"""
StackSage Question Agent - Answers natural language questions about the codebase
using RAG (Retrieval-Augmented Generation) with the vector store.
"""

from typing import Any

from app.agents.base import BaseAgent
from app.models.schemas import QuestionResponse
from app.services.state_manager import RepoState
from app.services.vector_store import get_vector_store
from app.utils.prompts import QUESTION_SYSTEM, QUESTION_USER


class QuestionAgent(BaseAgent):
    """RAG-powered Q&A agent for codebase questions."""

    agent_name = "question"

    def _format_context_chunks(self, results: dict) -> tuple[str, list[str], list[dict]]:
        """Format vector search results into a context string for the LLM."""
        context_parts = []
        relevant_files = []
        code_snippets = []
        seen_files = set()

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for doc, meta, dist in zip(documents, metadatas, distances):
            file_path = meta.get("file_path", "unknown")
            symbol = meta.get("symbol_name", "")
            chunk_type = meta.get("chunk_type", "code")
            start_line = meta.get("start_line", 0)
            end_line = meta.get("end_line", 0)

            # Build context entry
            header = f"[{file_path}"
            if symbol:
                header += f" :: {chunk_type} {symbol}"
            header += f" (lines {start_line}-{end_line}, relevance: {1 - dist:.2f})]"

            context_parts.append(f"{header}\n{doc}\n")

            # Track files
            if file_path not in seen_files:
                relevant_files.append(file_path)
                seen_files.add(file_path)

            # Extract code snippets
            # Strip metadata lines from the document
            code_lines = doc.split("\n")
            code_start = 0
            for i, line in enumerate(code_lines):
                if line.strip() == "" and i > 0:
                    code_start = i + 1
                    break

            code_content = "\n".join(code_lines[code_start:]).strip()
            if code_content:
                code_snippets.append({
                    "file": file_path,
                    "code": code_content[:2000],
                    "lines": f"{start_line}-{end_line}",
                    "symbol": symbol,
                })

        return "\n\n".join(context_parts), relevant_files, code_snippets

    def _compute_confidence(self, distances: list[float]) -> float:
        """Estimate answer confidence based on retrieval distances."""
        if not distances:
            return 0.0

        # Convert distances to similarities (cosine distance to similarity)
        similarities = [max(0, 1 - d) for d in distances]
        top_similarities = similarities[:5]

        if not top_similarities:
            return 0.0

        # Weighted average: top results matter more
        weights = [1.0, 0.8, 0.6, 0.4, 0.2][:len(top_similarities)]
        weighted_sum = sum(s * w for s, w in zip(top_similarities, weights))
        weight_total = sum(weights[:len(top_similarities)])

        confidence = weighted_sum / weight_total
        return round(min(1.0, confidence), 3)

    async def run(self, state: RepoState, **kwargs) -> QuestionResponse:
        """Answer a question about the codebase using RAG."""
        question: str = kwargs["question"]
        include_snippets: bool = kwargs.get("include_code_snippets", True)
        file_context: str = kwargs.get("file_context", "")

        self.logger.info("question_asked", repo_id=state.repo_id, question=question[:100])

        # Step 1: Retrieve relevant chunks from vector store
        vector_store = get_vector_store()
        results = vector_store.query(
            repo_id=state.repo_id,
            query_text=question,
            n_results=8,
        )

        # Step 2: Format context
        context_str, relevant_files, code_snippets = self._format_context_chunks(results)

        # Step 3: Get architecture context if available
        arch_summary = ""
        if state.architecture:
            arch_summary = state.architecture.get("summary", "")

        # Step 4: Generate answer via LLM
        prompt = QUESTION_USER.format(
            question=question,
            file_context=f"Focused file: {file_context[:2500]}" if file_context else "",
            context_chunks=self._truncate(context_str, 9000),
            architecture_summary=arch_summary[:1500],
        )

        answer = await self.llm.complete(
            system_prompt=QUESTION_SYSTEM,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=1500,
        )

        # Step 5: Compute confidence
        distances = results.get("distances", [[]])[0]
        confidence = self._compute_confidence(distances)

        response = QuestionResponse(
            repo_id=state.repo_id,
            question=question,
            answer=answer,
            relevant_files=relevant_files[:10],
            code_snippets=code_snippets[:5] if include_snippets else [],
            confidence=confidence,
        )

        self.logger.info(
            "question_answered",
            repo_id=state.repo_id,
            confidence=confidence,
            relevant_files=len(relevant_files),
        )

        return response