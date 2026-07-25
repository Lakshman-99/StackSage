"""
StackSage Glossary Agent - Extracts ONLY project-specific terminology, not generic programming terms.
"""

import re
from collections import Counter
from typing import Any

from app.agents.base import BaseAgent
from app.models.schemas import GlossaryResponse, GlossaryTerm
from app.services.state_manager import RepoState
from app.utils.prompts import GLOSSARY_SYSTEM, GLOSSARY_USER


class GlossaryAgent(BaseAgent):
    agent_name = "glossary"

    STANDARD_TERMS = {
        "init", "main", "self", "this", "class", "function", "def", "return",
        "import", "from", "if", "else", "for", "while", "try", "except",
        "true", "false", "none", "null", "undefined", "var", "let", "const",
        "string", "int", "float", "bool", "list", "dict", "array", "map",
        "set", "get", "post", "put", "delete", "patch", "request", "response",
        "error", "exception", "handler", "middleware", "router", "controller",
        "model", "view", "template", "service", "utils", "helper", "config",
        "test", "spec", "mock", "fixture", "setup", "teardown", "async", "await",
    }

    def _extract_identifiers(self, files: list[dict]) -> Counter:
        identifier_counts: Counter = Counter()
        camel_pattern = re.compile(r"\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b")
        snake_pattern = re.compile(r"\b([a-z]+(?:_[a-z]+){1,})\b")
        for f in files:
            content = f.get("content", "")
            if not content:
                continue
            for match in camel_pattern.findall(content):
                if match.lower() not in self.STANDARD_TERMS and len(match) > 4:
                    identifier_counts[match] += 1
            for match in snake_pattern.findall(content):
                if match not in self.STANDARD_TERMS and len(match) > 5:
                    identifier_counts[match] += 1
        return identifier_counts

    def _find_docs_content(self, files: list[dict]) -> str:
        docs = []
        for f in files:
            if any(p in f.get("path", "").lower() for p in ["readme", "contributing", "architecture", "design", "glossary"]):
                content = f.get("content", "")
                if content:
                    docs.append(f"--- {f['path']} ---\n{content[:5000]}\n")
        return "\n".join(docs[:3]) if docs else "No documentation files found."

    def _select_sample_files(self, files: list[dict], max_files: int = 15) -> str:
        source_files = [f for f in files if f.get("file_type", "source") == "source" and f.get("content")]
        sorted_files = sorted(source_files, key=lambda x: len(x.get("classes", [])) + len(x.get("functions", [])), reverse=True)
        parts = []
        for f in sorted_files[:max_files]:
            parts.append(f"--- {f['path']} ---\n{f.get('content', '')[:2000]}\n")
        return "\n".join(parts)

    async def run(self, state: RepoState, **kwargs) -> GlossaryResponse:
        files = state.parsed_files
        state.update(state.status, 80, "Extracting glossary terms")

        identifier_counts = self._extract_identifiers(files)
        docs_content = self._find_docs_content(files)
        sample_content = self._select_sample_files(files)

        prompt = GLOSSARY_USER.format(
            repo_url=state.repo_url,
            languages=state.languages,
            sample_files=self._truncate(sample_content, 15000),
            docs_content=self._truncate(docs_content, 5000),
        )

        result = await self.llm.complete_json(
            system_prompt=GLOSSARY_SYSTEM,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=4096,
        )

        terms = []
        for t in result.get("terms", []):
            term_name = t.get("term", "")
            actual_count = identifier_counts.get(term_name, 0)
            terms.append(GlossaryTerm(
                term=term_name,
                definition=t.get("definition", ""),
                category=t.get("category", ""),
                source_files=t.get("source_files", []),
                usage_count=actual_count,
            ))

        terms.sort(key=lambda x: x.usage_count, reverse=True)

        response = GlossaryResponse(repo_id=state.repo_id, terms=terms, total_terms=len(terms))
        state.glossary = response.model_dump()
        state._save()
        self.logger.info("glossary_extracted", repo_id=state.repo_id, terms=len(terms))
        return response