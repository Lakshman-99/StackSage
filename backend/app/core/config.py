"""
StackSage Configuration - Central settings management.
"""

from pathlib import Path
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Project ---
    app_name: str = "StackSage"
    app_version: str = "1.0.0"
    debug: bool = False

    # --- LLM Provider ---
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    gemini_api_key: str = ""
    llm_provider: Literal["groq", "openrouter", "gemini"] = "groq"
    llm_model: str = "llama-3.3-70b-versatile"

    # --- Vector Store ---
    chroma_persist_dir: str = "./data/chromadb"
    embedding_model: str = "all-MiniLM-L6-v2"

    # --- Persistent State ---
    state_persist_dir: str = "./data/state"

    # --- Repository ---
    repo_storage_dir: str = "./data/repos"
    max_file_size_kb: int = 500
    max_repo_files: int = 5000
    supported_extensions: list[str] = [
        ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs",
        ".rb", ".php", ".c", ".cpp", ".h", ".hpp", ".cs", ".swift",
        ".kt", ".scala", ".vue", ".svelte", ".html", ".css", ".scss",
        ".sql", ".sh", ".bash", ".yaml", ".yml", ".toml", ".json",
        ".md", ".txt", ".dockerfile", ".tf", ".proto",
    ]
    skip_dirs: list[str] = [
        "node_modules", ".git", "__pycache__", ".venv", "venv",
        "dist", "build", ".next", ".nuxt", "target", "vendor",
        ".idea", ".vscode", "coverage", ".tox", "egg-info",
    ]

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # --- Rate Limiting ---
    rate_limit_rpm: int = 30
    agent_delay_seconds: float = 4.0  # Delay between agent LLM calls to avoid rate limits

    @property
    def repo_storage_path(self) -> Path:
        path = Path(self.repo_storage_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def chroma_persist_path(self) -> Path:
        path = Path(self.chroma_persist_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def state_persist_path(self) -> Path:
        path = Path(self.state_persist_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def active_api_key(self) -> str:
        if self.llm_provider == "groq":
            return self.groq_api_key
        if self.llm_provider == "gemini":
            return self.gemini_api_key
        return self.openrouter_api_key


@lru_cache()
def get_settings() -> Settings:
    return Settings()