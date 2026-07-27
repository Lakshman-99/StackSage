"""
StackSage Change Impact Agent - Analyzes the ripple effects of modifying
a specific file in the codebase using dependency analysis + LLM reasoning.
"""

from typing import Any

import networkx as nx

from app.agents.base import BaseAgent
from app.models.schemas import ChangeImpactResponse, ImpactedFile
from app.services.state_manager import RepoState
from app.utils.prompts import CHANGE_IMPACT_SYSTEM, CHANGE_IMPACT_USER


class ChangeImpactAgent(BaseAgent):
    """Analyzes the impact of changing a file on the rest of the codebase."""

    agent_name = "change_impact"

    def _build_dependency_graph(self, files: list[dict]) -> nx.DiGraph:
        """Build directed dependency graph."""
        G = nx.DiGraph()
        file_paths = {f["path"] for f in files}

        for f in files:
            G.add_node(f["path"])
            for imp in f.get("imports", []):
                imp_clean = imp.replace(".", "/")
                for fp in file_paths:
                    if imp_clean in fp or fp.endswith(f"{imp_clean}.py"):
                        G.add_edge(f["path"], fp)
                        break
        return G

    def _find_dependents(self, G: nx.DiGraph, target: str, max_depth: int = 3) -> list[dict]:
        """Find all files that depend on the target file (reverse BFS)."""
        dependents = []
        visited = set()

        # Files that directly import the target
        reverse_G = G.reverse()
        if target not in reverse_G:
            return dependents

        for depth in range(1, max_depth + 1):
            if depth == 1:
                neighbors = list(reverse_G.neighbors(target))
            else:
                # BFS expansion
                next_level = set()
                for dep in [d["path"] for d in dependents if d["depth"] == depth - 1]:
                    if dep in reverse_G:
                        next_level.update(reverse_G.neighbors(dep))
                neighbors = list(next_level - visited - {target})

            for n in neighbors:
                if n not in visited and n != target:
                    visited.add(n)
                    dependents.append({
                        "path": n,
                        "depth": depth,
                        "relationship": "direct" if depth == 1 else "transitive",
                    })

        return dependents

    def _find_dependencies(self, G: nx.DiGraph, target: str) -> list[str]:
        """Find files the target imports."""
        if target in G:
            return list(G.neighbors(target))
        return []

    def _find_test_files(self, files: list[dict], target: str) -> list[str]:
        """Find test files that likely test the target file."""
        target_name = target.split("/")[-1].replace(".py", "").replace(".js", "").replace(".ts", "")
        test_files = []

        for f in files:
            path_lower = f["path"].lower()
            if any(t in path_lower for t in ["test", "spec", "__tests__"]):
                if target_name.lower() in path_lower:
                    test_files.append(f["path"])

        return test_files

    def _get_file_content(self, files: list[dict], target: str) -> str:
        """Get the content of a specific file."""
        for f in files:
            if f["path"] == target:
                return f.get("content", "File content not available")
        return "File not found in parsed files"

    async def run(self, state: RepoState, **kwargs) -> ChangeImpactResponse:
        """Analyze the impact of changing a specific file."""
        target_file: str = kwargs["file_path"].replace("\\", "/")
        description: str = kwargs.get("description", "General modification")
        # Normalize in case paths were persisted with OS-native (Windows) separators
        # by an older ingestion run - all path logic below assumes "/".
        files = [{**f, "path": f["path"].replace("\\", "/")} for f in state.parsed_files]

        self.logger.info("change_impact_analysis", repo_id=state.repo_id, target=target_file)

        # Build dependency graph
        G = self._build_dependency_graph(files)

        # Find dependents and dependencies
        dependents = self._find_dependents(G, target_file)
        dependencies = self._find_dependencies(G, target_file)
        test_files = self._find_test_files(files, target_file)

        # Get file content
        file_content = self._get_file_content(files, target_file)

        # Format for LLM
        dependents_str = "\n".join(
            f"  - {d['path']} ({d['relationship']}, depth={d['depth']})"
            for d in dependents[:20]
        ) or "  No direct dependents found"

        dependencies_str = "\n".join(
            f"  - {dep}" for dep in dependencies[:20]
        ) or "  No dependencies found"

        # Architecture context
        arch_summary = ""
        if state.architecture:
            arch_summary = state.architecture.get("summary", "")

        # LLM analysis
        prompt = CHANGE_IMPACT_USER.format(
            target_file=target_file,
            description=description,
            file_content=self._truncate(file_content, 10000),
            dependents=dependents_str,
            dependencies=dependencies_str,
            architecture_summary=arch_summary[:3000],
        )

        result = await self.llm.complete_json(
            system_prompt=CHANGE_IMPACT_SYSTEM,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=3000,
        )

        # Build response
        impacted_files = [
            ImpactedFile(**f)
            for f in result.get("impacted_files", [])
        ]

        response = ChangeImpactResponse(
            repo_id=state.repo_id,
            target_file=target_file,
            risk_level=result.get("risk_level", "medium"),
            summary=result.get("summary", ""),
            impacted_files=impacted_files,
            test_files_affected=result.get("test_files_affected", test_files),
            recommendations=result.get("recommendations", []),
        )

        self.logger.info(
            "change_impact_complete",
            repo_id=state.repo_id,
            risk=response.risk_level,
            impacted=len(impacted_files),
        )

        return response