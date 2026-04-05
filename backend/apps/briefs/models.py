import uuid
from django.db import models
from django.conf import settings
from django.contrib.postgres.indexes import GinIndex


# ── Choices ───────────────────────────────────────────────────────────────────

class RoadblockType(models.TextChoices):
    INTEGRATION_LIMITATION = "integration_limitation", "Integration Limitation"
    API_LIMITATION = "api_limitation", "API Limitation"
    AUTOMATION_LIMITATION = "automation_limitation", "Automation Limitation"
    DATA_MAPPING_MISMATCH = "data_mapping_mismatch", "Data Mapping Mismatch"
    AUTH_COMPLEXITY = "auth_complexity", "Auth Complexity"
    TIMING_CONFLICT = "timing_conflict", "Timing Conflict"
    COST_CEILING = "cost_ceiling", "Cost Ceiling"
    USER_BEHAVIOR_GAP = "user_behavior_gap", "User Behavior Gap"
    SCOPE_CREEP_BLOCK = "scope_creep_block", "Scope Creep Block"


class Severity(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    BLOCKER = "blocker", "Blocker"


class Urgency(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class BuildStatus(models.TextChoices):
    YES = "yes", "Yes"
    PARTIALLY = "partially", "Partially"
    NO = "no", "No"


class ProjectStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"


# ── Layer 0: CaseFile (top-level container) ───────────────────────────────────

class CaseFile(models.Model):
    """
    One complete workflow documentation record.
    Contains all 6 layers as related objects.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_files",
    )
    logged_by_name = models.CharField(max_length=255, blank=True)  # fallback if no user account
    name = models.CharField(max_length=255, blank=True)  # user-given name for the case file
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Denormalised tags for fast retrieval (populated from layer data on save)
    industries = models.JSONField(default=list)
    tools = models.JSONField(default=list)
    process_frameworks = models.JSONField(default=list)
    workflow_type = models.CharField(max_length=255, blank=True)
    team_size = models.CharField(max_length=50, blank=True)

    # Outcome signals — denormalised for filtering
    satisfaction_score = models.PositiveSmallIntegerField(null=True, blank=True)
    roadblock_count = models.PositiveSmallIntegerField(default=0)
    built_outcome = models.CharField(
        max_length=20, choices=BuildStatus.choices, blank=True
    )

    # Project lifecycle status
    status = models.CharField(
        max_length=10, choices=ProjectStatus.choices, default=ProjectStatus.OPEN
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    # Shareable client brief
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    share_enabled = models.BooleanField(default=False)

    class Meta:
        db_table = "case_files"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["satisfaction_score"]),
            models.Index(fields=["workflow_type"]),
            models.Index(fields=["team_size"]),
            GinIndex(fields=["industries"]),
            GinIndex(fields=["tools"]),
        ]

    def __str__(self):
        return f"CaseFile {self.id} — {self.workflow_type or 'Unknown'} ({self.created_at.date()})"


# ── Layer 1: Audit ────────────────────────────────────────────────────────────

class AuditLayer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file = models.OneToOneField(CaseFile, on_delete=models.CASCADE, related_name="audit")
    has_existing = models.BooleanField(null=True, blank=True)
    overall_assessment = models.TextField(blank=True)
    tried_to_fix = models.BooleanField(null=True, blank=True)
    previous_fixes = models.TextField(blank=True)
    pattern_summary = models.TextField(blank=True)

    class Meta:
        db_table = "audit_layers"


class CurrentBuild(models.Model):
    """One broken tool/system within an audit."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit = models.ForeignKey(AuditLayer, on_delete=models.CASCADE, related_name="builds")
    tool = models.CharField(max_length=255, blank=True)
    structure = models.TextField(blank=True)
    failure_reasons = models.JSONField(default=list)
    what_breaks = models.TextField(blank=True)
    workarounds_they_use = models.TextField(blank=True)
    how_long_broken = models.CharField(max_length=100, blank=True)
    who_reported = models.CharField(max_length=100, blank=True)
    integrations_in_place = models.JSONField(default=list)
    impact_on_team = models.TextField(blank=True)
    urgency = models.CharField(max_length=20, choices=Urgency.choices, default=Urgency.MEDIUM)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "current_builds"
        ordering = ["order"]


# ── Layer 2: Intake ───────────────────────────────────────────────────────────

class IntakeLayer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file = models.OneToOneField(CaseFile, on_delete=models.CASCADE, related_name="intake")
    raw_prompt = models.TextField(blank=True)
    industries = models.JSONField(default=list)
    team_size = models.CharField(max_length=50, blank=True)
    workflow_type = models.CharField(max_length=255, blank=True)
    process_frameworks = models.JSONField(default=list)
    tools = models.JSONField(default=list)
    pain_points = models.JSONField(default=list)
    prior_attempts = models.TextField(blank=True)

    class Meta:
        db_table = "intake_layers"


# ── Layer 3: Build ────────────────────────────────────────────────────────────

class BuildLayer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file = models.OneToOneField(CaseFile, on_delete=models.CASCADE, related_name="build")
    spaces = models.TextField(blank=True)
    lists = models.TextField(blank=True)
    statuses = models.TextField(blank=True)
    custom_fields = models.TextField(blank=True)
    automations = models.TextField(blank=True)
    integrations = models.JSONField(default=list)
    build_notes = models.TextField(blank=True)
    # Structured multi-workflow build map
    workflows = models.JSONField(default=list)

    class Meta:
        db_table = "build_layers"


# ── Layer 4: Delta ────────────────────────────────────────────────────────────

class DeltaLayer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file = models.OneToOneField(CaseFile, on_delete=models.CASCADE, related_name="delta")
    user_intent = models.TextField(blank=True)
    success_criteria = models.TextField(blank=True)
    actual_build = models.TextField(blank=True)
    diverged = models.BooleanField(null=True, blank=True)
    divergence_reason = models.TextField(blank=True)
    compromises = models.TextField(blank=True)
    scope_creep = models.JSONField(default=list)

    class Meta:
        db_table = "delta_layers"


class Roadblock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    delta = models.ForeignKey(DeltaLayer, on_delete=models.CASCADE, related_name="roadblocks")
    type = models.CharField(max_length=50, choices=RoadblockType.choices, blank=True)
    severity = models.CharField(max_length=20, choices=Severity.choices, blank=True)
    tools_affected = models.JSONField(default=list)
    description = models.TextField(blank=True)
    workaround_found = models.BooleanField(null=True, blank=True)
    workaround_description = models.TextField(blank=True)
    time_cost_hours = models.FloatField(null=True, blank=True)
    future_warning = models.TextField(blank=True)
    flag_for_future = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "roadblocks"
        ordering = ["order"]
        indexes = [
            models.Index(fields=["severity"]),
            models.Index(fields=["flag_for_future"]),
        ]


# ── Project Updates ───────────────────────────────────────────────────────────

class ProjectUpdate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file = models.ForeignKey(CaseFile, on_delete=models.CASCADE, related_name="project_updates")
    content = models.TextField(blank=True)
    attachments = models.JSONField(default=list)  # [{name, url}]
    created_at = models.DateTimeField()
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "project_updates"
        ordering = ["-created_at"]


# ── Layer 5: Reasoning ────────────────────────────────────────────────────────

class ReasoningLayer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file = models.OneToOneField(CaseFile, on_delete=models.CASCADE, related_name="reasoning")
    why_structure = models.TextField(blank=True)
    alternatives = models.TextField(blank=True)
    why_rejected = models.TextField(blank=True)
    assumptions = models.TextField(blank=True)
    when_opposite = models.TextField(blank=True)
    lessons = models.TextField(blank=True)
    complexity = models.PositiveSmallIntegerField(default=3)  # 1–5

    class Meta:
        db_table = "reasoning_layers"


# ── Layer 6: Outcome ──────────────────────────────────────────────────────────

class OutcomeLayer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file = models.OneToOneField(CaseFile, on_delete=models.CASCADE, related_name="outcome")
    built = models.CharField(max_length=20, choices=BuildStatus.choices, blank=True)
    block_reason = models.TextField(blank=True)
    changes = models.TextField(blank=True)
    what_worked = models.TextField(blank=True)
    what_failed = models.TextField(blank=True)
    satisfaction = models.PositiveSmallIntegerField(default=3)  # 1–5
    recommend = models.CharField(
        max_length=10,
        choices=[("yes", "Yes"), ("maybe", "Maybe"), ("no", "No")],
        blank=True,
    )
    revisit_when = models.TextField(blank=True)

    class Meta:
        db_table = "outcome_layers"
