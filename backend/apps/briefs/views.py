import json
import logging
import os
from datetime import datetime

from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import (
    CaseFile, Roadblock, ProjectStatus, ProjectUpdate,
    Platform, PlatformKnowledge, CommunityInsight,
    BillingShare,
)
from .serializers import (
    CaseFileDetailSerializer,
    CaseFileListSerializer,
    CaseFileWriteSerializer,
    PublicCaseFileSerializer,
    IngestRequestSerializer,
    PlatformSerializer,
    PlatformKnowledgeSerializer,
    CommunityInsightSerializer,
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
    # todos__title / todos__description surface a case file when the match is
    # on one of its todos. The JOIN this adds means we must .distinct() the
    # queryset to avoid duplicate case-file rows for multi-matching todos.
    search_fields = [
        "name",
        "workflow_type",
        "industries",
        "tools",
        "logged_by_name",
        "todos__title",
        "todos__description",
    ]
    ordering_fields = ["created_at", "satisfaction_score", "roadblock_count"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        try:
            is_admin = getattr(user, "role", None) == "admin" or user.is_staff
        except AttributeError:
            is_admin = False
        qs = CaseFile.objects.select_related(
            "logged_by", "primary_platform",
        ).prefetch_related(
            "connected_platforms",
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

        # Filtering by training data status:
        #   default          → only user projects (is_training_data=False)
        #   include_training → all projects (no filter)
        #   training_only    → only ingested training data (is_training_data=True)
        training_only = self.request.query_params.get("training_only", "").lower() == "true"
        include_training = self.request.query_params.get("include_training", "").lower() == "true"
        if training_only:
            qs = qs.filter(is_training_data=True)
        elif not include_training:
            qs = qs.filter(is_training_data=False)

        # Optional filters via query params
        industry = self.request.query_params.get("industry")
        tool = self.request.query_params.get("tool")
        platform = self.request.query_params.get("platform")
        workflow_type = self.request.query_params.get("workflow_type")
        min_satisfaction = self.request.query_params.get("min_satisfaction")

        if industry:
            qs = qs.filter(industries__contains=[industry])
        if tool:
            qs = qs.filter(tools__contains=[tool])
        if platform:
            qs = qs.filter(primary_platform__slug=platform)
        if workflow_type:
            qs = qs.filter(workflow_type__icontains=workflow_type)
        if min_satisfaction:
            qs = qs.filter(satisfaction_score__gte=int(min_satisfaction))

        project_status = self.request.query_params.get("status")
        if project_status in (ProjectStatus.OPEN, ProjectStatus.CLOSED):
            qs = qs.filter(status=project_status)

        # Dedup: searching across the todos relation joins and can repeat rows.
        return qs.distinct()

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
        qs = CaseFile.objects.select_related(
            "logged_by", "primary_platform",
        ).prefetch_related(
            "connected_platforms",
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

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        # Re-render with the detail serializer so the response always includes
        # id, share fields, and every other read-only attribute the UI needs.
        instance.refresh_from_db()
        return Response(CaseFileDetailSerializer(instance).data)

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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_client_share(request, pk):
    """
    POST /api/v1/briefs/<id>/client-share/
    Toggles client_share_enabled on/off. Returns the client share URL and state.
    """
    try:
        case_file = CaseFile.objects.get(pk=pk, logged_by=request.user)
    except CaseFile.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    case_file.client_share_enabled = not case_file.client_share_enabled
    case_file.save(update_fields=["client_share_enabled"])

    return Response({
        "client_share_enabled": case_file.client_share_enabled,
        "client_share_token": str(case_file.client_share_token),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def public_client_brief(request, share_token):
    """
    GET /api/v1/briefs/client/<share_token>/
    Public read-only endpoint — shows only progress overview (updates summary).
    """
    try:
        case_file = CaseFile.objects.select_related("logged_by__team").prefetch_related(
            "project_updates",
        ).get(
            client_share_token=share_token, client_share_enabled=True,
        )
    except CaseFile.DoesNotExist:
        return Response(
            {"detail": "This link is invalid or has been disabled."},
            status=status.HTTP_404_NOT_FOUND,
        )

    project_updates = [
        {
            "id": str(pu.id),
            "content": pu.content,
            "attachments": pu.attachments,
            "created_at": pu.created_at,
            "minutes_spent": pu.minutes_spent,
        }
        for pu in case_file.project_updates.all()
    ]

    team = getattr(case_file.logged_by, "team", None) if case_file.logged_by else None
    team_logo_url = None
    if team and team.logo:
        team_logo_url = request.build_absolute_uri(team.logo.url)

    return Response({
        "id": str(case_file.id),
        "name": case_file.name,
        "logged_by_name": case_file.logged_by.full_name if case_file.logged_by else case_file.logged_by_name or "Unknown",
        "workflow_type": case_file.workflow_type,
        "industries": case_file.industries,
        "tools": case_file.tools,
        "updates_summary": case_file.updates_summary,
        "updates_summary_generated_at": case_file.updates_summary_generated_at,
        "status": case_file.status,
        "created_at": case_file.created_at,
        "updated_at": case_file.updated_at,
        "project_updates": project_updates,
        "team_logo_url": team_logo_url,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def public_brief(request, share_token):
    """
    GET /api/v1/briefs/shared/<share_token>/
    Public read-only endpoint — no authentication required.
    """
    try:
        case_file = CaseFile.objects.select_related("logged_by__team").prefetch_related(
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

    serializer = PublicCaseFileSerializer(case_file, context={"request": request})
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


def _parse_iso_date(value):
    """Returns (date, error_message). On success error is None."""
    if not value:
        return None, None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date(), None
    except ValueError:
        return None, "Invalid date. Use YYYY-MM-DD."


def _build_billing_report(user_filter, date_from=None, date_to=None, case_file_id=None):
    """
    Returns ({updates, total_minutes, projects}, error_response_or_None).

    `user_filter` is a queryset filter dict applied to ProjectUpdate (e.g.
    {"case_file__logged_by": user}). Pass an empty dict to scope to all users
    (used only by admins).
    """
    qs = ProjectUpdate.objects.select_related("case_file").filter(
        case_file__is_training_data=False,
        **user_filter,
    )

    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    if case_file_id:
        qs = qs.filter(case_file_id=case_file_id)

    qs = qs.order_by("-created_at")

    cf_qs = CaseFile.objects.filter(is_training_data=False)
    cf_filter_kwargs = {
        k.replace("case_file__", "", 1): v for k, v in user_filter.items()
    }
    cf_qs = cf_qs.filter(**cf_filter_kwargs)

    projects = [
        {
            "id": str(p.id),
            "name": p.name or p.workflow_type or "Untitled",
        }
        for p in cf_qs.order_by("-created_at").only("id", "name", "workflow_type")
    ]

    updates = [
        {
            "id": str(pu.id),
            "case_file_id": str(pu.case_file_id),
            "case_file_name": pu.case_file.name or pu.case_file.workflow_type or "Untitled",
            "content": pu.content,
            "attachments": pu.attachments,
            "created_at": pu.created_at,
            "minutes_spent": pu.minutes_spent,
        }
        for pu in qs
    ]

    total_minutes = sum((pu.get("minutes_spent") or 0) for pu in updates)

    return {
        "updates": updates,
        "total_minutes": total_minutes,
        "projects": projects,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def billing(request):
    """
    GET /api/v1/briefs/billing/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&case_file=<uuid>
    Returns ProjectUpdates within a date range, optionally scoped to a single case file.
    Non-admins only see updates from their own case files.
    """
    user = request.user
    try:
        is_admin = getattr(user, "role", None) == "admin" or user.is_staff
    except AttributeError:
        is_admin = False

    date_from, err = _parse_iso_date(request.query_params.get("date_from"))
    if err:
        return Response({"detail": f"date_from: {err}"}, status=status.HTTP_400_BAD_REQUEST)
    date_to, err = _parse_iso_date(request.query_params.get("date_to"))
    if err:
        return Response({"detail": f"date_to: {err}"}, status=status.HTTP_400_BAD_REQUEST)

    case_file_id = request.query_params.get("case_file")

    user_filter = {} if is_admin else {"case_file__logged_by": user}
    report = _build_billing_report(user_filter, date_from, date_to, case_file_id)

    # Include the user's share state so the BillingPage can render the share modal.
    share, _ = BillingShare.objects.get_or_create(user=user)
    report["share_token"] = str(share.share_token)
    report["share_enabled"] = share.enabled

    return Response(report)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_billing_share(request):
    """
    POST /api/v1/briefs/billing/share/
    Toggles the user's billing share link on/off. Returns {enabled, share_token}.
    """
    share, _ = BillingShare.objects.get_or_create(user=request.user)
    share.enabled = not share.enabled
    share.save(update_fields=["enabled", "updated_at"])
    return Response({
        "enabled": share.enabled,
        "share_token": str(share.share_token),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def public_billing_report(request, share_token):
    """
    GET /api/v1/briefs/billing/shared/<share_token>/?date_from=&date_to=
    Public billing report — shows hours and notes grouped by client for the
    owning user's case files within the given date range.
    """
    try:
        share = BillingShare.objects.select_related("user__team").get(
            share_token=share_token, enabled=True,
        )
    except BillingShare.DoesNotExist:
        return Response(
            {"detail": "This link is invalid or has been disabled."},
            status=status.HTTP_404_NOT_FOUND,
        )

    date_from, err = _parse_iso_date(request.query_params.get("date_from"))
    if err:
        return Response({"detail": f"date_from: {err}"}, status=status.HTTP_400_BAD_REQUEST)
    date_to, err = _parse_iso_date(request.query_params.get("date_to"))
    if err:
        return Response({"detail": f"date_to: {err}"}, status=status.HTTP_400_BAD_REQUEST)

    report = _build_billing_report(
        {"case_file__logged_by": share.user},
        date_from=date_from,
        date_to=date_to,
    )

    # Group updates by case_file for the public view (clients are projects here).
    by_client = {}
    for pu in report["updates"]:
        cid = pu["case_file_id"]
        bucket = by_client.setdefault(cid, {
            "case_file_id": cid,
            "case_file_name": pu["case_file_name"],
            "total_minutes": 0,
            "updates": [],
        })
        bucket["total_minutes"] += pu.get("minutes_spent") or 0
        bucket["updates"].append({
            "id": pu["id"],
            "content": pu["content"],
            "attachments": pu["attachments"],
            "created_at": pu["created_at"],
            "minutes_spent": pu["minutes_spent"],
        })
    clients = sorted(by_client.values(), key=lambda c: c["case_file_name"].lower())

    user = share.user
    team = getattr(user, "team", None)
    team_logo_url = None
    if team and team.logo:
        team_logo_url = request.build_absolute_uri(team.logo.url)

    return Response({
        "owner_name": user.full_name,
        "date_from": date_from.isoformat() if date_from else None,
        "date_to": date_to.isoformat() if date_to else None,
        "total_minutes": report["total_minutes"],
        "clients": clients,
        "team_logo_url": team_logo_url,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stats(request):
    """
    GET /api/v1/briefs/stats/
    Dashboard stats — totals, satisfaction, roadblock analytics, scope creep signals.
    Non-admins see only stats derived from their own case files. Admins see all.
    """
    from django.db import connection
    from django.db.models import Avg, Count

    user = request.user
    try:
        is_admin = getattr(user, "role", None) == "admin" or user.is_staff
    except AttributeError:
        is_admin = False

    # Base querysets — non-admins only see their own case files (and roadblocks
    # attached to them). Mirrors the scoping on CaseFileListCreateView.
    case_file_qs = CaseFile.objects.filter(is_training_data=False)
    roadblock_qs = Roadblock.objects.filter(time_cost_hours__isnull=False)
    sat_wf_qs = CaseFile.objects.exclude(workflow_type="").exclude(
        satisfaction_score__isnull=True
    )
    if not is_admin:
        case_file_qs = case_file_qs.filter(logged_by=user)
        roadblock_qs = roadblock_qs.filter(delta__case_file__logged_by=user)
        sat_wf_qs = sat_wf_qs.filter(logged_by=user)

    totals = case_file_qs.aggregate(
        total=Count("id"),
        avg_satisfaction=Avg("satisfaction_score"),
        total_roadblocks=Count("delta__roadblocks"),
    )

    time_cost_agg = roadblock_qs.aggregate(avg=Avg("time_cost_hours"))

    sat_by_workflow = list(
        sat_wf_qs.values("workflow_type")
        .annotate(avg_sat=Avg("satisfaction_score"), count=Count("id"))
        .order_by("-avg_sat")[:10]
    )

    # Parameterised user-scope clauses for the raw SQL below. For admins these
    # stay empty (no WHERE addition); for non-admins they bind the user id.
    cf_scope_sql = "" if is_admin else " AND logged_by_id = %s"
    cf_alias_scope_sql = "" if is_admin else " AND cf.logged_by_id = %s"
    rb_join_scope_sql = (
        ""
        if is_admin
        else (
            " AND rb.delta_id IN ("
            "SELECT dl.id FROM delta_layers dl "
            "JOIN case_files cf ON cf.id = dl.case_file_id "
            "WHERE cf.logged_by_id = %s"
            ")"
        )
    )
    scope_params = () if is_admin else (user.id,)

    with connection.cursor() as cursor:
        # Top tools — unnest the tools JSON array at the DB level
        cursor.execute(
            f"""
            SELECT tool, COUNT(*) AS cnt
            FROM case_files,
                 jsonb_array_elements_text(tools) AS tool
            WHERE jsonb_array_length(tools) > 0{cf_scope_sql}
            GROUP BY tool
            ORDER BY cnt DESC
            LIMIT 5
            """,
            scope_params,
        )
        top_5_tools = cursor.fetchall()

        # Roadblock types with per-type tool breakdown — one DB round-trip
        cursor.execute(
            f"""
            SELECT rb.type, tool, COUNT(*) AS cnt
            FROM roadblocks rb
            CROSS JOIN LATERAL jsonb_array_elements_text(rb.tools_affected) AS tool
            WHERE rb.type != ''{rb_join_scope_sql}
            GROUP BY rb.type, tool
            ORDER BY rb.type, cnt DESC
            """,
            scope_params,
        )
        rb_tool_rows = cursor.fetchall()

        # Satisfaction by industry — unnest industries JSON array at the DB level
        cursor.execute(
            f"""
            SELECT industry,
                   ROUND(AVG(satisfaction_score)::numeric, 2) AS avg_sat,
                   COUNT(*) AS cnt
            FROM case_files,
                 jsonb_array_elements_text(industries) AS industry
            WHERE satisfaction_score IS NOT NULL
              AND jsonb_array_length(industries) > 0{cf_scope_sql}
            GROUP BY industry
            ORDER BY avg_sat DESC
            LIMIT 10
            """,
            scope_params,
        )
        sat_by_industry_rows = cursor.fetchall()

        # Tools most associated with scope-creep / diverged cases
        cursor.execute(
            f"""
            SELECT tool, COUNT(*) AS cnt
            FROM case_files cf
            JOIN delta_layers dl ON dl.case_file_id = cf.id
            CROSS JOIN LATERAL jsonb_array_elements_text(cf.tools) AS tool
            WHERE dl.diverged = true
              AND jsonb_array_length(cf.tools) > 0{cf_alias_scope_sql}
            GROUP BY tool
            ORDER BY cnt DESC
            LIMIT 8
            """,
            scope_params,
        )
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

FULL_SUMMARY_SYSTEM_PROMPT = """You are a project reporting assistant for a workflow consulting tool called Patternly.
Your job is to produce clear, professional summaries of the full project for reporting purposes.

You will receive:
- Project name and metadata
- Build notes (implementation notes, gotchas, dependencies)
- Build maps (workflow structures including lists, spaces, statuses, custom fields, automations, pipeline phases, and learnings)
- Total Time Spent on Updates (aggregate of logged time)
- Project updates (timestamped progress notes, each optionally tagged with `[time: Xh Ymin]`)
- Scope creep items (unplanned additions with area, reason, impact, and communication status)

Produce a structured summary with these sections:
1. **Overview** — 2-3 sentence high-level summary of the project state. If Total Time Spent is provided, state it here (e.g. "Total time logged: 4h 30min").
2. **Build Summary** — For each workflow, use this exact format:

**{Workflow Name}**
Description: 1-2 sentence summary of what the workflow does and its purpose.
Status Flow: List the status progression (e.g. To Do -> In Progress -> Review -> Done)
Automations:
1. First automation description
2. Second automation description
3. (continue numbering in order)

Repeat for each workflow. Keep descriptions brief and actionable. Do NOT include spaces, lists, custom fields, or pipeline details — only the workflow name, description, status flow, and numbered automations.
3. **Key Updates** — Organize updates by date. Use the date (MM/DD/YYYY) in **bold** as a header, then list the relevant notes as bullet points beneath it. Group multiple notes from the same date together under one date header. When an update has logged time, include the duration in parentheses at the end of that bullet (e.g. "- Wrapped up automations (1h 15min)"). When a date has a daily total, append it to the date header like "**MM/DD/YYYY** (2h total)".
4. **Scope Changes** — Summary of scope creep: what was added, why, how it impacted the project, and whether changes were communicated to the client
5. **Risks & Concerns** — Any patterns, recurring issues, or uncommunicated scope changes worth flagging

Be concise and actionable. Write for a project manager or stakeholder audience.
Do NOT use markdown headings (no #, ##, or ###). Use **bold** for section titles and date headers instead.
Do NOT use horizontal rules (---) to separate sections. Use blank lines instead.
Use -> instead of arrow characters for status flows (e.g. "To Do -> In Progress -> Done").
All dates must be formatted as MM/DD/YYYY.
If a section has no data, say "No data logged." rather than omitting it."""

UPDATES_SUMMARY_SYSTEM_PROMPT = """You are a project reporting assistant for a workflow consulting tool called Patternly.
Your job is to produce clear, professional summaries of project updates and scope changes for reporting purposes.

You will receive:
- Project name and metadata
- Total Time Spent on Updates (aggregate of logged time)
- Project updates (timestamped progress notes, each optionally tagged with `[time: Xh Ymin]`)
- Scope creep items (unplanned additions with area, reason, impact, and communication status)

Focus ONLY on the project updates and scope creep — do NOT reference build notes or technical implementation details.

Produce a structured summary with these sections:
1. **Progress Overview** — 2-3 sentence summary of how the project has progressed. If Total Time Spent is provided, state it here (e.g. "Total time logged: 4h 30min").
2. **Key Updates** — Organize updates by date. Use the date (MM/DD/YYYY) in **bold** as a header, then list the relevant notes as bullet points beneath it. Group multiple notes from the same date together under one date header. When an update has logged time, include the duration in parentheses at the end of that bullet (e.g. "- Wrapped up automations (1h 15min)"). When a date has a daily total, append it to the date header like "**MM/DD/YYYY** (2h total)".
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
            "minutes_spent": pu.minutes_spent,
        }
        for pu in updates_qs
    ]
    total_minutes = sum(pu["minutes_spent"] or 0 for pu in project_updates)

    def _fmt_minutes(mins):
        if not mins:
            return None
        h, m = divmod(int(mins), 60)
        if h and m:
            return f"{h}h {m}min"
        if h:
            return f"{h}h"
        return f"{m}min"

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
        total_label = _fmt_minutes(total_minutes) or "not logged"
        parts.append(f"\nTotal Time Spent on Updates: {total_label}")
        parts.append("\nProject Updates (grouped by date):")
        # Group updates by date for cleaner input
        from collections import OrderedDict
        grouped = OrderedDict()
        for pu in project_updates:
            grouped.setdefault(pu["date"], []).append(pu)
        for date, notes in grouped.items():
            day_total = sum(n["minutes_spent"] or 0 for n in notes)
            day_label = _fmt_minutes(day_total)
            header = f"\n{date}" + (f" (time spent: {day_label})" if day_label else "") + ":"
            parts.append(header)
            for note in notes:
                per_label = _fmt_minutes(note["minutes_spent"])
                line = f"- {note['content']}"
                if per_label:
                    line += f"  [time: {per_label}]"
                parts.append(line)
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

    # Persist summary for future loads and shared/print views
    now = timezone.now()
    if summary_type == "full" and not start_date and not end_date:
        case_file.full_summary = summary_text
        case_file.full_summary_generated_at = now
        case_file.save(update_fields=["full_summary", "full_summary_generated_at"])
    elif summary_type == "updates" and not start_date and not end_date:
        case_file.updates_summary = summary_text
        case_file.updates_summary_generated_at = now
        case_file.save(update_fields=["updates_summary", "updates_summary_generated_at"])

    return Response({
        "summary": summary_text,
        "summary_type": summary_type,
        "generated_at": now.isoformat() if not start_date and not end_date else None,
        "date_range": {"start": start_date, "end": end_date},
        "data_counts": {
            "build_notes": bool(build_notes),
            "project_updates": len(project_updates),
            "scope_creep_items": len(scope_creep),
        },
    })


# ── Platform & Knowledge endpoints ───────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def platform_list(request):
    """
    GET /api/v1/briefs/platforms/
    Returns all supported platforms, optionally filtered by category.
    """
    qs = Platform.objects.all()
    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)
    serializer = PlatformSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def knowledge_list(request):
    """
    GET /api/v1/briefs/knowledge/?platform=clickup&category=integrations
    Returns platform knowledge, filterable by platform, related_platform,
    knowledge_type, and category.
    """
    qs = PlatformKnowledge.objects.select_related("platform", "related_platform")

    platform = request.query_params.get("platform")
    related = request.query_params.get("related_platform")
    k_type = request.query_params.get("knowledge_type")
    category = request.query_params.get("category")

    if platform:
        qs = qs.filter(platform__slug=platform)
    if related:
        qs = qs.filter(related_platform__slug=related)
    if k_type:
        qs = qs.filter(knowledge_type=k_type)
    if category:
        qs = qs.filter(category=category)

    total = qs.count()
    serializer = PlatformKnowledgeSerializer(qs[:100], many=True)
    return Response({"count": total, "results": serializer.data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def insights_list(request):
    """
    GET /api/v1/briefs/insights/?platform=clickup&type=workaround
    Returns community insights, filterable by platform and insight_type.
    """
    qs = CommunityInsight.objects.prefetch_related("platforms")

    platform = request.query_params.get("platform")
    i_type = request.query_params.get("type")

    if platform:
        qs = qs.filter(platforms__slug=platform)
    if i_type:
        qs = qs.filter(insight_type=i_type)

    qs = qs.distinct()
    total = qs.count()
    serializer = CommunityInsightSerializer(qs[:100], many=True)
    return Response({"count": total, "results": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ingest_url(request):
    """
    POST /api/v1/briefs/ingest/
    Frontend-facing ingestion endpoint.

    Supports three modes:
    - URL + case_file:  fetch URL → extract case file
    - URL + knowledge:  fetch URL → extract platform knowledge + community insights
    - content + prompt: paste raw text → auto-route to all data types

    Body: { "url": "...", "content": "...", "platform": "clickup",
            "ingest_type": "case_file"|"knowledge"|"prompt",
            "content_type": "blog_post"|..., "source_attribution": "..." }
    """
    serializer = IngestRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    url = serializer.validated_data.get("url", "").strip()
    content = serializer.validated_data.get("content", "").strip()
    platform = serializer.validated_data["platform"]
    ingest_type = serializer.validated_data["ingest_type"]
    content_type = serializer.validated_data["content_type"]
    source_attribution = serializer.validated_data.get("source_attribution", "")

    from django.core.management import call_command
    from io import StringIO

    stdout = StringIO()
    stderr = StringIO()

    try:
        if ingest_type == "prompt":
            # Smart extract: raw content → auto-routes to all models
            call_command(
                "ingest_prompt",
                platform=platform.slug,
                content=content,
                source_url=url,
                source_attribution=source_attribution,
                auto_approve=True,
                stdout=stdout,
                stderr=stderr,
            )
        elif ingest_type == "case_file":
            call_command(
                "ingest_source",
                url=url,
                platform=platform.slug,
                source_type=content_type if content_type in [
                    "blog_post", "case_study", "community_post",
                ] else "blog_post",
                auto_approve=True,
                stdout=stdout,
                stderr=stderr,
            )
        else:
            call_command(
                "ingest_knowledge",
                url=url,
                platform=platform.slug,
                content_type=content_type if content_type in [
                    "platform_doc", "community_post", "integration_doc", "changelog",
                ] else "community_post",
                auto_approve=True,
                stdout=stdout,
                stderr=stderr,
            )
    except Exception as e:
        logger.error("Ingestion failed: %s", e)
        return Response(
            {"detail": f"Ingestion failed: {str(e)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    output = stdout.getvalue()
    errors = stderr.getvalue()

    if errors and "Failed" in errors:
        return Response(
            {"detail": errors.strip()},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        "status": "success",
        "ingest_type": ingest_type,
        "platform": platform.slug,
        "url": url or None,
        "output": output.strip(),
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ingest_pdf(request):
    """
    POST /api/v1/briefs/ingest/pdf/
    Upload a PDF file for extraction. Extracts text via PyMuPDF, then routes
    through the ingest_prompt pipeline (auto-routes to all data types).

    Multipart form data:
        file: PDF file
        platform: platform slug (required)
        source_attribution: optional author/org name
    """
    import fitz  # PyMuPDF

    pdf_file = request.FILES.get("file")
    if not pdf_file:
        return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

    if not pdf_file.name.lower().endswith(".pdf"):
        return Response({"detail": "Only PDF files are supported."}, status=status.HTTP_400_BAD_REQUEST)

    if pdf_file.size > 10 * 1024 * 1024:
        return Response({"detail": "File too large. Maximum 10 MB."}, status=status.HTTP_400_BAD_REQUEST)

    platform_slug = request.data.get("platform", "").strip()
    if not platform_slug:
        return Response({"detail": "Platform is required."}, status=status.HTTP_400_BAD_REQUEST)

    platform = Platform.objects.filter(slug=platform_slug).first()
    if not platform:
        return Response({"detail": f"Unknown platform: {platform_slug}"}, status=status.HTTP_400_BAD_REQUEST)

    source_attribution = request.data.get("source_attribution", "")

    try:
        pdf_bytes = pdf_file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        content = "\n\n".join(pages).strip()
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        return Response(
            {"detail": f"Failed to extract text from PDF: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not content:
        return Response(
            {"detail": "No text could be extracted from this PDF. It may be image-based."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.core.management import call_command
    from io import StringIO

    stdout = StringIO()
    stderr = StringIO()

    try:
        call_command(
            "ingest_prompt",
            platform=platform.slug,
            content=content,
            source_url="",
            source_attribution=source_attribution or pdf_file.name,
            auto_approve=True,
            stdout=stdout,
            stderr=stderr,
        )
    except Exception as e:
        logger.error("PDF ingestion failed: %s", e)
        return Response(
            {"detail": f"Ingestion failed: {str(e)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    output = stdout.getvalue()
    errors = stderr.getvalue()

    if errors and "Failed" in errors:
        return Response({"detail": errors.strip()}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "status": "success",
        "ingest_type": "prompt",
        "platform": platform.slug,
        "filename": pdf_file.name,
        "pages_extracted": len(pages),
        "characters_extracted": len(content),
        "output": output.strip(),
    }, status=status.HTTP_201_CREATED)


def _extract_youtube_id(url_or_id):
    """Extract YouTube video ID from a URL or return as-is if already an ID."""
    import re
    # Already a bare ID (11 chars, alphanumeric + dash/underscore)
    if re.match(r'^[\w-]{11}$', url_or_id):
        return url_or_id
    # Standard and short URLs
    patterns = [
        r'(?:youtube\.com/watch\?.*v=)([\w-]{11})',
        r'(?:youtu\.be/)([\w-]{11})',
        r'(?:youtube\.com/embed/)([\w-]{11})',
        r'(?:youtube\.com/v/)([\w-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    return None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ingest_youtube(request):
    """
    POST /api/v1/briefs/ingest/youtube/
    Fetch a YouTube video's transcript and route through the ingest_prompt pipeline.

    Body:
        { "url": "https://youtube.com/watch?v=...", "platform": "clickup",
          "source_attribution": "ZenPilot" }
    """
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        NoTranscriptFound, TranscriptsDisabled, VideoUnavailable,
    )

    url_or_id = request.data.get("url", "").strip()
    if not url_or_id:
        return Response({"detail": "YouTube URL or video ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    platform_slug = request.data.get("platform", "").strip()
    if not platform_slug:
        return Response({"detail": "Platform is required."}, status=status.HTTP_400_BAD_REQUEST)

    platform = Platform.objects.filter(slug=platform_slug).first()
    if not platform:
        return Response({"detail": f"Unknown platform: {platform_slug}"}, status=status.HTTP_400_BAD_REQUEST)

    source_attribution = request.data.get("source_attribution", "")

    video_id = _extract_youtube_id(url_or_id)
    if not video_id:
        return Response(
            {"detail": "Could not extract a YouTube video ID from the provided URL."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Fetch transcript
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)
        # Prefer manually created, fall back to auto-generated
        try:
            transcript = transcript_list.find_manually_created_transcript(['en'])
        except NoTranscriptFound:
            transcript = transcript_list.find_generated_transcript(['en'])
        segments = transcript.fetch()
        content = " ".join(seg.text for seg in segments).strip()
    except TranscriptsDisabled:
        return Response(
            {"detail": "Transcripts are disabled for this video."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except VideoUnavailable:
        return Response(
            {"detail": "This video is unavailable or does not exist."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except NoTranscriptFound:
        return Response(
            {"detail": "No English transcript found for this video."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.error("YouTube transcript fetch failed for %s: %s", video_id, e)
        return Response(
            {"detail": f"Failed to fetch transcript: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not content:
        return Response(
            {"detail": "Transcript is empty for this video."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    source_url = f"https://www.youtube.com/watch?v={video_id}"

    from django.core.management import call_command
    from io import StringIO

    stdout = StringIO()
    stderr = StringIO()

    try:
        call_command(
            "ingest_prompt",
            platform=platform.slug,
            content=content,
            source_url=source_url,
            source_attribution=source_attribution or "YouTube",
            auto_approve=True,
            stdout=stdout,
            stderr=stderr,
        )
    except Exception as e:
        logger.error("YouTube ingestion failed for %s: %s", video_id, e)
        return Response(
            {"detail": f"Ingestion failed: {str(e)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    output = stdout.getvalue()
    errors = stderr.getvalue()

    if errors and "Failed" in errors:
        return Response({"detail": errors.strip()}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "status": "success",
        "ingest_type": "prompt",
        "platform": platform.slug,
        "video_id": video_id,
        "source_url": source_url,
        "characters_extracted": len(content),
        "output": output.strip(),
    }, status=status.HTTP_201_CREATED)
