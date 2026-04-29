import uuid

from django.conf import settings
from django.db import models


class LibraryItemKind(models.TextChoices):
    FORMULA = "formula", "Formula"
    AUTOMATION = "automation", "Agent Automation"
    CUSTOM_FIELD_SET = "custom_field_set", "Custom Field Set"
    TEMPLATE = "template", "Template"
    INTEGRATION_RECIPE = "integration_recipe", "Integration Recipe"
    SNIPPET = "snippet", "Snippet"


class LibraryItemVisibility(models.TextChoices):
    TEAM = "team", "Team"
    PRIVATE = "private", "Private"
    PUBLIC = "public", "Public"


class LibrarySourceLayer(models.TextChoices):
    BUILD_AUTOMATIONS = "build.automations", "Build — Automations"
    BUILD_CUSTOM_FIELDS = "build.custom_fields", "Build — Custom Fields"
    BUILD_WORKFLOWS = "build.workflows", "Build — Workflows"
    BUILD_INTEGRATIONS = "build.integrations", "Build — Integrations"
    OTHER = "other", "Other"


class LibraryItem(models.Model):
    """
    A reusable building block (formula, automation, template, etc.) shared
    across a team. May be authored standalone, or "promoted" from a project.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    team = models.ForeignKey(
        "users.Team",
        on_delete=models.CASCADE,
        related_name="library_items",
    )

    kind = models.CharField(max_length=32, choices=LibraryItemKind.choices, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Free-form payload — schema varies by kind. The frontend renders by `kind`.
    body = models.JSONField(default=dict, blank=True)

    # Optional platform pin (ClickUp, Monday, Zapier, etc.).
    platform = models.ForeignKey(
        "briefs.Platform",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="library_items",
    )

    # Discovery metadata — composes with the existing case-file vocabulary.
    tags = models.JSONField(default=list, blank=True)
    industries = models.JSONField(default=list, blank=True)
    tools = models.JSONField(default=list, blank=True)
    workflow_types = models.JSONField(default=list, blank=True)

    # Provenance — set when promoted from a project.
    source_case_file = models.ForeignKey(
        "briefs.CaseFile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promoted_library_items",
    )
    source_layer = models.CharField(
        max_length=32,
        choices=LibrarySourceLayer.choices,
        blank=True,
    )
    # Path within source_case_file the item was promoted from (e.g. "build.workflows[0].lists[2]").
    source_path = models.CharField(max_length=255, blank=True)

    visibility = models.CharField(
        max_length=16,
        choices=LibraryItemVisibility.choices,
        default=LibraryItemVisibility.TEAM,
    )

    version = models.PositiveIntegerField(default=1)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="library_items_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="library_items_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "library_items"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["team", "kind"]),
            models.Index(fields=["team", "-updated_at"]),
        ]

    def __str__(self):
        return f"{self.get_kind_display()} — {self.name}"


class LibraryItemUsage(models.Model):
    """
    Lightweight signal: records every time a library item is copied/used in
    a project. Drives "popular this month" sort and "used in N projects" badge.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    library_item = models.ForeignKey(
        LibraryItem,
        on_delete=models.CASCADE,
        related_name="usages",
    )
    used_in_case_file = models.ForeignKey(
        "briefs.CaseFile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="library_item_usages",
    )
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="library_item_usages",
    )
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "library_item_usages"
        ordering = ["-used_at"]
        indexes = [
            models.Index(fields=["library_item", "-used_at"]),
        ]

    def __str__(self):
        return f"Usage of {self.library_item_id} @ {self.used_at}"


class LibraryItemComment(models.Model):
    """
    Library-only annotations. These are visible on the library item view but
    are NOT rendered on the source project's build view.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    library_item = models.ForeignKey(
        LibraryItem,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="library_comments",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "library_item_comments"
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on {self.library_item_id}"
