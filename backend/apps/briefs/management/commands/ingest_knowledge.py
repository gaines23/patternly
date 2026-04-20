"""
management command: ingest_knowledge

Extracts platform intelligence and community insights from public sources
via Claude and saves them into the PlatformKnowledge / CommunityInsight models.

Usage:
    # Platform docs / official guides → PlatformKnowledge
    python manage.py ingest_knowledge --url "https://clickup.com/integrations/slack" \
        --platform clickup --type platform_doc

    # Blog / methodology / community post → CommunityInsight
    python manage.py ingest_knowledge --url "https://www.zenpilot.com/methodology/" \
        --platform clickup --type community_post

    # Dry run
    python manage.py ingest_knowledge --url "..." --platform clickup --dry-run

    # Auto-approve high-confidence extractions
    python manage.py ingest_knowledge --url "..." --platform monday --auto-approve
"""

import json
import re
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

CONTENT_TYPES = [
    "platform_doc",       # official docs, API reference, changelogs
    "community_post",     # blogs, methodology guides, forum threads
    "integration_doc",    # integration-specific documentation
    "changelog",          # release notes, feature announcements
]

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
    help = "Ingest platform knowledge and community insights from a public source via Claude"

    def add_arguments(self, parser):
        parser.add_argument("--url", type=str, required=True, help="URL to ingest")
        parser.add_argument("--platform", type=str, required=True,
                            help="Primary platform slug (e.g. clickup, monday)")
        parser.add_argument("--type", type=str, default="community_post",
                            choices=CONTENT_TYPES, dest="content_type",
                            help="Content type (default: community_post)")
        parser.add_argument("--dry-run", action="store_true",
                            help="Extract and print JSON without saving")
        parser.add_argument("--auto-approve", action="store_true",
                            help="Skip review for extractions with avg confidence >= 0.7")

    def handle(self, *args, **options):
        url = options["url"]
        platform_slug = options["platform"]
        content_type = options["content_type"]
        dry_run = options["dry_run"]
        auto_approve = options["auto_approve"]

        # Validate platform exists
        platform = Platform.objects.filter(slug=platform_slug).first()
        if not platform:
            self.stderr.write(self.style.ERROR(
                f"Unknown platform '{platform_slug}'. "
                f"Available: {', '.join(Platform.objects.values_list('slug', flat=True))}"
            ))
            return

        # 1. Fetch
        self.stdout.write(f"Fetching: {url}")
        content = self._fetch_content(url)
        if not content:
            self.stderr.write(self.style.ERROR(f"Failed to fetch content from {url}"))
            return
        self.stdout.write(f"Fetched {len(content)} characters")

        # 2. Extract via Claude
        self.stdout.write("Extracting knowledge via Claude...")
        client = Anthropic()

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

        # 3. Parse
        try:
            data = json.loads(raw_output)
        except json.JSONDecodeError:
            cleaned = raw_output.replace("```json", "").replace("```", "").strip()
            try:
                data = json.loads(cleaned)
            except json.JSONDecodeError as e:
                self.stderr.write(self.style.ERROR(f"Failed to parse output: {e}"))
                self.stderr.write(raw_output[:2000])
                return

        pk_items = data.get("platform_knowledge", [])
        ci_items = data.get("community_insights", [])
        notes = data.get("meta", {}).get("extraction_notes", "N/A")

        self.stdout.write(f"Extracted: {len(pk_items)} platform knowledge, {len(ci_items)} community insights")
        self.stdout.write(f"Notes: {notes}")

        if dry_run:
            self.stdout.write("\n--- DRY RUN (not saving) ---")
            self.stdout.write(json.dumps(data, indent=2))
            return

        # Calculate average confidence
        all_scores = [
            item.get("confidence_score", 0)
            for item in pk_items + ci_items
            if item.get("confidence_score") is not None
        ]
        avg_confidence = sum(all_scores) / len(all_scores) if all_scores else 0

        if auto_approve and avg_confidence >= 0.7:
            self._save_all(data, url, platform_slug)
        elif avg_confidence >= 0.4:
            self.stdout.write(f"\nAvg confidence: {avg_confidence:.2f}")
            self.stdout.write(json.dumps(data, indent=2))
            confirm = input("\nSave all items? [y/n]: ").strip().lower()
            if confirm == "y":
                self._save_all(data, url, platform_slug)
            else:
                self.stdout.write("Skipped.")
        else:
            self.stdout.write(self.style.WARNING(
                f"Low avg confidence ({avg_confidence:.2f}). Skipping."
            ))
            self.stdout.write(json.dumps(data, indent=2))

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
            self.stderr.write(f"HTTP error: {e}")
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
            self.stderr.write(f"Reddit fetch error: {e}")
            return None

        parts = []
        try:
            post = data[0]["data"]["children"][0]["data"]
            parts.append(f"Title: {post.get('title', '')}")
            if post.get("selftext"):
                parts.append(post["selftext"])
        except (IndexError, KeyError, TypeError):
            self.stderr.write("Could not parse Reddit post data.")
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

    def _save_all(self, data, url, platform_slug):
        meta = data.get("meta", {})
        source_attribution = meta.get("source_attribution", "")
        platform_slugs = set(Platform.objects.values_list("slug", flat=True))

        # Valid choices for cleaning
        valid_knowledge_types = {c[0] for c in PlatformKnowledge._meta.get_field("knowledge_type").choices}
        valid_categories = {c[0] for c in PlatformKnowledge._meta.get_field("category").choices}
        valid_insight_types = {c[0] for c in CommunityInsight._meta.get_field("insight_type").choices}

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
            # M2M: platforms
            slugs = [s for s in item.get("platforms", [platform_slug]) if s in platform_slugs]
            if slugs:
                platforms = Platform.objects.filter(slug__in=slugs)
                insight.platforms.set(platforms)
            ci_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Saved {pk_count} platform knowledge + {ci_count} community insights"
        ))
