"""
StackSage Ingestion Agent - Clones repositories, parses files, creates embeddings.
Handles: invalid URLs, private repos, empty repos, clone failures, large repos.
"""

import hashlib
import os
import re
import shutil
import stat
from pathlib import Path
from typing import Any

from app.agents.base import BaseAgent
from app.core.config import get_settings
from app.models.schemas import AnalysisStatus, FileType, ParsedFile
from app.services.state_manager import RepoState
from app.services.vector_store import get_vector_store
from app.utils.code_chunker import chunk_file, detect_language

settings = get_settings()


class IngestionError(Exception):
    """Raised when ingestion fails in a user-facing way."""
    pass


class IngestionAgent(BaseAgent):
    agent_name = "ingestion"

    def _generate_repo_id(self, repo_url: str, branch: str) -> str:
        slug = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
        short_hash = hashlib.sha256(f"{repo_url}:{branch}".encode()).hexdigest()[:8]
        return f"{slug}-{short_hash}"

    def _validate_url(self, url: str) -> None:
        """Basic validation of repo URL."""
        if not url or not url.strip():
            raise IngestionError("Repository URL is empty")
        if not url.startswith(("https://", "http://")):
            raise IngestionError(f"Invalid URL scheme. Use HTTPS: {url}")
        if " " in url:
            raise IngestionError(f"URL contains spaces: {url}")

    def _classify_file(self, file_path: str) -> FileType:
        path_lower = file_path.lower()
        if any(t in path_lower for t in ["test", "spec", "__tests__", "fixtures"]):
            return FileType.TEST
        if any(c in os.path.basename(path_lower) for c in [
            "config", "setting", ".env", "dockerfile", "docker-compose",
            "makefile", "cmakelists", ".toml", ".ini", ".cfg",
        ]):
            return FileType.CONFIG
        if any(d in path_lower for d in ["readme", "doc", "changelog", "contributing", "license"]):
            return FileType.DOCUMENTATION
        if any(b in path_lower for b in ["webpack", "rollup", "vite", "babel", "tsconfig", "package.json"]):
            return FileType.BUILD
        return FileType.SOURCE

    def _extract_imports(self, content: str, language: str) -> list[str]:
        imports = []
        patterns = {
            "python": [
                re.compile(r"^import\s+(\S+)", re.MULTILINE),
                re.compile(r"^from\s+(\S+)\s+import", re.MULTILINE),
            ],
            "javascript": [
                re.compile(r"import\s+.*?from\s+['\"](.+?)['\"]", re.MULTILINE),
                re.compile(r"require\(['\"](.+?)['\"]\)", re.MULTILINE),
            ],
            "typescript": [
                re.compile(r"import\s+.*?from\s+['\"](.+?)['\"]", re.MULTILINE),
            ],
            "java": [re.compile(r"^import\s+(\S+);", re.MULTILINE)],
            "go": [re.compile(r'"(\S+)"', re.MULTILINE)],
        }
        for pattern in patterns.get(language, []):
            imports.extend(pattern.findall(content))
        return imports

    def _extract_symbols(self, content: str, language: str) -> tuple[list[str], list[str]]:
        classes, functions = [], []
        class_patterns = {
            "python": re.compile(r"^class\s+(\w+)", re.MULTILINE),
            "javascript": re.compile(r"(?:export\s+)?class\s+(\w+)", re.MULTILINE),
            "typescript": re.compile(r"(?:export\s+)?(?:abstract\s+)?class\s+(\w+)", re.MULTILINE),
            "java": re.compile(r"(?:public|private|protected)?\s*class\s+(\w+)", re.MULTILINE),
        }
        func_patterns = {
            "python": re.compile(r"^(?:async\s+)?def\s+(\w+)", re.MULTILINE),
            "javascript": re.compile(r"(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(", re.MULTILINE),
            "typescript": re.compile(r"(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(", re.MULTILINE),
            "java": re.compile(r"(?:public|private|protected)\s+(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\(", re.MULTILINE),
            "go": re.compile(r"func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(", re.MULTILINE),
        }
        if language in class_patterns:
            classes = class_patterns[language].findall(content)
        if language in func_patterns:
            matches = func_patterns[language].findall(content)
            for m in matches:
                name = m if isinstance(m, str) else next((g for g in m if g), None)
                if name:
                    functions.append(name)
        return classes, functions

    @staticmethod
    def _force_rmtree(path: Path) -> None:
        """Remove a directory tree, clearing read-only bits git sets on objects
        (otherwise rmtree silently fails on Windows and leaves a stale, non-empty
        directory that blocks the next clone)."""
        def _on_error(func, target, exc_info):
            try:
                os.chmod(target, stat.S_IWRITE)
                func(target)
            except Exception:
                pass
        shutil.rmtree(path, onerror=_on_error)

    @staticmethod
    def _git_stderr(e: "git.exc.GitCommandError") -> str:
        """Extract just the stderr text from a GitCommandError, excluding the
        echoed cmdline (e.g. '--branch=main') which can spuriously match keyword
        checks below regardless of what actually went wrong."""
        stderr = getattr(e, "stderr", None)
        if stderr:
            return str(stderr).lower()
        lines = [l for l in str(e).splitlines() if not l.strip().startswith("cmdline:")]
        return "\n".join(lines).lower()

    async def _clone_repo(self, repo_url: str, branch: str) -> Path:
        """Clone with error handling for private repos, network issues, etc."""
        import git

        repo_id = self._generate_repo_id(repo_url, branch)
        clone_path = settings.repo_storage_path / repo_id

        if clone_path.exists():
            self.logger.info("repo_exists_locally", path=str(clone_path))
            repo = None
            try:
                repo = git.Repo(clone_path)
                repo.remotes.origin.fetch()
                repo.git.checkout(branch)
                repo.remotes.origin.pull()
                repo.close()
                return clone_path
            except Exception as e:
                self.logger.warning("repo_reuse_failed", path=str(clone_path), error=str(e))
                if repo is not None:
                    try:
                        repo.close()
                    except Exception:
                        pass
                self._force_rmtree(clone_path)

        self.logger.info("cloning_repo", url=repo_url, branch=branch)
        try:
            git.Repo.clone_from(
                repo_url,
                str(clone_path),
                branch=branch,
                depth=1,
                single_branch=True,
            )
        except git.exc.GitCommandError as e:
            stderr = self._git_stderr(e)
            if "already exists and is not an empty directory" in stderr:
                # Cleanup above didn't fully clear the directory (stale locked
                # files); force it again and retry the clone exactly once.
                self._force_rmtree(clone_path)
                try:
                    git.Repo.clone_from(repo_url, str(clone_path), branch=branch, depth=1, single_branch=True)
                    return clone_path
                except git.exc.GitCommandError as retry_e:
                    stderr = self._git_stderr(retry_e)
            if "not found" in stderr or "404" in stderr:
                raise IngestionError(f"Repository not found: {repo_url}. Is it public?")
            elif "authentication" in stderr or "403" in stderr or "401" in stderr or "could not read username" in stderr:
                raise IngestionError(f"Authentication required. Only public repos are supported: {repo_url}")
            elif "could not resolve host" in stderr:
                raise IngestionError(f"Could not resolve host. Check the URL: {repo_url}")
            elif "remote branch" in stderr or "couldn't find remote ref" in stderr:
                raise IngestionError(f"Branch '{branch}' not found in {repo_url}")
            else:
                raise IngestionError(f"Git clone failed: {stderr[:200] or str(e)[:200]}")
        except Exception as e:
            raise IngestionError(f"Failed to clone repository: {str(e)[:200]}")

        return clone_path

    def _scan_files(self, repo_path: Path) -> list[ParsedFile]:
        parsed_files: list[ParsedFile] = []
        file_count = 0

        for root, dirs, files in os.walk(repo_path):
            dirs[:] = [d for d in dirs if d not in settings.skip_dirs]
            for fname in files:
                fpath = Path(root) / fname
                # Always use forward slashes regardless of OS, so paths are
                # consistent for tree-building, dependency graphs, and the frontend.
                rel_path = fpath.relative_to(repo_path).as_posix()
                if fpath.suffix.lower() not in settings.supported_extensions:
                    continue
                try:
                    size = fpath.stat().st_size
                    if size > settings.max_file_size_kb * 1024 or size == 0:
                        continue
                except OSError:
                    continue

                file_count += 1
                if file_count > settings.max_repo_files:
                    self.logger.warning("max_files_exceeded", limit=settings.max_repo_files)
                    break

                try:
                    content = fpath.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                language = detect_language(rel_path)
                line_count = content.count("\n") + 1
                classes, functions = self._extract_symbols(content, language)
                imports = self._extract_imports(content, language)

                parsed_files.append(ParsedFile(
                    path=rel_path, language=language,
                    file_type=self._classify_file(rel_path),
                    size_bytes=size, line_count=line_count,
                    content=content, classes=classes,
                    functions=functions, imports=imports,
                ))

        return parsed_files

    def _compute_language_stats(self, files: list[ParsedFile]) -> dict[str, int]:
        stats: dict[str, int] = {}
        for f in files:
            stats[f.language] = stats.get(f.language, 0) + 1
        return dict(sorted(stats.items(), key=lambda x: x[1], reverse=True))

    async def _create_embeddings(self, repo_id: str, files: list[ParsedFile]) -> int:
        vector_store = get_vector_store()

        # Skip if embeddings already exist
        if vector_store.collection_exists(repo_id):
            self.logger.info("embeddings_already_exist", repo_id=repo_id)
            return 0

        all_ids, all_docs, all_meta = [], [], []

        for pf in files:
            if not pf.content.strip():
                continue
            chunks = chunk_file(pf.path, pf.content)
            for chunk in chunks:
                doc = f"File: {chunk.file_path}\n"
                if chunk.symbol_name:
                    doc += f"Symbol: {chunk.symbol_name}\n"
                doc += f"Language: {chunk.language}\nLines {chunk.start_line}-{chunk.end_line}\n\n"
                doc += chunk.content

                all_ids.append(chunk.chunk_id)
                all_docs.append(doc)
                all_meta.append({
                    "file_path": chunk.file_path,
                    "language": chunk.language,
                    "chunk_type": chunk.chunk_type,
                    "symbol_name": chunk.symbol_name,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                })

        if all_docs:
            return vector_store.add_documents(repo_id=repo_id, ids=all_ids, documents=all_docs, metadatas=all_meta)
        return 0

    async def run(self, state: RepoState, **kwargs) -> dict[str, Any]:
        """Full ingestion pipeline with validation and error handling."""

        # Validate URL
        self._validate_url(state.repo_url)

        # Step 1: Clone
        state.update(AnalysisStatus.CLONING, 10, "Cloning repository")
        clone_path = await self._clone_repo(state.repo_url, state.branch)
        state.local_path = str(clone_path)

        # Step 2: Parse
        state.update(AnalysisStatus.PARSING, 30, "Parsing source files")
        parsed_files = self._scan_files(clone_path)

        if len(parsed_files) == 0:
            raise IngestionError("No supported source files found in the repository")

        languages = self._compute_language_stats(parsed_files)
        state.parsed_files = [pf.model_dump() for pf in parsed_files]
        state.languages = languages

        self.logger.info("files_parsed", repo_id=state.repo_id, file_count=len(parsed_files), languages=languages)

        # Step 3: Embeddings
        state.update(AnalysisStatus.EMBEDDING, 50, "Creating vector embeddings")
        chunks_stored = await self._create_embeddings(state.repo_id, parsed_files)
        self.logger.info("embeddings_created", repo_id=state.repo_id, chunks=chunks_stored)

        return {
            "file_count": len(parsed_files),
            "languages": languages,
            "chunks_embedded": chunks_stored,
            "local_path": str(clone_path),
        }