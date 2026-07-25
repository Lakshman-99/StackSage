"""
StackSage Repo State Manager - Persists analysis state to disk as JSON files.
Each repo gets its own JSON file in data/state/{repo_id}.json.
Survives server restarts.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.models.schemas import AnalysisStatus, AnalysisStatusResponse
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class RepoState:
    """State for a single repository analysis. Persisted to disk."""

    def __init__(self, repo_id: str, repo_url: str, branch: str):
        self.repo_id = repo_id
        self.repo_url = repo_url
        self.branch = branch
        self.status = AnalysisStatus.PENDING
        self.progress = 0.0
        self.current_step = ""
        self.steps_completed: list[str] = []
        self.error: Optional[str] = None
        self.created_at = datetime.now(timezone.utc).isoformat()

        # Cached agent results
        self.parsed_files: list[dict] = []
        self.languages: dict[str, int] = {}
        self.architecture: Optional[dict] = None
        self.entry_points: Optional[dict] = None
        self.glossary: Optional[dict] = None
        self.onboarding: Optional[dict] = None
        self.local_path: str = ""

    def update(self, status: AnalysisStatus, progress: float, step: str):
        self.status = status
        self.progress = progress
        self.current_step = step
        if step and step not in self.steps_completed:
            self.steps_completed.append(step)
        self._save()
        logger.info("repo_state_update", repo_id=self.repo_id, status=status, progress=progress, step=step)

    def fail(self, error: str):
        self.status = AnalysisStatus.FAILED
        self.error = error
        self._save()
        logger.error("repo_analysis_failed", repo_id=self.repo_id, error=error)

    def _get_path(self) -> Path:
        return settings.state_persist_path / f"{self.repo_id}.json"

    def _save(self):
        """Persist state to disk."""
        data = {
            "repo_id": self.repo_id,
            "repo_url": self.repo_url,
            "branch": self.branch,
            "status": self.status.value if isinstance(self.status, AnalysisStatus) else self.status,
            "progress": self.progress,
            "current_step": self.current_step,
            "steps_completed": self.steps_completed,
            "error": self.error,
            "created_at": self.created_at,
            "languages": self.languages,
            "local_path": self.local_path,
            # Store condensed file metadata (no content — too large)
            "file_metadata": [
                {k: v for k, v in f.items() if k != "content"}
                for f in self.parsed_files[:2000]
            ],
            "architecture": self.architecture,
            "entry_points": self.entry_points,
            "glossary": self.glossary,
            "onboarding": self.onboarding,
        }
        path = self._get_path()
        path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

    @classmethod
    def _load(cls, path: Path) -> Optional["RepoState"]:
        """Load state from a JSON file."""
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            state = cls(
                repo_id=data["repo_id"],
                repo_url=data["repo_url"],
                branch=data["branch"],
            )
            state.status = AnalysisStatus(data.get("status", "pending"))
            state.progress = data.get("progress", 0)
            state.current_step = data.get("current_step", "")
            state.steps_completed = data.get("steps_completed", [])
            state.error = data.get("error")
            state.created_at = data.get("created_at", state.created_at)
            state.languages = data.get("languages", {})
            state.local_path = data.get("local_path", "")
            state.architecture = data.get("architecture")
            state.entry_points = data.get("entry_points")
            state.glossary = data.get("glossary")
            state.onboarding = data.get("onboarding")
            # Restore file metadata (without content) for agents that need it
            state.parsed_files = data.get("file_metadata", [])
            return state
        except Exception as e:
            logger.warning("state_load_failed", path=str(path), error=str(e))
            return None

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
    """Manages persistent state for all repository analyses."""

    def __init__(self):
        self._repos: dict[str, RepoState] = {}
        self._load_all()

    def _load_all(self):
        """Load all persisted states from disk on startup."""
        state_dir = settings.state_persist_path
        count = 0
        for path in state_dir.glob("*.json"):
            state = RepoState._load(path)
            if state:
                self._repos[state.repo_id] = state
                count += 1
        if count > 0:
            logger.info("states_loaded_from_disk", count=count)

    def create(self, repo_id: str, repo_url: str, branch: str) -> RepoState:
        state = RepoState(repo_id=repo_id, repo_url=repo_url, branch=branch)
        state._save()
        self._repos[repo_id] = state
        logger.info("repo_state_created", repo_id=repo_id)
        return state

    def get(self, repo_id: str) -> Optional[RepoState]:
        return self._repos.get(repo_id)

    def exists(self, repo_id: str) -> bool:
        return repo_id in self._repos

    def delete(self, repo_id: str) -> bool:
        if repo_id in self._repos:
            # Delete state file
            path = settings.state_persist_path / f"{repo_id}.json"
            path.unlink(missing_ok=True)
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
                "created_at": s.created_at,
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