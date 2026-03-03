# 🔍 CodeLens Backend

**Multi-Agent Codebase Onboarding System** — Understand any codebase in 30 minutes instead of weeks.

CodeLens uses six specialized AI agents to analyze Git repositories, reverse-engineer architecture, identify critical entry points, answer questions, extract terminology, and predict change impact.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    FastAPI Server                      │
│                     /api/v1/*                          │
├──────────────────────────────────────────────────────┤
│                Pipeline Orchestrator                  │
│         (coordinates agents in sequence)              │
├──────┬──────┬───────┬──────┬──────┬──────────────────┤
│Ingest│Archi-│Entry  │Quest-│Gloss-│Change            │
│Agent │tect  │Point  │ion   │ary   │Impact            │
│      │Agent │Agent  │Agent │Agent │Agent             │
├──────┴──────┴───────┴──────┴──────┴──────────────────┤
│  LLM Service (Groq/OpenRouter)  │  ChromaDB (RAG)    │
│  NetworkX (PageRank)            │  GitPython          │
└──────────────────────────────────────────────────────┘
```

## Agents

| Agent | Purpose | Technique |
|-------|---------|-----------|
| **Ingestion** | Clone repo, parse files, create embeddings | GitPython + code chunker + ChromaDB |
| **Architecture** | Reverse-engineer system structure | File tree analysis + LLM reasoning |
| **Entry Point** | Find critical files | PageRank on dependency graph + LLM |
| **Question** | Natural language Q&A over code | RAG (ChromaDB retrieval + LLM) |
| **Glossary** | Extract domain terminology | Identifier extraction + LLM |
| **Change Impact** | Predict modification effects | Dependency BFS + LLM analysis |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/repos/ingest` | Start analyzing a repository |
| `GET` | `/api/v1/repos/{id}/status` | Check analysis progress |
| `GET` | `/api/v1/repos` | List all repositories |
| `DELETE`| `/api/v1/repos/{id}` | Delete a repository |
| `GET` | `/api/v1/repos/{id}/architecture` | Get architecture analysis |
| `GET` | `/api/v1/repos/{id}/entry-points` | Get PageRank entry points |
| `POST` | `/api/v1/repos/{id}/ask` | Ask a question (RAG) |
| `GET` | `/api/v1/repos/{id}/glossary` | Get domain glossary |
| `POST` | `/api/v1/repos/{id}/change-impact` | Analyze change impact |
| `GET` | `/api/v1/health` | Health check |

## Quick Start

```bash
# 1. Clone and setup
cd codelens-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Configure
cp .env.example .env
# Edit .env with your GROQ_API_KEY or OPENROUTER_API_KEY

# 3. Run
uvicorn app.main:app --reload --port 8000

# 4. Open docs at http://localhost:8000/docs
```

## Example Usage

```bash
# Ingest a repository
curl -X POST http://localhost:8000/api/v1/repos/ingest \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/tiangolo/fastapi", "branch": "main"}'

# Check status (use the repo_id from the ingest response)
curl http://localhost:8000/api/v1/repos/fastapi-a1b2c3d4/status

# Get architecture analysis
curl http://localhost:8000/api/v1/repos/fastapi-a1b2c3d4/architecture

# Get entry points (PageRank)
curl http://localhost:8000/api/v1/repos/fastapi-a1b2c3d4/entry-points

# Ask a question (RAG-powered)
curl -X POST http://localhost:8000/api/v1/repos/fastapi-a1b2c3d4/ask \
  -H "Content-Type: application/json" \
  -d '{"repo_id": "fastapi-a1b2c3d4", "question": "How does dependency injection work?"}'

# Get glossary
curl http://localhost:8000/api/v1/repos/fastapi-a1b2c3d4/glossary

# Analyze change impact
curl -X POST http://localhost:8000/api/v1/repos/fastapi-a1b2c3d4/change-impact \
  -H "Content-Type: application/json" \
  -d '{"repo_id": "fastapi-a1b2c3d4", "file_path": "fastapi/routing.py", "description": "Refactor route registration"}'
```

## Project Structure

```
codelens-backend/
├── app/
│   ├── agents/                  # Six specialized AI agents
│   │   ├── base.py              # Abstract base agent class
│   │   ├── ingestion_agent.py   # Clone, parse, embed
│   │   ├── architecture_agent.py# Reverse-engineer structure
│   │   ├── entry_point_agent.py # PageRank critical files
│   │   ├── question_agent.py    # RAG Q&A
│   │   ├── glossary_agent.py    # Domain terminology
│   │   └── change_impact_agent.py# Modification analysis
│   ├── api/
│   │   └── routes.py            # All REST endpoints
│   ├── core/
│   │   ├── config.py            # Pydantic settings
│   │   └── logging.py           # Structured logging
│   ├── models/
│   │   └── schemas.py           # Request/response models
│   ├── services/
│   │   ├── llm_service.py       # Groq/OpenRouter abstraction
│   │   ├── vector_store.py      # ChromaDB wrapper
│   │   ├── state_manager.py     # Analysis pipeline state
│   │   └── orchestrator.py      # Pipeline coordinator
│   ├── utils/
│   │   ├── code_chunker.py      # Smart code splitting
│   │   └── prompts.py           # All LLM prompt templates
│   └── main.py                  # FastAPI app entry point
├── tests/
│   └── test_backend.py          # Unit tests
├── requirements.txt
├── pytest.ini
├── .env.example
└── README.md
```

## Tech Stack

- **Framework**: FastAPI + Uvicorn
- **LLM Providers**: Groq / OpenRouter (configurable)
- **Vector Store**: ChromaDB with cosine similarity
- **Graph Analysis**: NetworkX (PageRank algorithm)
- **Git Operations**: GitPython
- **Code Parsing**: Regex-based with language-aware boundary detection
- **Validation**: Pydantic v2
- **Logging**: structlog (structured JSON logging)
- **Retry Logic**: tenacity (exponential backoff)

## Running Tests

```bash
pytest -v
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API key |
| `OPENROUTER_API_KEY` | — | OpenRouter API key |
| `LLM_PROVIDER` | `groq` | LLM provider (`groq` or `openrouter`) |
| `LLM_MODEL` | `llama-3.1-70b-versatile` | Model to use |
| `CHROMA_PERSIST_DIR` | `./data/chromadb` | ChromaDB storage path |
| `REPO_STORAGE_DIR` | `./data/repos` | Cloned repos storage |
| `DEBUG` | `false` | Enable debug logging |
| `CORS_ORIGINS` | `localhost:3000,5173` | Allowed CORS origins |
