from rest_framework import serializers
from .models import GeneratedBrief, WorkflowPattern


class GenerateBriefInputSerializer(serializers.Serializer):
    """Input for POST /api/v1/workflows/generate/"""
    raw_prompt = serializers.CharField(min_length=20, max_length=5000)


class GeneratedBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedBrief
        fields = [
            "id", "raw_prompt", "parsed_scenario", "recommendation",
            "source_case_file_ids", "confidence_score", "proactive_warnings",
            "user_rating", "user_feedback", "converted_to_case_file",
            "case_file_id", "created_at",
        ]
        read_only_fields = [
            "id", "parsed_scenario", "recommendation", "source_case_file_ids",
            "confidence_score", "proactive_warnings", "created_at",
        ]


class BriefFeedbackSerializer(serializers.Serializer):
    """Input for PATCH /api/v1/workflows/briefs/<id>/feedback/"""
    user_rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    user_feedback = serializers.CharField(max_length=2000, required=False, allow_blank=True)
