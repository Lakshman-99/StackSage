"""
StackSage Onboarding Agent - Creates a comprehensive onboarding guide
for new developers joining a project. The most user-facing agent.
"""

from typing import Any

from app.agents.base import BaseAgent
from app.services.state_manager import RepoState
from app.utils.prompts import ONBOARDING_SYSTEM, ONBOARDING_USER


class OnboardingAgent(BaseAgent):
    agent_name = "onboarding"

    def _find_docs(self, files: list[dict]) -> str:
        docs = []
        doc_names = ["readme", "contributing", "getting_started", "setup", "install", "development"]
        for f in files:
            path_lower = f.get("path", "").lower()
            if any(d in path_lower for d in doc_names):
                content = f.get("content", "")
                if content:
                    docs.append(f"--- {f['path']} ---\n{content[:4000]}\n")
        return "\n".join(docs[:3]) if docs else "No documentation files found."

    def _select_samples(self, files: list[dict], max_files: int = 8) -> str:
        source = [f for f in files if f.get("file_type") == "source" and f.get("content")]
        sorted_files = sorted(source, key=lambda x: len(x.get("classes", [])) + len(x.get("functions", [])), reverse=True)
        parts = []
        for f in sorted_files[:max_files]:
            parts.append(f"--- {f['path']} ---\n{f.get('content', '')[:1500]}\n")
        return "\n".join(parts)

    async def run(self, state: RepoState, **kwargs) -> dict[str, Any]:
        files = state.parsed_files

        arch_summary = ""
        tech_stack = ""
        if state.architecture:
            arch_summary = state.architecture.get("summary", "")
            stack = state.architecture.get("tech_stack_categorized", {})
            if stack:
                tech_stack = "\n".join(f"  {cat}: {', '.join(items)}" for cat, items in stack.items() if items)

        ep_summary = ""
        if state.entry_points:
            eps = state.entry_points.get("entry_points", [])[:5]
            ep_summary = "\n".join(f"  - {e.get('path', '')} — {e.get('reason', '')[:100]}" for e in eps)

        docs = self._find_docs(files)
        samples = self._select_samples(files)

        prompt = ONBOARDING_USER.format(
            repo_url=state.repo_url,
            architecture_summary=arch_summary[:3000],
            tech_stack=tech_stack or str(state.languages),
            entry_points_summary=ep_summary,
            languages=state.languages,
            file_count=len(files),
            docs_content=self._truncate(docs, 5000),
            sample_files=self._truncate(samples, 10000),
        )

        result = await self.llm.complete_json(
            system_prompt=ONBOARDING_SYSTEM,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=4096,
        )

        state.onboarding = result
        state._save()
        self.logger.info("onboarding_generated", repo_id=state.repo_id)
        return result