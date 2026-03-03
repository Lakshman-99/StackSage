"""
StackSage Repo State Manager - In-memory state tracking for analysis pipelines.
Tracks status, progress, and cached results for each analyzed repository.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from app.models.schemas import AnalysisStatus, AnalysisStatusResponse
from app.core.logging import get_logger

logger = get_logger(__name__)


class RepoState:
    """State for a single repository analysis."""

    def __init__(self, repo_id: str, repo_url: str, branch: str):
        self.repo_id = repo_id
        self.repo_url = repo_url
        self.branch = branch
        self.status = AnalysisStatus.PENDING
        self.progress = 0.0
        self.current_step = ""
        self.steps_completed: list[str] = []
        self.error: Optional[str] = None
        self.created_at = datetime.now(timezone.utc)

        # Cached agent results
        self.parsed_files: list[dict] = []
        self.languages: dict[str, int] = {}
        self.architecture: Optional[dict] = None
        self.entry_points: Optional[dict] = None
        self.glossary: Optional[dict] = None
        self.local_path: str = ""

    def update(self, status: AnalysisStatus, progress: float, step: str):
        self.status = status
        self.progress = progress
        self.current_step = step
        if step and step not in self.steps_completed:
            self.steps_completed.append(step)
        logger.info("repo_state_update", repo_id=self.repo_id, status=status, progress=progress, step=step)

    def fail(self, error: str):
        self.status = AnalysisStatus.FAILED
        self.error = error
        logger.error("repo_analysis_failed", repo_id=self.repo_id, error=error)

    def to_status_response(self) -> AnalysisStatusResponse:
        return AnalysisStatusResponse(
            repo_id=self.repo_id,
            status=self.status,
            progress=self.progress,
            current_step=self.current_step,
            steps_completed=self.steps_completed,
            error=self.error,
            created_at=self.created_at,
        )


class RepoStateManager:
    """Manages state for all repository analyses."""

    def __init__(self):
        self._repos: dict[str, RepoState] = {}

    def create(self, repo_id: str, repo_url: str, branch: str) -> RepoState:
        state = RepoState(repo_id=repo_id, repo_url=repo_url, branch=branch)
        self._repos[repo_id] = state
        logger.info("repo_state_created", repo_id=repo_id)
        return state

    def get(self, repo_id: str) -> Optional[RepoState]:
        return self._repos.get(repo_id)

    def exists(self, repo_id: str) -> bool:
        return repo_id in self._repos

    def delete(self, repo_id: str) -> bool:
        if repo_id in self._repos:
            del self._repos[repo_id]
            return True
        return False

    def list_repos(self) -> list[dict[str, Any]]:
        return [
            {
                "repo_id": s.repo_id,
                "repo_url": s.repo_url,
                "status": s.status,
                "progress": s.progress,
                "created_at": s.created_at.isoformat(),
            }
            for s in self._repos.values()
        ]


# Singleton
_state_manager: Optional[RepoStateManager] = None


def get_state_manager() -> RepoStateManager:
    global _state_manager
    if _state_manager is None:
        _state_manager = RepoStateManager()
    return _state_manager