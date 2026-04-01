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


class GeneratedBriefListView(generics.ListAPIView):
    """
    GET /api/v1/workflows/briefs/
    List all previously generated briefs, newest first.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = GeneratedBriefSerializer

    def get_queryset(self):
        return GeneratedBrief.objects.all().order_by("-created_at")


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
