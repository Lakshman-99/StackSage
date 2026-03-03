"""
StackSage Pipeline Orchestrator - Coordinates the multi-agent analysis pipeline.
Runs agents in the correct order: Ingestion → Architecture → Entry Points → Glossary.
The Question and Change Impact agents are on-demand (not part of the initial pipeline).
"""

import asyncio
import traceback
from typing import Optional

from app.agents.ingestion_agent import IngestionAgent
from app.agents.architecture_agent import ArchitectureAgent
from app.agents.entry_point_agent import EntryPointAgent
from app.agents.glossary_agent import GlossaryAgent
from app.models.schemas import AnalysisStatus
from app.services.state_manager import RepoState, get_state_manager
from app.core.logging import get_logger

logger = get_logger("orchestrator")


async def run_analysis_pipeline(repo_id: str) -> None:
    """
    Execute the full analysis pipeline for a repository.
    Runs as a background task after the ingest endpoint responds.
    
    Pipeline order:
    1. Ingestion Agent (clone, parse, embed)
    2. Architecture Agent (structure analysis)
    3. Entry Point Agent (PageRank)
    4. Glossary Agent (terminology)
    """
    state_manager = get_state_manager()
    state = state_manager.get(repo_id)

    if not state:
        logger.error("pipeline_no_state", repo_id=repo_id)
        return

    try:
        # Agent 1: Ingestion
        ingestion = IngestionAgent()
        ingestion_result = await ingestion.run(state)
        logger.info("pipeline_ingestion_done", repo_id=repo_id, files=ingestion_result["file_count"])

        # Agent 2: Architecture
        state.update(AnalysisStatus.ANALYZING, 55, "Analyzing architecture")
        architecture = ArchitectureAgent()
        arch_result = await architecture.run(state)
        logger.info("pipeline_architecture_done", repo_id=repo_id, layers=len(arch_result.layers))

        # Agent 3: Entry Points
        state.update(AnalysisStatus.ANALYZING, 70, "Computing entry points")
        entry_point = EntryPointAgent()
        ep_result = await entry_point.run(state)
        logger.info("pipeline_entry_points_done", repo_id=repo_id, entries=len(ep_result.entry_points))

        # Agent 4: Glossary
        state.update(AnalysisStatus.ANALYZING, 85, "Extracting glossary")
        glossary = GlossaryAgent()
        glossary_result = await glossary.run(state)
        logger.info("pipeline_glossary_done", repo_id=repo_id, terms=glossary_result.total_terms)

        # Pipeline complete
        state.update(AnalysisStatus.COMPLETE, 100, "Analysis complete")
        logger.info("pipeline_complete", repo_id=repo_id)

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        logger.error("pipeline_failed", repo_id=repo_id, error=error_msg, traceback=traceback.format_exc())
        state.fail(error_msg)