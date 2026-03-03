"""
StackSage Backend Tests - Unit tests for core functionality.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.config import Settings
from app.models.schemas import (
    AnalysisStatus,
    FileType,
    RepoIngestRequest,
    QuestionRequest,
    ChangeImpactRequest,
)
from app.utils.code_chunker import chunk_file, detect_language, CodeChunk
from app.services.state_manager import RepoState, RepoStateManager


# ============================================================
# Config Tests
# ============================================================

class TestConfig:
    def test_default_settings(self):
        s = Settings()
        assert s.app_name == "StackSage"
        assert s.llm_provider in ("groq", "openrouter")
        assert s.max_file_size_kb == 500

    def test_active_api_key_groq(self):
        s = Settings(groq_api_key="test-key", llm_provider="groq")
        assert s.active_api_key == "test-key"

    def test_active_api_key_openrouter(self):
        s = Settings(openrouter_api_key="or-key", llm_provider="openrouter")
        assert s.active_api_key == "or-key"


# ============================================================
# Code Chunker Tests
# ============================================================

class TestCodeChunker:
    def test_detect_language(self):
        assert detect_language("app/main.py") == "python"
        assert detect_language("src/index.ts") == "typescript"
        assert detect_language("Dockerfile") == "unknown"
        assert detect_language("config.yaml") == "yaml"

    def test_small_file_single_chunk(self):
        content = "def hello():\n    return 'world'\n"
        chunks = chunk_file("test.py", content)
        assert len(chunks) == 1
        assert chunks[0].chunk_type == "module"

    def test_empty_file_no_chunks(self):
        chunks = chunk_file("empty.py", "")
        assert len(chunks) == 0

    def test_python_function_boundaries(self):
        content = "\n".join([
            "import os",
            "",
            "def function_one():",
            *[f"    line_{i} = {i}" for i in range(30)],
            "",
            "def function_two():",
            *[f"    line_{i} = {i}" for i in range(30)],
            "",
            "def function_three():",
            *[f"    line_{i} = {i}" for i in range(30)],
        ])
        chunks = chunk_file("test.py", content, max_chunk_lines=40)
        # Should produce multiple chunks (header + functions)
        assert len(chunks) >= 2
        # Check that at least one function chunk was detected
        func_chunks = [c for c in chunks if c.chunk_type == "function"]
        assert len(func_chunks) >= 1

    def test_sliding_window_fallback(self):
        # A file with no recognizable boundaries (plain text)
        content = "\n".join([f"line {i}" for i in range(200)])
        chunks = chunk_file("data.txt", content, max_chunk_lines=50, overlap_lines=5)
        assert len(chunks) >= 3
        # Check overlap exists
        assert chunks[1].start_line < chunks[0].end_line + 10


# ============================================================
# State Manager Tests
# ============================================================

class TestStateManager:
    def test_create_and_get(self):
        sm = RepoStateManager()
        state = sm.create("test-123", "https://github.com/test/repo", "main")
        assert state.repo_id == "test-123"
        assert sm.get("test-123") is state

    def test_get_nonexistent(self):
        sm = RepoStateManager()
        assert sm.get("nonexistent") is None

    def test_update_state(self):
        sm = RepoStateManager()
        state = sm.create("test-456", "https://github.com/test/repo", "main")
        state.update(AnalysisStatus.PARSING, 30, "Parsing files")
        assert state.status == AnalysisStatus.PARSING
        assert state.progress == 30
        assert "Parsing files" in state.steps_completed

    def test_fail_state(self):
        sm = RepoStateManager()
        state = sm.create("test-789", "https://github.com/test/repo", "main")
        state.fail("Something broke")
        assert state.status == AnalysisStatus.FAILED
        assert state.error == "Something broke"

    def test_delete(self):
        sm = RepoStateManager()
        sm.create("to-delete", "https://github.com/test/repo", "main")
        assert sm.delete("to-delete") is True
        assert sm.get("to-delete") is None
        assert sm.delete("to-delete") is False

    def test_list_repos(self):
        sm = RepoStateManager()
        sm.create("repo-1", "https://github.com/test/repo1", "main")
        sm.create("repo-2", "https://github.com/test/repo2", "dev")
        repos = sm.list_repos()
        assert len(repos) == 2
        assert repos[0]["repo_id"] in ("repo-1", "repo-2")


# ============================================================
# Schema Validation Tests
# ============================================================

class TestSchemas:
    def test_ingest_request_valid(self):
        req = RepoIngestRequest(repo_url="https://github.com/user/repo")
        assert req.branch == "main"

    def test_question_request_validation(self):
        req = QuestionRequest(
            repo_id="test-123",
            question="How does auth work?",
        )
        assert req.include_code_snippets is True

    def test_question_request_min_length(self):
        with pytest.raises(Exception):
            QuestionRequest(repo_id="test", question="ab")

    def test_change_impact_request(self):
        req = ChangeImpactRequest(
            repo_id="test-123",
            file_path="src/auth.py",
            description="Refactor token validation",
        )
        assert req.file_path == "src/auth.py"


# ============================================================
# API Route Tests (using TestClient)
# ============================================================

class TestAPIRoutes:
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app)

    def test_health(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    def test_root(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "StackSage API"

    def test_list_repos_empty(self, client):
        response = client.get("/api/v1/repos")
        assert response.status_code == 200
        assert "repositories" in response.json()

    def test_get_nonexistent_repo(self, client):
        response = client.get("/api/v1/repos/nonexistent/status")
        assert response.status_code == 404

    def test_get_nonexistent_architecture(self, client):
        response = client.get("/api/v1/repos/nonexistent/architecture")
        assert response.status_code == 404