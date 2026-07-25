"""
StackSage API Routes - All REST endpoints including file explorer and onboarding.
"""

import os
import shutil
import hashlib
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.agents.question_agent import QuestionAgent
from app.agents.change_impact_agent import ChangeImpactAgent
from app.core.config import get_settings
from app.models.schemas import (
    AnalysisStatus,
    ArchitectureResponse,
    ChangeImpactRequest,
    ChangeImpactResponse,
    EntryPointsResponse,
    GlossaryResponse,
    HealthResponse,
    QuestionRequest,
    QuestionResponse,
    RepoIngestRequest,
    RepoIngestResponse,
)
from app.services.orchestrator import run_analysis_pipeline
from app.services.state_manager import get_state_manager
from app.services.vector_store import get_vector_store

router = APIRouter()
settings = get_settings()
_start_time = time.time()


# ============================================================
# Health
# ============================================================

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    return HealthResponse(status="healthy", version=settings.app_version, uptime_seconds=round(time.time() - _start_time, 2))


# ============================================================
# Repository CRUD
# ============================================================

@router.post("/repos/ingest", response_model=RepoIngestResponse, tags=["Repository"])
async def ingest_repository(request: RepoIngestRequest, background_tasks: BackgroundTasks):
    state_manager = get_state_manager()

    slug = request.repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    short_hash = hashlib.sha256(f"{request.repo_url}:{request.branch}".encode()).hexdigest()[:8]
    repo_id = f"{slug}-{short_hash}"

    existing = state_manager.get(repo_id)
    if existing:
        if existing.status not in (AnalysisStatus.FAILED, AnalysisStatus.COMPLETE):
            return RepoIngestResponse(repo_id=repo_id, status=existing.status, message=f"Already being analyzed ({existing.status})")
        if existing.status == AnalysisStatus.FAILED:
            state_manager.delete(repo_id)
        if existing.status == AnalysisStatus.COMPLETE:
            return RepoIngestResponse(
                repo_id=repo_id, status=existing.status,
                message="Already analyzed. Delete first to re-analyze.",
                file_count=len(existing.parsed_files), languages=existing.languages,
            )

    state = state_manager.create(repo_id=repo_id, repo_url=request.repo_url, branch=request.branch)
    background_tasks.add_task(run_analysis_pipeline, repo_id)

    return RepoIngestResponse(repo_id=repo_id, status=AnalysisStatus.PENDING, message="Analysis started. Poll /repos/{repo_id}/status for updates.")


@router.get("/repos/{repo_id}/status", tags=["Repository"])
async def get_repo_status(repo_id: str):
    state = get_state_manager().get(repo_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")
    return state.to_status_response()


@router.get("/repos", tags=["Repository"])
async def list_repos():
    return {"repositories": get_state_manager().list_repos()}


@router.delete("/repos/{repo_id}", tags=["Repository"])
async def delete_repo(repo_id: str):
    state_manager = get_state_manager()
    state = state_manager.get(repo_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")

    if state.local_path:
        shutil.rmtree(state.local_path, ignore_errors=True)
    get_vector_store().delete_collection(repo_id)
    state_manager.delete(repo_id)
    return {"message": f"Repository '{repo_id}' deleted"}


# ============================================================
# Architecture
# ============================================================

@router.get("/repos/{repo_id}/architecture", tags=["Analysis"])
async def get_architecture(repo_id: str):
    state = _get_completed_state(repo_id)
    if not state.architecture:
        raise HTTPException(status_code=404, detail="Architecture analysis not available")
    return state.architecture


# ============================================================
# Entry Points
# ============================================================

@router.get("/repos/{repo_id}/entry-points", response_model=EntryPointsResponse, tags=["Analysis"])
async def get_entry_points(repo_id: str):
    state = _get_completed_state(repo_id)
    if not state.entry_points:
        raise HTTPException(status_code=404, detail="Entry points not available")
    return EntryPointsResponse(**state.entry_points)


# ============================================================
# Question (RAG) - with @file support
# ============================================================

@router.post("/repos/{repo_id}/ask", response_model=QuestionResponse, tags=["Q&A"])
async def ask_question(repo_id: str, request: QuestionRequest):
    state = _get_completed_state(repo_id)

    # If a file path is mentioned, try to load its content for context
    file_context = ""
    if hasattr(request, "file_path") and request.file_path:
        file_context = _read_repo_file(state, request.file_path)

    agent = QuestionAgent()
    return await agent.run(
        state,
        question=request.question,
        include_code_snippets=request.include_code_snippets,
        file_context=file_context,
    )


# ============================================================
# Glossary
# ============================================================

@router.get("/repos/{repo_id}/glossary", response_model=GlossaryResponse, tags=["Analysis"])
async def get_glossary(repo_id: str):
    state = _get_completed_state(repo_id)
    if not state.glossary:
        raise HTTPException(status_code=404, detail="Glossary not available")
    return GlossaryResponse(**state.glossary)


# ============================================================
# Change Impact
# ============================================================

@router.post("/repos/{repo_id}/change-impact", response_model=ChangeImpactResponse, tags=["Analysis"])
async def analyze_change_impact(repo_id: str, request: ChangeImpactRequest):
    state = _get_completed_state(repo_id)
    agent = ChangeImpactAgent()
    return await agent.run(state, file_path=request.file_path, description=request.description)


# ============================================================
# Onboarding Guide (NEW)
# ============================================================

@router.get("/repos/{repo_id}/onboarding", tags=["Analysis"])
async def get_onboarding(repo_id: str):
    state = _get_completed_state(repo_id)
    if not state.onboarding:
        raise HTTPException(status_code=404, detail="Onboarding guide not available")
    return state.onboarding


# ============================================================
# File Explorer (NEW)
# ============================================================

@router.get("/repos/{repo_id}/files", tags=["File Explorer"])
async def get_file_tree(repo_id: str):
    """Get the full file tree of the analyzed repository."""
    state = _get_completed_state(repo_id)
    files = state.parsed_files

    tree = _build_tree(files)
    return {
        "repo_id": repo_id,
        "file_count": len(files),
        "tree": tree,
    }


@router.get("/repos/{repo_id}/files/content", tags=["File Explorer"])
async def get_file_content(repo_id: str, path: str = Query(..., description="File path within the repo")):
    """Read the content of a specific file from the cloned repository."""
    state = _get_completed_state(repo_id)
    content = _read_repo_file(state, path)
    if content is None:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")

    # Detect language
    from app.utils.code_chunker import detect_language
    language = detect_language(path)

    return {
        "path": path,
        "content": content,
        "language": language,
        "line_count": content.count("\n") + 1,
    }


@router.get("/repos/{repo_id}/files/search", tags=["File Explorer"])
async def search_files(repo_id: str, q: str = Query(..., min_length=1, description="Search query")):
    """Search file paths in the repository (for @-mention autocomplete)."""
    state = _get_completed_state(repo_id)
    query = q.lower()

    matches = []
    for f in state.parsed_files:
        path = f.get("path", "")
        if query in path.lower():
            matches.append({
                "path": path,
                "language": f.get("language", "unknown"),
                "line_count": f.get("line_count", 0),
            })
        if len(matches) >= 20:
            break

    return {"query": q, "results": matches}


# ============================================================
# Embedding Stats
# ============================================================

@router.get("/repos/{repo_id}/embeddings/stats", tags=["System"])
async def get_embedding_stats(repo_id: str):
    if not get_state_manager().exists(repo_id):
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")
    return get_vector_store().get_stats(repo_id)


# ============================================================
# Helpers
# ============================================================

def _get_completed_state(repo_id: str):
    state = get_state_manager().get(repo_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")
    if state.status == AnalysisStatus.FAILED:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {state.error}")
    if state.status != AnalysisStatus.COMPLETE:
        raise HTTPException(status_code=202, detail=f"Analysis in progress ({state.progress}%)")
    return state


def _read_repo_file(state, file_path: str) -> Optional[str]:
    """Read a file from the cloned repository on disk."""
    if not state.local_path:
        return None
    full_path = Path(state.local_path) / file_path
    if not full_path.exists() or not full_path.is_file():
        return None
    try:
        return full_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None


def _build_tree(files: list[dict]) -> list[dict]:
    """Build a nested tree structure from flat file paths."""
    root: dict = {}

    for f in files:
        parts = f.get("path", "").split("/")
        current = root
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        # Leaf node (file)
        current[parts[-1]] = {
            "__file__": True,
            "path": f.get("path", ""),
            "language": f.get("language", ""),
            "line_count": f.get("line_count", 0),
            "size_bytes": f.get("size_bytes", 0),
        }

    def _to_list(node: dict, prefix: str = "") -> list[dict]:
        items = []
        for name, value in sorted(node.items()):
            if isinstance(value, dict) and "__file__" in value:
                items.append({
                    "name": name,
                    "type": "file",
                    "path": value["path"],
                    "language": value.get("language", ""),
                    "line_count": value.get("line_count", 0),
                })
            elif isinstance(value, dict):
                path = f"{prefix}/{name}" if prefix else name
                children = _to_list(value, path)
                items.append({
                    "name": name,
                    "type": "directory",
                    "path": path,
                    "children": children,
                    "file_count": sum(1 for c in children if c["type"] == "file") + sum(c.get("file_count", 0) for c in children if c["type"] == "directory"),
                })
        return items

    return _to_list(root)