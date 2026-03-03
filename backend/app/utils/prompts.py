"""
StackSage Prompt Templates - All LLM prompts used by the agents.
Centralized for easy tuning and consistency.
"""

# ============================================================
# Architecture Agent
# ============================================================

ARCHITECTURE_SYSTEM = """You are StackSage Architecture Agent, an expert software architect.
Analyze the provided codebase structure and produce a comprehensive architecture overview.
You must respond ONLY with valid JSON, no markdown, no preamble."""

ARCHITECTURE_USER = """Analyze this repository's architecture.

Repository: {repo_url}
Total Files: {file_count}
Languages: {languages}

File tree:
{file_tree}

Sample file contents (key files):
{sample_files}

Respond with this exact JSON structure:
{{
    "summary": "2-3 paragraph architecture overview",
    "tech_stack": ["technology1", "technology2"],
    "layers": [
        {{
            "name": "Layer Name",
            "description": "What this layer does",
            "files": ["path/to/file1.py"],
            "responsibilities": ["responsibility1"]
        }}
    ],
    "design_patterns": ["pattern1", "pattern2"]
}}"""

# ============================================================
# Entry Point Agent
# ============================================================

ENTRY_POINT_SYSTEM = """You are StackSage Entry Point Agent. Given PageRank scores and file metadata,
identify and explain the most critical entry points in a codebase.
Respond ONLY with valid JSON."""

ENTRY_POINT_USER = """Analyze these PageRank-ranked files and explain why each is important.

Repository: {repo_url}
Top files by PageRank:
{ranked_files}

Dependency info:
{dependency_info}

Respond with this JSON:
{{
    "entry_points": [
        {{
            "path": "file/path.py",
            "reason": "Why this file is a critical entry point",
            "score": 0.95
        }}
    ]
}}"""

# ============================================================
# Question Agent (RAG)
# ============================================================

QUESTION_SYSTEM = """You are StackSage Question Agent, an expert at explaining codebases.
Answer questions about the repository using ONLY the provided context chunks.
If you cannot answer from the context, say so clearly.
Be specific, reference file paths and function names."""

QUESTION_USER = """Question: {question}

Repository: {repo_id}

Relevant code chunks from the codebase:
{context_chunks}

Architecture context:
{architecture_summary}

Provide a clear, detailed answer. Reference specific files and code when relevant.
If including code snippets, format them with the file path."""

# ============================================================
# Glossary Agent
# ============================================================

GLOSSARY_SYSTEM = """You are StackSage Glossary Agent. Extract domain-specific terminology
from the provided codebase. Focus on project-specific terms, not standard programming terms.
Respond ONLY with valid JSON."""

GLOSSARY_USER = """Extract domain-specific terminology from this codebase.

Repository: {repo_url}
Languages: {languages}

File contents (sampling key files):
{sample_files}

README/Documentation:
{docs_content}

Respond with this JSON:
{{
    "terms": [
        {{
            "term": "DomainTerm",
            "definition": "Clear definition in context of this project",
            "category": "category name",
            "source_files": ["path/to/file.py"],
            "usage_count": 5
        }}
    ]
}}"""

# ============================================================
# Change Impact Agent
# ============================================================

CHANGE_IMPACT_SYSTEM = """You are StackSage Change Impact Agent. Analyze the potential impact
of modifying a specific file in a codebase. Consider direct dependencies, transitive effects,
and testing implications. Respond ONLY with valid JSON."""

CHANGE_IMPACT_USER = """Analyze the impact of changing this file:

Target file: {target_file}
Change description: {description}

File content:
{file_content}

Files that import/depend on this file:
{dependents}

Files this file imports:
{dependencies}

Architecture context:
{architecture_summary}

Respond with this JSON:
{{
    "risk_level": "high|medium|low",
    "summary": "Impact summary",
    "impacted_files": [
        {{
            "path": "file/path.py",
            "impact_level": "high|medium|low",
            "reason": "Why this file is impacted",
            "suggestion": "What to check or update"
        }}
    ],
    "test_files_affected": ["tests/test_file.py"],
    "recommendations": ["recommendation1", "recommendation2"]
}}"""