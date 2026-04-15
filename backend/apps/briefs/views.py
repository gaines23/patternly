import json
import logging
import os
from datetime import datetime

from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import CaseFile, Roadblock, ProjectStatus, ProjectUpdate
from .serializers import (
    CaseFileDetailSerializer,
    CaseFileListSerializer,
    CaseFileWriteSerializer,
    PublicCaseFileSerializer,
)
from apps.users.audit import log_action
from apps.users.models import (
    ACTION_CASE_FILE_CREATED, ACTION_CASE_FILE_UPDATED, ACTION_CASE_FILE_DELETED,
)

logger = logging.getLogger(__name__)


class CaseFileListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/briefs/          → paginated list of case files
    POST /api/v1/briefs/          → create a new case file (all 6 layers)
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["workflow_type", "industries", "tools", "logged_by_name"]
    ordering_fields = ["created_at", "satisfaction_score", "roadblock_count"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        try:
            is_admin = getattr(user, "role", None) == "admin" or user.is_staff
        except AttributeError:
            is_admin = False
        qs = CaseFile.objects.select_related("logged_by").prefetch_related(
            "audit__builds",
            "intake",
            "build",
            "delta__roadblocks",
            "reasoning",
            "outcome",
        )
        # Admins see all; everyone else only sees their own files
        if not is_admin:
            qs = qs.filter(logged_by=user)
        # Optional filters via query params
        industry = self.request.query_params.get("industry")
        tool = self.request.query_params.get("tool")
        workflow_type = self.request.query_params.get("workflow_type")
        min_satisfaction = self.request.query_params.get("min_satisfaction")

        if industry:
            qs = qs.filter(industries__contains=[industry])
        if tool:
            qs = qs.filter(tools__contains=[tool])
        if workflow_type:
            qs = qs.filter(workflow_type__icontains=workflow_type)
        if min_satisfaction:
            qs = qs.filter(satisfaction_score__gte=int(min_satisfaction))

        project_status = self.request.query_params.get("status")
        if project_status in (ProjectStatus.OPEN, ProjectStatus.CLOSED):
            qs = qs.filter(status=project_status)

        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CaseFileWriteSerializer
        return CaseFileListSerializer

    def create(self, request, *args, **kwargs):
        serializer = CaseFileWriteSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        case_file = serializer.save()
        log_action(
            user=request.user,
            action=ACTION_CASE_FILE_CREATED,
            request=request,
            details={"case_file_id": str(case_file.id)},
        )
        # Return the full detail on creation
        out = CaseFileDetailSerializer(case_file)
        return Response(out.data, status=status.HTTP_201_CREATED)


class CaseFileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/briefs/<id>/   → full case file with all layers
    PUT    /api/v1/briefs/<id>/   → update (owner or admin only)
    DELETE /api/v1/briefs/<id>/   → delete (owner or admin only)
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            is_admin = getattr(user, "role", None) == "admin" or user.is_staff
        except AttributeError:
            is_admin = False
        qs = CaseFile.objects.select_related("logged_by").prefetch_related(
            "audit__builds",
            "intake",
            "build",
            "delta__roadblocks",
            "reasoning",
            "outcome",
        )
        if not is_admin:
            qs = qs.filter(logged_by=user)
        return qs

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return CaseFileWriteSerializer
        return CaseFileDetailSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            user=self.request.user,
            action=ACTION_CASE_FILE_UPDATED,
            request=self.request,
            details={"case_file_id": str(instance.id)},
        )

    def perform_destroy(self, instance):
        log_action(
            user=self.request.user,
            action=ACTION_CASE_FILE_DELETED,
            request=self.request,
            details={"case_file_id": str(instance.id)},
        )
        instance.delete()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_share(request, pk):
    """
    POST /api/v1/briefs/<id>/share/
    Toggles share_enabled on/off. Returns the share URL and current state.
    """
    try:
        case_file = CaseFile.objects.get(pk=pk, logged_by=request.user)
    except CaseFile.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    case_file.share_enabled = not case_file.share_enabled
    case_file.save(update_fields=["share_enabled"])

    return Response({
        "share_enabled": case_file.share_enabled,
        "share_token": str(case_file.share_token),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_status(request, pk):
    """
    POST /api/v1/briefs/<id>/status/
    Toggles project status between open and closed.
    Sets closed_at when closing; clears it when reopening.
    """
    try:
        case_file = CaseFile.objects.get(pk=pk, logged_by=request.user)
    except CaseFile.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if case_file.status == ProjectStatus.OPEN:
        case_file.status = ProjectStatus.CLOSED
        case_file.closed_at = timezone.now()
    else:
        case_file.status = ProjectStatus.OPEN
        case_file.closed_at = None

    case_file.save(update_fields=["status", "closed_at"])

    return Response({
        "status": case_file.status,
        "closed_at": case_file.closed_at,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def public_brief(request, share_token):
    """
    GET /api/v1/briefs/shared/<share_token>/
    Public read-only endpoint — no authentication required.
    """
    try:
        case_file = CaseFile.objects.select_related("logged_by").prefetch_related(
            "audit__builds",
            "intake",
            "build",
            "delta__roadblocks",
            "reasoning",
            "outcome",
            "project_updates",
        ).get(share_token=share_token, share_enabled=True)
    except CaseFile.DoesNotExist:
        return Response({"detail": "This link is invalid or has been disabled."}, status=status.HTTP_404_NOT_FOUND)

    serializer = PublicCaseFileSerializer(case_file)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def roadblock_warnings(request):
    """
    GET /api/v1/briefs/roadblocks/warnings/?tools=Slack,HubSpot
    Returns flagged roadblocks for a given tool stack.
    Used by the AI recommendation engine to surface proactive warnings.
    """
    tools_param = request.query_params.get("tools", "")
    if not tools_param:
        return Response({"warnings": []})

    tools = [t.strip() for t in tools_param.split(",") if t.strip()]

    warnings = (
        Roadblock.objects.filter(
            flag_for_future=True,
            severity__in=["high", "blocker"],
        )
        .exclude(future_warning="")
        .order_by("-delta__case_file__created_at")
    )

    # Filter to roadblocks where any of the queried tools appear
    matched = [
        {
            "type": rb.type,
            "severity": rb.severity,
            "tools_affected": rb.tools_affected,
            "description": rb.description,
            "future_warning": rb.future_warning,
            "workaround": rb.workaround_description,
        }
        for rb in warnings
        if any(t in rb.tools_affected for t in tools)
    ]

    return Response({"warnings": matched[:10]})  # cap at 10


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stats(request):
    """
    GET /api/v1/briefs/stats/
    Dashboard stats — totals, satisfaction, roadblock analytics, scope creep signals.
    """
    from django.db import connection
    from django.db.models import Avg, Count

    totals = CaseFile.objects.aggregate(
        total=Count("id"),
        avg_satisfaction=Avg("satisfaction_score"),
        total_roadblocks=Count("delta__roadblocks"),
    )

    time_cost_agg = Roadblock.objects.filter(
        time_cost_hours__isnull=False
    ).aggregate(avg=Avg("time_cost_hours"))

    sat_by_workflow = list(
        CaseFile.objects.exclude(workflow_type="")
        .exclude(satisfaction_score__isnull=True)
        .values("workflow_type")
        .annotate(avg_sat=Avg("satisfaction_score"), count=Count("id"))
        .order_by("-avg_sat")[:10]
    )

    with connection.cursor() as cursor:
        # Top tools — unnest the tools JSON array at the DB level
        cursor.execute("""
            SELECT tool, COUNT(*) AS cnt
            FROM case_files,
                 jsonb_array_elements_text(tools) AS tool
            WHERE jsonb_array_length(tools) > 0
            GROUP BY tool
            ORDER BY cnt DESC
            LIMIT 5
        """)
        top_5_tools = cursor.fetchall()

        # Roadblock types with per-type tool breakdown — one DB round-trip
        cursor.execute("""
            SELECT rb.type, tool, COUNT(*) AS cnt
            FROM roadblocks rb
            CROSS JOIN LATERAL jsonb_array_elements_text(rb.tools_affected) AS tool
            WHERE rb.type != ''
            GROUP BY rb.type, tool
            ORDER BY rb.type, cnt DESC
        """)
        rb_tool_rows = cursor.fetchall()

        # Satisfaction by industry — unnest industries JSON array at the DB level
        cursor.execute("""
            SELECT industry,
                   ROUND(AVG(satisfaction_score)::numeric, 2) AS avg_sat,
                   COUNT(*) AS cnt
            FROM case_files,
                 jsonb_array_elements_text(industries) AS industry
            WHERE satisfaction_score IS NOT NULL
              AND jsonb_array_length(industries) > 0
            GROUP BY industry
            ORDER BY avg_sat DESC
            LIMIT 10
        """)
        sat_by_industry_rows = cursor.fetchall()

        # Tools most associated with scope-creep / diverged cases
        cursor.execute("""
            SELECT tool, COUNT(*) AS cnt
            FROM case_files cf
            JOIN delta_layers dl ON dl.case_file_id = cf.id
            CROSS JOIN LATERAL jsonb_array_elements_text(cf.tools) AS tool
            WHERE dl.diverged = true
              AND jsonb_array_length(cf.tools) > 0
            GROUP BY tool
            ORDER BY cnt DESC
            LIMIT 8
        """)
        scope_creep_rows = cursor.fetchall()

    # Reshape roadblock rows (rb_type, tool, cnt) into nested structure
    rb_type_map = {}
    for rb_type, tool, cnt in rb_tool_rows:
        if rb_type not in rb_type_map:
            rb_type_map[rb_type] = {"total": 0, "tools": []}
        rb_type_map[rb_type]["tools"].append({"tool": tool, "count": cnt})
        rb_type_map[rb_type]["total"] += cnt

    roadblock_types = sorted(
        [
            {"type": rb_type, "count": entry["total"], "tools": entry["tools"]}
            for rb_type, entry in rb_type_map.items()
        ],
        key=lambda x: x["count"],
        reverse=True,
    )

    return Response({
        "total_case_files": totals["total"],
        "avg_satisfaction": round(totals["avg_satisfaction"] or 0, 2),
        "total_roadblocks": totals["total_roadblocks"],
        "avg_roadblock_hours": round(time_cost_agg["avg"] or 0, 1),
        "top_tools": [{"tool": t, "count": c} for t, c in top_5_tools],
        "roadblock_types": roadblock_types,
        "sat_by_workflow": [
            {
                "workflow_type": r["workflow_type"],
                "avg_sat": round(r["avg_sat"], 2),
                "count": r["count"],
            }
            for r in sat_by_workflow
        ],
        "sat_by_industry": [
            {"industry": row[0], "avg_sat": float(row[1]), "count": row[2]}
            for row in sat_by_industry_rows
        ],
        "scope_creep_tools": [{"tool": row[0], "count": row[1]} for row in scope_creep_rows],
    })


# ── Project Summary (AI-powered) ────────────────────────────────────────────

FULL_SUMMARY_SYSTEM_PROMPT = """You are a project reporting assistant for a workflow consulting tool called Flowpath.
Your job is to produce clear, professional summaries of the full project for reporting purposes.

You will receive:
- Project name and metadata
- Build notes (implementation notes, gotchas, dependencies)
- Build maps (workflow structures including lists, spaces, statuses, custom fields, automations, pipeline phases, and learnings)
- Project updates (timestamped progress notes)
- Scope creep items (unplanned additions with area, reason, impact, and communication status)

Produce a structured summary with these sections:
1. **Overview** — 2-3 sentence high-level summary of the project state
2. **Build Summary** — For each workflow, use this exact format:

**{Workflow Name}**
Description: 1-2 sentence summary of what the workflow does and its purpose.
Status Flow: List the status progression (e.g. To Do -> In Progress -> Review -> Done)
Automations:
1. First automation description
2. Second automation description
3. (continue numbering in order)

Repeat for each workflow. Keep descriptions brief and actionable. Do NOT include spaces, lists, custom fields, or pipeline details — only the workflow name, description, status flow, and numbered automations.
3. **Key Updates** — Organize updates by date. Use the date (MM/DD/YYYY) in **bold** as a header, then list the relevant notes as bullet points beneath it. Group multiple notes from the same date together under one date header.
4. **Scope Changes** — Summary of scope creep: what was added, why, how it impacted the project, and whether changes were communicated to the client
5. **Risks & Concerns** — Any patterns, recurring issues, or uncommunicated scope changes worth flagging

Be concise and actionable. Write for a project manager or stakeholder audience.
Do NOT use markdown headings (no #, ##, or ###). Use **bold** for section titles and date headers instead.
Do NOT use horizontal rules (---) to separate sections. Use blank lines instead.
Use -> instead of arrow characters for status flows (e.g. "To Do -> In Progress -> Done").
All dates must be formatted as MM/DD/YYYY.
If a section has no data, say "No data logged." rather than omitting it."""

UPDATES_SUMMARY_SYSTEM_PROMPT = """You are a project reporting assistant for a workflow consulting tool called Flowpath.
Your job is to produce clear, professional summaries of project updates and scope changes for reporting purposes.

You will receive:
- Project name and metadata
- Project updates (timestamped progress notes)
- Scope creep items (unplanned additions with area, reason, impact, and communication status)

Focus ONLY on the project updates and scope creep — do NOT reference build notes or technical implementation details.

Produce a structured summary with these sections:
1. **Progress Overview** — 2-3 sentence summary of how the project has progressed
2. **Key Updates** — Organize updates by date. Use the date (MM/DD/YYYY) in **bold** as a header, then list the relevant notes as bullet points beneath it. Group multiple notes from the same date together under one date header.
3. **Scope Changes** — Summary of scope creep: what was added, why, how it impacted the project, and whether changes were communicated to the client
4. **Action Items & Concerns** — Any unresolved issues, uncommunicated scope changes, or items needing follow-up

Be concise and actionable. Write for a project manager or stakeholder audience.
Do NOT use markdown headings (no #, ##, or ###). Use **bold** for section titles and date headers instead.
Do NOT use horizontal rules (---) to separate sections. Use blank lines instead.
Use -> instead of arrow characters for status flows.
All dates must be formatted as MM/DD/YYYY.
If a section has no data, say "No data logged." rather than omitting it."""


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def project_summary(request, pk):
    """
    GET /api/v1/briefs/<id>/summary/?type=full|updates&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    AI-generated summary for reporting.
    - type=full (default): summarizes build notes + project updates + scope creep
    - type=updates: summarizes only project updates + scope creep
    Omit date params to summarize everything.
    """
    import anthropic
    from django.conf import settings as django_settings

    summary_type = request.query_params.get("type", "full")
    if summary_type not in ("full", "updates"):
        return Response(
            {"detail": "Invalid type. Use 'full' or 'updates'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        case_file = CaseFile.objects.select_related(
            "build", "delta"
        ).prefetch_related("project_updates").get(pk=pk, logged_by=request.user)
    except CaseFile.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Parse optional date range
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")

    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
        end_dt = datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
    except ValueError:
        return Response(
            {"detail": "Invalid date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Gather data ──────────────────────────────────────────────────────────
    # Build notes + workflows (only for full summary)
    build_notes = ""
    workflows = []
    if summary_type == "full" and hasattr(case_file, "build") and case_file.build:
        build_notes = case_file.build.build_notes or ""
        workflows = case_file.build.workflows or []

    # Project updates (filtered by date if provided)
    updates_qs = case_file.project_updates.order_by("created_at")
    if start_dt:
        updates_qs = updates_qs.filter(created_at__date__gte=start_dt.date())
    if end_dt:
        updates_qs = updates_qs.filter(created_at__date__lte=end_dt.date())

    project_updates = [
        {
            "date": pu.created_at.strftime("%m/%d/%Y"),
            "content": pu.content,
        }
        for pu in updates_qs
    ]

    # Scope creep items
    scope_creep = []
    if hasattr(case_file, "delta") and case_file.delta:
        scope_creep = case_file.delta.scope_creep or []

    # Check there's something to summarize
    if not build_notes and not workflows and not project_updates and not scope_creep:
        return Response({
            "summary": "No notes, updates, or scope creep items to summarize for this project.",
            "date_range": {"start": start_date, "end": end_date},
            "data_counts": {"build_notes": False, "project_updates": 0, "scope_creep_items": 0},
        })

    # ── Build prompt ─────────────────────────────────────────────────────────
    parts = [f"## Project: {case_file.name or 'Unnamed Project'}"]

    if start_date or end_date:
        range_label = f"{start_date or 'beginning'} to {end_date or 'present'}"
        parts.append(f"Date range: {range_label}")

    if build_notes:
        parts.append(f"\nBuild Notes:\n{build_notes}")

    if workflows:
        parts.append("\nBuild Maps (Workflows):")
        for wf in workflows:
            wf_name = wf.get("name", "Unnamed Workflow")
            parts.append(f"\n**{wf_name}**")
            if wf.get("status"):
                parts.append(f"  Status: {wf['status']}")
            if wf.get("replaces"):
                parts.append(f"  Replaces: {wf['replaces']}")
            if wf.get("notes"):
                parts.append(f"  Notes: {wf['notes']}")
            if wf.get("pipeline"):
                parts.append(f"  Pipeline: {' → '.join(wf['pipeline'])}")
            for lst in wf.get("lists", []):
                lst_name = lst.get("name", "Unnamed List")
                space = lst.get("space", "")
                parts.append(f"  - List: {lst_name}" + (f" (Space: {space})" if space else ""))
                if lst.get("statuses"):
                    parts.append(f"    Statuses: {lst['statuses']}")
                if lst.get("custom_fields"):
                    parts.append(f"    Custom Fields: {lst['custom_fields']}")
                for auto in lst.get("automations", []):
                    platform = auto.get("platform", "clickup")
                    desc = auto.get("map_description", "")
                    triggers = ", ".join(t.get("detail", "") for t in auto.get("triggers", []) if t.get("detail"))
                    actions = ", ".join(a.get("detail", "") for a in auto.get("actions", []) if a.get("detail"))
                    label = f"[{platform}]"
                    if auto.get("third_party_platform"):
                        label = f"[{auto['third_party_platform']}]"
                    summary_parts = [p for p in [desc, f"Trigger: {triggers}" if triggers else "", f"Action: {actions}" if actions else ""] if p]
                    if summary_parts:
                        parts.append(f"    Automation {label}: {' | '.join(summary_parts)}")
            if wf.get("learnings"):
                lr = wf["learnings"]
                if lr.get("whatWorked"):
                    parts.append(f"  What worked: {lr['whatWorked']}")
                if lr.get("whatToAvoid"):
                    parts.append(f"  What to avoid: {lr['whatToAvoid']}")

    if project_updates:
        parts.append("\nProject Updates (grouped by date):")
        # Group updates by date for cleaner input
        from collections import OrderedDict
        grouped = OrderedDict()
        for pu in project_updates:
            grouped.setdefault(pu["date"], []).append(pu["content"])
        for date, notes in grouped.items():
            parts.append(f"\n{date}:")
            for note in notes:
                parts.append(f"- {note}")
    else:
        parts.append("\nProject Updates:\nNo updates in this time range.")

    if scope_creep:
        parts.append("\n### Scope Creep Items")
        for sc in scope_creep:
            comm = sc.get("communicated", "unknown")
            if comm is True:
                comm = "Yes"
            elif comm is False:
                comm = "No"
            parts.append(
                f"- **{sc.get('area', 'Unknown')}**: {sc.get('reason', '')} "
                f"| Impact: {sc.get('impact', 'N/A')} | Communicated: {comm}"
            )
    else:
        parts.append("\n### Scope Creep Items\nNone logged.")

    user_message = "\n".join(parts)

    # ── Call Claude ──────────────────────────────────────────────────────────
    system_prompt = FULL_SUMMARY_SYSTEM_PROMPT if summary_type == "full" else UPDATES_SUMMARY_SYSTEM_PROMPT

    api_key = os.environ.get("ANTHROPIC_API_KEY") or getattr(django_settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        return Response(
            {"detail": "AI summarization is not configured (missing API key)."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        summary_text = message.content[0].text
    except Exception as e:
        logger.error("AI summary generation failed: %s", e)
        return Response(
            {"detail": "Failed to generate summary. Please try again."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({
        "summary": summary_text,
        "summary_type": summary_type,
        "date_range": {"start": start_date, "end": end_date},
        "data_counts": {
            "build_notes": bool(build_notes),
            "project_updates": len(project_updates),
            "scope_creep_items": len(scope_creep),
        },
    })
