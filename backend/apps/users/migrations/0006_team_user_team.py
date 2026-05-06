import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_default_team(apps, schema_editor):
    Team = apps.get_model("users", "Team")
    User = apps.get_model("users", "User")
    team, _ = Team.objects.get_or_create(
        slug="default",
        defaults={"name": "Default Team"},
    )
    User.objects.filter(team__isnull=True).update(team=team)


def reverse_default_team(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.update(team=None)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_rename_audit_logs_user_created_idx_audit_logs_user_id_6193b2_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Team",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120)),
                ("slug", models.SlugField(unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "teams",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="user",
            name="team",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="members",
                to="users.team",
            ),
        ),
        migrations.RunPython(create_default_team, reverse_default_team),
    ]
