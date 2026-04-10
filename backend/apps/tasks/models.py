import uuid
from django.db import models
from django.conf import settings


class TodoStatus(models.TextChoices):
    OPEN        = "open",        "Open"
    IN_PROGRESS = "in_progress", "In Progress"
    DONE        = "done",        "Done"


class TodoPriority(models.TextChoices):
    LOW    = "low",    "Low"
    MEDIUM = "medium", "Medium"
    HIGH   = "high",   "High"


class TodoLayer(models.TextChoices):
    AUDIT     = "audit",     "Audit"
    INTAKE    = "intake",    "Intake"
    BUILD     = "build",     "Build"
    DELTA     = "delta",     "Delta"
    REASONING = "reasoning", "Reasoning"
    OUTCOME   = "outcome",   "Outcome"


class Todo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title       = models.CharField(max_length=500)
    description = models.TextField(blank=True)

    # ── Client project link ───────────────────────────────────────────────────
    case_file = models.ForeignKey(
        "briefs.CaseFile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="todos",
    )
    # Denormalized so list queries don't need a join
    case_file_name = models.CharField(max_length=255, blank=True)

    # ── Layer context ─────────────────────────────────────────────────────────
    layer_reference = models.CharField(
        max_length=20,
        choices=TodoLayer.choices,
        blank=True,
    )

    # ── Assignment ────────────────────────────────────────────────────────────
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_todos",
    )
    assigned_to_name = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_todos",
    )
    created_by_name = models.CharField(max_length=255, blank=True)

    # ── Status & classification ───────────────────────────────────────────────
    status = models.CharField(
        max_length=20,
        choices=TodoStatus.choices,
        default=TodoStatus.OPEN,
        db_index=True,
    )
    priority = models.CharField(
        max_length=10,
        choices=TodoPriority.choices,
        default=TodoPriority.MEDIUM,
        db_index=True,
    )
    due_date = models.DateField(null=True, blank=True, db_index=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "todos"
        ordering = ["status", "due_date", "-created_at"]

    def __str__(self):
        return self.title
