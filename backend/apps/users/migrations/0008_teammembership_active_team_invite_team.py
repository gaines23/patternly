import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_memberships_and_active_team(apps, schema_editor):
    """
    Create a TeamMembership row for every existing (user, team) pair, copying
    the user's role onto the membership. Set active_team to the user's current
    team so the multi-team UI lands on the right team after migration.
    """
    User = apps.get_model("users", "User")
    TeamMembership = apps.get_model("users", "TeamMembership")
    Team = apps.get_model("users", "Team")

    default_team, _ = Team.objects.get_or_create(
        slug="default",
        defaults={"name": "Default Team"},
    )

    for user in User.objects.all():
        team = user.team or default_team
        TeamMembership.objects.get_or_create(
            user=user,
            team=team,
            defaults={"role": user.role or "engineer"},
        )
        # Copy the user's current team into the new active_team field. If they
        # had no team, drop them on the default so library/briefs don't 500
        # on the first request after deploy.
        if user.active_team_id is None:
            user.active_team = team
            user.save(update_fields=["active_team"])


def reverse_backfill(apps, schema_editor):
    TeamMembership = apps.get_model("users", "TeamMembership")
    User = apps.get_model("users", "User")
    TeamMembership.objects.all().delete()
    User.objects.update(active_team=None)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_team_logo"),
    ]

    operations = [
        migrations.CreateModel(
            name="TeamMembership",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("role", models.CharField(
                    choices=[("admin", "Admin"), ("engineer", "Solutions Engineer"), ("viewer", "Viewer")],
                    default="engineer",
                    max_length=50,
                )),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("team", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="memberships",
                    to="users.team",
                )),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="team_memberships",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "team_memberships",
                "ordering": ["-joined_at"],
                "unique_together": {("user", "team")},
            },
        ),
        migrations.AddField(
            model_name="user",
            name="active_team",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="active_members",
                to="users.team",
            ),
        ),
        migrations.AddField(
            model_name="invitation",
            name="invited_to_team",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="invitations",
                to="users.team",
            ),
        ),
        migrations.RunPython(backfill_memberships_and_active_team, reverse_backfill),
    ]
