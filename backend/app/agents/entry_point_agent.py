"""
StackSage Entry Point Agent - Identifies critical entry points using PageRank
on the file dependency graph, enhanced by LLM reasoning.
"""

from typing import Any

import networkx as nx

from app.agents.base import BaseAgent
from app.models.schemas import EntryPointFile, EntryPointsResponse
from app.services.state_manager import RepoState
from app.utils.prompts import ENTRY_POINT_SYSTEM, ENTRY_POINT_USER


class EntryPointAgent(BaseAgent):
    """Finds critical files using PageRank + LLM analysis."""

    agent_name = "entry_point"

    def _build_dependency_graph(self, files: list[dict]) -> nx.DiGraph:
        """Build a directed graph from file import relationships."""
        G = nx.DiGraph()

        # Add all files as nodes
        for f in files:
            G.add_node(f["path"], language=f.get("language", ""), line_count=f.get("line_count", 0))

        # Add edges from imports
        file_paths = {f["path"] for f in files}
        for f in files:
            for imp in f.get("imports", []):
                imp_clean = imp.replace(".", "/")
                for fp in file_paths:
                    if imp_clean in fp or fp.endswith(f"{imp_clean}.py"):
                        G.add_edge(f["path"], fp, import_name=imp)
                        break

        return G

    def _compute_pagerank(self, G: nx.DiGraph, top_n: int = 20) -> list[dict]:
        """Run PageRank and return top N files by score."""
        if len(G.nodes) == 0:
            return []

        try:
            scores = nx.pagerank(G, alpha=0.85, max_iter=100)
        except nx.PowerIterationFailedConvergence:
            scores = nx.pagerank(G, alpha=0.85, max_iter=500, tol=1e-4)

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        results = []
        for path, score in ranked[:top_n]:
            results.append({
                "path": path,
                "score": round(score, 6),
                "in_degree": G.in_degree(path),
                "out_degree": G.out_degree(path),
            })

        return results

    def _compute_graph_stats(self, G: nx.DiGraph) -> dict[str, Any]:
        """Compute interesting graph statistics."""
        stats = {
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges(),
            "density": round(nx.density(G), 4) if G.number_of_nodes() > 1 else 0,
        }

        if G.number_of_nodes() > 0:
            in_degrees = [d for _, d in G.in_degree()]
            out_degrees = [d for _, d in G.out_degree()]
            stats["avg_in_degree"] = round(sum(in_degrees) / len(in_degrees), 2)
            stats["avg_out_degree"] = round(sum(out_degrees) / len(out_degrees), 2)
            stats["max_in_degree"] = max(in_degrees)
            stats["max_out_degree"] = max(out_degrees)

        # Connected components (treat as undirected)
        undirected = G.to_undirected()
        components = list(nx.connected_components(undirected))
        stats["connected_components"] = len(components)
        stats["largest_component_size"] = max(len(c) for c in components) if components else 0

        return stats

    async def run(self, state: RepoState, **kwargs) -> EntryPointsResponse:
        """Identify critical entry points using PageRank + LLM."""
        files = state.parsed_files

        state.update(state.status, 70, "Computing entry points (PageRank)")

        # Build graph and run PageRank
        G = self._build_dependency_graph(files)
        ranked_files = self._compute_pagerank(G, top_n=20)
        graph_stats = self._compute_graph_stats(G)

        # Format for LLM
        ranked_str = "\n".join(
            f"  {i+1}. {f['path']} (score: {f['score']}, "
            f"imported by {f['in_degree']} files, imports {f['out_degree']} files)"
            for i, f in enumerate(ranked_files[:15])
        )

        dep_info = "\n".join(
            f"  {f['path']}: imported by {f['in_degree']}, imports {f['out_degree']}"
            for f in ranked_files[:15]
        )

        # LLM enrichment - explain WHY each file matters
        prompt = ENTRY_POINT_USER.format(
            repo_url=state.repo_url,
            ranked_files=ranked_str,
            dependency_info=dep_info,
        )

        result = await self.llm.complete_json(
            system_prompt=ENTRY_POINT_SYSTEM,
            user_prompt=prompt,
            temperature=0.3,
        )

        # Merge LLM explanations with PageRank data
        llm_entries = {e["path"]: e for e in result.get("entry_points", [])}

        entry_points = []
        for rf in ranked_files[:15]:
            llm_info = llm_entries.get(rf["path"], {})
            entry_points.append(
                EntryPointFile(
                    path=rf["path"],
                    score=rf["score"],
                    reason=llm_info.get("reason", f"High PageRank score ({rf['score']})"),
                    in_degree=rf["in_degree"],
                    out_degree=rf["out_degree"],
                )
            )

        response = EntryPointsResponse(
            repo_id=state.repo_id,
            entry_points=entry_points,
            graph_stats=graph_stats,
        )

        state.entry_points = response.model_dump()
        self.logger.info("entry_points_computed", repo_id=state.repo_id, count=len(entry_points))

        return response