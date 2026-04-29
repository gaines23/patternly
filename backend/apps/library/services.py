"""
Helpers for promoting CaseFile.build content into LibraryItem rows.

These are used both by the one-time backfill management command and by the
post_save signal on BuildLayer that auto-promotes workflows when they reach
the "Live" lifecycle stage.

Idempotency contract:
    Each LibraryItem has a unique (source_case_file, source_path) shape.
    If an item already exists at that path, we DO NOT overwrite it — the
    user may have edited it in the library or attached comments. The first
    Live transition is the only auto-creation point.
"""

from __future__ import annotations

import logging

from apps.briefs.models import CaseFile
from apps.users.models import Team

from .models import LibraryItem, LibraryItemKind, LibrarySourceLayer

logger = logging.getLogger(__name__)

LIVE_STAGE = "Live"


def _summarize_instructions(text: str) -> str:
    """Mirror ProjectForm.summarizeInstructions: first non-empty/non-comment line, capped."""
    if not text:
        return ""
    for raw in text.split("\n"):
        line = raw.strip()
        if line and not line.startswith("#"):
            return (line[:80] + "…") if len(line) > 80 else line
    return ""


def _trigger_summary(triggers) -> str:
    if not isinstance(triggers, list):
        return ""
    return "; ".join(
        " — ".join(p for p in [t.get("type"), t.get("detail")] if p)
        for t in triggers if isinstance(t, dict)
    ).strip()


def _action_summary(actions) -> str:
    if not isinstance(actions, list):
        return ""
    return "; ".join(
        " — ".join(p for p in [a.get("type"), a.get("detail")] if p)
        for a in actions if isinstance(a, dict)
    ).strip()


def _agent_automation_name(auto: dict, list_name: str, ai: int) -> str:
    """An Agent Automation's library name comes from its description, with sensible fallbacks."""
    desc = (auto.get("map_description") or "").strip()
    if desc:
        return desc
    summary = _summarize_instructions(auto.get("instructions") or "")
    if summary:
        return summary
    suffix = f" (Automation {ai + 1})"
    return (list_name + suffix) if list_name else f"Agent Automation {ai + 1}"


def _workflow_steps(workflow: dict) -> str:
    out = []
    for idx, l in enumerate(workflow.get("lists") or [], start=1):
        if not isinstance(l, dict):
            continue
        name = (l.get("name") or "List").strip()
        statuses = (l.get("statuses") or "").strip()
        suffix = f" — statuses: {statuses}" if statuses else ""
        out.append(f"{idx}. {name}{suffix}")
    return "\n".join(out)


def _resolve_team(case_file: CaseFile) -> Team:
    owner = case_file.logged_by
    if owner and owner.team_id:
        return owner.team
    team, _ = Team.objects.get_or_create(slug="default", defaults={"name": "Default Team"})
    return team


def _upsert(*, case_file, owner, team, kind, source_layer, source_path,
            name, description, body, tags) -> tuple[LibraryItem | None, bool]:
    """Idempotent on (source_case_file, source_path). Returns (item, created)."""
    existing = LibraryItem.objects.filter(
        source_case_file=case_file,
        source_path=source_path,
    ).first()
    if existing is not None:
        return existing, False
    item = LibraryItem.objects.create(
        team=team,
        kind=kind,
        name=name[:255],
        description=description or "",
        body=body or {},
        tags=tags or [],
        platform=getattr(case_file, "primary_platform", None),
        industries=list(case_file.industries or []),
        tools=list(case_file.tools or []),
        workflow_types=[case_file.workflow_type] if case_file.workflow_type else [],
        source_case_file=case_file,
        source_layer=source_layer,
        source_path=source_path,
        created_by=owner,
        updated_by=owner,
    )
    return item, True


def sync_workflow_to_library(case_file: CaseFile, workflow: dict, wf_idx: int) -> int:
    """
    Upsert library items for one workflow + its lists. Returns the number of
    items that were newly created (existing items are preserved).
    """
    if not isinstance(workflow, dict):
        return 0

    owner = case_file.logged_by
    team = _resolve_team(case_file)
    base_tags = [t for t in [case_file.workflow_type] + list(case_file.industries or []) if t]
    wf_name = (workflow.get("name") or f"Workflow {wf_idx + 1}").strip()
    wf_tags = base_tags + [wf_name] if wf_name else base_tags

    created = 0

    # Workflow → template
    _, did_create = _upsert(
        case_file=case_file, owner=owner, team=team,
        kind=LibraryItemKind.TEMPLATE,
        source_layer=LibrarySourceLayer.BUILD_WORKFLOWS,
        source_path=f"build.workflows[{wf_idx}]",
        name=f"{wf_name} — Template",
        description=(workflow.get("notes") or "")[:1000],
        body={"summary": workflow.get("notes") or "", "steps": _workflow_steps(workflow)},
        tags=wf_tags,
    )
    created += int(did_create)

    # Per-list custom fields and automations
    for li, l in enumerate(workflow.get("lists") or []):
        if not isinstance(l, dict):
            continue
        list_name = (l.get("name") or f"List {li + 1}").strip()
        item_tags = base_tags + [t for t in [wf_name, list_name] if t]

        cf_text = (l.get("custom_fields") or "").strip()
        if cf_text:
            _, did_create = _upsert(
                case_file=case_file, owner=owner, team=team,
                kind=LibraryItemKind.CUSTOM_FIELD_SET,
                source_layer=LibrarySourceLayer.BUILD_CUSTOM_FIELDS,
                source_path=f"build.workflows[{wf_idx}].lists[{li}].custom_fields",
                name=f"{list_name} — Custom Fields",
                description="",
                body={"fields_text": cf_text},
                tags=item_tags,
            )
            created += int(did_create)

        # Agent automations: one library item per automation that has Agent / Automation
        # Instructions populated. Title = description (map_description); body.instructions
        # = the instructions text. Triggers/actions are stored alongside for context.
        for ai, auto in enumerate(l.get("automations") or []):
            if not isinstance(auto, dict):
                continue
            instructions = (auto.get("instructions") or "").strip()
            if not instructions:
                continue
            auto_name = _agent_automation_name(auto, list_name, ai)
            _, did_create = _upsert(
                case_file=case_file, owner=owner, team=team,
                kind=LibraryItemKind.AUTOMATION,
                source_layer=LibrarySourceLayer.BUILD_AUTOMATIONS,
                source_path=f"build.workflows[{wf_idx}].lists[{li}].automations[{ai}]",
                name=auto_name,
                description=(auto.get("map_description") or "")[:1000],
                body={
                    "instructions": instructions,
                    "trigger": _trigger_summary(auto.get("triggers")),
                    "actions": _action_summary(auto.get("actions")),
                },
                tags=item_tags,
            )
            created += int(did_create)

    return created


def sync_case_file_workflows_to_library(case_file: CaseFile, *, only_live: bool = False) -> int:
    """
    Upsert library items for every workflow in a CaseFile's build.
    If `only_live=True`, only workflows currently at the Live lifecycle stage are synced.
    """
    build = getattr(case_file, "build", None)
    if build is None:
        return 0
    workflows = build.workflows if isinstance(build.workflows, list) else []
    created = 0
    for wi, wf in enumerate(workflows):
        if not isinstance(wf, dict):
            continue
        if only_live and (wf.get("status") or "").strip() != LIVE_STAGE:
            continue
        created += sync_workflow_to_library(case_file, wf, wi)
    return created
