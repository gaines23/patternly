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


class PlatformCategory(models.TextChoices):
    PM = "pm", "Project Management"
    AUTOMATION = "automation", "Automation / Integration"
    DATABASE = "database", "Database / No-Code"
    CRM = "crm", "CRM"
    INTEGRATION_APP = "integration_app", "Integration App"
    OTHER = "other", "Other"


class SourceType(models.TextChoices):
    ORGANIC = "organic", "Direct user input"
    INGESTED = "ingested", "AI-ingested from public source"
    COMMUNITY = "community", "Community contribution"
    TEMPLATE = "template", "Official template"


class IntegrationPatternType(models.TextChoices):
    DATA_SYNC = "data_sync", "Data Sync"
    TRIGGER_ACTION = "trigger_action", "Trigger → Action"
    BIDIRECTIONAL = "bidirectional", "Bidirectional Sync"
    MIGRATION = "migration", "One-time Migration"
    WEBHOOK = "webhook", "Webhook-based"


class KnowledgeType(models.TextChoices):
    CAPABILITY = "capability", "Capability"
    LIMITATION = "limitation", "Limitation"
    PRICING_CONSTRAINT = "pricing_constraint", "Pricing Constraint"
    API_DETAIL = "api_detail", "API Detail"
    INTEGRATION_SPEC = "integration_spec", "Integration Spec"
    FEATURE = "feature", "Feature"


class KnowledgeCategory(models.TextChoices):
    AUTOMATIONS = "automations", "Automations"
    INTEGRATIONS = "integrations", "Integrations"
    PERMISSIONS = "permissions", "Permissions"
    HIERARCHY = "hierarchy", "Hierarchy / Structure"
    REPORTING = "reporting", "Reporting / Dashboards"
    VIEWS = "views", "Views"
    CUSTOM_FIELDS = "custom_fields", "Custom Fields"
    TEMPLATES = "templates", "Templates"
    API = "api", "API"
    PRICING = "pricing", "Pricing / Plans"
    OTHER = "other", "Other"


class InsightType(models.TextChoices):
    METHODOLOGY = "methodology", "Methodology"
    WORKAROUND = "workaround", "Workaround"
    COMPLAINT = "complaint", "Complaint / Pain Point"
    BEST_PRACTICE = "best_practice", "Best Practice"
    FEATURE_REQUEST = "feature_request", "Feature Request"
    GOTCHA = "gotcha", "Gotcha / Pitfall"


# ── Platform ─────────────────────────────────────────────────────────────────

class Platform(models.Model):
    """
    Supported workflow platforms.
    Seeded via fixture (briefs/fixtures/platforms.json).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, choices=PlatformCategory.choices)
    concept_labels = models.JSONField(
        default=dict,
        help_text="Maps generic concepts to platform terms, "
                  "e.g. {'container': 'Space', 'workflow_group': 'Folder'}",
    )
    supported = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "platforms"
        ordering = ["name"]

    def __str__(self):
        return self.name


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

    # Platform relationship
    primary_platform = models.ForeignKey(
        Platform,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_files",
        help_text="Primary workflow platform being configured",
    )
    connected_platforms = models.ManyToManyField(
        Platform,
        blank=True,
        related_name="connected_case_files",
        help_text="Other platforms integrated in this workflow",
    )

    # Source tracking for ingested vs organic case files
    source_type = models.CharField(
        max_length=30,
        choices=SourceType.choices,
        default=SourceType.ORGANIC,
    )
    source_url = models.URLField(blank=True, default="")
    source_attribution = models.CharField(max_length=255, blank=True)
    confidence_score = models.FloatField(
        null=True,
        blank=True,
        help_text="AI confidence in data quality (0.0–1.0) for ingested case files",
    )
    is_training_data = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True for ingested-only training data (hidden from project list); "
                  "False for user-created projects (visible in project list). "
                  "Both are used by the AI recommendation engine.",
    )

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

    # Shareable full brief (internal)
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    share_enabled = models.BooleanField(default=False)

    # Shareable client brief (progress overview only)
    client_share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    client_share_enabled = models.BooleanField(default=False)

    # Cached AI-generated summaries
    full_summary = models.TextField(blank=True)
    full_summary_generated_at = models.DateTimeField(null=True, blank=True)
    updates_summary = models.TextField(blank=True)
    updates_summary_generated_at = models.DateTimeField(null=True, blank=True)

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

    def save(self, *args, **kwargs):
        # Keep Todo.case_file_name (a denormalized char column used by the
        # Tasks page display, project filter, and todo search) in sync with
        # the live project name. Without this, renaming a project would
        # leave stale labels on every attached todo until each one was
        # edited and re-saved.
        super().save(*args, **kwargs)
        if self.pk:
            expected = self.name or self.workflow_type or ""
            self.todos.exclude(case_file_name=expected).update(
                case_file_name=expected
            )


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
    client_url = models.URLField(max_length=500, blank=True, default="")
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
    # Platform-agnostic top-level organisational units
    containers = models.JSONField(
        default=list,
        help_text="Top-level organisational units (Spaces in CU, Boards in Monday, etc.)",
    )
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
    minutes_spent = models.PositiveIntegerField(null=True, blank=True)
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


# ── Integration Patterns ─────────────────────────────────────────────────────

class IntegrationPattern(models.Model):
    """
    Cross-platform integration patterns and their known limitations.
    Populated from case file roadblocks and ingested data.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_platform = models.ForeignKey(
        Platform, on_delete=models.CASCADE, related_name="outbound_patterns",
    )
    target_platform = models.ForeignKey(
        Platform, on_delete=models.CASCADE, related_name="inbound_patterns",
    )
    via_platform = models.ForeignKey(
        Platform,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="middleware_patterns",
        help_text="Intermediary platform if not a native integration (e.g. Zapier, Make)",
    )
    pattern_type = models.CharField(
        max_length=50, choices=IntegrationPatternType.choices,
    )
    description = models.TextField()
    known_limitations = models.JSONField(default=list)
    workarounds = models.JSONField(default=list)
    success_rate = models.FloatField(null=True, blank=True)
    case_file_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "integration_patterns"
        unique_together = ["source_platform", "target_platform", "pattern_type"]

    def __str__(self):
        via = f" via {self.via_platform}" if self.via_platform else ""
        return f"{self.source_platform} → {self.target_platform}{via} ({self.get_pattern_type_display()})"


# ── Platform Knowledge ───────────────────────────────────────────────────────

class PlatformKnowledge(models.Model):
    """
    Factual, structured intelligence about a platform's capabilities,
    limitations, API details, and integration specs.
    Sourced from official documentation, changelogs, and verified guides.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    platform = models.ForeignKey(
        Platform, on_delete=models.CASCADE, related_name="knowledge",
    )
    related_platform = models.ForeignKey(
        Platform,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="related_knowledge",
        help_text="Second platform if this is about an integration pair",
    )
    knowledge_type = models.CharField(
        max_length=50, choices=KnowledgeType.choices,
    )
    category = models.CharField(
        max_length=50, choices=KnowledgeCategory.choices,
    )
    title = models.CharField(max_length=300)
    content = models.TextField()
    source_url = models.URLField(blank=True, default="")
    source_attribution = models.CharField(max_length=255, blank=True)
    verified_at = models.DateField(
        null=True, blank=True,
        help_text="Date this was last confirmed accurate",
    )
    platform_version = models.CharField(
        max_length=50, blank=True,
        help_text="Platform version if version-specific, e.g. 'ClickUp 3.0'",
    )
    confidence_score = models.FloatField(
        null=True, blank=True,
        help_text="0.0–1.0 confidence in accuracy",
    )
    embedding = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "platform_knowledge"
        ordering = ["-verified_at", "-created_at"]
        indexes = [
            models.Index(fields=["platform", "knowledge_type"]),
            models.Index(fields=["platform", "category"]),
            models.Index(fields=["platform", "related_platform"]),
        ]

    def __str__(self):
        related = f" + {self.related_platform}" if self.related_platform else ""
        return f"[{self.platform}{related}] {self.title}"


# ── Community Insight ────────────────────────────────────────────────────────

class CommunityInsight(models.Model):
    """
    Experiential knowledge from practitioners, community forums, and
    methodology guides. Less structured than PlatformKnowledge — captures
    opinions, patterns, workarounds, and gotchas.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    platforms = models.ManyToManyField(
        Platform, related_name="community_insights",
        help_text="Platforms this insight relates to",
    )
    insight_type = models.CharField(
        max_length=50, choices=InsightType.choices,
    )
    title = models.CharField(max_length=300)
    content = models.TextField()
    source_url = models.URLField(blank=True, default="")
    source_attribution = models.CharField(
        max_length=255, blank=True,
        help_text="e.g. 'ZenPilot', 'ClickUp Community', 'Reddit r/clickup'",
    )
    source_date = models.DateField(
        null=True, blank=True,
        help_text="When the source was published",
    )
    confidence_score = models.FloatField(
        null=True, blank=True,
        help_text="Reliability: official docs (0.9+) > practitioner blog (0.7) > forum post (0.5)",
    )
    applies_to_industries = models.JSONField(
        default=list, blank=True,
        help_text="Industry tags if this insight is industry-specific",
    )
    embedding = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "community_insights"
        ordering = ["-source_date", "-created_at"]
        indexes = [
            models.Index(fields=["insight_type"]),
            models.Index(fields=["source_date"]),
        ]

    def __str__(self):
        return f"[{self.get_insight_type_display()}] {self.title}"
