import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── CaseFile ──────────────────────────────────────────────────────
        migrations.CreateModel(
            name="CaseFile",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("logged_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="case_files",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("logged_by_name", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("industries", models.JSONField(default=list)),
                ("tools", models.JSONField(default=list)),
                ("process_frameworks", models.JSONField(default=list)),
                ("workflow_type", models.CharField(blank=True, max_length=255)),
                ("team_size", models.CharField(blank=True, max_length=50)),
                ("satisfaction_score", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("roadblock_count", models.PositiveSmallIntegerField(default=0)),
                ("built_outcome", models.CharField(
                    blank=True,
                    choices=[("yes", "Yes"), ("partially", "Partially"), ("no", "No")],
                    max_length=20,
                )),
            ],
            options={"db_table": "case_files", "ordering": ["-created_at"]},
        ),

        # ── AuditLayer ────────────────────────────────────────────────────
        migrations.CreateModel(
            name="AuditLayer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_file", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="audit",
                    to="briefs.casefile",
                )),
                ("has_existing", models.BooleanField(blank=True, null=True)),
                ("overall_assessment", models.TextField(blank=True)),
                ("tried_to_fix", models.BooleanField(blank=True, null=True)),
                ("previous_fixes", models.TextField(blank=True)),
                ("pattern_summary", models.TextField(blank=True)),
            ],
            options={"db_table": "audit_layers"},
        ),

        # ── CurrentBuild ──────────────────────────────────────────────────
        migrations.CreateModel(
            name="CurrentBuild",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("audit", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="builds",
                    to="briefs.auditlayer",
                )),
                ("tool", models.CharField(blank=True, max_length=255)),
                ("structure", models.TextField(blank=True)),
                ("failure_reasons", models.JSONField(default=list)),
                ("what_breaks", models.TextField(blank=True)),
                ("workarounds_they_use", models.TextField(blank=True)),
                ("how_long_broken", models.CharField(blank=True, max_length=100)),
                ("who_reported", models.CharField(blank=True, max_length=100)),
                ("integrations_in_place", models.JSONField(default=list)),
                ("impact_on_team", models.TextField(blank=True)),
                ("urgency", models.CharField(
                    choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")],
                    default="medium", max_length=20,
                )),
                ("order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"db_table": "current_builds", "ordering": ["order"]},
        ),

        # ── IntakeLayer ───────────────────────────────────────────────────
        migrations.CreateModel(
            name="IntakeLayer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_file", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="intake",
                    to="briefs.casefile",
                )),
                ("raw_prompt", models.TextField(blank=True)),
                ("industries", models.JSONField(default=list)),
                ("team_size", models.CharField(blank=True, max_length=50)),
                ("workflow_type", models.CharField(blank=True, max_length=255)),
                ("process_frameworks", models.JSONField(default=list)),
                ("tools", models.JSONField(default=list)),
                ("pain_points", models.JSONField(default=list)),
                ("prior_attempts", models.TextField(blank=True)),
            ],
            options={"db_table": "intake_layers"},
        ),

        # ── BuildLayer ────────────────────────────────────────────────────
        migrations.CreateModel(
            name="BuildLayer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_file", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="build",
                    to="briefs.casefile",
                )),
                ("spaces", models.TextField(blank=True)),
                ("lists", models.TextField(blank=True)),
                ("statuses", models.TextField(blank=True)),
                ("custom_fields", models.TextField(blank=True)),
                ("automations", models.TextField(blank=True)),
                ("integrations", models.JSONField(default=list)),
                ("build_notes", models.TextField(blank=True)),
            ],
            options={"db_table": "build_layers"},
        ),

        # ── DeltaLayer ────────────────────────────────────────────────────
        migrations.CreateModel(
            name="DeltaLayer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_file", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="delta",
                    to="briefs.casefile",
                )),
                ("user_intent", models.TextField(blank=True)),
                ("success_criteria", models.TextField(blank=True)),
                ("actual_build", models.TextField(blank=True)),
                ("diverged", models.BooleanField(blank=True, null=True)),
                ("divergence_reason", models.TextField(blank=True)),
                ("compromises", models.TextField(blank=True)),
            ],
            options={"db_table": "delta_layers"},
        ),

        # ── Roadblock ─────────────────────────────────────────────────────
        migrations.CreateModel(
            name="Roadblock",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("delta", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="roadblocks",
                    to="briefs.deltalayer",
                )),
                ("type", models.CharField(
                    blank=True,
                    choices=[
                        ("integration_limitation", "Integration Limitation"),
                        ("api_limitation", "API Limitation"),
                        ("data_mapping_mismatch", "Data Mapping Mismatch"),
                        ("auth_complexity", "Auth Complexity"),
                        ("timing_conflict", "Timing Conflict"),
                        ("cost_ceiling", "Cost Ceiling"),
                        ("user_behavior_gap", "User Behavior Gap"),
                        ("scope_creep_block", "Scope Creep Block"),
                    ],
                    max_length=50,
                )),
                ("severity", models.CharField(
                    blank=True,
                    choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("blocker", "Blocker")],
                    max_length=20,
                )),
                ("tools_affected", models.JSONField(default=list)),
                ("description", models.TextField(blank=True)),
                ("workaround_found", models.BooleanField(blank=True, null=True)),
                ("workaround_description", models.TextField(blank=True)),
                ("time_cost_hours", models.FloatField(blank=True, null=True)),
                ("future_warning", models.TextField(blank=True)),
                ("flag_for_future", models.BooleanField(default=True)),
                ("order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"db_table": "roadblocks", "ordering": ["order"]},
        ),

        # ── ReasoningLayer ────────────────────────────────────────────────
        migrations.CreateModel(
            name="ReasoningLayer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_file", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="reasoning",
                    to="briefs.casefile",
                )),
                ("why_structure", models.TextField(blank=True)),
                ("alternatives", models.TextField(blank=True)),
                ("why_rejected", models.TextField(blank=True)),
                ("assumptions", models.TextField(blank=True)),
                ("when_opposite", models.TextField(blank=True)),
                ("lessons", models.TextField(blank=True)),
                ("complexity", models.PositiveSmallIntegerField(default=3)),
            ],
            options={"db_table": "reasoning_layers"},
        ),

        # ── OutcomeLayer ──────────────────────────────────────────────────
        migrations.CreateModel(
            name="OutcomeLayer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_file", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="outcome",
                    to="briefs.casefile",
                )),
                ("built", models.CharField(
                    blank=True,
                    choices=[("yes", "Yes"), ("partially", "Partially"), ("no", "No")],
                    max_length=20,
                )),
                ("block_reason", models.TextField(blank=True)),
                ("changes", models.TextField(blank=True)),
                ("what_worked", models.TextField(blank=True)),
                ("what_failed", models.TextField(blank=True)),
                ("satisfaction", models.PositiveSmallIntegerField(default=3)),
                ("recommend", models.CharField(
                    blank=True,
                    choices=[("yes", "Yes"), ("maybe", "Maybe"), ("no", "No")],
                    max_length=10,
                )),
                ("revisit_when", models.TextField(blank=True)),
            ],
            options={"db_table": "outcome_layers"},
        ),
    ]
