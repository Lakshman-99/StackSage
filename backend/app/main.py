"""
StackSage Backend - Multi-Agent Codebase Onboarding System
=========================================================
Reduce codebase understanding from weeks to 30 minutes using
six specialized AI agents that analyze, index, and explain code.

Author: Lakshman
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.services.llm_service import LLMError, LLMClientError, RateLimitError, get_llm_service

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    setup_logging(debug=settings.debug)
    logger = get_logger("app")
    logger.info(
        "stacksage_starting",
        version=settings.app_version,
        llm_provider=settings.llm_provider,
        llm_model=settings.llm_model,
    )
    yield
    # Cleanup
    llm = get_llm_service()
    await llm.close()
    logger.info("stacksage_shutdown")


app = FastAPI(
    title="StackSage API",
    description=(
        "Multi-Agent Codebase Onboarding System. "
        "Analyze any Git repository with AI-powered agents to understand "
        "architecture, entry points, terminology, and change impact."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - explicit origins from settings, plus any localhost port for local dev
# (Next.js falls back to 3001, 3002, etc. when its default port is taken)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(router, prefix="/api/v1")


@app.exception_handler(LLMError)
async def llm_error_handler(request: Request, exc: LLMError):
    """Surface LLM provider failures (rate limits, oversized requests) as
    clean JSON errors instead of an opaque 500."""
    if isinstance(exc, RateLimitError):
        status_code, message = 429, "The AI provider is rate-limiting requests. Please wait a moment and try again."
    elif isinstance(exc, LLMClientError):
        status_code, message = 400, f"The AI provider rejected this request: {exc}"
    else:
        status_code, message = 502, f"The AI provider is temporarily unavailable: {exc}"
    return JSONResponse(status_code=status_code, content={"detail": message})


# Root redirect to docs
@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "StackSage API",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/v1/health",
    }