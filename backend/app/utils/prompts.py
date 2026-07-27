"""
StackSage Prompt Templates - Deep, actionable analysis prompts for codebase onboarding.
"""

# ============================================================
# Architecture Agent
# ============================================================

ARCHITECTURE_SYSTEM = """You are StackSage Architecture Agent — an expert software architect who helps
developers onboard to unfamiliar codebases. Your analysis must be DEEP, SPECIFIC, and ACTIONABLE.

You must detect:
- Whether this is a monorepo, polyrepo, or monolith
- Whether the architecture is microservices, MVC, layered, event-driven, serverless, etc.
- Whether it's polyglot (multiple languages) and WHY each language is used
- The actual data flow: how does a request travel through the system?
- What patterns are used and WHERE (not just listing pattern names)

Respond ONLY with valid JSON. No markdown, no preamble."""

ARCHITECTURE_USER = """Analyze this codebase's architecture for a developer who is brand new to this project.

Repository: {repo_url}
Total Files: {file_count} | Languages: {languages}

File tree structure:
{file_tree}

Real file-level dependency edges detected by static analysis (source imports target -
use these to ground the diagram and data_flow description, do not invent connections
that contradict them):
{dependency_edges}

Key file contents:
{sample_files}

Respond with this EXACT JSON structure:
{{
    "summary": "3-4 paragraph deep architecture overview. Explain the WHAT, WHY, and HOW. Mention if it's a monorepo/polyrepo. Describe the overall system purpose. Be specific about patterns used.",
    "repo_type": "monorepo | polyrepo | monolith",
    "architecture_style": "microservices | mvc | layered | event-driven | serverless | modular-monolith | other",
    "tech_stack_categorized": {{
        "frontend": ["React", "Next.js", "Tailwind CSS"],
        "backend": ["FastAPI", "Python"],
        "database": ["PostgreSQL", "Redis"],
        "infrastructure": ["Docker", "Kubernetes", "Terraform"],
        "ci_cd": ["GitHub Actions"],
        "messaging": ["RabbitMQ"],
        "monitoring": ["Prometheus"],
        "other": ["tool1"]
    }},
    "layers": [
        {{
            "name": "Descriptive Layer Name (e.g. 'API Gateway' not just 'Layer 1')",
            "description": "What this layer does and WHY it exists. 2-3 sentences.",
            "files": ["path/to/key/file.py"],
            "responsibilities": ["specific responsibility 1"],
            "talks_to": ["Other Layer Name this one actually calls or is called by"]
        }}
    ],
    "design_patterns": [
        {{
            "name": "Pattern Name",
            "where": "Where in the codebase this is used",
            "why": "Why this pattern was chosen"
        }}
    ],
    "data_flow": "Describe how a typical request flows through the system from entry to response. Be specific about which files/modules are involved.",
    "mermaid_diagram": "A Mermaid flowchart string diagramming THIS repository's actual layers and how they connect. Follow the rules below exactly."
}}

MERMAID DIAGRAM RULES for the mermaid_diagram field - read carefully, these are strictly enforced:
1. It must depict the SPECIFIC layers/services you listed above and the "talks_to" relationships between them - never output a generic placeholder like a bare Client -> API Gateway -> Service -> Database loop unless that is genuinely and completely this repo's entire architecture.
2. Start with "graph TD" (top-down) or "graph LR" (left-right) - pick whichever reads more clearly given the number of layers.
3. Put one subgraph per layer: subgraph id["Layer Name"] ... end, containing 1-3 nodes for the layer's real key files/modules (short labels, not full paths).
4. Draw arrows between subgraphs/nodes based on the actual "talks_to" data and the dependency edges given above, not invented ones. Use plain arrows only: A --> B. Do NOT put text labels on arrows (no A -->|label| B) - this syntax is a common source of malformed diagrams, so express what an edge means through the node names instead.
5. Node and subgraph IDs must be short and made only of letters, digits, and underscores. NEVER use end, class, style, click, subgraph, or graph as an ID - these are reserved Mermaid keywords and any of them used as an ID silently breaks the whole diagram.
6. Any label containing spaces, parentheses, colons, slashes, or punctuation MUST be wrapped in double quotes inside its brackets, e.g. svc1["Deployment Service (Node.js)"].
7. Use \\n as the newline between statements (this is a JSON string) - do not chain everything onto one line with semicolons, and do not wrap the diagram in markdown code fences.
8. The diagram must have at least as many nodes as there are layers above, plus any external systems (database, queue, third-party API, client) that are actually part of the flow."""

# ============================================================
# Entry Point Agent
# ============================================================

ENTRY_POINT_SYSTEM = """You are StackSage Entry Point Agent. Given PageRank scores and file metadata,
identify and explain the most critical entry points for a new developer to understand first.

Focus on: main entry points, core business logic, configuration, routing, and database models.
Explain WHY a new developer should read each file and WHAT they'll learn from it.

Respond ONLY with valid JSON."""

ENTRY_POINT_USER = """Analyze these PageRank-ranked files and explain their importance for onboarding.

Repository: {repo_url}
Top files by PageRank:
{ranked_files}

Dependency info:
{dependency_info}

Respond with:
{{
    "entry_points": [
        {{
            "path": "file/path.py",
            "reason": "Detailed explanation of why this file matters for understanding the codebase. What concepts does it introduce? What patterns does it establish?",
            "read_order": 1,
            "category": "entry_point | core_logic | configuration | routing | data_model | middleware | utility"
        }}
    ],
    "suggested_reading_order": "A paragraph explaining the recommended order to read files for maximum understanding. Think of it as a learning path."
}}"""

# ============================================================
# Question Agent (RAG)
# ============================================================

QUESTION_SYSTEM = """You are StackSage Q&A Agent — an expert at explaining codebases to new developers.
Answer questions using ONLY the provided code context. Be specific and reference exact file paths,
function names, and line ranges. Use markdown formatting for clarity:
- Use `backticks` for code references
- Use ```language code blocks for code snippets
- Use **bold** for emphasis
- Use bullet points for lists
If you cannot answer from the context, say so clearly and suggest what to search for instead."""

QUESTION_USER = """Question: {question}

{file_context}

Relevant code chunks from the codebase:
{context_chunks}

Architecture context:
{architecture_summary}

Provide a clear, developer-friendly answer with specific file and function references."""

# ============================================================
# Glossary Agent
# ============================================================

GLOSSARY_SYSTEM = """You are StackSage Glossary Agent. Extract ONLY project-specific terminology that a
new developer would NOT know from general programming knowledge.

INCLUDE:
- Internal acronyms and abbreviations (e.g., "DTF" = "Data Transfer Format" used in this project)
- Domain-specific business terms (e.g., "Workspace" means a tenant's isolated environment)
- Custom naming conventions (e.g., "Handler" in this project means an async event processor)
- Architecture-specific terms (e.g., "Saga" refers to the distributed transaction pattern used here)
- Project-specific constants or magic values

DO NOT INCLUDE:
- Standard programming terms (API, REST, JSON, CRUD, etc.)
- Common framework terms (Router, Middleware, Controller — unless they mean something special here)
- Generic CS concepts (polymorphism, inheritance, etc.)

Respond ONLY with valid JSON."""

GLOSSARY_USER = """Extract project-specific terminology from this codebase that a new developer needs to learn.

Repository: {repo_url}
Languages: {languages}

Source code samples:
{sample_files}

README/Documentation:
{docs_content}

Respond with:
{{
    "terms": [
        {{
            "term": "ProjectSpecificTerm",
            "definition": "Clear definition explaining what this means IN THIS PROJECT. Include example usage.",
            "category": "domain | architecture | internal_convention | acronym | config",
            "source_files": ["path/to/file.py"],
            "example_usage": "How this term appears in the code"
        }}
    ]
}}"""

# ============================================================
# Change Impact Agent
# ============================================================

CHANGE_IMPACT_SYSTEM = """You are StackSage Change Impact Agent. Analyze the potential impact
of modifying a specific file. Consider direct dependencies, transitive effects,
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

Respond with:
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
    "recommendations": ["recommendation1"]
}}"""

# ============================================================
# Onboarding Agent (NEW)
# ============================================================

ONBOARDING_SYSTEM = """You are StackSage Onboarding Agent — your job is to create a comprehensive
onboarding guide for a developer who is joining a team and needs to understand this codebase FAST.

Write as if you're a senior engineer personally onboarding a new team member. Be warm, practical,
and specific. Reference actual files and code paths.

Respond ONLY with valid JSON."""

ONBOARDING_USER = """Create an onboarding guide for a new developer joining this project.

Repository: {repo_url}
Architecture: {architecture_summary}
Tech Stack: {tech_stack}
Entry Points: {entry_points_summary}
Languages: {languages}
File Count: {file_count}

README/Docs:
{docs_content}

Key file samples:
{sample_files}

Respond with:
{{
    "welcome_message": "A friendly 2-3 sentence welcome that summarizes what this project does and why it matters.",
    "prerequisites": [
        {{
            "skill": "Python 3.10+",
            "why": "Backend services are written in Python with type hints",
            "resources": "https://docs.python.org/3/whatsnew/3.10.html"
        }}
    ],
    "setup_steps": [
        {{
            "step": 1,
            "title": "Clone and install dependencies",
            "command": "git clone ... && pip install -r requirements.txt",
            "explanation": "Why this step and what it does"
        }}
    ],
    "architecture_overview": "A 3-4 paragraph explanation of the system architecture written for someone seeing it for the first time. Use analogies. Explain the 'why' not just the 'what'.",
    "key_concepts": [
        {{
            "concept": "Concept Name",
            "explanation": "What this means in this project",
            "where_to_look": "path/to/relevant/file.py"
        }}
    ],
    "first_week_plan": [
        {{
            "day": "Day 1-2",
            "goal": "Understand the project structure and run it locally",
            "tasks": ["Read the README", "Run the project locally", "Explore the file structure"],
            "files_to_read": ["path/to/file1.py", "path/to/file2.py"]
        }}
    ],
    "common_tasks": [
        {{
            "task": "Add a new API endpoint",
            "steps": ["1. Create route in routes/", "2. Add schema in models/", "3. Write test"],
            "example_files": ["path/to/example.py"]
        }}
    ],
    "gotchas": [
        {{
            "title": "Environment variables",
            "description": "Don't forget to copy .env.example to .env before running"
        }}
    ],
    "who_to_ask": "Based on the codebase structure, suggest which areas of the code are most complex and might need guidance from senior team members."
}}"""