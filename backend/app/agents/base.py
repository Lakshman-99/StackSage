"""
StackSage Agent Base - Abstract base class for all agents.
"""

from abc import ABC, abstractmethod
from typing import Any

from app.core.logging import get_logger


class BaseAgent(ABC):
    """Base class for all StackSage agents."""

    agent_name: str = "base"

    def __init__(self):
        # Lazy import to avoid circular dependency chain
        from app.services.llm_service import LLMService, get_llm_service
        self.llm: LLMService = get_llm_service()
        self.logger = get_logger(f"agent.{self.agent_name}")

    @abstractmethod
    async def run(self, state, **kwargs) -> Any:
        """Execute the agent's task."""
        ...

    def _truncate(self, text: str, max_chars: int = 50000) -> str:
        """Truncate text to fit in LLM context window."""
        if len(text) <= max_chars:
            return text
        half = max_chars // 2
        return text[:half] + "\n\n... [TRUNCATED] ...\n\n" + text[-half:]