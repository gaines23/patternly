"""
patternly.apps.workflows.ai_service
------------------------------------
Phase 2 AI engine. Handles:
  1. Parsing a raw user prompt into a structured scenario
  2. Retrieving similar past case files via pgvector similarity search
  3. Fetching proactive roadblock warnings for the detected tool stack
  4. Generating a workflow recommendation via Claude API
  5. Persisting the GeneratedBrief for feedback and training

All Anthropic API calls use the environment variable ANTHROPIC_API_KEY.
If the key is not set the service raises a clear ConfigurationError rather
than silently failing — this makes local dev easier to debug.
"""

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Optional

import anthropic
from django.conf import settings

from apps.briefs.models import CaseFile, Roadblock
from .models import GeneratedBrief

logger = logging.getLogger(__name__)


# ── Exceptions ────────────────────────────────────────────────────────────────

class ConfigurationError(Exception):
    """Raised when ANTHROPIC_API_KEY is not configured."""
    pass


class AIServiceError(Exception):
    """Raised when the Anthropic API returns an unexpected response."""
    pass


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class ParsedScenario:
    """Structured output from the prompt parser."""
    client_name: str = ""
    industries: list = field(default_factory=list)
    team_size: str = ""
    workflow_type: str = ""
    tools: list = field(default_factory=list)
    pain_points: list = field(default_factory=list)
    process_frameworks: list = field(default_factory=list)
    key_requirements: list = field(default_factory=list)
    raw_prompt: str = ""
    has_existing_setup: bool = False
    existing_tools: list = field(default_factory=list)
    existing_issues: list = field(default_factory=list)


@dataclass
class RetrievedContext:
    """Case files retrieved for RAG context."""
    case_files: list = field(default_factory=list)  # list of CaseFile dicts
    roadblock_warnings: list = field(default_factory=list)
    similar_count: int = 0


@dataclass
class WorkflowRecommendation:
    """The structured AI recommendation output."""
    spaces: str = ""
    lists: str = ""
    statuses: str = ""
    custom_fields: str = ""
    automations: str = ""
    integrations: list = field(default_factory=list)
    build_notes: str = ""
    reasoning: str = ""
    confidence_score: float = 0.0
    proactive_warnings: list = field(default_factory=list)
    estimated_complexity: int = 3
    source_case_file_ids: list = field(default_factory=list)


# ── Prompt templates ──────────────────────────────────────────────────────────

PARSE_SYSTEM_PROMPT = """You are a workflow analysis expert specialising in ClickUp implementations.
Your job is to parse a user's description of their team and workflow needs into a structured JSON object.

Extract the following fields from the user's text. If a field cannot be determined, use an empty string or empty array.

Return ONLY valid JSON, no markdown fences, no explanation. Schema:
{
  "client_name": "string — the company or client name if mentioned, otherwise empty string",
  "industries": ["array of industries that apply — e.g. 'Consulting', 'SaaS / Software Product', 'Marketing Agency'. Include all that fit, not just the primary one."],
  "team_size": "string — e.g. '6', '10-20', 'small'",
  "workflow_type": "string — e.g. 'Client Project Management', 'Sprint Planning'",
  "tools": ["array of tool names mentioned — e.g. Slack, HubSpot, GitHub"],
  "pain_points": ["array of pain points — e.g. Visibility, Handoffs, Reporting"],
  "process_frameworks": ["suggest process frameworks this team would benefit from — include relevant ones even if not explicitly mentioned. Use exact names from this list: Kanban, SOPs, RACI Matrix, Phase Gate, Waterfall, Agile / Scrum, PMBOK, Milestones & Deliverables, OKRs, KPIs, Change Management, Risk Register, BPM, Value Stream Mapping, Lean / Six Sigma, Critical Path Method, Program Delivery. For teams with no workflow/broken comms/missed deadlines: Kanban, SOPs, RACI Matrix. For event and project tracking: Phase Gate, Milestones & Deliverables. For teams needing clear accountability: RACI Matrix, OKRs. For intake or intake process gaps: BPM, SOPs."],
  "key_requirements": ["array of 3-5 specific things they need the workflow to do"],
  "has_existing_setup": "boolean — true if the client already has something in place (ClickUp, Asana, spreadsheets, any prior tool or process), false if they are starting from scratch",
  "existing_tools": ["array of tools/systems the client is currently using or migrating away from — e.g. Asana, Monday.com, Google Sheets, a custom spreadsheet"],
  "existing_issues": ["array of specific problems or failure reasons with their current setup — e.g. 'tasks fall through the cracks', 'no visibility across teams', 'automations broken'"]
}"""

RECOMMEND_SYSTEM_PROMPT = """You are a senior ClickUp solutions engineer with deep expertise in workflow design.
You have access to documentation from previous successful and unsuccessful builds.

Your task: Given a user scenario and relevant past case files, generate the optimal ClickUp workspace recommendation.

CRITICAL RULES:
- Be specific and actionable — someone should be able to build exactly this in ClickUp
- Acknowledge known limitations proactively (from roadblock history)
- Set realistic expectations — don't promise what integrations cannot deliver
- Draw explicitly on the provided past case files as evidence

Return ONLY valid JSON. Schema:
{
  "spaces": "comma-separated Space names",
  "lists": "comma-separated List names (per Space if different)",
  "statuses": "status flow e.g. New → In Progress → Review → Done",
  "custom_fields": "one per line: FieldName — Type — Purpose",
  "automations": "one per line: Trigger → Action",
  "integrations": ["array of tool names to connect"],
  "build_notes": "implementation notes, gotchas, dependencies",
  "reasoning": "2-3 paragraphs explaining why this structure was chosen",
  "confidence_score": 0.0,
  "estimated_complexity": 3,
  "proactive_warnings": [
    {"tool": "tool name", "warning": "what to watch out for", "workaround": "how to handle it"}
  ]
}"""


def _strip_json_fences(text: str) -> str:
    """Strip markdown code fences that Claude sometimes wraps JSON in."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]  # drop opening fence line
        text = text.rsplit("```", 1)[0]  # drop closing fence
    return text.strip()


# ── Core service ──────────────────────────────────────────────────────────────

class PatternlyAIService:
    """
    Orchestrates the full AI recommendation pipeline.

    Usage:
        service = PatternlyAIService()
        brief = service.generate_brief("We're a 6-person agency using Slack and HubSpot...")
    """

    def __init__(self):
        api_key = os.environ.get("ANTHROPIC_API_KEY") or getattr(settings, "ANTHROPIC_API_KEY", None)
        if not api_key:
            raise ConfigurationError(
                "ANTHROPIC_API_KEY is not set. Add it to your .env file."
            )
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-6"

    # ── Step 1: Parse prompt ──────────────────────────────────────────────────

    def parse_scenario(self, raw_prompt: str) -> ParsedScenario:
        """
        Convert a free-text user prompt into a structured ParsedScenario.
        Uses Claude with a strict JSON output constraint.
        """
        logger.info("Parsing scenario from prompt: %s...", raw_prompt[:80])
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=800,
                system=PARSE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": raw_prompt}],
            )
            raw = _strip_json_fences(message.content[0].text)
            data = json.loads(raw)
            return ParsedScenario(
                raw_prompt=raw_prompt,
                client_name=data.get("client_name", ""),
                industries=data.get("industries", []),
                team_size=data.get("team_size", ""),
                workflow_type=data.get("workflow_type", ""),
                tools=data.get("tools", []),
                pain_points=data.get("pain_points", []),
                process_frameworks=data.get("process_frameworks", []),
                key_requirements=data.get("key_requirements", []),
                has_existing_setup=bool(data.get("has_existing_setup", False)),
                existing_tools=data.get("existing_tools", []),
                existing_issues=data.get("existing_issues", []),
            )
        except json.JSONDecodeError as e:
            logger.error("Failed to parse AI JSON response: %s", e)
            raise AIServiceError(f"AI returned invalid JSON: {e}")

    # ── Step 2: Retrieve context ──────────────────────────────────────────────

    def retrieve_context(self, scenario: ParsedScenario, top_k: int = 5) -> RetrievedContext:
        """
        Retrieve the most relevant past case files using metadata filtering.

        Phase 2a: Metadata-only retrieval (fast, no embeddings needed yet).
        Phase 2b: Add pgvector cosine similarity once embeddings are populated.
        """
        # Build a relevance-scored queryset
        qs = CaseFile.objects.filter(
            satisfaction_score__gte=3,  # only well-received builds
        ).prefetch_related(
            "intake", "build", "delta__roadblocks", "reasoning", "outcome", "audit__builds"
        )

        # Filter by workflow type first (highest signal)
        if scenario.workflow_type:
            matching = qs.filter(workflow_type__icontains=scenario.workflow_type)
            if matching.exists():
                qs = matching

        # Filter by industry if we have matches
        if scenario.industries:
            industry_match = qs.filter(industries__overlap=scenario.industries)
            if industry_match.exists():
                qs = industry_match

        # Limit and order by satisfaction
        qs = qs.order_by("-satisfaction_score", "-created_at")[:top_k]

        case_files = [self._serialise_case_file(cf) for cf in qs]

        # Fetch roadblock warnings for detected tools
        warnings = self._get_roadblock_warnings(scenario.tools)

        logger.info(
            "Retrieved %d case files, %d roadblock warnings for scenario",
            len(case_files), len(warnings),
        )

        return RetrievedContext(
            case_files=case_files,
            roadblock_warnings=warnings,
            similar_count=len(case_files),
        )

    def _serialise_case_file(self, cf: CaseFile) -> dict:
        """Convert a CaseFile ORM object into a compact dict for prompt context."""
        result = {
            "id": str(cf.id),
            "workflow_type": cf.workflow_type,
            "industries": cf.industries,
            "tools": cf.tools,
            "satisfaction": cf.satisfaction_score,
        }
        if hasattr(cf, "intake") and cf.intake:
            result["scenario"] = cf.intake.raw_prompt[:300]
            result["pain_points"] = cf.intake.pain_points
        if hasattr(cf, "build") and cf.build:
            result["spaces"] = cf.build.spaces
            result["statuses"] = cf.build.statuses
            result["automations"] = cf.build.automations[:300] if cf.build.automations else ""
        if hasattr(cf, "reasoning") and cf.reasoning:
            result["why_structure"] = cf.reasoning.why_structure[:300]
            result["when_not_to_use"] = cf.reasoning.when_opposite[:200]
        if hasattr(cf, "delta") and cf.delta:
            result["diverged"] = cf.delta.diverged
            result["compromises"] = cf.delta.compromises[:200]
            result["roadblocks"] = [
                {"type": rb.type, "severity": rb.severity, "warning": rb.future_warning}
                for rb in cf.delta.roadblocks.filter(flag_for_future=True)
            ]
        return result

    def _get_roadblock_warnings(self, tools: list) -> list:
        """Fetch flagged roadblocks that match the user's tool stack."""
        if not tools:
            return []
        warnings = (
            Roadblock.objects.filter(
                flag_for_future=True,
                severity__in=["high", "blocker"],
            )
            .exclude(future_warning="")
            .order_by("-delta__case_file__created_at")
        )
        return [
            {
                "tool": ", ".join(rb.tools_affected),
                "warning": rb.future_warning,
                "workaround": rb.workaround_description,
                "severity": rb.severity,
            }
            for rb in warnings
            if any(t in rb.tools_affected for t in tools)
        ][:8]

    # ── Step 3: Generate recommendation ──────────────────────────────────────

    def generate_recommendation(
        self,
        scenario: ParsedScenario,
        context: RetrievedContext,
    ) -> WorkflowRecommendation:
        """
        Call Claude with the parsed scenario + retrieved context to generate
        a structured workflow recommendation.
        """
        user_message = self._build_generation_prompt(scenario, context)

        logger.info("Generating recommendation via Claude for workflow: %s", scenario.workflow_type)
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=6000,
                system=RECOMMEND_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            raw = _strip_json_fences(message.content[0].text)
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("AI recommendation JSON parse error: %s", e)
            raise AIServiceError(f"AI returned invalid JSON: {e}")

        return WorkflowRecommendation(
            spaces=data.get("spaces", ""),
            lists=data.get("lists", ""),
            statuses=data.get("statuses", ""),
            custom_fields=data.get("custom_fields", ""),
            automations=data.get("automations", ""),
            integrations=data.get("integrations", []),
            build_notes=data.get("build_notes", ""),
            reasoning=data.get("reasoning", ""),
            confidence_score=float(data.get("confidence_score", 0.5)),
            estimated_complexity=int(data.get("estimated_complexity", 3)),
            proactive_warnings=data.get("proactive_warnings", []),
            source_case_file_ids=[cf["id"] for cf in context.case_files],
        )

    def _build_generation_prompt(self, scenario: ParsedScenario, context: RetrievedContext) -> str:
        parts = [
            "## User Scenario",
            f"Raw prompt: {scenario.raw_prompt}",
            f"Industries: {', '.join(scenario.industries)}",
            f"Team size: {scenario.team_size}",
            f"Workflow type: {scenario.workflow_type}",
            f"Tools: {', '.join(scenario.tools)}",
            f"Pain points: {', '.join(scenario.pain_points)}",
            f"Key requirements: {', '.join(scenario.key_requirements)}",
        ]

        if context.roadblock_warnings:
            parts.append("\n## Known Roadblocks For This Tool Stack")
            for w in context.roadblock_warnings:
                parts.append(f"- [{w['severity'].upper()}] {w['tool']}: {w['warning']}")
                if w.get("workaround"):
                    parts.append(f"  Workaround: {w['workaround']}")

        if context.case_files:
            parts.append(f"\n## {len(context.case_files)} Relevant Past Builds")
            for cf in context.case_files:
                parts.append(f"\n### Build: {cf.get('workflow_type')} (satisfaction: {cf.get('satisfaction')}/5)")
                if cf.get("scenario"):
                    parts.append(f"Scenario: {cf['scenario']}")
                if cf.get("spaces"):
                    parts.append(f"Structure: Spaces={cf['spaces']}, Statuses={cf.get('statuses','')}")
                if cf.get("why_structure"):
                    parts.append(f"Why it worked: {cf['why_structure']}")
                if cf.get("when_not_to_use"):
                    parts.append(f"Don't use when: {cf['when_not_to_use']}")
                if cf.get("roadblocks"):
                    parts.append(f"Roadblocks hit: {json.dumps(cf['roadblocks'])}")
        else:
            parts.append("\n## Past Builds\nNo closely matching past builds found. Use general best practices.")

        parts.append("\n## Instructions")
        parts.append(
            "Generate the optimal ClickUp workspace recommendation for this scenario. "
            "Draw on the past builds above. Flag any known risks proactively. "
            "Be specific — every field should be actionable by someone building in ClickUp."
        )

        return "\n".join(parts)

    # ── Step 4: Full pipeline ─────────────────────────────────────────────────

    def generate_brief(self, raw_prompt: str) -> GeneratedBrief:
        """
        Full pipeline: parse → retrieve → recommend → persist.
        Returns the saved GeneratedBrief instance.
        """
        # Step 1: Parse
        scenario = self.parse_scenario(raw_prompt)

        # Step 2: Retrieve
        context = self.retrieve_context(scenario)

        # Step 3: Generate
        recommendation = self.generate_recommendation(scenario, context)

        # Step 4: Persist
        brief = GeneratedBrief.objects.create(
            raw_prompt=raw_prompt,
            parsed_scenario={
                "client_name": scenario.client_name,
                "industries": scenario.industries,
                "team_size": scenario.team_size,
                "workflow_type": scenario.workflow_type,
                "tools": scenario.tools,
                "pain_points": scenario.pain_points,
                "process_frameworks": scenario.process_frameworks,
                "key_requirements": scenario.key_requirements,
            },
            recommendation={
                "spaces": recommendation.spaces,
                "lists": recommendation.lists,
                "statuses": recommendation.statuses,
                "custom_fields": recommendation.custom_fields,
                "automations": recommendation.automations,
                "integrations": recommendation.integrations,
                "build_notes": recommendation.build_notes,
                "reasoning": recommendation.reasoning,
                "estimated_complexity": recommendation.estimated_complexity,
            },
            source_case_file_ids=recommendation.source_case_file_ids,
            confidence_score=recommendation.confidence_score,
            proactive_warnings=recommendation.proactive_warnings,
        )

        logger.info(
            "GeneratedBrief %s created (confidence=%.2f, sources=%d)",
            brief.id, recommendation.confidence_score, len(recommendation.source_case_file_ids),
        )

        return brief
