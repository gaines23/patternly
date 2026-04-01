import uuid
import pgvector.django
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="WorkflowPattern",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_file_id", models.UUIDField(db_index=True)),
                ("chunk_type", models.CharField(
                    choices=[("scenario","Scenario"),("build","Build"),("reasoning","Reasoning"),("outcome","Outcome"),("roadblock","Roadblock")],
                    db_index=True, max_length=30,
                )),
                ("text", models.TextField()),
                ("embedding", pgvector.django.VectorField(blank=True, dimensions=1536, null=True)),
                ("industries", models.JSONField(default=list)),
                ("tools", models.JSONField(default=list)),
                ("workflow_type", models.CharField(blank=True, db_index=True, max_length=255)),
                ("satisfaction_score", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("complexity", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "workflow_patterns"},
        ),
        migrations.CreateModel(
            name="GeneratedBrief",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("raw_prompt", models.TextField()),
                ("parsed_scenario", models.JSONField(default=dict)),
                ("recommendation", models.JSONField(default=dict)),
                ("source_case_file_ids", models.JSONField(default=list)),
                ("confidence_score", models.FloatField(blank=True, null=True)),
                ("proactive_warnings", models.JSONField(default=list)),
                ("user_rating", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("user_feedback", models.TextField(blank=True)),
                ("converted_to_case_file", models.BooleanField(default=False)),
                ("case_file_id", models.UUIDField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "generated_briefs", "ordering": ["-created_at"]},
        ),
    ]
