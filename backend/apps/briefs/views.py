from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import CaseFile, Roadblock
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
    Dashboard stats — total builds, avg satisfaction, roadblock count.
    """
    from django.db.models import Avg, Count

    data = CaseFile.objects.aggregate(
        total=Count("id"),
        avg_satisfaction=Avg("satisfaction_score"),
        total_roadblocks=Count("delta__roadblocks"),
    )

    top_tools = (
        CaseFile.objects.values_list("tools", flat=True)
        .exclude(tools=[])
        .order_by("-created_at")[:100]
    )

    tool_freq = {}
    for tool_list in top_tools:
        for tool in tool_list:
            tool_freq[tool] = tool_freq.get(tool, 0) + 1

    top_5_tools = sorted(tool_freq.items(), key=lambda x: x[1], reverse=True)[:5]

    return Response({
        "total_case_files": data["total"],
        "avg_satisfaction": round(data["avg_satisfaction"] or 0, 2),
        "total_roadblocks": data["total_roadblocks"],
        "top_tools": [{"tool": t, "count": c} for t, c in top_5_tools],
    })
