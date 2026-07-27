"""
StackSage Architecture Agent - Deep architecture analysis with categorized tech stack,
monorepo detection, polyglot analysis, data flow mapping, and Mermaid diagram generation.
"""

import re
from typing import Any

from app.agents.base import BaseAgent
from app.models.schemas import ArchitectureLayer, ArchitectureResponse, DependencyEdge
from app.services.state_manager import RepoState
from app.utils.prompts import ARCHITECTURE_SYSTEM, ARCHITECTURE_USER

MERMAID_DIAGRAM_TYPES = (
    "graph", "flowchart", "sequencediagram", "classdiagram",
    "erdiagram", "statediagram", "journey", "gantt", "pie",
)


def _sanitize_mermaid(raw: str) -> str:
    """Strip markdown fences models sometimes add despite JSON-only instructions, and
    repair the malformed edge-label syntax models frequently emit (e.g. `-->|label|>`,
    which is not valid Mermaid - the closing `|` already ends the label)."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"```$", "", text.strip())
    text = re.sub(r"(-->\|[^|\n]*\|)>", r"\1", text)
    return text.strip()


_BROKEN_EDGE_LABEL = re.compile(r"\|>\S")


def _is_valid_mermaid(text: str) -> bool:
    if not text:
        return False
    first_line = text.strip().splitlines()[0].strip().lower()
    if not any(first_line.startswith(kind) for kind in MERMAID_DIAGRAM_TYPES):
        return False
    # A lingering "|>" immediately followed by a non-space character means the model's
    # edge-label syntax is still broken after sanitizing and would fail to render.
    return not _BROKEN_EDGE_LABEL.search(text)


def _fallback_diagram(layers: list[ArchitectureLayer], edges: list[DependencyEdge]) -> str:
    """Deterministically build a diagram-as-code from detected layers/dependencies
    when the LLM output is missing or malformed, so the UI always has something to render.
    Uses each layer's real files (as sub-nodes) and its "talks_to" relationships (as
    cross-layer edges) instead of just chaining layers in list order, so the fallback
    still reflects the repo's actual structure rather than a generic straight line."""
    def node_id(name: str, prefix: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_") or "node"
        return f"{prefix}_{slug}"

    if layers:
        lines = ["graph TD"]
        layer_ids = [node_id(layer.name, f"L{i}") for i, layer in enumerate(layers)]
        name_to_id = {layer.name.lower(): layer_ids[i] for i, layer in enumerate(layers)}

        for i, layer in enumerate(layers):
            label = layer.name.replace('"', "'")
            lines.append(f'    subgraph {layer_ids[i]}["{label}"]')
            for j, path in enumerate(layer.files[:2]):
                file_label = path.split("/")[-1].replace('"', "'")
                lines.append(f'        {node_id(f"{layer.name}_{path}", f"f{i}_{j}")}["{file_label}"]')
            if not layer.files:
                lines.append(f"        {layer_ids[i]}_e[\" \"]")
            lines.append("    end")

        drew_edge = False
        for i, layer in enumerate(layers):
            for target_name in layer.talks_to:
                target_id = name_to_id.get(target_name.lower())
                if target_id and target_id != layer_ids[i]:
                    lines.append(f"    {layer_ids[i]} --> {target_id}")
                    drew_edge = True

        if not drew_edge:
            # No talks_to data available at all - a straight chain is still better than nothing.
            for i in range(len(layers) - 1):
                lines.append(f"    {layer_ids[i]} --> {layer_ids[i + 1]}")

        return "\n".join(lines)

    if edges:
        lines = ["graph LR"]
        for i, e in enumerate(edges[:25]):
            src = node_id(e.source, f"s{i}")
            tgt = node_id(e.target, f"t{i}")
            lines.append(f'    {src}["{e.source.split("/")[-1]}"] --> {tgt}["{e.target.split("/")[-1]}"]')
        return "\n".join(lines)

    return ""


class ArchitectureAgent(BaseAgent):
    agent_name = "architecture"

    def _build_file_tree(self, files: list[dict]) -> str:
        paths = sorted(f["path"] for f in files)
        tree_lines = []
        for p in paths[:250]:
            depth = p.count("/")
            indent = "  " * depth
            name = p.split("/")[-1]
            tree_lines.append(f"{indent}{name}")
        if len(paths) > 250:
            tree_lines.append(f"\n... and {len(paths) - 250} more files")
        return "\n".join(tree_lines)

    def _select_key_files(self, files: list[dict], max_files: int = 10) -> list[dict]:
        priority_files = []
        seen = set()

        entry_names = {
            "main.py", "app.py", "index.js", "index.ts", "server.py", "server.ts",
            "main.go", "application.java", "manage.py", "setup.py",
            "package.json", "pyproject.toml", "cargo.toml", "go.mod",
            "docker-compose.yml", "docker-compose.yaml", "dockerfile",
            "readme.md", ".env.example", "tsconfig.json",
        }
        for f in files:
            basename = f["path"].split("/")[-1].lower()
            if basename in entry_names and f["path"] not in seen:
                priority_files.append(f)
                seen.add(f["path"])

        hub_files = sorted(
            [f for f in files if f["path"] not in seen],
            key=lambda x: len(x.get("classes", [])) + len(x.get("functions", [])),
            reverse=True,
        )
        for f in hub_files[:max_files - len(priority_files)]:
            priority_files.append(f)
            seen.add(f["path"])

        return priority_files[:max_files]

    def _format_sample_files(self, files: list[dict], max_chars: int = 1500) -> str:
        parts = []
        for f in files:
            content = f.get("content", "")[:max_chars]
            parts.append(f"--- {f['path']} ({f.get('language', 'unknown')}) ---\n{content}\n")
        return "\n".join(parts)

    def _extract_dependency_edges(self, files: list[dict]) -> list[DependencyEdge]:
        edges: list[DependencyEdge] = []
        file_paths = {f["path"] for f in files}
        for f in files:
            for imp in f.get("imports", []):
                imp_clean = imp.replace(".", "/")
                for fp in file_paths:
                    if imp_clean in fp or fp.endswith(f"{imp_clean}.py") or fp.endswith(f"{imp_clean}/index.ts"):
                        edges.append(DependencyEdge(source=f["path"], target=fp, import_name=imp))
                        break
        return edges

    async def run(self, state: RepoState, **kwargs) -> ArchitectureResponse:
        # Normalize in case paths were persisted with OS-native (Windows) separators
        # by an older ingestion run - all path logic below assumes "/".
        files = [{**f, "path": f["path"].replace("\\", "/")} for f in state.parsed_files]
        state.update(state.status, 60, "Analyzing architecture")

        file_tree = self._build_file_tree(files)
        key_files = self._select_key_files(files)
        sample_content = self._format_sample_files(key_files)
        dep_edges = self._extract_dependency_edges(files)
        dep_edges_summary = "\n".join(
            f"{e.source} -> {e.target} ({e.import_name})" for e in dep_edges[:60]
        ) or "(none detected)"

        prompt = ARCHITECTURE_USER.format(
            repo_url=state.repo_url,
            file_count=len(files),
            languages=state.languages,
            file_tree=self._truncate(file_tree, 8000),
            dependency_edges=self._truncate(dep_edges_summary, 2500),
            sample_files=self._truncate(sample_content, 13000),
        )

        result = await self.llm.complete_json(
            system_prompt=ARCHITECTURE_SYSTEM,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=4096,
        )

        layers = [ArchitectureLayer(**layer) for layer in result.get("layers", [])]
        total_lines = sum(f.get("line_count", 0) for f in files)

        # design_patterns from the LLM are detailed objects ({name, where, why});
        # ArchitectureResponse.design_patterns is a flat list[str] of names only.
        raw_patterns = result.get("design_patterns", [])
        pattern_names = [p.get("name", "") if isinstance(p, dict) else str(p) for p in raw_patterns]

        response = ArchitectureResponse(
            repo_id=state.repo_id,
            summary=result.get("summary", ""),
            tech_stack=result.get("tech_stack", []),
            layers=layers,
            dependency_graph=dep_edges,
            design_patterns=pattern_names,
            file_count=len(files),
            total_lines=total_lines,
        )

        mermaid_diagram = _sanitize_mermaid(result.get("mermaid_diagram", ""))
        if not _is_valid_mermaid(mermaid_diagram):
            mermaid_diagram = _fallback_diagram(layers, dep_edges)

        # Store the full result including new fields
        arch_data = response.model_dump()
        arch_data["tech_stack_categorized"] = result.get("tech_stack_categorized", {})
        arch_data["repo_type"] = result.get("repo_type", "unknown")
        arch_data["architecture_style"] = result.get("architecture_style", "unknown")
        arch_data["data_flow"] = result.get("data_flow", "")
        arch_data["mermaid_diagram"] = mermaid_diagram
        arch_data["design_patterns_detailed"] = result.get("design_patterns", [])

        state.architecture = arch_data
        state._save()

        self.logger.info("architecture_analyzed", repo_id=state.repo_id, layers=len(layers))
        return response