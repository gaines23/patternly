"""
management command: batch_ingest_patternly

Batch-ingests all URLs from the Patternly ingestion source list through
the same pipeline as the ingest_knowledge command (Claude extraction →
PlatformKnowledge / CommunityInsight models).

Usage:
    # Full run with auto-approve
    python manage.py batch_ingest_patternly

    # Dry run — extract and print, don't save
    python manage.py batch_ingest_patternly --dry-run

    # Resume from a specific index (e.g. after a failure at #42)
    python manage.py batch_ingest_patternly --start-from 42

    # Only process a specific platform
    python manage.py batch_ingest_patternly --only-platform clickup
"""

import json
import re
import time
from html import unescape

import httpx
from anthropic import Anthropic
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.briefs.models import (
    CommunityInsight,
    Platform,
    PlatformKnowledge,
)

# ---------------------------------------------------------------------------
# URL registry — each entry: (url, platform_slug, content_type, description)
# content_type: platform_doc | community_post | integration_doc | changelog
# ---------------------------------------------------------------------------

URLS = [
    # ===== CLICKUP =====
    # Official Docs & Guides
    ("https://clickup.com/api/", "clickup", "platform_doc", "API reference"),
    ("https://docs.clickup.com/", "clickup", "platform_doc", "Help center"),
    ("https://clickup.com/integrations", "clickup", "integration_doc", "Integrations list"),
    ("https://clickup.com/automations", "clickup", "platform_doc", "Automation documentation"),
    ("https://clickup.com/features/custom-fields", "clickup", "platform_doc", "Custom fields reference"),
    ("https://clickup.com/features/views", "clickup", "platform_doc", "Views documentation"),
    ("https://clickup.com/features/dashboards", "clickup", "platform_doc", "Dashboard capabilities"),
    ("https://clickup.com/pricing", "clickup", "platform_doc", "Plan tier comparison"),
    # Community & Learning
    ("https://community.clickup.com/", "clickup", "community_post", "Official community forum"),
    ("https://university.clickup.com/", "clickup", "community_post", "ClickUp University"),
    ("https://clickup.com/blog", "clickup", "community_post", "Official blog"),
    ("https://clickup.com/templates", "clickup", "platform_doc", "Template library"),

    # ===== MONDAY.COM =====
    # Official Docs & Guides
    ("https://developer.monday.com/api-reference", "monday", "platform_doc", "API reference"),
    ("https://support.monday.com/hc/en-us", "monday", "platform_doc", "Help center"),
    ("https://monday.com/integrations", "monday", "integration_doc", "Integrations directory"),
    ("https://monday.com/templates", "monday", "platform_doc", "Template center"),
    ("https://monday.com/pricing", "monday", "platform_doc", "Plan comparison"),
    # Community & Learning
    ("https://community.monday.com/", "monday", "community_post", "Official community forum"),
    ("https://monday.com/blog", "monday", "community_post", "Official blog"),
    ("https://monday.com/webinars", "monday", "community_post", "Webinars and guides"),

    # ===== ZAPIER =====
    # Official Docs & Guides
    ("https://platform.zapier.com/docs/api", "zapier", "platform_doc", "API reference"),
    ("https://zapier.com/apps", "zapier", "integration_doc", "App directory"),
    ("https://zapier.com/app/editor/templates", "zapier", "platform_doc", "Template library"),
    ("https://help.zapier.com/", "zapier", "platform_doc", "Help center"),
    # Community & Learning
    ("https://community.zapier.com/", "zapier", "community_post", "Community forum"),
    ("https://zapier.com/blog", "zapier", "community_post", "Blog"),
    ("https://zapier.com/resources", "zapier", "community_post", "Resources hub"),

    # ===== MAKE (INTEGROMAT) =====
    # Official Docs & Guides
    ("https://www.make.com/en/api-documentation", "make", "platform_doc", "API reference"),
    ("https://www.make.com/en/integrations", "make", "integration_doc", "Integration directory"),
    ("https://www.make.com/en/templates", "make", "platform_doc", "Template gallery"),
    ("https://www.make.com/en/help", "make", "platform_doc", "Help center"),
    # Community & Learning
    ("https://www.make.com/en/community", "make", "community_post", "Community forum"),
    ("https://www.make.com/en/blog", "make", "community_post", "Blog"),
    ("https://academy.make.com/", "make", "community_post", "Make Academy"),

    # ===== HUBSPOT =====
    # Official Docs & Guides
    ("https://developers.hubspot.com/docs/api/overview", "hubspot", "platform_doc", "API reference"),
    ("https://knowledge.hubspot.com/", "hubspot", "platform_doc", "Knowledge base"),
    ("https://ecosystem.hubspot.com/marketplace/apps", "hubspot", "integration_doc", "App marketplace"),
    ("https://www.hubspot.com/pricing", "hubspot", "platform_doc", "Plan comparison"),
    ("https://developers.hubspot.com/docs/api/crm/understanding-the-crm", "hubspot", "platform_doc", "CRM API guide"),
    # Community & Learning
    ("https://community.hubspot.com/", "hubspot", "community_post", "Community forum"),
    ("https://academy.hubspot.com/", "hubspot", "community_post", "HubSpot Academy"),
    ("https://blog.hubspot.com/", "hubspot", "community_post", "Blog"),
    ("https://www.hubspot.com/resources", "hubspot", "community_post", "Resources"),

    # ===== SALESFORCE =====
    # Official Docs & Guides
    ("https://developer.salesforce.com/docs/apis", "salesforce", "platform_doc", "API reference"),
    ("https://help.salesforce.com/", "salesforce", "platform_doc", "Help center"),
    ("https://appexchange.salesforce.com/", "salesforce", "integration_doc", "AppExchange"),
    # Community & Learning
    ("https://trailhead.salesforce.com/", "salesforce", "community_post", "Trailhead"),
    ("https://developer.salesforce.com/forums", "salesforce", "community_post", "Developer forums"),
    ("https://www.salesforce.com/blog/", "salesforce", "community_post", "Blog"),

    # ===== SLACK =====
    ("https://api.slack.com/", "slack", "platform_doc", "API documentation"),
    ("https://slack.com/integrations", "slack", "integration_doc", "App directory"),
    ("https://slack.com/help/articles", "slack", "platform_doc", "Help center"),
    ("https://api.slack.com/automation", "slack", "platform_doc", "Workflow Builder docs"),

    # ===== GITHUB =====
    ("https://docs.github.com/en/rest", "github", "platform_doc", "REST API reference"),
    ("https://github.com/features/actions", "github", "platform_doc", "Actions documentation"),
    ("https://docs.github.com/en/webhooks", "github", "platform_doc", "Webhooks reference"),
    ("https://github.com/marketplace", "github", "integration_doc", "Marketplace"),

    # ===== MICROSOFT TEAMS =====
    ("https://learn.microsoft.com/en-us/microsoftteams/", "microsoft-teams", "platform_doc", "Teams documentation"),
    ("https://learn.microsoft.com/en-us/graph/teams-concept-overview", "microsoft-teams", "platform_doc", "Graph API for Teams"),
    ("https://learn.microsoft.com/en-us/power-automate/", "microsoft-teams", "platform_doc", "Power Automate"),

    # ===== ZOOM =====
    ("https://developers.zoom.us/docs/api/", "zoom", "platform_doc", "API reference"),
    ("https://marketplace.zoom.us/", "zoom", "integration_doc", "App marketplace"),
    ("https://support.zoom.com/", "zoom", "platform_doc", "Help center"),

    # ===== DOCUSIGN =====
    ("https://developers.docusign.com/", "docusign", "platform_doc", "Developer center"),
    ("https://developers.docusign.com/docs/esign-rest-api/", "docusign", "platform_doc", "eSign API reference"),
    ("https://support.docusign.com/", "docusign", "platform_doc", "Help center"),

    # ===== STRIPE =====
    ("https://docs.stripe.com/api", "stripe", "platform_doc", "API reference"),
    ("https://docs.stripe.com/webhooks", "stripe", "platform_doc", "Webhooks documentation"),
    ("https://docs.stripe.com/connect", "stripe", "platform_doc", "Connect platform docs"),
    ("https://docs.stripe.com/billing", "stripe", "platform_doc", "Billing/subscription docs"),

    # ===== GOOGLE DRIVE =====
    ("https://developers.google.com/drive/api", "google-drive", "platform_doc", "Drive API reference"),
    ("https://support.google.com/drive", "google-drive", "platform_doc", "Help center"),
    ("https://workspace.google.com/marketplace", "google-drive", "integration_doc", "Workspace marketplace"),

    # ===== FIGMA =====
    ("https://www.figma.com/developers/api", "figma", "platform_doc", "API reference"),
    ("https://help.figma.com/", "figma", "platform_doc", "Help center"),
    ("https://www.figma.com/community", "figma", "community_post", "Community (plugins, templates)"),

    # ===== CROSS-PLATFORM INTEGRATION GUIDES =====
    ("https://zapier.com/apps/clickup/integrations", "clickup", "integration_doc", "ClickUp Zapier integrations"),
    ("https://zapier.com/apps/hubspot/integrations", "hubspot", "integration_doc", "HubSpot Zapier integrations"),
    ("https://zapier.com/apps/monday/integrations", "monday", "integration_doc", "Monday Zapier integrations"),
    ("https://zapier.com/apps/salesforce/integrations", "salesforce", "integration_doc", "Salesforce Zapier integrations"),
    ("https://www.make.com/en/integrations/clickup", "clickup", "integration_doc", "ClickUp Make scenarios"),
    ("https://www.make.com/en/integrations/hubspot-crm", "hubspot", "integration_doc", "HubSpot Make scenarios"),
    ("https://www.make.com/en/integrations/monday", "monday", "integration_doc", "Monday Make scenarios"),
]

# YouTube channels — logged but skipped (need specific video URLs for transcript extraction)
YOUTUBE_CHANNELS = [
    ("https://www.youtube.com/@ClickUp", "clickup", "Official channel"),
    ("https://www.youtube.com/@ZenPilot", "clickup", "ZenPilot (500+ ClickUp implementation videos)"),
    ("https://www.youtube.com/@ProcessDriven", "clickup", "ProcessDriven (ClickUp tutorials)"),
    ("https://www.youtube.com/@LaunchpadbyClickUp", "clickup", "Launchpad by ClickUp"),
    ("https://www.youtube.com/@mondaydotcom", "monday", "Official channel"),
    ("https://www.youtube.com/@zapaborr", "zapier", "Official channel"),
    ("https://www.youtube.com/@MakeHQ", "make", "Official channel"),
    ("https://www.youtube.com/@HubSpot", "hubspot", "Official channel"),
    ("https://www.youtube.com/@salesforce", "salesforce", "Official channel"),
    ("https://www.youtube.com/@SlackHQ", "slack", "Official channel"),
]

# Reuse the same system prompt from ingest_knowledge
SYSTEM_PROMPT = """\
You are a workflow intelligence analyst for Flowpath, a platform that documents
and analyses workflow implementations across project management and automation tools.

Your task is to extract structured knowledge from public sources and classify each
piece of information as either PLATFORM KNOWLEDGE (factual, verifiable) or
COMMUNITY INSIGHT (experiential, opinionated).

CLASSIFICATION RULES:
- Platform Knowledge: capabilities, limitations, API details, pricing constraints,
  integration specs, feature documentation, official best practices.
  These are FACTS about what a platform can or cannot do.
- Community Insight: methodologies, workarounds, complaints, gotchas, best practices
  from practitioners, feature requests, opinions on how to use tools.
  These are LEARNED WISDOM from people who use the tools.

A single source often contains BOTH types. Extract all of them.

IMPORTANT RULES:
- Only extract information that is explicitly stated or strongly implied.
- Never fabricate specific details.
- Assign confidence_score: official docs (0.9+), practitioner blog (0.7-0.8),
  forum post (0.5-0.7), unverified claim (0.3-0.5).
- Skip information that is clearly outdated (pre-2024) unless it's about
  fundamental platform architecture that hasn't changed.
- For integration-related knowledge, always specify both platforms involved.

OUTPUT FORMAT:
Return a single JSON object. Do not include markdown fences or explanation.

{
  "meta": {
    "source_url": "<url>",
    "source_attribution": "<author or organisation name>",
    "extraction_notes": "<brief note on data quality>"
  },
  "platform_knowledge": [
    {
      "platform": "<primary platform slug>",
      "related_platform": "<second platform slug if integration-related, or null>",
      "knowledge_type": "<capability|limitation|pricing_constraint|api_detail|integration_spec|feature>",
      "category": "<automations|integrations|permissions|hierarchy|reporting|views|custom_fields|templates|api|pricing|other>",
      "title": "<concise summary, max 200 chars>",
      "content": "<full detail — be specific about versions, constraints, and conditions>",
      "platform_version": "<version if mentioned, or empty string>",
      "confidence_score": <0.0-1.0>
    }
  ],
  "community_insights": [
    {
      "platforms": ["<platform slug>", ...],
      "insight_type": "<methodology|workaround|complaint|best_practice|feature_request|gotcha>",
      "title": "<concise summary, max 200 chars>",
      "content": "<full detail — include context, reasoning, and any caveats>",
      "applies_to_industries": ["<industry>", ...],
      "confidence_score": <0.0-1.0>
    }
  ]
}
"""

USER_PROMPT_TEMPLATE = """\
Analyse the following source and extract all platform knowledge and community insights.

SOURCE URL: {url}
CONTENT TYPE: {content_type}
PRIMARY PLATFORM: {platform}

CONTENT:
---
{content}
---

Extract every distinct piece of knowledge or insight. A long blog post might yield
10-20 items. Be thorough — each capability, limitation, integration detail, best
practice, and gotcha should be its own entry.
"""


class Command(BaseCommand):
    help = "Batch-ingest all Patternly source URLs into PlatformKnowledge / CommunityInsight"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Extract and print JSON without saving")
        parser.add_argument("--start-from", type=int, default=0,
                            help="Resume from this index (0-based)")
        parser.add_argument("--only-platform", type=str, default=None,
                            help="Only process URLs for this platform slug")
        parser.add_argument("--delay", type=float, default=2.0,
                            help="Seconds to wait between API calls (default: 2)")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        start_from = options["start_from"]
        only_platform = options["only_platform"]
        delay = options["delay"]

        # Filter URLs
        urls_to_process = list(enumerate(URLS))
        if only_platform:
            urls_to_process = [
                (i, entry) for i, entry in urls_to_process
                if entry[1] == only_platform
            ]
        if start_from > 0:
            urls_to_process = [
                (i, entry) for i, entry in urls_to_process
                if i >= start_from
            ]

        total = len(urls_to_process)
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\nPatternly Batch Ingestion: {total} URLs to process"
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — nothing will be saved"))

        # Log skipped YouTube channels
        self.stdout.write(f"\nSkipping {len(YOUTUBE_CHANNELS)} YouTube channel URLs "
                          "(need specific video URLs for transcript extraction):")
        for yt_url, yt_platform, yt_desc in YOUTUBE_CHANNELS:
            self.stdout.write(f"  SKIP  {yt_platform}: {yt_url} — {yt_desc}")

        self.stdout.write("")

        # Validate platforms exist
        platform_slugs = set(Platform.objects.values_list("slug", flat=True))
        client = Anthropic()

        # Valid choices for cleaning
        valid_knowledge_types = {c[0] for c in PlatformKnowledge._meta.get_field("knowledge_type").choices}
        valid_categories = {c[0] for c in PlatformKnowledge._meta.get_field("category").choices}
        valid_insight_types = {c[0] for c in CommunityInsight._meta.get_field("insight_type").choices}

        results = {"success": 0, "failed": 0, "skipped": 0, "pk_total": 0, "ci_total": 0}
        failures = []

        for idx, (url, platform_slug, content_type, description) in urls_to_process:
            self.stdout.write(self.style.MIGRATE_HEADING(
                f"\n[{idx + 1}/{len(URLS)}] {platform_slug} — {description}"
            ))
            self.stdout.write(f"  URL: {url}")
            self.stdout.write(f"  Type: {content_type}")

            if platform_slug not in platform_slugs:
                self.stdout.write(self.style.WARNING(
                    f"  SKIP: Platform '{platform_slug}' not in database"
                ))
                results["skipped"] += 1
                continue

            # 1. Fetch content
            content = self._fetch_content(url)
            if not content:
                self.stdout.write(self.style.ERROR(f"  FAIL: Could not fetch content"))
                results["failed"] += 1
                failures.append((idx, url, "fetch_failed"))
                continue

            if len(content) < 100:
                self.stdout.write(self.style.WARNING(
                    f"  SKIP: Content too short ({len(content)} chars) — likely a JS-rendered page"
                ))
                results["skipped"] += 1
                failures.append((idx, url, "content_too_short"))
                continue

            self.stdout.write(f"  Fetched {len(content)} chars")

            # 2. Extract via Claude
            self.stdout.write("  Extracting via Claude...")
            try:
                user_prompt = USER_PROMPT_TEMPLATE.format(
                    url=url,
                    content_type=content_type,
                    platform=platform_slug,
                    content=content[:50000],
                )

                response = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=8192,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_prompt}],
                )
                raw_output = response.content[0].text
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  FAIL: Claude API error: {e}"))
                results["failed"] += 1
                failures.append((idx, url, f"api_error: {e}"))
                time.sleep(delay)
                continue

            # 3. Parse JSON
            try:
                data = json.loads(raw_output)
            except json.JSONDecodeError:
                cleaned = raw_output.replace("```json", "").replace("```", "").strip()
                try:
                    data = json.loads(cleaned)
                except json.JSONDecodeError as e:
                    self.stdout.write(self.style.ERROR(f"  FAIL: JSON parse error: {e}"))
                    results["failed"] += 1
                    failures.append((idx, url, f"parse_error: {e}"))
                    time.sleep(delay)
                    continue

            pk_items = data.get("platform_knowledge", [])
            ci_items = data.get("community_insights", [])
            notes = data.get("meta", {}).get("extraction_notes", "N/A")

            self.stdout.write(f"  Extracted: {len(pk_items)} platform knowledge, {len(ci_items)} community insights")
            self.stdout.write(f"  Notes: {notes}")

            # Calculate average confidence
            all_scores = [
                item.get("confidence_score", 0)
                for item in pk_items + ci_items
                if item.get("confidence_score") is not None
            ]
            avg_confidence = sum(all_scores) / len(all_scores) if all_scores else 0
            self.stdout.write(f"  Avg confidence: {avg_confidence:.2f}")

            if dry_run:
                self.stdout.write(self.style.WARNING("  DRY RUN — skipping save"))
                results["success"] += 1
                results["pk_total"] += len(pk_items)
                results["ci_total"] += len(ci_items)
                time.sleep(delay)
                continue

            if avg_confidence < 0.4:
                self.stdout.write(self.style.WARNING(
                    f"  SKIP: Low confidence ({avg_confidence:.2f})"
                ))
                results["skipped"] += 1
                failures.append((idx, url, f"low_confidence: {avg_confidence:.2f}"))
                time.sleep(delay)
                continue

            # 4. Save
            try:
                pk_count, ci_count = self._save_all(
                    data, url, platform_slug, platform_slugs,
                    valid_knowledge_types, valid_categories, valid_insight_types,
                )
                self.stdout.write(self.style.SUCCESS(
                    f"  Saved {pk_count} platform knowledge + {ci_count} community insights"
                ))
                results["success"] += 1
                results["pk_total"] += pk_count
                results["ci_total"] += ci_count
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  FAIL: Save error: {e}"))
                results["failed"] += 1
                failures.append((idx, url, f"save_error: {e}"))

            time.sleep(delay)

        # Summary
        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 60))
        self.stdout.write(self.style.MIGRATE_HEADING("BATCH INGESTION COMPLETE"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 60))
        self.stdout.write(f"  Success:  {results['success']}")
        self.stdout.write(f"  Failed:   {results['failed']}")
        self.stdout.write(f"  Skipped:  {results['skipped']}")
        self.stdout.write(f"  Total PK: {results['pk_total']}")
        self.stdout.write(f"  Total CI: {results['ci_total']}")

        if failures:
            self.stdout.write(self.style.WARNING("\nFailures (re-run with --start-from <idx>):"))
            for idx, url, reason in failures:
                self.stdout.write(f"  [{idx}] {url} — {reason}")

    def _fetch_content(self, url):
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
            self.stderr.write(f"  HTTP error: {e}")
            return None

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
            self.stderr.write(f"  Reddit fetch error: {e}")
            return None

        parts = []
        try:
            post = data[0]["data"]["children"][0]["data"]
            parts.append(f"Title: {post.get('title', '')}")
            if post.get("selftext"):
                parts.append(post["selftext"])
        except (IndexError, KeyError, TypeError):
            self.stderr.write("  Could not parse Reddit post data.")
            return None

        try:
            comments = data[1]["data"]["children"]
            for c in comments[:20]:
                body = c.get("data", {}).get("body", "")
                if body:
                    parts.append(f"Comment: {body}")
        except (IndexError, KeyError, TypeError):
            pass

        return "\n\n".join(parts).strip() or None

    def _save_all(self, data, url, platform_slug, platform_slugs,
                  valid_knowledge_types, valid_categories, valid_insight_types):
        meta = data.get("meta", {})
        source_attribution = meta.get("source_attribution", "")

        pk_count = 0
        for item in data.get("platform_knowledge", []):
            plat = Platform.objects.filter(slug=item.get("platform", platform_slug)).first()
            if not plat:
                continue

            related = None
            rel_slug = item.get("related_platform")
            if rel_slug and rel_slug in platform_slugs:
                related = Platform.objects.get(slug=rel_slug)

            k_type = item.get("knowledge_type", "")
            if k_type not in valid_knowledge_types:
                k_type = "feature"
            category = item.get("category", "")
            if category not in valid_categories:
                category = "other"

            PlatformKnowledge.objects.create(
                platform=plat,
                related_platform=related,
                knowledge_type=k_type,
                category=category,
                title=item.get("title", "")[:300],
                content=item.get("content", ""),
                source_url=url,
                source_attribution=source_attribution,
                verified_at=timezone.now().date(),
                platform_version=item.get("platform_version", ""),
                confidence_score=item.get("confidence_score"),
            )
            pk_count += 1

        ci_count = 0
        for item in data.get("community_insights", []):
            i_type = item.get("insight_type", "")
            if i_type not in valid_insight_types:
                i_type = "best_practice"

            insight = CommunityInsight.objects.create(
                insight_type=i_type,
                title=item.get("title", "")[:300],
                content=item.get("content", ""),
                source_url=url,
                source_attribution=source_attribution,
                source_date=timezone.now().date(),
                confidence_score=item.get("confidence_score"),
                applies_to_industries=item.get("applies_to_industries", []),
            )
            slugs = [s for s in item.get("platforms", [platform_slug]) if s in platform_slugs]
            if slugs:
                platforms = Platform.objects.filter(slug__in=slugs)
                insight.platforms.set(platforms)
            ci_count += 1

        return pk_count, ci_count
