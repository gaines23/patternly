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

from apps.briefs.models import (
    CaseFile, Roadblock, Platform,
    PlatformKnowledge, CommunityInsight, IntegrationPattern,
)
from .models import GeneratedBrief, WorkflowTemplate

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
    """All knowledge retrieved for generation context."""
    case_files: list = field(default_factory=list)
    roadblock_warnings: list = field(default_factory=list)
    similar_count: int = 0
    platform_knowledge: list = field(default_factory=list)
    community_insights: list = field(default_factory=list)
    matched_templates: list = field(default_factory=list)
    integration_patterns: list = field(default_factory=list)


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


@dataclass
class CompiledSuggestion:
    """One ranked build suggestion from the Agent Compiler."""
    rank: int = 1
    name: str = ""
    description: str = ""
    reasoning: str = ""
    limitations: str = ""
    confidence_score: float = 0.0
    estimated_complexity: int = 3
    workflows: list = field(default_factory=list)
    proactive_warnings: list = field(default_factory=list)
    integrations: list = field(default_factory=list)
    build_notes: str = ""


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
You have access to a comprehensive knowledge base including:
- Past successful and unsuccessful builds (case files)
- Platform capabilities and limitations (official docs, API specs)
- Community best practices, gotchas, and workarounds from practitioners
- Pre-built workflow templates that have been validated in production
- Known integration patterns between tool pairs

Your task: Given a user scenario and all available context, generate the optimal ClickUp workspace recommendation.

CRITICAL RULES:
- Be specific and actionable — someone should be able to build exactly this in ClickUp
- Reference platform capabilities AND limitations from the provided knowledge base
- Apply community best practices and avoid known gotchas mentioned in the context
- When matching pre-built templates exist, use them as a structural starting point and adapt to this specific scenario
- For tool pairs with known integration patterns, use those patterns and flag their limitations
- Acknowledge known limitations proactively (from roadblock history and platform knowledge)
- Set realistic expectations — don't promise what integrations cannot deliver
- Draw explicitly on past case files, templates, and knowledge as evidence
- Prioritize knowledge with higher confidence scores

Return ONLY valid JSON. Schema:
{
  "spaces": "comma-separated Space names",
  "lists": "comma-separated List names (per Space if different)",
  "statuses": "status flow e.g. New → In Progress → Review → Done",
  "custom_fields": "one per line: FieldName — Type — Purpose",
  "automations": "one per line: Trigger → Action",
  "integrations": ["array of tool names to connect"],
  "build_notes": "implementation notes, gotchas, dependencies",
  "reasoning": "2-3 paragraphs explaining why this structure was chosen, referencing templates, past builds, and knowledge used",
  "confidence_score": 0.0,
  "estimated_complexity": 3,
  "proactive_warnings": [
    {"tool": "tool name", "warning": "what to watch out for", "workaround": "how to handle it"}
  ]
}"""

COMPILE_SYSTEM_PROMPT = """You are a senior ClickUp solutions architect with deep expertise in workflow design.
You have access to a comprehensive knowledge base including past successful builds, platform
capabilities and limitations, community best practices, validated workflow templates, and
known integration patterns between tool pairs.

Your task: Given a user scenario and all available context, generate 1 to {num_suggestions}
DISTINCT ranked build suggestions. Each suggestion must be a complete, actionable ClickUp
workspace build that someone could implement directly.

SUGGESTION STRATEGY:
- Suggestion #1: The OPTIMAL fit — best match for the user's specific needs, tools, and constraints
- Suggestion #2: A SIMPLER alternative — fewer moving parts, easier to maintain, good for smaller teams
- Suggestion #3: A COMPREHENSIVE option — more structure, better reporting, suits growing teams
- Suggestion #4-5: CREATIVE alternatives — different structural approaches, different frameworks, or different automation strategies
- Each suggestion must be meaningfully different (not just variations in naming)
- Rank by confidence_score: how well this specific build fits the described scenario

SCORING DIMENSIONS (compute confidence_score as weighted average, 0.0 to 1.0):
- Fit (40%): How well does the build match the described workflow need?
- Feasibility (25%): Can this be built in ClickUp without hitting known blockers?
- Simplicity (20%): Lower complexity for equivalent outcomes scores higher
- Evidence (15%): Is this backed by past case files and templates?

AUTOMATION RULES:
- Use ONLY these trigger types: Task Created, Task Status Changed, Task Completed, Task Moved, Task Assigned, Task Unassigned, Task Due Date Arrives, Task Start Date Arrives, Task Due Date Changed, Task Priority Changed, Custom Field Changed, Custom Field Is, Comment Posted, Attachment Added, Tag Added, Tag Removed, Task Type Is, Checklist Item Completed, Time Estimate Changed, Dependency Resolved, Form Submitted, Recurring Task Due
- Use ONLY these action types: Change Status, Assign To, Unassign From, Set Priority, Set Due Date, Set Start Date, Move to List, Add to List, Create List, Copy Task, Create Subtask, Create Task, Post Comment, Send Email, Add Tag, Remove Tag, Set Custom Field, Start Time Tracking, Stop Time Tracking, Change Task Type, Apply Template, Archive Task, Send Webhook

AGENT INSTRUCTIONS RULES:
- The "instructions" field is ONLY for automations that require an AI agent or custom prompt text — for example: creating lists dynamically, applying list templates, complex conditional logic, or multi-step orchestration that goes beyond a simple trigger→action pair
- For standard ClickUp automations (e.g. "when status changes → assign to"), leave "instructions" as an empty string ""
- When instructions ARE needed (e.g. a ClickUp AI agent that creates a list and applies a template), write clear step-by-step prompt text the agent should follow

CRITICAL RULES:
- Be specific and actionable — someone should be able to build exactly this in ClickUp
- Each suggestion must include reasoning explaining WHY this approach fits
- Each suggestion must include limitations noting known tradeoffs, blockers, or gotchas
- Reference platform knowledge and community best practices
- Flag integration limitations proactively
- Set realistic expectations

Return ONLY valid JSON — an array of suggestion objects. Schema:
[
  {{
    "rank": 1,
    "name": "short descriptive name for this build approach",
    "description": "1-2 sentence summary of the approach",
    "reasoning": "2-3 paragraphs explaining why this structure was chosen, referencing templates, past builds, and knowledge",
    "limitations": "known tradeoffs, blockers, or things that won't work perfectly with this approach",
    "confidence_score": 0.85,
    "estimated_complexity": 3,
    "integrations": ["tool names to connect"],
    "build_notes": "implementation notes, gotchas, dependencies",
    "proactive_warnings": [
      {{"tool": "tool name", "warning": "what to watch out for", "workaround": "how to handle it"}}
    ],
    "workflows": [
      {{
        "name": "Workflow / Space name",
        "notes": "workflow-specific implementation notes",
        "pipeline": ["Phase 1 Name", "Phase 2 Name"],
        "lists": [
          {{
            "name": "List name",
            "space": "Space this list belongs to",
            "statuses": "Status1 → Status2 → Status3 → Done",
            "custom_fields": "FieldName — Type — Purpose (one per line)",
            "automations": [
              {{
                "platform": "clickup",
                "automation_mode": "pipeline",
                "pipeline_phase": "Phase name if applicable",
                "triggers": [{{"type": "Task Status Changed", "detail": "When status changes to Review"}}],
                "actions": [{{"type": "Assign To", "detail": "Assign to team lead for review"}}],
                "instructions": "",
                "map_description": "Short label for workflow visualization"
              }},
              {{
                "platform": "clickup",
                "automation_mode": "standalone",
                "pipeline_phase": "",
                "triggers": [{{"type": "Task Status Changed", "detail": "When task status changes to Approved"}}],
                "actions": [{{"type": "Create List", "detail": "Create new list in Project Space with task name"}}],
                "instructions": "1. Get the approved task name from the trigger\\n2. Create a new list in the Project Space using the task name\\n3. Apply the 'List Template' template to the new list\\n4. Post a comment on the original task confirming the list was created",
                "map_description": "Auto-provision project list with template"
              }}
            ]
          }}
        ]
      }}
    ]
  }}
]"""


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
        Retrieve all relevant knowledge for generation context:
        case files, roadblocks, platform knowledge, community insights,
        matched templates, and integration patterns.
        """
        # Resolve tool names to Platform objects (reused by multiple queries)
        platforms = self._resolve_platforms(scenario.tools)

        # Case files — well-received past builds
        qs = CaseFile.objects.filter(
            satisfaction_score__gte=3,
        ).prefetch_related(
            "intake", "build", "delta__roadblocks", "reasoning", "outcome", "audit__builds"
        )
        if scenario.workflow_type:
            matching = qs.filter(workflow_type__icontains=scenario.workflow_type)
            if matching.exists():
                qs = matching
        if scenario.industries:
            industry_match = qs.filter(industries__overlap=scenario.industries)
            if industry_match.exists():
                qs = industry_match
        qs = qs.order_by("-satisfaction_score", "-created_at")[:top_k]
        case_files = [self._serialise_case_file(cf) for cf in qs]

        # All knowledge sources
        warnings = self._get_roadblock_warnings(scenario.tools)
        platform_knowledge = self._get_platform_knowledge(platforms, scenario)
        community_insights = self._get_community_insights(platforms, scenario)
        matched_templates = self._get_matched_templates(scenario)
        integration_patterns = self._get_integration_patterns(platforms)

        logger.info(
            "Retrieved context: %d case files, %d warnings, %d knowledge, "
            "%d insights, %d templates, %d patterns",
            len(case_files), len(warnings), len(platform_knowledge),
            len(community_insights), len(matched_templates), len(integration_patterns),
        )

        return RetrievedContext(
            case_files=case_files,
            roadblock_warnings=warnings,
            similar_count=len(case_files),
            platform_knowledge=platform_knowledge,
            community_insights=community_insights,
            matched_templates=matched_templates,
            integration_patterns=integration_patterns,
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

    # ── Knowledge retrieval helpers ────────────────────────────────────────

    def _resolve_platforms(self, tool_names: list) -> list:
        """Map human tool names to Platform objects for FK-based queries."""
        if not tool_names:
            return []
        slug_map = {
            "clickup": "clickup", "monday": "monday", "monday.com": "monday",
            "asana": "asana", "jira": "jira",
            "zapier": "zapier", "make": "make", "integromat": "make",
            "airtable": "airtable", "notion": "notion",
            "hubspot": "hubspot", "salesforce": "salesforce",
            "slack": "slack", "google drive": "google-drive",
            "github": "github", "figma": "figma",
            "docusign": "docusign", "zoom": "zoom", "stripe": "stripe",
            "microsoft teams": "microsoft-teams", "teams": "microsoft-teams",
            "outlook": "outlook", "gmail": "gmail",
        }
        slugs = set()
        for tool in tool_names:
            slug = slug_map.get(tool.strip().lower())
            if slug:
                slugs.add(slug)
        if not slugs:
            return []
        return list(Platform.objects.filter(slug__in=slugs))

    def _get_platform_knowledge(self, platforms: list, scenario: ParsedScenario) -> list:
        """Retrieve platform capabilities and limitations for the user's tools."""
        if not platforms:
            return []
        qs = PlatformKnowledge.objects.filter(
            platform__in=platforms,
            confidence_score__gte=0.5,
        ).select_related("platform", "related_platform").order_by("-confidence_score")

        # Limitations are always important; then capabilities/features
        limitations = list(qs.filter(knowledge_type="limitation")[:5])
        capabilities = list(qs.filter(
            knowledge_type__in=["capability", "feature", "integration_spec"],
        )[:5])

        return [
            {
                "platform": pk.platform.name,
                "type": pk.knowledge_type,
                "category": pk.category,
                "title": pk.title,
                "content": pk.content[:300],
                "confidence": pk.confidence_score,
            }
            for pk in (limitations + capabilities)[:10]
        ]

    def _get_community_insights(self, platforms: list, scenario: ParsedScenario) -> list:
        """Retrieve community best practices, gotchas, and workarounds."""
        if not platforms:
            return []
        actionable_types = ["best_practice", "gotcha", "workaround", "methodology"]
        qs = CommunityInsight.objects.filter(
            platforms__in=platforms,
            insight_type__in=actionable_types,
            confidence_score__gte=0.5,
        ).distinct().order_by("-confidence_score")

        # Boost industry-relevant insights
        if scenario.industries:
            industry_match = qs.filter(applies_to_industries__overlap=scenario.industries)
            general = qs.exclude(pk__in=industry_match)
            results = list(industry_match[:5]) + list(general[:3])
        else:
            results = list(qs[:8])

        return [
            {
                "type": ci.insight_type,
                "title": ci.title,
                "content": ci.content[:300],
                "confidence": ci.confidence_score,
            }
            for ci in results[:8]
        ]

    def _get_matched_templates(self, scenario: ParsedScenario) -> list:
        """Score WorkflowTemplates against the parsed scenario and return top matches."""
        parsed_wf = (scenario.workflow_type or "").lower()
        parsed_industries = set(i.lower() for i in scenario.industries)
        parsed_pain_points = set(p.lower() for p in scenario.pain_points)
        parsed_tools = set(t.lower() for t in scenario.tools)

        templates = WorkflowTemplate.objects.filter(is_active=True)
        scored = []

        for tmpl in templates:
            score = 0
            if parsed_wf and tmpl.workflow_type.lower() == parsed_wf:
                score += 40
            shared_ind = parsed_industries & set(i.lower() for i in (tmpl.industries or []))
            score += min(len(shared_ind) * 15, 30)
            shared_pp = parsed_pain_points & set(p.lower() for p in (tmpl.pain_points or []))
            score += min(len(shared_pp) * 10, 30)
            shared_tools = parsed_tools & set(t.lower() for t in (tmpl.tools or []))
            score += min(len(shared_tools) * 5, 20)
            if score > 0:
                scored.append((tmpl, min(score, 100)))

        scored.sort(key=lambda x: x[1], reverse=True)

        return [
            {
                "name": tmpl.name,
                "score": score,
                "workflow_type": tmpl.workflow_type,
                "spaces": tmpl.spaces,
                "lists": tmpl.lists,
                "statuses": tmpl.statuses,
                "custom_fields": tmpl.custom_fields[:200],
                "automations": tmpl.automations[:200],
                "integrations": tmpl.integrations,
                "build_notes": tmpl.build_notes[:200],
                "estimated_complexity": tmpl.estimated_complexity,
            }
            for tmpl, score in scored[:3]
        ]

    def _get_integration_patterns(self, platforms: list) -> list:
        """Retrieve known integration patterns for tool pairs in the user's stack."""
        if len(platforms) < 2:
            return []
        patterns = IntegrationPattern.objects.filter(
            source_platform__in=platforms,
            target_platform__in=platforms,
        ).select_related("source_platform", "target_platform", "via_platform")

        return [
            {
                "source": ip.source_platform.name,
                "target": ip.target_platform.name,
                "via": ip.via_platform.name if ip.via_platform else "native",
                "pattern_type": ip.pattern_type,
                "description": ip.description[:200],
                "limitations": ip.known_limitations[:3] if ip.known_limitations else [],
                "workarounds": ip.workarounds[:2] if ip.workarounds else [],
                "success_rate": ip.success_rate,
            }
            for ip in patterns[:6]
        ]

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

        # Platform knowledge — capabilities and limitations
        if context.platform_knowledge:
            parts.append("\n## Platform Capabilities & Limitations")
            for pk in context.platform_knowledge:
                parts.append(
                    f"- [{pk['type'].upper()}] {pk['platform']} ({pk['category']}): "
                    f"{pk['title']} — {pk['content']} (confidence: {pk['confidence']})"
                )

        # Community insights — best practices, gotchas, workarounds
        if context.community_insights:
            parts.append("\n## Community Best Practices & Gotchas")
            for ci in context.community_insights:
                parts.append(
                    f"- [{ci['type'].upper()}] {ci['title']} — "
                    f"{ci['content']} (confidence: {ci['confidence']})"
                )

        # Roadblock warnings
        if context.roadblock_warnings:
            parts.append("\n## Known Roadblocks For This Tool Stack")
            for w in context.roadblock_warnings:
                parts.append(f"- [{w['severity'].upper()}] {w['tool']}: {w['warning']}")
                if w.get("workaround"):
                    parts.append(f"  Workaround: {w['workaround']}")

        # Integration patterns
        if context.integration_patterns:
            parts.append("\n## Known Integration Patterns")
            for ip in context.integration_patterns:
                via = f" via {ip['via']}" if ip['via'] != "native" else " (native)"
                parts.append(
                    f"- {ip['source']} → {ip['target']}{via} ({ip['pattern_type']}): "
                    f"{ip['description']}"
                )
                if ip.get("limitations"):
                    parts.append(f"  Limitations: {'; '.join(str(l) for l in ip['limitations'])}")
                if ip.get("success_rate") is not None:
                    parts.append(f"  Success rate: {ip['success_rate']:.0%}")

        # Past builds
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

        # Matched templates — full build structure as starting points
        if context.matched_templates:
            parts.append(f"\n## {len(context.matched_templates)} Pre-Built Template Matches")
            for tmpl in context.matched_templates:
                parts.append(f"\n### {tmpl['name']} (match score: {tmpl['score']}/100)")
                parts.append(f"Workflow type: {tmpl['workflow_type']}")
                if tmpl.get("spaces"):
                    parts.append(f"Spaces: {tmpl['spaces']}")
                if tmpl.get("lists"):
                    parts.append(f"Lists: {tmpl['lists']}")
                if tmpl.get("statuses"):
                    parts.append(f"Statuses: {tmpl['statuses']}")
                if tmpl.get("custom_fields"):
                    parts.append(f"Custom fields: {tmpl['custom_fields']}")
                if tmpl.get("automations"):
                    parts.append(f"Automations: {tmpl['automations']}")
                if tmpl.get("integrations"):
                    parts.append(f"Integrations: {', '.join(tmpl['integrations'])}")
                if tmpl.get("build_notes"):
                    parts.append(f"Build notes: {tmpl['build_notes']}")

        parts.append("\n## Instructions")
        parts.append(
            "Generate the optimal ClickUp workspace recommendation for this scenario. "
            "Draw on past builds, platform knowledge, community insights, and matching templates above. "
            "Use matching templates as a structural starting point and adapt to this specific scenario. "
            "Flag any known risks, limitations, or gotchas proactively. "
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
                "knowledge_sources": {
                    "case_files_used": len(context.case_files),
                    "platform_knowledge_used": len(context.platform_knowledge),
                    "community_insights_used": len(context.community_insights),
                    "templates_matched": len(context.matched_templates),
                    "integration_patterns_used": len(context.integration_patterns),
                },
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

    # ── Agent Compiler pipeline ──────────────────────────────────────────────

    def generate_compiled_suggestions(
        self,
        scenario: ParsedScenario,
        context: RetrievedContext,
        num_suggestions: int = 5,
    ) -> list[CompiledSuggestion]:
        """
        Call Claude with the parsed scenario + retrieved context to generate
        multiple ranked build suggestions with full workflow structure.
        """
        user_message = self._build_generation_prompt(scenario, context)
        system_prompt = COMPILE_SYSTEM_PROMPT.format(num_suggestions=num_suggestions)

        logger.info(
            "Compiling %d suggestions via Claude for workflow: %s",
            num_suggestions, scenario.workflow_type,
        )
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=16000,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
            raw = _strip_json_fences(message.content[0].text)
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("Compiler JSON parse error: %s", e)
            raise AIServiceError(f"AI returned invalid JSON: {e}")

        if not isinstance(data, list):
            data = [data]

        suggestions = []
        for i, item in enumerate(data[:num_suggestions]):
            suggestions.append(CompiledSuggestion(
                rank=item.get("rank", i + 1),
                name=item.get("name", f"Suggestion {i + 1}"),
                description=item.get("description", ""),
                reasoning=item.get("reasoning", ""),
                limitations=item.get("limitations", ""),
                confidence_score=float(item.get("confidence_score", 0.5)),
                estimated_complexity=int(item.get("estimated_complexity", 3)),
                workflows=item.get("workflows", []),
                proactive_warnings=item.get("proactive_warnings", []),
                integrations=item.get("integrations", []),
                build_notes=item.get("build_notes", ""),
            ))

        suggestions.sort(key=lambda s: s.confidence_score, reverse=True)
        for i, s in enumerate(suggestions):
            s.rank = i + 1

        return suggestions

    def compile_build_suggestions(
        self,
        raw_prompt: str,
        num_suggestions: int = 5,
    ) -> dict:
        """
        Full Agent Compiler pipeline: parse → retrieve → compile → persist.
        Returns a dict with brief_id, parsed scenario, and ranked suggestions.
        """
        scenario = self.parse_scenario(raw_prompt)
        context = self.retrieve_context(scenario)
        suggestions = self.generate_compiled_suggestions(
            scenario, context, num_suggestions,
        )

        top = suggestions[0] if suggestions else None
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
                "type": "compile",
                "suggestions": [
                    {
                        "rank": s.rank,
                        "name": s.name,
                        "description": s.description,
                        "reasoning": s.reasoning,
                        "limitations": s.limitations,
                        "confidence_score": s.confidence_score,
                        "estimated_complexity": s.estimated_complexity,
                        "workflows": s.workflows,
                        "proactive_warnings": s.proactive_warnings,
                        "integrations": s.integrations,
                        "build_notes": s.build_notes,
                    }
                    for s in suggestions
                ],
                "knowledge_sources": {
                    "case_files_used": len(context.case_files),
                    "platform_knowledge_used": len(context.platform_knowledge),
                    "community_insights_used": len(context.community_insights),
                    "templates_matched": len(context.matched_templates),
                    "integration_patterns_used": len(context.integration_patterns),
                },
            },
            source_case_file_ids=[cf["id"] for cf in context.case_files],
            confidence_score=top.confidence_score if top else 0,
            proactive_warnings=top.proactive_warnings if top else [],
        )

        logger.info(
            "Compiled %d suggestions (brief %s, top confidence=%.2f)",
            len(suggestions), brief.id,
            top.confidence_score if top else 0,
        )

        return {
            "brief_id": str(brief.id),
            "parsed": {
                "workflow_type": scenario.workflow_type,
                "industries": scenario.industries,
                "tools": scenario.tools,
                "pain_points": scenario.pain_points,
                "process_frameworks": scenario.process_frameworks,
                "team_size": scenario.team_size,
            },
            "suggestions": [
                {
                    "rank": s.rank,
                    "name": s.name,
                    "description": s.description,
                    "reasoning": s.reasoning,
                    "limitations": s.limitations,
                    "confidence_score": s.confidence_score,
                    "estimated_complexity": s.estimated_complexity,
                    "workflows": s.workflows,
                    "proactive_warnings": s.proactive_warnings,
                    "integrations": s.integrations,
                    "build_notes": s.build_notes,
                }
                for s in suggestions
            ],
        }
