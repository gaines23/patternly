"""
management command: ingest_source

Extracts structured case file data from public sources via Claude and saves
them into the Flowpath schema.

Usage:
    # Single URL
    python manage.py ingest_source --url "https://example.com/blog-post" \
        --platform clickup --type blog_post

    # Dry run — extract and print JSON without saving
    python manage.py ingest_source --url "https://example.com/blog-post" \
        --platform clickup --dry-run

    # Auto-approve high-confidence extractions (>= 0.7)
    python manage.py ingest_source --url "https://example.com/blog-post" \
        --platform monday --auto-approve
"""

import json
import re
from html import unescape

import httpx
from anthropic import Anthropic
from django.core.management.base import BaseCommand

from apps.briefs.models import (
    AuditLayer,
    BuildLayer,
    CaseFile,
    CurrentBuild,
    DeltaLayer,
    IntakeLayer,
    OutcomeLayer,
    Platform,
    ReasoningLayer,
    Roadblock,
    RoadblockType,
    Severity,
    Urgency,
)

SOURCE_TYPES = ["blog_post", "youtube_transcript", "forum_thread", "template_doc", "case_study"]

VALID_ROADBLOCK_TYPES = {c.value for c in RoadblockType}
VALID_SEVERITIES = {c.value for c in Severity}
VALID_URGENCIES = {c.value for c in Urgency}

SYSTEM_PROMPT = """\
You are a workflow intelligence analyst for Flowpath, a platform that documents
and analyses workflow implementations across project management and automation tools.

Your task is to extract structured case file data from public sources — blog posts,
YouTube transcripts, community forum threads, template documentation, and case studies —
and output it in Flowpath's 6-layer schema.

IMPORTANT RULES:
- Only extract information that is explicitly stated or strongly implied in the source.
- Never fabricate specific numbers, company names, or tool configurations.
- If a layer has no data available from the source, return null for that layer.
- Assign a confidence_score (0.0 to 1.0) based on how much concrete detail the source provides.
- Mark the source_type as "ingested" and include the source URL.

OUTPUT FORMAT:
Return a single JSON object following this exact schema. Do not include markdown
fences, preamble, or explanation — only the raw JSON.

{
  "meta": {
    "source_url": "<url>",
    "source_type": "ingested",
    "source_attribution": "<author or organisation name>",
    "confidence_score": <0.0-1.0>,
    "extraction_notes": "<brief note on data quality and what was inferred vs explicit>"
  },
  "case_file": {
    "name": "<descriptive name for this workflow setup>",
    "primary_platform": "<platform slug: clickup|monday|asana|zapier|make|airtable|notion|hubspot|other>",
    "connected_platforms": ["<slug>", ...],
    "industries": ["<industry>", ...],
    "workflow_type": "<e.g. Project Management, Client Onboarding, Campaign Management>",
    "team_size": "<number or empty string>",
    "status": "open"
  },
  "intake_layer": {
    "raw_prompt": "<summarised description of the team's situation and needs>",
    "industries": ["<same as case_file.industries>"],
    "team_size": "<number or empty string>",
    "workflow_type": "<same as case_file.workflow_type>",
    "process_frameworks": ["<e.g. Kanban, Phase Gate, Agile, Milestones & Deliverables>"],
    "tools": ["<tool names used>"],
    "pain_points": ["<specific pain points mentioned>"],
    "prior_attempts": "<what they tried before, or empty string>"
  },
  "audit_layer": {
    "has_existing": <true|false>,
    "overall_assessment": "<assessment of their previous setup, or empty string>",
    "tried_to_fix": <true|false|null>,
    "previous_fixes": "<what fixes they attempted, or empty string>",
    "pattern_summary": "<pattern observed>",
    "builds": [
      {
        "tool": "<tool name>",
        "structure": "<how they were using the tool>",
        "failure_reasons": ["<why it wasn't working>"],
        "what_breaks": "<specific breakdowns>",
        "workarounds_they_use": "<manual workarounds>",
        "how_long_broken": "<duration>",
        "who_reported": "<role>",
        "integrations_in_place": ["<integrations>"],
        "impact_on_team": "<description>",
        "urgency": "<low|medium|high|critical>"
      }
    ]
  },
  "build_layer": {
    "containers": ["<top-level organisational units>"],
    "spaces": "<space names>",
    "lists": "<list/board names>",
    "statuses": "<status progression>",
    "custom_fields": "<field descriptions>",
    "automations": "<automation descriptions>",
    "integrations": ["<integration names>"],
    "build_notes": "<general notes>",
    "workflows": [
      {
        "name": "<workflow name>",
        "platform": "<platform slug>",
        "work_units": [
          {
            "name": "<list/board/group name>",
            "status_flow": "<status progression>",
            "custom_data": [{"name": "<field>", "type": "<type>"}],
            "automations": [
              {
                "platform": "<where automation runs>",
                "trigger": {"type": "<trigger type>", "detail": "<specifics>"},
                "actions": [{"type": "<action type>", "detail": "<specifics>"}]
              }
            ]
          }
        ],
        "integrations": [
          {
            "source_platform": "<slug>",
            "target_platform": "<slug>",
            "via": "<native|zapier|make|api>",
            "data_flow": "<what data moves and when>",
            "known_limitations": "<any noted limitations>"
          }
        ],
        "pipeline": ["<pipeline phase names>"],
        "notes": "<implementation notes>"
      }
    ]
  },
  "delta_layer": {
    "user_intent": "<what the team wanted to achieve>",
    "success_criteria": "<how they defined success>",
    "actual_build": "<what was actually built>",
    "diverged": <true|false|null>,
    "divergence_reason": "<why the build diverged from intent, or empty string>",
    "compromises": "<compromises made>",
    "scope_creep": ["<scope creep items>"],
    "roadblocks": [
      {
        "type": "<integration_limitation|automation_limitation|platform_bug|user_behavior_gap|scope_creep_block|api_limitation|data_mapping_mismatch|auth_complexity|timing_conflict|cost_ceiling>",
        "severity": "<high|medium|low|blocker>",
        "tools_affected": ["<tool names>"],
        "description": "<what the roadblock was>",
        "workaround_found": <true|false>,
        "workaround_description": "<the workaround, or empty string>",
        "time_cost_hours": <number or null>,
        "future_warning": "<warning for future implementations>",
        "flag_for_future": true
      }
    ]
  },
  "reasoning_layer": {
    "why_structure": "<rationale for the chosen structure>",
    "alternatives": "<alternative approaches considered>",
    "why_rejected": "<why alternatives were rejected>",
    "assumptions": "<assumptions made in the design>",
    "when_opposite": "<when a different approach would be better>",
    "lessons": "<lessons learned>",
    "complexity": <1-5>
  },
  "outcome_layer": {
    "built": "<yes|partially|no>",
    "block_reason": "<what blocked completion, or empty string>",
    "changes": "<changes from original plan>",
    "what_worked": "<what succeeded>",
    "what_failed": "<what didn't work>",
    "satisfaction": <1-5 or null>,
    "recommend": "<yes|maybe|no>",
    "revisit_when": "<conditions for revisiting>"
  }
}
"""

USER_PROMPT_TEMPLATE = """\
Analyse the following source content and extract a structured Flowpath case file.

SOURCE URL: {url}
SOURCE TYPE: {source_type}  (blog_post | youtube_transcript | forum_thread | template_doc | case_study)
PLATFORM FOCUS: {platform}  (clickup | monday | asana | zapier | make | airtable | notion | hubspot | mixed)

CONTENT:
---
{content}
---

Extract all workflow configuration details, pain points, roadblocks, and outcomes
into the Flowpath schema. Focus especially on:
1. The specific tool hierarchy and structure they built
2. Automations and integration patterns (triggers, actions, platforms involved)
3. What broke, what limitations they hit, and how they worked around them
4. The industry, team size, and workflow type

If any layer has insufficient data from the source, return null for that layer.
Return a single JSON object.
"""


class Command(BaseCommand):
    help = "Ingest a public source into a Flowpath case file via Claude extraction"

    def add_arguments(self, parser):
        parser.add_argument("--url", type=str, required=True, help="URL to ingest")
        parser.add_argument("--platform", type=str, default="clickup",
                            help="Primary platform slug (default: clickup)")
        parser.add_argument("--type", type=str, default="blog_post",
                            choices=SOURCE_TYPES, dest="source_type",
                            help="Source content type (default: blog_post)")
        parser.add_argument("--dry-run", action="store_true",
                            help="Extract and print JSON without saving to DB")
        parser.add_argument("--auto-approve", action="store_true",
                            help="Skip review for high-confidence extractions (>= 0.7)")

    def handle(self, *args, **options):
        url = options["url"]
        platform = options["platform"]
        source_type = options["source_type"]
        dry_run = options["dry_run"]
        auto_approve = options["auto_approve"]

        # 1. Fetch content
        self.stdout.write(f"Fetching: {url}")
        content = self._fetch_content(url)
        if not content:
            self.stderr.write(self.style.ERROR(f"Failed to fetch content from {url}"))
            return

        self.stdout.write(f"Fetched {len(content)} characters")

        # 2. Extract via Claude
        self.stdout.write("Extracting case file data via Claude...")
        client = Anthropic()

        user_prompt = USER_PROMPT_TEMPLATE.format(
            url=url,
            source_type=source_type,
            platform=platform,
            content=content[:50000],
        )

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_output = response.content[0].text

        # 3. Parse JSON
        try:
            case_data = json.loads(raw_output)
        except json.JSONDecodeError:
            cleaned = raw_output.replace("```json", "").replace("```", "").strip()
            try:
                case_data = json.loads(cleaned)
            except json.JSONDecodeError as e:
                self.stderr.write(self.style.ERROR(f"Failed to parse Claude output: {e}"))
                self.stderr.write(raw_output[:2000])
                return

        confidence = case_data.get("meta", {}).get("confidence_score", 0)
        notes = case_data.get("meta", {}).get("extraction_notes", "N/A")
        name = case_data.get("case_file", {}).get("name", "Unknown")

        self.stdout.write(f"Name: {name}")
        self.stdout.write(f"Confidence: {confidence}")
        self.stdout.write(f"Notes: {notes}")

        if dry_run:
            self.stdout.write("\n--- DRY RUN (not saving) ---")
            self.stdout.write(json.dumps(case_data, indent=2))
            return

        # 4. Save or queue for review
        if auto_approve and confidence >= 0.7:
            cf = self._save_case_file(case_data)
            self.stdout.write(self.style.SUCCESS(f"Saved case file: {cf.name} ({cf.id})"))
        elif confidence >= 0.5:
            self.stdout.write("\n--- REVIEW REQUIRED ---")
            self.stdout.write(json.dumps(case_data, indent=2))
            confirm = input("\nSave this case file? [y/n]: ").strip().lower()
            if confirm == "y":
                cf = self._save_case_file(case_data)
                self.stdout.write(self.style.SUCCESS(f"Saved case file: {cf.name} ({cf.id})"))
            else:
                self.stdout.write("Skipped.")
        else:
            self.stdout.write(self.style.WARNING(
                f"Low confidence ({confidence}). Skipping."
            ))
            self.stdout.write(json.dumps(case_data, indent=2))

    def _fetch_content(self, url):
        """Fetch and convert HTML to plain text."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
        }

        # Reddit blocks bots — use their public JSON API instead
        if "reddit.com" in url:
            return self._fetch_reddit(url, headers)

        try:
            resp = httpx.get(url, timeout=30, follow_redirects=True, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.stderr.write(f"HTTP error: {e}")
            return None

        # Strip HTML tags → plain text
        text = re.sub(r"<script[^>]*>.*?</script>", " ", resp.text, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = unescape(text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _fetch_reddit(self, url, headers):
        """Fetch Reddit post content via the public JSON API."""
        json_url = url.rstrip("/") + ".json"
        try:
            resp = httpx.get(json_url, timeout=30, follow_redirects=True, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError) as e:
            self.stderr.write(f"Reddit fetch error: {e}")
            return None

        parts = []
        # Post data is in data[0].data.children[0].data
        try:
            post = data[0]["data"]["children"][0]["data"]
            parts.append(f"Title: {post.get('title', '')}")
            if post.get("selftext"):
                parts.append(post["selftext"])
        except (IndexError, KeyError, TypeError):
            self.stderr.write("Could not parse Reddit post data.")
            return None

        # Top-level comments are in data[1].data.children
        try:
            comments = data[1]["data"]["children"]
            for c in comments[:20]:
                body = c.get("data", {}).get("body", "")
                if body:
                    parts.append(f"Comment: {body}")
        except (IndexError, KeyError, TypeError):
            pass

        return "\n\n".join(parts).strip() or None

    def _clean_case_data(self, case_data):
        """Normalise Claude output to match model constraints."""
        platform_slugs = set(Platform.objects.values_list("slug", flat=True))

        # connected_platforms: drop unknown slugs
        cf = case_data.get("case_file", {})
        cf["connected_platforms"] = [
            s for s in cf.get("connected_platforms", []) if s in platform_slugs
        ]

        # build_layer.containers: ensure it's a list
        build = case_data.get("build_layer")
        if build:
            containers = build.get("containers", [])
            if isinstance(containers, str):
                build["containers"] = [containers] if containers else []

        # delta_layer.roadblocks: clamp type/severity to valid choices
        delta = case_data.get("delta_layer")
        if delta:
            for rb in delta.get("roadblocks", []):
                if rb.get("type") not in VALID_ROADBLOCK_TYPES:
                    rb["type"] = ""
                if rb.get("severity") not in VALID_SEVERITIES:
                    rb["severity"] = ""
                # Ensure time_cost_hours is a number or None
                tch = rb.get("time_cost_hours")
                if tch is not None and not isinstance(tch, (int, float)):
                    rb["time_cost_hours"] = None

        # audit_layer.builds: clamp urgency
        audit = case_data.get("audit_layer")
        if audit:
            for b in audit.get("builds", []):
                if b.get("urgency") not in VALID_URGENCIES:
                    b["urgency"] = "medium"

        return case_data

    def _save_case_file(self, case_data):
        """Map extracted JSON to Django models and save."""
        case_data = self._clean_case_data(case_data)

        cf_data = case_data["case_file"]
        meta = case_data["meta"]

        platform = Platform.objects.filter(slug=cf_data.get("primary_platform", "")).first()

        # Build the tools list from intake tools (more complete than connected_platforms)
        intake_tools = []
        intake = case_data.get("intake_layer")
        if intake:
            intake_tools = intake.get("tools", [])

        case_file = CaseFile.objects.create(
            name=cf_data.get("name", ""),
            primary_platform=platform,
            industries=cf_data.get("industries", []),
            tools=intake_tools,
            workflow_type=cf_data.get("workflow_type", ""),
            team_size=cf_data.get("team_size", ""),
            source_type="ingested",
            source_url=meta.get("source_url", ""),
            source_attribution=meta.get("source_attribution", ""),
            confidence_score=meta.get("confidence_score"),
            is_training_data=True,
            status="open",
        )

        # M2M: connected platforms
        connected_slugs = cf_data.get("connected_platforms", [])
        if connected_slugs:
            platforms = Platform.objects.filter(slug__in=connected_slugs)
            case_file.connected_platforms.set(platforms)

        # Layer 1: Audit
        audit_data = case_data.get("audit_layer")
        if audit_data:
            builds = audit_data.pop("builds", [])
            audit = AuditLayer.objects.create(case_file=case_file, **audit_data)
            for i, b in enumerate(builds):
                CurrentBuild.objects.create(audit=audit, order=i, **b)

        # Layer 2: Intake
        intake_data = case_data.get("intake_layer")
        if intake_data:
            IntakeLayer.objects.create(case_file=case_file, **intake_data)

        # Layer 3: Build
        build_data = case_data.get("build_layer")
        if build_data:
            BuildLayer.objects.create(
                case_file=case_file,
                containers=build_data.get("containers", []),
                spaces=build_data.get("spaces", ""),
                lists=build_data.get("lists", ""),
                statuses=build_data.get("statuses", ""),
                custom_fields=build_data.get("custom_fields", ""),
                automations=build_data.get("automations", ""),
                integrations=build_data.get("integrations", []),
                build_notes=build_data.get("build_notes", ""),
                workflows=build_data.get("workflows", []),
            )

        # Layer 4: Delta + Roadblocks
        delta_data = case_data.get("delta_layer")
        if delta_data:
            roadblocks = delta_data.pop("roadblocks", [])
            delta = DeltaLayer.objects.create(case_file=case_file, **delta_data)
            for i, rb in enumerate(roadblocks):
                Roadblock.objects.create(delta=delta, order=i, **rb)

        # Layer 5: Reasoning
        reasoning_data = case_data.get("reasoning_layer")
        if reasoning_data:
            ReasoningLayer.objects.create(case_file=case_file, **reasoning_data)

        # Layer 6: Outcome
        outcome_data = case_data.get("outcome_layer")
        if outcome_data:
            # Remove None values so model defaults apply (e.g. satisfaction=3)
            outcome_data = {k: v for k, v in outcome_data.items() if v is not None}
            OutcomeLayer.objects.create(case_file=case_file, **outcome_data)

        # Denormalise outcome signals
        if outcome_data:
            case_file.satisfaction_score = outcome_data.get("satisfaction")
            case_file.built_outcome = outcome_data.get("built", "")
        if delta_data:
            case_file.roadblock_count = len(roadblocks)
        case_file.save(update_fields=[
            "satisfaction_score", "built_outcome", "roadblock_count",
        ])

        # Auto-promote to WorkflowTemplate if the case file has build structure
        try:
            from apps.workflows.signals import promote_to_template
            promote_to_template(case_file)
        except Exception:
            pass  # template promotion is best-effort

        return case_file
