import uuid
from django.conf import settings
from django.db import models

from .fields import EncryptedTextField


class IntegrationProvider(models.TextChoices):
    CLICKUP = "clickup", "ClickUp"


class AuthMethod(models.TextChoices):
    OAUTH = "oauth", "OAuth"
    PERSONAL_TOKEN = "personal_token", "Personal API Token"


class ExportSourceType(models.TextChoices):
    CASE_FILE = "case_file", "Case File"
    LIBRARY_ITEM = "library_item", "Library Item"


class ExportStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    SUCCESS = "success", "Success"
    PARTIAL = "partial", "Partial"
    FAILED = "failed", "Failed"


class ProjectIntegration(models.Model):
    """
    A per-project (per CaseFile) connection to a third-party workflow platform.

    Scope is intentionally per-CaseFile: each client project lives in its own
    external workspace with its own credentials. Team-level visibility of the
    CaseFile transitively gates who can use the integration.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_file = models.ForeignKey(
        "briefs.CaseFile",
        on_delete=models.CASCADE,
        related_name="integrations",
    )
    provider = models.CharField(max_length=32, choices=IntegrationProvider.choices)

    workspace_id = models.CharField(
        max_length=64,
        help_text="External workspace/team ID returned by the provider.",
    )
    workspace_name = models.CharField(max_length=255, blank=True)

    access_token = EncryptedTextField(
        help_text="OAuth access token or personal API token, encrypted at rest "
                  "with FIELD_ENCRYPTION_KEY.",
    )
    auth_method = models.CharField(
        max_length=20,
        choices=AuthMethod.choices,
        default=AuthMethod.OAUTH,
        help_text="How the user authorized this connection. Affects nothing in "
                  "the export pipeline — both methods produce a working token.",
    )
    scopes = models.JSONField(
        default=list,
        blank=True,
        help_text="OAuth scopes granted at connection time. Empty for personal tokens.",
    )

    connected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="integrations_connected",
        help_text="User who completed the OAuth flow. Audit only.",
    )
    connected_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Soft-delete marker. Treat row as inactive when set.",
    )

    class Meta:
        db_table = "project_integrations"
        ordering = ["-connected_at"]
        constraints = [
            # Only one ACTIVE connection per (case_file, provider). Revoked
            # rows stay in the table for audit and don't block reconnection.
            models.UniqueConstraint(
                fields=["case_file", "provider"],
                condition=models.Q(revoked_at__isnull=True),
                name="uniq_active_project_integration",
            ),
        ]
        indexes = [
            models.Index(fields=["case_file", "provider"]),
            models.Index(fields=["provider", "revoked_at"]),
        ]

    def __str__(self):
        active = "active" if self.revoked_at is None else "revoked"
        return f"{self.get_provider_display()}/{self.workspace_name or self.workspace_id} ({active})"

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None


class IntegrationExport(models.Model):
    """
    A single push attempt from Patternly into an external workspace.

    `source_type` + `source_id` is polymorphic so a single export pipeline can
    serve full CaseFile pushes and individual LibraryItem pushes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    integration = models.ForeignKey(
        ProjectIntegration,
        on_delete=models.CASCADE,
        related_name="exports",
    )

    source_type = models.CharField(max_length=32, choices=ExportSourceType.choices)
    source_id = models.UUIDField(
        help_text="UUID of the CaseFile or LibraryItem being exported.",
    )

    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exports_triggered",
    )

    status = models.CharField(
        max_length=20,
        choices=ExportStatus.choices,
        default=ExportStatus.PENDING,
        db_index=True,
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(
        blank=True,
        help_text="Truncated error message from the most recent failed step. "
                  "MUST NOT contain access tokens or PII.",
    )
    summary_json = models.JSONField(
        default=dict,
        blank=True,
        help_text='Counts and metadata, e.g. {"spaces_created": 2, "tasks_created": 14}.',
    )

    class Meta:
        db_table = "integration_exports"
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["source_type", "source_id"]),
            models.Index(fields=["integration", "-started_at"]),
        ]

    def __str__(self):
        return f"Export {self.id} → {self.integration} ({self.status})"


class IntegrationObjectMap(models.Model):
    """
    Idempotency ledger: records which Patternly object ended up as which
    external object, so subsequent re-syncs update rather than duplicate.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    export = models.ForeignKey(
        IntegrationExport,
        on_delete=models.CASCADE,
        related_name="object_maps",
    )

    patternly_type = models.CharField(
        max_length=32,
        help_text="e.g. 'workflow', 'list', 'task', 'todo', 'roadblock'.",
    )
    patternly_id = models.CharField(
        max_length=255,
        help_text="UUID for model rows or a JSON path like 'workflows[0].lists[2]' "
                  "for nested JSON entries.",
    )

    external_type = models.CharField(
        max_length=32,
        help_text="e.g. 'space', 'folder', 'list', 'task'.",
    )
    external_id = models.CharField(max_length=64)
    external_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "integration_object_maps"
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["export", "patternly_type", "patternly_id"],
                name="uniq_export_patternly_object",
            ),
        ]
        indexes = [
            models.Index(fields=["export", "patternly_type"]),
            models.Index(fields=["external_type", "external_id"]),
        ]

    def __str__(self):
        return f"{self.patternly_type}:{self.patternly_id} ↔ {self.external_type}:{self.external_id}"
