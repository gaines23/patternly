import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.integrations.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("briefs", "0023_casefile_team"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectIntegration",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "provider",
                    models.CharField(
                        choices=[("clickup", "ClickUp")], max_length=32
                    ),
                ),
                (
                    "workspace_id",
                    models.CharField(
                        help_text="External workspace/team ID returned by the provider.",
                        max_length=64,
                    ),
                ),
                ("workspace_name", models.CharField(blank=True, max_length=255)),
                (
                    "access_token",
                    apps.integrations.fields.EncryptedTextField(
                        help_text="OAuth access token, encrypted at rest with FIELD_ENCRYPTION_KEY.",
                    ),
                ),
                (
                    "scopes",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="OAuth scopes granted at connection time.",
                    ),
                ),
                ("connected_at", models.DateTimeField(auto_now_add=True)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                (
                    "revoked_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Soft-delete marker. Treat row as inactive when set.",
                        null=True,
                    ),
                ),
                (
                    "case_file",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="integrations",
                        to="briefs.casefile",
                    ),
                ),
                (
                    "connected_by",
                    models.ForeignKey(
                        blank=True,
                        help_text="User who completed the OAuth flow. Audit only.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="integrations_connected",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "project_integrations",
                "ordering": ["-connected_at"],
            },
        ),
        migrations.AddIndex(
            model_name="projectintegration",
            index=models.Index(
                fields=["case_file", "provider"],
                name="project_int_case_fi_2d3c0a_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="projectintegration",
            index=models.Index(
                fields=["provider", "revoked_at"],
                name="project_int_provide_8f6e1b_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="projectintegration",
            constraint=models.UniqueConstraint(
                fields=("case_file", "provider"),
                name="uniq_project_integration_per_provider",
            ),
        ),
        migrations.CreateModel(
            name="IntegrationExport",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "source_type",
                    models.CharField(
                        choices=[
                            ("case_file", "Case File"),
                            ("library_item", "Library Item"),
                        ],
                        max_length=32,
                    ),
                ),
                (
                    "source_id",
                    models.UUIDField(
                        help_text="UUID of the CaseFile or LibraryItem being exported.",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("running", "Running"),
                            ("success", "Success"),
                            ("partial", "Partial"),
                            ("failed", "Failed"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "last_error",
                    models.TextField(
                        blank=True,
                        help_text=(
                            "Truncated error message from the most recent failed step. "
                            "MUST NOT contain access tokens or PII."
                        ),
                    ),
                ),
                (
                    "summary_json",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text='Counts and metadata, e.g. {"spaces_created": 2, "tasks_created": 14}.',
                    ),
                ),
                (
                    "integration",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="exports",
                        to="integrations.projectintegration",
                    ),
                ),
                (
                    "triggered_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="exports_triggered",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "integration_exports",
                "ordering": ["-started_at"],
            },
        ),
        migrations.AddIndex(
            model_name="integrationexport",
            index=models.Index(
                fields=["source_type", "source_id"],
                name="integration_source__1e7b34_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="integrationexport",
            index=models.Index(
                fields=["integration", "-started_at"],
                name="integration_integra_4ac82d_idx",
            ),
        ),
        migrations.CreateModel(
            name="IntegrationObjectMap",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "patternly_type",
                    models.CharField(
                        help_text="e.g. 'workflow', 'list', 'task', 'todo', 'roadblock'.",
                        max_length=32,
                    ),
                ),
                (
                    "patternly_id",
                    models.CharField(
                        help_text=(
                            "UUID for model rows or a JSON path like 'workflows[0].lists[2]' "
                            "for nested JSON entries."
                        ),
                        max_length=255,
                    ),
                ),
                (
                    "external_type",
                    models.CharField(
                        help_text="e.g. 'space', 'folder', 'list', 'task'.",
                        max_length=32,
                    ),
                ),
                ("external_id", models.CharField(max_length=64)),
                ("external_url", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "export",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="object_maps",
                        to="integrations.integrationexport",
                    ),
                ),
            ],
            options={
                "db_table": "integration_object_maps",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="integrationobjectmap",
            index=models.Index(
                fields=["export", "patternly_type"],
                name="integration_export__9c5af0_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="integrationobjectmap",
            index=models.Index(
                fields=["external_type", "external_id"],
                name="integration_externa_b3d72e_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="integrationobjectmap",
            constraint=models.UniqueConstraint(
                fields=("export", "patternly_type", "patternly_id"),
                name="uniq_export_patternly_object",
            ),
        ),
    ]
