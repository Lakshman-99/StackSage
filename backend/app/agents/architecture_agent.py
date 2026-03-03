"""
StackSage Architecture Agent - Reverse-engineers the system architecture
by analyzing file structure, dependencies, and key source files via LLM.
"""

from typing import Any

from app.agents.base import BaseAgent
from app.models.schemas import ArchitectureLayer, ArchitectureResponse, DependencyEdge, ParsedFile
from app.services.state_manager import RepoState
from app.utils.prompts import ARCHITECTURE_SYSTEM, ARCHITECTURE_USER


class ArchitectureAgent(BaseAgent):
    """Analyzes repository architecture using file structure + LLM reasoning."""

    agent_name = "architecture"

    def _build_file_tree(self, files: list[dict]) -> str:
        """Build a visual file tree string."""
        paths = sorted(f["path"] for f in files)
        tree_lines = []
        for p in paths[:300]:  # Limit for LLM context
            depth = p.count("/")
            indent = "  " * depth
            name = p.split("/")[-1]
            tree_lines.append(f"{indent}{name}")
        if len(paths) > 300:
            tree_lines.append(f"\n... and {len(paths) - 300} more files")
        return "\n".join(tree_lines)

    def _select_key_files(self, files: list[dict], max_files: int = 15) -> list[dict]:
        """Select the most architecturally significant files for LLM analysis."""
        priority_files = []
        seen = set()

        # Priority 1: Entry points and configs
        entry_names = {
            "main.py", "app.py", "index.js", "index.ts", "server.py",
            "main.go", "application.java", "manage.py", "setup.py",
            "package.json", "pyproject.toml", "cargo.toml", "go.mod",
            "docker-compose.yml", "dockerfile", "readme.md",
        }
        for f in files:
            basename = f["path"].split("/")[-1].lower()
            if basename in entry_names and f["path"] not in seen:
                priority_files.append(f)
                seen.add(f["path"])

        # Priority 2: Files with many imports/exports (hubs)
        hub_files = sorted(
            [f for f in files if f["path"] not in seen],
            key=lambda x: len(x.get("classes", [])) + len(x.get("functions", [])),
            reverse=True,
        )
        for f in hub_files[:max_files - len(priority_files)]:
            priority_files.append(f)
            seen.add(f["path"])

        return priority_files[:max_files]

    def _format_sample_files(self, files: list[dict], max_chars_per_file: int = 3000) -> str:
        """Format key files for LLM consumption."""
        parts = []
        for f in files:
            content = f.get("content", "")[:max_chars_per_file]
            parts.append(f"--- {f['path']} ({f.get('language', 'unknown')}) ---\n{content}\n")
        return "\n".join(parts)

    def _extract_dependency_edges(self, files: list[dict]) -> list[DependencyEdge]:
        """Build dependency edges from import statements."""
        edges: list[DependencyEdge] = []
        file_paths = {f["path"] for f in files}

        for f in files:
            for imp in f.get("imports", []):
                # Try to resolve import to a file in the repo
                imp_clean = imp.replace(".", "/")
                for fp in file_paths:
                    if imp_clean in fp or fp.endswith(f"{imp_clean}.py") or fp.endswith(f"{imp_clean}/index.ts"):
                        edges.append(DependencyEdge(
                            source=f["path"],
                            target=fp,
                            import_name=imp,
                        ))
                        break

        return edges

    async def run(self, state: RepoState, **kwargs) -> ArchitectureResponse:
        """Analyze repository architecture."""
        files = state.parsed_files

        state.update(state.status, 60, "Analyzing architecture")

        # Build inputs
        file_tree = self._build_file_tree(files)
        key_files = self._select_key_files(files)
        sample_content = self._format_sample_files(key_files)
        dep_edges = self._extract_dependency_edges(files)

        # LLM analysis
        prompt = ARCHITECTURE_USER.format(
            repo_url=state.repo_url,
            file_count=len(files),
            languages=state.languages,
            file_tree=self._truncate(file_tree, 15000),
            sample_files=self._truncate(sample_content, 30000),
        )

        result = await self.llm.complete_json(
            system_prompt=ARCHITECTURE_SYSTEM,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=4096,
        )

        # Build response
        layers = [
            ArchitectureLayer(**layer)
            for layer in result.get("layers", [])
        ]

        total_lines = sum(f.get("line_count", 0) for f in files)

        response = ArchitectureResponse(
            repo_id=state.repo_id,
            summary=result.get("summary", ""),
            tech_stack=result.get("tech_stack", []),
            layers=layers,
            dependency_graph=dep_edges,
            design_patterns=result.get("design_patterns", []),
            file_count=len(files),
            total_lines=total_lines,
        )

        state.architecture = response.model_dump()
        self.logger.info(
            "architecture_analyzed",
            repo_id=state.repo_id,
            layers=len(layers),
            patterns=len(response.design_patterns),
        )

        return response