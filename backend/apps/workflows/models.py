import uuid
from django.db import models
from pgvector.django import VectorField


class WorkflowTemplate(models.Model):
    """
    A pre-built workflow template used for template matching on the Generate page.
    Templates are matched against parsed user prompts by metadata scoring
    (workflow_type, industries, pain_points, tools) rather than AI generation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Matching metadata — scored against parsed scenario
    workflow_type = models.CharField(max_length=255, db_index=True)
    industries = models.JSONField(default=list)
    pain_points = models.JSONField(default=list)
    tools = models.JSONField(default=list)
    process_frameworks = models.JSONField(default=list)

    # Build structure — mirrors GeneratedBrief.recommendation fields
    spaces = models.TextField(blank=True)
    lists = models.TextField(blank=True)
    statuses = models.TextField(blank=True)
    custom_fields = models.TextField(blank=True)
    automations = models.TextField(blank=True)
    integrations = models.JSONField(default=list)
    build_notes = models.TextField(blank=True)
    estimated_complexity = models.PositiveSmallIntegerField(default=3)

    # Provenance — set when auto-generated from a real build
    source_project_id = models.UUIDField(null=True, blank=True, unique=True, db_index=True)
    is_auto_generated = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "workflow_templates"
        ordering = ["workflow_type", "name"]

    def __str__(self):
        return f"{self.name} ({self.workflow_type})"


class WorkflowPattern(models.Model):
    """
    A retrieved and embedded case file chunk used for RAG retrieval.
    Each CaseFile gets chunked into multiple patterns for targeted retrieval.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file_id = models.UUIDField(db_index=True)

    CHUNK_TYPES = [
        ("scenario", "Scenario (intake + audit combined)"),
        ("build", "Build documentation"),
        ("reasoning", "Decision reasoning"),
        ("outcome", "Outcome + delta"),
        ("roadblock", "Individual roadblock"),
    ]
    chunk_type = models.CharField(max_length=30, choices=CHUNK_TYPES, db_index=True)
    text = models.TextField()
    embedding = VectorField(dimensions=1536, null=True, blank=True)

    industries = models.JSONField(default=list)
    tools = models.JSONField(default=list)
    workflow_type = models.CharField(max_length=255, blank=True, db_index=True)
    satisfaction_score = models.PositiveSmallIntegerField(null=True, blank=True)
    complexity = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "workflow_patterns"
        indexes = [
            models.Index(fields=["chunk_type", "workflow_type"]),
            models.Index(fields=["satisfaction_score"]),
        ]

    def __str__(self):
        return f"Pattern [{self.chunk_type}] — case_file {self.case_file_id}"


class GeneratedBrief(models.Model):
    """
    An AI-generated workflow recommendation stored for feedback and training.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raw_prompt = models.TextField()
    parsed_scenario = models.JSONField(default=dict)
    recommendation = models.JSONField(default=dict)
    source_case_file_ids = models.JSONField(default=list)
    confidence_score = models.FloatField(null=True, blank=True)
    proactive_warnings = models.JSONField(default=list)
    user_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    user_feedback = models.TextField(blank=True)
    converted_to_case_file = models.BooleanField(default=False)
    case_file_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "generated_briefs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"GeneratedBrief {self.id} — {self.raw_prompt[:60]}"
