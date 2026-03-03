"""
StackSage Agents - Lazy imports to prevent circular dependency issues.
Import agents directly from their modules where needed.
"""


def get_agent(agent_type: str):
    """Factory function to get agent instances without eager imports."""
    if agent_type == "ingestion":
        from app.agents.ingestion_agent import IngestionAgent
        return IngestionAgent()
    elif agent_type == "architecture":
        from app.agents.architecture_agent import ArchitectureAgent
        return ArchitectureAgent()
    elif agent_type == "entry_point":
        from app.agents.entry_point_agent import EntryPointAgent
        return EntryPointAgent()
    elif agent_type == "question":
        from app.agents.question_agent import QuestionAgent
        return QuestionAgent()
    elif agent_type == "glossary":
        from app.agents.glossary_agent import GlossaryAgent
        return GlossaryAgent()
    elif agent_type == "change_impact":
        from app.agents.change_impact_agent import ChangeImpactAgent
        return ChangeImpactAgent()
    else:
        raise ValueError(f"Unknown agent type: {agent_type}")