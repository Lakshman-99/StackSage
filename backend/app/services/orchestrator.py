"""
StackSage Pipeline Orchestrator - Coordinates agents with rate limit awareness.
Adds onboarding agent as the final step. Each agent failure is non-fatal.
"""

import asyncio
import traceback

from app.agents.ingestion_agent import IngestionAgent
from app.agents.architecture_agent import ArchitectureAgent
from app.agents.entry_point_agent import EntryPointAgent
from app.agents.glossary_agent import GlossaryAgent
from app.agents.onboarding_agent import OnboardingAgent
from app.models.schemas import AnalysisStatus
from app.services.state_manager import get_state_manager
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("orchestrator")
settings = get_settings()


async def run_analysis_pipeline(repo_id: str) -> None:
    """
    Pipeline: Ingestion → [delay] Architecture → [delay] Entry Points → [delay] Glossary → [delay] Onboarding
    """
    state_manager = get_state_manager()
    state = state_manager.get(repo_id)
    if not state:
        logger.error("pipeline_no_state", repo_id=repo_id)
        return

    delay = settings.agent_delay_seconds

    try:
        # === Agent 1: Ingestion (no LLM call) ===
        ingestion = IngestionAgent()
        ingestion_result = await ingestion.run(state)
        logger.info("pipeline_ingestion_done", repo_id=repo_id, files=ingestion_result["file_count"])

        logger.info("pipeline_rate_limit_delay", seconds=delay)
        await asyncio.sleep(delay)

        # === Agent 2: Architecture ===
        state.update(AnalysisStatus.ANALYZING, 55, "Analyzing architecture")
        try:
            arch = ArchitectureAgent()
            arch_result = await arch.run(state)
            logger.info("pipeline_architecture_done", repo_id=repo_id, layers=len(arch_result.layers))
        except Exception as e:
            logger.warning("architecture_agent_failed", repo_id=repo_id, error=str(e))

        await asyncio.sleep(delay)

        # === Agent 3: Entry Points ===
        state.update(AnalysisStatus.ANALYZING, 70, "Computing entry points")
        try:
            ep = EntryPointAgent()
            ep_result = await ep.run(state)
            logger.info("pipeline_entry_points_done", repo_id=repo_id, entries=len(ep_result.entry_points))
        except Exception as e:
            logger.warning("entry_point_agent_failed", repo_id=repo_id, error=str(e))

        await asyncio.sleep(delay)

        # === Agent 4: Glossary ===
        state.update(AnalysisStatus.ANALYZING, 82, "Extracting glossary")
        try:
            glossary = GlossaryAgent()
            glossary_result = await glossary.run(state)
            logger.info("pipeline_glossary_done", repo_id=repo_id, terms=glossary_result.total_terms)
        except Exception as e:
            logger.warning("glossary_agent_failed", repo_id=repo_id, error=str(e))

        await asyncio.sleep(delay)

        # === Agent 5: Onboarding Guide ===
        state.update(AnalysisStatus.ANALYZING, 92, "Generating onboarding guide")
        try:
            onboarding = OnboardingAgent()
            await onboarding.run(state)
            logger.info("pipeline_onboarding_done", repo_id=repo_id)
        except Exception as e:
            logger.warning("onboarding_agent_failed", repo_id=repo_id, error=str(e))

        # === Complete ===
        state.update(AnalysisStatus.COMPLETE, 100, "Analysis complete")
        logger.info("pipeline_complete", repo_id=repo_id)

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        logger.error("pipeline_failed", repo_id=repo_id, error=error_msg, traceback=traceback.format_exc())
        state.fail(error_msg)