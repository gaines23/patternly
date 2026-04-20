"""
management command: ingest_prompt

Accepts raw text content (pasted docs, transcripts, notes) and intelligently
extracts and routes data to the appropriate models: CaseFile (training),
PlatformKnowledge, and/or CommunityInsight.

Usage:
    # Pipe content from stdin
    cat transcript.txt | python manage.py ingest_prompt --platform clickup

    # Pass content inline (for API usage)
    python manage.py ingest_prompt --platform clickup --content "..." --auto-approve

    # Dry run
    python manage.py ingest_prompt --platform clickup --content "..." --dry-run
"""

import json
import sys

from anthropic import Anthropic
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.briefs.models import (
    AuditLayer,
    BuildLayer,
    CaseFile,
    CommunityInsight,
    CurrentBuild,
    DeltaLayer,
    IntakeLayer,
    OutcomeLayer,
    Platform,
    PlatformKnowledge,
    ReasoningLayer,
    Roadblock,
    RoadblockType,
    Severity,
    Urgency,
)

VALID_ROADBLOCK_TYPES = {c.value for c in RoadblockType}
VALID_SEVERITIES = {c.value for c in Severity}
VALID_URGENCIES = {c.value for c in Urgency}

SYSTEM_PROMPT = """\
You are a workflow intelligence analyst for Flowpath, a platform that documents
and analyses workflow implementations across project management and automation tools.

You will receive raw content — it could be a blog post, documentation, transcript,
forum thread, notes, or any text about workflow tools and implementations.

Your job is to extract ALL useful information and classify it into three categories:

1. CASE FILES — specific workflow implementations (someone built X using Y tool, here's
   what happened). These document a real build with structure, outcomes, and roadblocks.

2. PLATFORM KNOWLEDGE — factual information about what a platform can/can't do:
   capabilities, limitations, API details, pricing constraints, integration specs,
   feature documentation. These are verifiable FACTS.

3. COMMUNITY INSIGHTS — experiential wisdom: methodologies, workarounds, complaints,
   gotchas, best practices, feature requests. These are LEARNED PATTERNS from
   practitioners.

A single source often contains ALL THREE types. Extract everything useful.

RULES:
- Only extract information explicitly stated or strongly implied.
- Never fabricate details.
- Confidence scores: official docs (0.9+), practitioner blog (0.7-0.8),
  forum/transcript (0.5-0.7), unverified claim (0.3-0.5).
- Skip clearly outdated info (pre-2024) unless it's fundamental platform architecture.
- For integrations, always specify both platforms involved.
- If the content describes a specific implementation, include a case_file.
  If it's purely informational, omit the case_file section.

PLATFORM SLUGS: clickup, monday, asana, zapier, make, airtable, hubspot, notion,
  slack, google-drive, outlook, gmail, docusign, github, figma, zoom, stripe,
  salesforce, jira, microsoft-teams

OUTPUT FORMAT — return a single JSON object, no markdown fences:

{
  "meta": {
    "source_attribution": "<author or org if mentioned, or empty string>",
    "extraction_notes": "<brief note on data quality and what was extracted>"
  },
  "case_file": <case file object or null if no implementation story>,
  "platform_knowledge": [<array of knowledge items>],
  "community_insights": [<array of insight items>]
}

CASE FILE SCHEMA (only if content describes a specific build/implementation):
{
  "name": "<descriptive name>",
  "primary_platform": "<platform slug>",
  "connected_platforms": ["<slug>", ...],
  "industries": ["<industry>", ...],
  "workflow_type": "<e.g. Project Management, Client Onboarding>",
  "team_size": "<number or empty string>",
  "intake_layer": {
    "raw_prompt": "<summarised situation and needs>",
    "industries": ["<industry>"],
    "team_size": "<number or empty string>",
    "workflow_type": "<type>",
    "process_frameworks": ["<framework>"],
    "tools": ["<tool names>"],
    "pain_points": ["<pain points>"],
    "prior_attempts": "<what they tried before>"
  },
  "audit_layer": {
    "has_existing": <true|false>,
    "overall_assessment": "<assessment>",
    "tried_to_fix": <true|false|null>,
    "previous_fixes": "<fixes>",
    "pattern_summary": "<pattern>",
    "builds": [{"tool":"","structure":"","failure_reasons":[],"what_breaks":"",
      "workarounds_they_use":"","how_long_broken":"","who_reported":"",
      "integrations_in_place":[],"impact_on_team":"","urgency":"medium"}]
  },
  "build_layer": {
    "containers": ["<top-level units>"],
    "spaces": "<spaces>", "lists": "<lists>", "statuses": "<statuses>",
    "custom_fields": "<fields>", "automations": "<automations>",
    "integrations": ["<names>"], "build_notes": "<notes>",
    "workflows": []
  },
  "delta_layer": {
    "user_intent": "", "success_criteria": "", "actual_build": "",
    "diverged": <true|false|null>, "divergence_reason": "", "compromises": "",
    "scope_creep": [],
    "roadblocks": [{"type":"","severity":"","tools_affected":[],"description":"",
      "workaround_found":false,"workaround_description":"","time_cost_hours":null,
      "future_warning":"","flag_for_future":true}]
  },
  "reasoning_layer": {
    "why_structure": "", "alternatives": "", "why_rejected": "",
    "assumptions": "", "when_opposite": "", "lessons": "", "complexity": 3
  },
  "outcome_layer": {
    "built": "<yes|partially|no>", "block_reason": "", "changes": "",
    "what_worked": "", "what_failed": "", "satisfaction": <1-5 or null>,
    "recommend": "<yes|maybe|no>", "revisit_when": ""
  }
}

PLATFORM KNOWLEDGE ITEM SCHEMA:
{
  "platform": "<platform slug>",
  "related_platform": "<second platform slug or null>",
  "knowledge_type": "<capability|limitation|pricing_constraint|api_detail|integration_spec|feature>",
  "category": "<automations|integrations|permissions|hierarchy|reporting|views|custom_fields|templates|api|pricing|other>",
  "title": "<concise summary, max 200 chars>",
  "content": "<full detail>",
  "platform_version": "<version or empty string>",
  "confidence_score": <0.0-1.0>
}

COMMUNITY INSIGHT ITEM SCHEMA:
{
  "platforms": ["<platform slug>", ...],
  "insight_type": "<methodology|workaround|complaint|best_practice|feature_request|gotcha>",
  "title": "<concise summary, max 200 chars>",
  "content": "<full detail with context and reasoning>",
  "applies_to_industries": ["<industry>", ...],
  "confidence_score": <0.0-1.0>
}
"""

USER_PROMPT_TEMPLATE = """\
Analyse the following content and extract all useful information.
Classify each piece as a case file, platform knowledge, or community insight.

PRIMARY PLATFORM FOCUS: {platform}

CONTENT:
---
{content}
---

Be thorough — extract every capability, limitation, integration detail, best practice,
methodology principle, workaround, and gotcha as separate items. A rich source might
yield 15-30 items across all three categories.
"""


class Command(BaseCommand):
    help = "Ingest raw content via prompt — routes to CaseFile, PlatformKnowledge, and/or CommunityInsight"

    def add_arguments(self, parser):
        parser.add_argument("--platform", type=str, required=True,
                            help="Primary platform slug")
        parser.add_argument("--content", type=str, default="",
                            help="Raw content to ingest (or pipe via stdin)")
        parser.add_argument("--source-url", type=str, default="",
                            help="Optional source URL for attribution")
        parser.add_argument("--source-attribution", type=str, default="",
                            help="Optional author/org name")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--auto-approve", action="store_true")

    def handle(self, *args, **options):
        platform_slug = options["platform"]
        content = options["content"]
        source_url = options["source_url"]
        source_attribution = options["source_attribution"]
        dry_run = options["dry_run"]
        auto_approve = options["auto_approve"]

        # Read from stdin if no content provided
        if not content and not sys.stdin.isatty():
            content = sys.stdin.read()

        if not content.strip():
            self.stderr.write(self.style.ERROR("No content provided. Use --content or pipe via stdin."))
            return

        platform = Platform.objects.filter(slug=platform_slug).first()
        if not platform:
            slugs = ", ".join(Platform.objects.values_list("slug", flat=True))
            self.stderr.write(self.style.ERROR(f"Unknown platform '{platform_slug}'. Available: {slugs}"))
            return

        self.stdout.write(f"Content length: {len(content)} characters")
        self.stdout.write("Extracting via Claude...")

        client = Anthropic()
        user_prompt = USER_PROMPT_TEMPLATE.format(
            platform=platform_slug,
            content=content[:50000],
        )

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw = response.content[0].text
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            cleaned = raw.replace("```json", "").replace("```", "").strip()
            try:
                data = json.loads(cleaned)
            except json.JSONDecodeError as e:
                self.stderr.write(self.style.ERROR(f"Failed to parse output: {e}"))
                self.stderr.write(raw[:2000])
                return

        has_cf = data.get("case_file") is not None
        pk_count = len(data.get("platform_knowledge", []))
        ci_count = len(data.get("community_insights", []))
        notes = data.get("meta", {}).get("extraction_notes", "N/A")

        self.stdout.write(f"Extracted: case_file={'yes' if has_cf else 'no'}, "
                          f"{pk_count} platform knowledge, {ci_count} community insights")
        self.stdout.write(f"Notes: {notes}")

        if dry_run:
            self.stdout.write("\n--- DRY RUN ---")
            self.stdout.write(json.dumps(data, indent=2))
            return

        if auto_approve:
            saved = self._save_all(data, source_url, source_attribution, platform_slug)
            self.stdout.write(self.style.SUCCESS(saved))
        else:
            self.stdout.write(json.dumps(data, indent=2))
            confirm = input("\nSave all? [y/n]: ").strip().lower()
            if confirm == "y":
                saved = self._save_all(data, source_url, source_attribution, platform_slug)
                self.stdout.write(self.style.SUCCESS(saved))
            else:
                self.stdout.write("Skipped.")

    def _save_all(self, data, source_url, source_attribution, platform_slug):
        meta = data.get("meta", {})
        attribution = source_attribution or meta.get("source_attribution", "")
        platform_slugs = set(Platform.objects.values_list("slug", flat=True))

        results = []

        # ── Case File ────────────────────────────────────────────────────────
        cf_data = data.get("case_file")
        if cf_data:
            cf = self._save_case_file(cf_data, source_url, attribution, platform_slug, platform_slugs)
            results.append(f"Case file: {cf.name} ({cf.id})")

        # ── Platform Knowledge ───────────────────────────────────────────────
        valid_kt = {c[0] for c in PlatformKnowledge._meta.get_field("knowledge_type").choices}
        valid_kc = {c[0] for c in PlatformKnowledge._meta.get_field("category").choices}
        pk_count = 0

        for item in data.get("platform_knowledge", []):
            plat = Platform.objects.filter(slug=item.get("platform", platform_slug)).first()
            if not plat:
                continue
            related = None
            rel_slug = item.get("related_platform")
            if rel_slug and rel_slug in platform_slugs:
                related = Platform.objects.get(slug=rel_slug)

            k_type = item.get("knowledge_type", "feature")
            if k_type not in valid_kt:
                k_type = "feature"
            category = item.get("category", "other")
            if category not in valid_kc:
                category = "other"

            PlatformKnowledge.objects.create(
                platform=plat,
                related_platform=related,
                knowledge_type=k_type,
                category=category,
                title=item.get("title", "")[:300],
                content=item.get("content", ""),
                source_url=source_url,
                source_attribution=attribution,
                verified_at=timezone.now().date(),
                platform_version=item.get("platform_version", ""),
                confidence_score=item.get("confidence_score"),
            )
            pk_count += 1

        # ── Community Insights ───────────────────────────────────────────────
        valid_it = {c[0] for c in CommunityInsight._meta.get_field("insight_type").choices}
        ci_count = 0

        for item in data.get("community_insights", []):
            i_type = item.get("insight_type", "best_practice")
            if i_type not in valid_it:
                i_type = "best_practice"

            insight = CommunityInsight.objects.create(
                insight_type=i_type,
                title=item.get("title", "")[:300],
                content=item.get("content", ""),
                source_url=source_url,
                source_attribution=attribution,
                source_date=timezone.now().date(),
                confidence_score=item.get("confidence_score"),
                applies_to_industries=item.get("applies_to_industries", []),
            )
            slugs = [s for s in item.get("platforms", [platform_slug]) if s in platform_slugs]
            if slugs:
                insight.platforms.set(Platform.objects.filter(slug__in=slugs))
            ci_count += 1

        results.append(f"Saved {pk_count} platform knowledge + {ci_count} community insights")
        return " | ".join(results)

    def _save_case_file(self, cf_data, source_url, attribution, platform_slug, platform_slugs):
        platform = Platform.objects.filter(slug=cf_data.get("primary_platform", platform_slug)).first()

        intake = cf_data.get("intake_layer") or {}
        case_file = CaseFile.objects.create(
            name=cf_data.get("name", ""),
            primary_platform=platform,
            industries=cf_data.get("industries", []),
            tools=intake.get("tools", []),
            workflow_type=cf_data.get("workflow_type", ""),
            team_size=cf_data.get("team_size", ""),
            source_type="ingested",
            source_url=source_url,
            source_attribution=attribution,
            confidence_score=0.7,
            is_training_data=True,
            status="open",
        )

        connected = [s for s in cf_data.get("connected_platforms", []) if s in platform_slugs]
        if connected:
            case_file.connected_platforms.set(Platform.objects.filter(slug__in=connected))

        if intake:
            IntakeLayer.objects.create(case_file=case_file, **intake)

        audit_data = cf_data.get("audit_layer")
        if audit_data:
            builds = audit_data.pop("builds", [])
            audit = AuditLayer.objects.create(case_file=case_file, **audit_data)
            for i, b in enumerate(builds):
                if b.get("urgency") not in {c.value for c in Urgency}:
                    b["urgency"] = "medium"
                CurrentBuild.objects.create(audit=audit, order=i, **b)

        build_data = cf_data.get("build_layer")
        if build_data:
            containers = build_data.get("containers", [])
            if isinstance(containers, str):
                containers = [containers] if containers else []
            BuildLayer.objects.create(
                case_file=case_file,
                containers=containers,
                spaces=build_data.get("spaces", ""),
                lists=build_data.get("lists", ""),
                statuses=build_data.get("statuses", ""),
                custom_fields=build_data.get("custom_fields", ""),
                automations=build_data.get("automations", ""),
                integrations=build_data.get("integrations", []),
                build_notes=build_data.get("build_notes", ""),
                workflows=build_data.get("workflows", []),
            )

        delta_data = cf_data.get("delta_layer")
        roadblocks = []
        if delta_data:
            roadblocks = delta_data.pop("roadblocks", [])
            delta = DeltaLayer.objects.create(case_file=case_file, **delta_data)
            for i, rb in enumerate(roadblocks):
                if rb.get("type") not in VALID_ROADBLOCK_TYPES:
                    rb["type"] = ""
                if rb.get("severity") not in VALID_SEVERITIES:
                    rb["severity"] = ""
                tch = rb.get("time_cost_hours")
                if tch is not None and not isinstance(tch, (int, float)):
                    rb["time_cost_hours"] = None
                Roadblock.objects.create(delta=delta, order=i, **rb)

        reasoning_data = cf_data.get("reasoning_layer")
        if reasoning_data:
            ReasoningLayer.objects.create(case_file=case_file, **reasoning_data)

        outcome_data = cf_data.get("outcome_layer")
        if outcome_data:
            # Remove None values so model defaults apply (e.g. satisfaction=3)
            outcome_data = {k: v for k, v in outcome_data.items() if v is not None}
            OutcomeLayer.objects.create(case_file=case_file, **outcome_data)
            case_file.satisfaction_score = outcome_data.get("satisfaction")
            case_file.built_outcome = outcome_data.get("built", "")

        case_file.roadblock_count = len(roadblocks)
        case_file.save(update_fields=["satisfaction_score", "built_outcome", "roadblock_count"])

        # Auto-promote to WorkflowTemplate if the case file has build structure
        try:
            from apps.workflows.signals import promote_to_template
            promote_to_template(case_file)
        except Exception:
            pass  # template promotion is best-effort

        return case_file
