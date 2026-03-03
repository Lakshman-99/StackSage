"""
StackSage Glossary Agent - Extracts domain-specific terminology from the codebase
by analyzing README, documentation, and source code naming patterns.
"""

import re
from collections import Counter
from typing import Any

from app.agents.base import BaseAgent
from app.models.schemas import GlossaryResponse, GlossaryTerm
from app.services.state_manager import RepoState
from app.utils.prompts import GLOSSARY_SYSTEM, GLOSSARY_USER


class GlossaryAgent(BaseAgent):
    """Extracts and defines domain-specific terminology from the codebase."""

    agent_name = "glossary"

    # Common programming terms to exclude
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
        """Extract CamelCase and snake_case identifiers from source files."""
        identifier_counts: Counter = Counter()

        # Patterns for meaningful identifiers
        camel_pattern = re.compile(r"\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b")
        snake_pattern = re.compile(r"\b([a-z]+(?:_[a-z]+){1,})\b")

        for f in files:
            content = f.get("content", "")
            if not content:
                continue

            # Extract CamelCase identifiers
            for match in camel_pattern.findall(content):
                if match.lower() not in self.STANDARD_TERMS and len(match) > 4:
                    identifier_counts[match] += 1

            # Extract meaningful snake_case identifiers
            for match in snake_pattern.findall(content):
                if match not in self.STANDARD_TERMS and len(match) > 5:
                    identifier_counts[match] += 1

        return identifier_counts

    def _find_docs_content(self, files: list[dict]) -> str:
        """Find and combine README and documentation content."""
        docs = []
        doc_patterns = ["readme", "contributing", "architecture", "design"]

        for f in files:
            path_lower = f["path"].lower()
            if any(p in path_lower for p in doc_patterns):
                content = f.get("content", "")
                if content:
                    docs.append(f"--- {f['path']} ---\n{content[:5000]}\n")

        return "\n".join(docs[:3]) if docs else "No documentation files found."

    def _select_sample_files(self, files: list[dict], max_files: int = 20) -> str:
        """Select diverse sample of source files for glossary extraction."""
        # Prioritize files with many classes/functions (domain-rich)
        source_files = [
            f for f in files
            if f.get("file_type", "source") == "source" and f.get("content")
        ]

        sorted_files = sorted(
            source_files,
            key=lambda x: len(x.get("classes", [])) + len(x.get("functions", [])),
            reverse=True,
        )

        parts = []
        for f in sorted_files[:max_files]:
            content = f.get("content", "")[:3000]
            parts.append(f"--- {f['path']} ---\n{content}\n")

        return "\n".join(parts)

    async def run(self, state: RepoState, **kwargs) -> GlossaryResponse:
        """Extract domain-specific glossary from the codebase."""
        files = state.parsed_files

        state.update(state.status, 80, "Extracting glossary terms")

        # Pre-extract identifiers for context
        identifier_counts = self._extract_identifiers(files)
        top_identifiers = identifier_counts.most_common(50)

        # Gather inputs
        docs_content = self._find_docs_content(files)
        sample_content = self._select_sample_files(files)

        # LLM glossary extraction
        prompt = GLOSSARY_USER.format(
            repo_url=state.repo_url,
            languages=state.languages,
            sample_files=self._truncate(sample_content, 30000),
            docs_content=self._truncate(docs_content, 10000),
        )

        result = await self.llm.complete_json(
            system_prompt=GLOSSARY_SYSTEM,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=4096,
        )

        # Build response
        terms = []
        for t in result.get("terms", []):
            # Enrich with actual usage counts from identifier extraction
            term_name = t.get("term", "")
            actual_count = identifier_counts.get(term_name, t.get("usage_count", 0))

            terms.append(
                GlossaryTerm(
                    term=term_name,
                    definition=t.get("definition", ""),
                    category=t.get("category", ""),
                    source_files=t.get("source_files", []),
                    usage_count=actual_count,
                )
            )

        # Sort by usage count
        terms.sort(key=lambda x: x.usage_count, reverse=True)

        response = GlossaryResponse(
            repo_id=state.repo_id,
            terms=terms,
            total_terms=len(terms),
        )

        state.glossary = response.model_dump()
        self.logger.info("glossary_extracted", repo_id=state.repo_id, terms=len(terms))

        return response