"""
StackSage Models - Pydantic schemas for requests, responses, and domain objects.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


# ============================================================
# Enums
# ============================================================

class AnalysisStatus(str, Enum):
    PENDING = "pending"
    CLONING = "cloning"
    PARSING = "parsing"
    ANALYZING = "analyzing"
    EMBEDDING = "embedding"
    COMPLETE = "complete"
    FAILED = "failed"


class FileType(str, Enum):
    SOURCE = "source"
    CONFIG = "config"
    TEST = "test"
    DOCUMENTATION = "documentation"
    BUILD = "build"
    OTHER = "other"


class AgentType(str, Enum):
    INGESTION = "ingestion"
    ARCHITECTURE = "architecture"
    ENTRY_POINT = "entry_point"
    QUESTION = "question"
    GLOSSARY = "glossary"
    CHANGE_IMPACT = "change_impact"


# ============================================================
# Request Models
# ============================================================

class RepoIngestRequest(BaseModel):
    """Request to ingest a repository for analysis."""
    repo_url: str = Field(..., description="Git repository URL (HTTPS)")
    branch: str = Field(default="main", description="Branch to analyze")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "repo_url": "https://github.com/tiangolo/fastapi",
            "branch": "main",
        }
    })


class QuestionRequest(BaseModel):
    """Ask a natural language question about an analyzed repository."""
    repo_id: str = Field(..., description="Repository identifier")
    question: str = Field(..., min_length=3, max_length=2000, description="Question about the codebase")
    include_code_snippets: bool = Field(default=True, description="Include relevant code in response")
    file_path: str = Field(default="", description="Optional file path to focus the answer on")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "repo_id": "fastapi-abc123",
            "question": "How does the dependency injection system work?",
            "include_code_snippets": True,
        }
    })


class ChangeImpactRequest(BaseModel):
    """Request change impact analysis for a specific file."""
    repo_id: str = Field(..., description="Repository identifier")
    file_path: str = Field(..., description="Path to the file being changed")
    description: str = Field(
        default="",
        max_length=1000,
        description="Optional description of the planned change",
    )

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "repo_id": "fastapi-abc123",
            "file_path": "fastapi/routing.py",
            "description": "Refactor route registration to support middleware hooks",
        }
    })


# ============================================================
# Domain Models
# ============================================================

class ParsedFile(BaseModel):
    """A single parsed source file."""
    path: str
    language: str
    file_type: FileType = FileType.SOURCE
    size_bytes: int
    line_count: int
    content: str = ""
    classes: list[str] = Field(default_factory=list)
    functions: list[str] = Field(default_factory=list)
    imports: list[str] = Field(default_factory=list)


class DependencyEdge(BaseModel):
    """An import/dependency relationship between two files."""
    source: str
    target: str
    import_name: str = ""


class ArchitectureLayer(BaseModel):
    """A logical layer/module in the codebase architecture."""
    name: str
    description: str
    files: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    talks_to: list[str] = Field(default_factory=list)


class EntryPointFile(BaseModel):
    """A critical entry point file identified by PageRank analysis."""
    path: str
    score: float = Field(..., description="PageRank importance score (0-1)")
    reason: str = Field(..., description="Why this file is important")
    in_degree: int = Field(default=0, description="Number of files importing this")
    out_degree: int = Field(default=0, description="Number of files this imports")


class GlossaryTerm(BaseModel):
    """A domain-specific term extracted from the codebase."""
    term: str
    definition: str
    category: str = ""
    source_files: list[str] = Field(default_factory=list)
    usage_count: int = 0


class ImpactedFile(BaseModel):
    """A file that would be impacted by a change."""
    path: str
    impact_level: str = Field(..., description="high | medium | low")
    reason: str
    suggestion: str = ""


# ============================================================
# Response Models
# ============================================================

class RepoIngestResponse(BaseModel):
    """Response after initiating repository ingestion."""
    repo_id: str
    status: AnalysisStatus
    message: str
    file_count: int = 0
    languages: dict[str, int] = Field(default_factory=dict)


class AnalysisStatusResponse(BaseModel):
    """Current status of a repository analysis pipeline."""
    repo_id: str
    status: AnalysisStatus
    progress: float = Field(default=0.0, ge=0, le=100, description="Progress percentage")
    current_step: str = ""
    steps_completed: list[str] = Field(default_factory=list)
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ArchitectureResponse(BaseModel):
    """Full architecture analysis of a repository."""
    repo_id: str
    summary: str
    tech_stack: list[str] = Field(default_factory=list)
    layers: list[ArchitectureLayer] = Field(default_factory=list)
    dependency_graph: list[DependencyEdge] = Field(default_factory=list)
    design_patterns: list[str] = Field(default_factory=list)
    file_count: int = 0
    total_lines: int = 0


class EntryPointsResponse(BaseModel):
    """Critical entry points identified via PageRank."""
    repo_id: str
    entry_points: list[EntryPointFile] = Field(default_factory=list)
    graph_stats: dict[str, Any] = Field(default_factory=dict)


class QuestionResponse(BaseModel):
    """Answer to a natural language question about the codebase."""
    repo_id: str
    question: str
    answer: str
    relevant_files: list[str] = Field(default_factory=list)
    code_snippets: list[dict[str, str]] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0, le=1)


class GlossaryResponse(BaseModel):
    """Domain-specific glossary extracted from the codebase."""
    repo_id: str
    terms: list[GlossaryTerm] = Field(default_factory=list)
    total_terms: int = 0


class ChangeImpactResponse(BaseModel):
    """Change impact analysis results."""
    repo_id: str
    target_file: str
    risk_level: str = Field(..., description="high | medium | low")
    summary: str
    impacted_files: list[ImpactedFile] = Field(default_factory=list)
    test_files_affected: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str
    uptime_seconds: float = 0