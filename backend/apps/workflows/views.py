import logging

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .ai_service import FlowpathAIService, ConfigurationError, AIServiceError
from .models import GeneratedBrief
from .serializers import (
    GenerateBriefInputSerializer,
    GeneratedBriefSerializer,
    BriefFeedbackSerializer,
)

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_brief(request):
    """
    POST /api/v1/workflows/generate/

    Takes a raw user prompt and runs the full AI pipeline:
    parse → retrieve similar case files → generate recommendation → persist.

    Body:
        { "raw_prompt": "We're a 6-person agency using Slack and HubSpot..." }

    Returns the full GeneratedBrief including recommendation and warnings.
    """
    input_serializer = GenerateBriefInputSerializer(data=request.data)
    if not input_serializer.is_valid():
        return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    raw_prompt = input_serializer.validated_data["raw_prompt"]

    try:
        service = FlowpathAIService()
        brief = service.generate_brief(raw_prompt)
        return Response(
            GeneratedBriefSerializer(brief).data,
            status=status.HTTP_201_CREATED,
        )
    except ConfigurationError as e:
        logger.error("AI service not configured: %s", e)
        return Response(
            {"error": "AI service is not configured. Set ANTHROPIC_API_KEY in your environment."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except AIServiceError as e:
        logger.error("AI service error: %s", e)
        return Response(
            {"error": f"AI generation failed: {str(e)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        logger.exception("Unexpected error in generate_brief: %s", e)
        return Response(
            {"error": "An unexpected error occurred. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def parse_prompt(request):
    """
    POST /api/v1/workflows/parse/

    Lightweight parse-only endpoint. Runs parse_scenario and returns
    structured fields without persisting anything or running the full
    recommendation pipeline.

    Body:
        { "raw_prompt": "We're a 6-person agency using Slack and HubSpot..." }

    Returns:
        { "industry": "", "team_size": "", "workflow_type": "",
          "tools": [], "pain_points": [], "process_frameworks": [] }
    """
    raw_prompt = (request.data.get("raw_prompt") or "").strip()
    if not raw_prompt:
        return Response({"error": "raw_prompt is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service = FlowpathAIService()
        scenario = service.parse_scenario(raw_prompt)
        return Response({
            "industry": scenario.industry,
            "team_size": scenario.team_size,
            "workflow_type": scenario.workflow_type,
            "tools": scenario.tools,
            "pain_points": scenario.pain_points,
            "process_frameworks": scenario.process_frameworks,
        })
    except ConfigurationError as e:
        logger.error("AI service not configured: %s", e)
        return Response(
            {"error": "AI service is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except AIServiceError as e:
        logger.error("AI service error: %s", e)
        return Response(
            {"error": f"Parse failed: {str(e)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        logger.exception("Unexpected error in parse_prompt: %s", e)
        return Response(
            {"error": "An unexpected error occurred."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class GeneratedBriefListView(generics.ListAPIView):
    """
    GET /api/v1/workflows/briefs/
    List all previously generated briefs, newest first.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = GeneratedBriefSerializer

    def get_queryset(self):
        qs = GeneratedBrief.objects.all().order_by("-created_at")
        case_file_id = self.request.query_params.get("case_file_id")
        if case_file_id:
            qs = qs.filter(case_file_id=case_file_id)
        return qs


class GeneratedBriefDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/workflows/briefs/<id>/
    Retrieve a single generated brief.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = GeneratedBriefSerializer
    queryset = GeneratedBrief.objects.all()


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def brief_convert(request, pk):
    """
    PATCH /api/v1/workflows/briefs/<id>/convert/

    Mark a generated brief as converted to a case file and record the link.

    Body:
        { "case_file_id": "<uuid>" }
    """
    try:
        brief = GeneratedBrief.objects.get(pk=pk)
    except GeneratedBrief.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    case_file_id = request.data.get("case_file_id")
    if not case_file_id:
        return Response({"error": "case_file_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    brief.converted_to_case_file = True
    brief.case_file_id = case_file_id
    brief.save(update_fields=["converted_to_case_file", "case_file_id"])

    return Response(GeneratedBriefSerializer(brief).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def brief_feedback(request, pk):
    """
    PATCH /api/v1/workflows/briefs/<id>/feedback/

    Submit user rating and feedback on a generated brief.
    This is training signal — every rating improves future retrieval.
    """
    try:
        brief = GeneratedBrief.objects.get(pk=pk)
    except GeneratedBrief.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = BriefFeedbackSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    if "user_rating" in data:
        brief.user_rating = data["user_rating"]
    if "user_feedback" in data:
        brief.user_feedback = data["user_feedback"]
    brief.save(update_fields=["user_rating", "user_feedback"])

    return Response(GeneratedBriefSerializer(brief).data)
