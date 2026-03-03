"""
StackSage Code Chunker - Splits source files into meaningful, embeddable chunks.
Respects function/class boundaries for better semantic retrieval.
"""

import re
from dataclasses import dataclass, field
from typing import Optional

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class CodeChunk:
    """A chunk of code ready for embedding."""
    chunk_id: str
    file_path: str
    language: str
    content: str
    start_line: int
    end_line: int
    chunk_type: str = "code"  # code | function | class | module_header
    symbol_name: str = ""
    metadata: dict = field(default_factory=dict)


# Regex patterns for detecting function/class boundaries by language
BOUNDARY_PATTERNS = {
    "python": {
        "class": re.compile(r"^class\s+(\w+)"),
        "function": re.compile(r"^(?:async\s+)?def\s+(\w+)"),
    },
    "javascript": {
        "class": re.compile(r"^(?:export\s+)?class\s+(\w+)"),
        "function": re.compile(
            r"^(?:export\s+)?(?:async\s+)?function\s+(\w+)|"
            r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\("
        ),
    },
    "typescript": {
        "class": re.compile(r"^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)"),
        "function": re.compile(
            r"^(?:export\s+)?(?:async\s+)?function\s+(\w+)|"
            r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*(?:async\s+)?\("
        ),
    },
    "java": {
        "class": re.compile(r"^(?:public|private|protected)?\s*(?:abstract\s+)?class\s+(\w+)"),
        "function": re.compile(r"^(?:\s*)(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\("),
    },
    "go": {
        "function": re.compile(r"^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\("),
    },
}


def detect_language(file_path: str) -> str:
    """Detect programming language from file extension."""
    ext_map = {
        ".py": "python", ".js": "javascript", ".jsx": "javascript",
        ".ts": "typescript", ".tsx": "typescript",
        ".java": "java", ".go": "go", ".rs": "rust",
        ".rb": "ruby", ".php": "php", ".c": "c", ".cpp": "cpp",
        ".cs": "csharp", ".swift": "swift", ".kt": "kotlin",
        ".scala": "scala", ".vue": "vue", ".svelte": "svelte",
        ".html": "html", ".css": "css", ".scss": "scss",
        ".sql": "sql", ".sh": "shell", ".yaml": "yaml",
        ".yml": "yaml", ".toml": "toml", ".json": "json",
        ".md": "markdown", ".dockerfile": "dockerfile",
        ".tf": "terraform", ".proto": "protobuf",
    }
    for ext, lang in ext_map.items():
        if file_path.lower().endswith(ext):
            return lang
    return "unknown"


def chunk_file(
    file_path: str,
    content: str,
    max_chunk_lines: int = 60,
    overlap_lines: int = 5,
) -> list[CodeChunk]:
    """
    Split a source file into chunks, respecting function/class boundaries.
    Falls back to line-based sliding window for unsupported languages.
    """
    language = detect_language(file_path)
    lines = content.split("\n")

    if not content.strip():
        return []

    # For small files, return as a single chunk
    if len(lines) <= max_chunk_lines:
        return [
            CodeChunk(
                chunk_id=f"{file_path}::0-{len(lines)}",
                file_path=file_path,
                language=language,
                content=content,
                start_line=1,
                end_line=len(lines),
                chunk_type="module",
                metadata={"total_lines": len(lines)},
            )
        ]

    # Try boundary-aware chunking
    patterns = BOUNDARY_PATTERNS.get(language, {})
    if patterns:
        chunks = _chunk_by_boundaries(file_path, language, lines, patterns, max_chunk_lines)
        if chunks:
            return chunks

    # Fallback: sliding window
    return _chunk_by_window(file_path, language, lines, max_chunk_lines, overlap_lines)


def _chunk_by_boundaries(
    file_path: str,
    language: str,
    lines: list[str],
    patterns: dict,
    max_chunk_lines: int,
) -> list[CodeChunk]:
    """Split file at class/function boundaries."""
    boundaries: list[tuple[int, str, str]] = []  # (line_idx, type, name)

    for i, line in enumerate(lines):
        stripped = line.strip()
        for kind, pattern in patterns.items():
            match = pattern.match(stripped)
            if match:
                name = next((g for g in match.groups() if g), "unknown")
                boundaries.append((i, kind, name))
                break

    if not boundaries:
        return []

    chunks: list[CodeChunk] = []

    # Module header (imports, top-level code before first boundary)
    if boundaries[0][0] > 0:
        header_end = boundaries[0][0]
        header_content = "\n".join(lines[:header_end])
        if header_content.strip():
            chunks.append(
                CodeChunk(
                    chunk_id=f"{file_path}::header::0-{header_end}",
                    file_path=file_path,
                    language=language,
                    content=header_content,
                    start_line=1,
                    end_line=header_end,
                    chunk_type="module_header",
                )
            )

    # Chunk each boundary section
    for idx, (line_idx, kind, name) in enumerate(boundaries):
        end_idx = boundaries[idx + 1][0] if idx + 1 < len(boundaries) else len(lines)
        section_lines = lines[line_idx:end_idx]
        section_content = "\n".join(section_lines)

        # If section is too large, sub-chunk it
        if len(section_lines) > max_chunk_lines:
            sub_chunks = _chunk_by_window(
                file_path, language, section_lines, max_chunk_lines, 5, offset=line_idx
            )
            for sc in sub_chunks:
                sc.symbol_name = name
            chunks.extend(sub_chunks)
        else:
            chunks.append(
                CodeChunk(
                    chunk_id=f"{file_path}::{kind}::{name}::{line_idx}-{end_idx}",
                    file_path=file_path,
                    language=language,
                    content=section_content,
                    start_line=line_idx + 1,
                    end_line=end_idx,
                    chunk_type=kind,
                    symbol_name=name,
                )
            )

    return chunks


def _chunk_by_window(
    file_path: str,
    language: str,
    lines: list[str],
    max_chunk_lines: int,
    overlap_lines: int,
    offset: int = 0,
) -> list[CodeChunk]:
    """Sliding window chunking with overlap."""
    chunks: list[CodeChunk] = []
    i = 0

    while i < len(lines):
        end = min(i + max_chunk_lines, len(lines))
        chunk_content = "\n".join(lines[i:end])

        chunks.append(
            CodeChunk(
                chunk_id=f"{file_path}::window::{offset + i}-{offset + end}",
                file_path=file_path,
                language=language,
                content=chunk_content,
                start_line=offset + i + 1,
                end_line=offset + end,
                chunk_type="code",
            )
        )

        if end >= len(lines):
            break
        i = end - overlap_lines

    return chunks