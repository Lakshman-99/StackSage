"""
StackSage API Routes - All REST endpoints for the StackSage backend.
"""

import asyncio
import hashlib
import time

from fastapi import APIRouter, BackgroundTasks, HTTPException

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
# Health Check
# ============================================================

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        uptime_seconds=round(time.time() - _start_time, 2),
    )


# ============================================================
# Repository Ingestion & Status
# ============================================================

@router.post("/repos/ingest", response_model=RepoIngestResponse, tags=["Repository"])
async def ingest_repository(request: RepoIngestRequest, background_tasks: BackgroundTasks):
    """
    Ingest a repository for analysis. Kicks off the full pipeline as a background task.
    Returns immediately with the repo_id for status polling.
    """
    state_manager = get_state_manager()

    # Generate repo ID
    slug = request.repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    hash_input = f"{request.repo_url}:{request.branch}"
    short_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:8]
    repo_id = f"{slug}-{short_hash}"

    # Check if already being processed
    existing = state_manager.get(repo_id)
    if existing and existing.status not in (AnalysisStatus.FAILED, AnalysisStatus.COMPLETE):
        return RepoIngestResponse(
            repo_id=repo_id,
            status=existing.status,
            message=f"Repository is already being analyzed (status: {existing.status})",
        )

    # Create new state
    state = state_manager.create(repo_id=repo_id, repo_url=request.repo_url, branch=request.branch)

    # Launch pipeline in background
    background_tasks.add_task(run_analysis_pipeline, repo_id)

    return RepoIngestResponse(
        repo_id=repo_id,
        status=AnalysisStatus.PENDING,
        message="Repository ingestion started. Poll /repos/{repo_id}/status for updates.",
    )


@router.get("/repos/{repo_id}/status", tags=["Repository"])
async def get_repo_status(repo_id: str):
    """Get the current analysis status and progress for a repository."""
    state_manager = get_state_manager()
    state = state_manager.get(repo_id)

    if not state:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")

    return state.to_status_response()


@router.get("/repos", tags=["Repository"])
async def list_repos():
    """List all analyzed repositories."""
    state_manager = get_state_manager()
    return {"repositories": state_manager.list_repos()}


@router.delete("/repos/{repo_id}", tags=["Repository"])
async def delete_repo(repo_id: str):
    """Delete a repository and its analysis data."""
    state_manager = get_state_manager()
    vector_store = get_vector_store()

    if not state_manager.exists(repo_id):
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")

    vector_store.delete_collection(repo_id)
    state_manager.delete(repo_id)

    return {"message": f"Repository '{repo_id}' deleted successfully"}


# ============================================================
# Architecture
# ============================================================

@router.get("/repos/{repo_id}/architecture", response_model=ArchitectureResponse, tags=["Analysis"])
async def get_architecture(repo_id: str):
    """Get the architecture analysis for a repository."""
    state = _get_completed_state(repo_id)

    if not state.architecture:
        raise HTTPException(status_code=404, detail="Architecture analysis not available yet")

    return ArchitectureResponse(**state.architecture)


# ============================================================
# Entry Points
# ============================================================

@router.get("/repos/{repo_id}/entry-points", response_model=EntryPointsResponse, tags=["Analysis"])
async def get_entry_points(repo_id: str):
    """Get the PageRank-based entry point analysis."""
    state = _get_completed_state(repo_id)

    if not state.entry_points:
        raise HTTPException(status_code=404, detail="Entry point analysis not available yet")

    return EntryPointsResponse(**state.entry_points)


# ============================================================
# Question (RAG)
# ============================================================

@router.post("/repos/{repo_id}/ask", response_model=QuestionResponse, tags=["Q&A"])
async def ask_question(repo_id: str, request: QuestionRequest):
    """Ask a natural language question about the codebase (RAG-powered)."""
    state = _get_completed_state(repo_id)

    agent = QuestionAgent()
    response = await agent.run(
        state,
        question=request.question,
        include_code_snippets=request.include_code_snippets,
    )
    return response


# ============================================================
# Glossary
# ============================================================

@router.get("/repos/{repo_id}/glossary", response_model=GlossaryResponse, tags=["Analysis"])
async def get_glossary(repo_id: str):
    """Get the domain-specific glossary."""
    state = _get_completed_state(repo_id)

    if not state.glossary:
        raise HTTPException(status_code=404, detail="Glossary not available yet")

    return GlossaryResponse(**state.glossary)


# ============================================================
# Change Impact
# ============================================================

@router.post("/repos/{repo_id}/change-impact", response_model=ChangeImpactResponse, tags=["Analysis"])
async def analyze_change_impact(repo_id: str, request: ChangeImpactRequest):
    """Analyze the impact of changing a specific file."""
    state = _get_completed_state(repo_id)

    agent = ChangeImpactAgent()
    response = await agent.run(
        state,
        file_path=request.file_path,
        description=request.description,
    )
    return response


# ============================================================
# Vector Store Stats
# ============================================================

@router.get("/repos/{repo_id}/embeddings/stats", tags=["System"])
async def get_embedding_stats(repo_id: str):
    """Get vector store statistics for a repository."""
    state_manager = get_state_manager()
    if not state_manager.exists(repo_id):
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")

    vector_store = get_vector_store()
    stats = vector_store.get_stats(repo_id)
    return stats


# ============================================================
# Helpers
# ============================================================

def _get_completed_state(repo_id: str):
    """Get state for a repo that must be fully analyzed."""
    state_manager = get_state_manager()
    state = state_manager.get(repo_id)

    if not state:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")

    if state.status == AnalysisStatus.FAILED:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {state.error}")

    if state.status != AnalysisStatus.COMPLETE:
        raise HTTPException(
            status_code=202,
            detail=f"Analysis still in progress ({state.status}). Progress: {state.progress}%",
        )

    return state