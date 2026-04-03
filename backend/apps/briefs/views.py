from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import CaseFile, Roadblock, ProjectStatus
from .serializers import (
    CaseFileDetailSerializer,
    CaseFileListSerializer,
    CaseFileWriteSerializer,
    PublicCaseFileSerializer,
)


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
        qs = CaseFile.objects.select_related("logged_by").prefetch_related(
            "audit__builds",
            "intake",
            "build",
            "delta__roadblocks",
            "reasoning",
            "outcome",
        )
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
        # Return the full detail on creation
        out = CaseFileDetailSerializer(case_file)
        return Response(out.data, status=status.HTTP_201_CREATED)


class CaseFileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/briefs/<id>/   → full case file with all layers
    PUT    /api/v1/briefs/<id>/   → update
    DELETE /api/v1/briefs/<id>/   → delete
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CaseFile.objects.select_related("logged_by").prefetch_related(
            "audit__builds",
            "intake",
            "build",
            "delta__roadblocks",
            "reasoning",
            "outcome",
        )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return CaseFileWriteSerializer
        return CaseFileDetailSerializer


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
    from django.db.models import Avg, Count

    data = CaseFile.objects.aggregate(
        total=Count("id"),
        avg_satisfaction=Avg("satisfaction_score"),
        total_roadblocks=Count("delta__roadblocks"),
    )

    # Top tools (existing — last 100 case files)
    top_tools_qs = (
        CaseFile.objects.values_list("tools", flat=True)
        .exclude(tools=[])
        .order_by("-created_at")[:100]
    )
    tool_freq = {}
    for tool_list in top_tools_qs:
        for tool in tool_list:
            tool_freq[tool] = tool_freq.get(tool, 0) + 1
    top_5_tools = sorted(tool_freq.items(), key=lambda x: x[1], reverse=True)[:5]

    # 1. Average time cost of roadblocks (hours)
    time_cost_agg = Roadblock.objects.filter(
        time_cost_hours__isnull=False
    ).aggregate(avg=Avg("time_cost_hours"))

    # 2. Most common roadblock types — count + top affected tool per type
    roadblocks_qs = Roadblock.objects.exclude(type="").values("type", "tools_affected")
    type_tool_counts = {}  # {rb_type: {tool: count}}
    for rb in roadblocks_qs:
        rb_type = rb["type"]
        if rb_type not in type_tool_counts:
            type_tool_counts[rb_type] = {}
        for tool in (rb["tools_affected"] or []):
            type_tool_counts[rb_type][tool] = type_tool_counts[rb_type].get(tool, 0) + 1

    roadblock_types = []
    for rb_type, tool_counts in type_tool_counts.items():
        roadblock_types.append({
            "type": rb_type,
            "count": sum(tool_counts.values()),
            "tools": [
                {"tool": t, "count": c}
                for t, c in sorted(tool_counts.items(), key=lambda x: x[1], reverse=True)
            ],
        })
    roadblock_types.sort(key=lambda x: x["count"], reverse=True)

    # 3. Satisfaction by workflow type (SQL aggregation)
    sat_by_workflow = list(
        CaseFile.objects.exclude(workflow_type="")
        .exclude(satisfaction_score__isnull=True)
        .values("workflow_type")
        .annotate(avg_sat=Avg("satisfaction_score"), count=Count("id"))
        .order_by("-avg_sat")[:10]
    )

    # 4. Satisfaction by industry (Python aggregation — JSONField)
    industry_scores = {}
    for cf in CaseFile.objects.exclude(industries=[]).exclude(
        satisfaction_score__isnull=True
    ).values("industries", "satisfaction_score"):
        for ind in (cf["industries"] or []):
            if ind not in industry_scores:
                industry_scores[ind] = []
            industry_scores[ind].append(cf["satisfaction_score"])

    sat_by_industry = sorted(
        [
            {"industry": ind, "avg_sat": round(sum(s) / len(s), 2), "count": len(s)}
            for ind, s in industry_scores.items()
        ],
        key=lambda x: x["avg_sat"],
        reverse=True,
    )[:10]

    # 5. Tools that appear most in scope-creep / diverged cases
    scope_creep_tool_freq = {}
    for tool_list in CaseFile.objects.filter(
        delta__diverged=True
    ).values_list("tools", flat=True):
        for tool in (tool_list or []):
            scope_creep_tool_freq[tool] = scope_creep_tool_freq.get(tool, 0) + 1

    scope_creep_tools = [
        {"tool": t, "count": c}
        for t, c in sorted(scope_creep_tool_freq.items(), key=lambda x: x[1], reverse=True)[:8]
    ]

    return Response({
        "total_case_files": data["total"],
        "avg_satisfaction": round(data["avg_satisfaction"] or 0, 2),
        "total_roadblocks": data["total_roadblocks"],
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
        "sat_by_industry": sat_by_industry,
        "scope_creep_tools": scope_creep_tools,
    })
