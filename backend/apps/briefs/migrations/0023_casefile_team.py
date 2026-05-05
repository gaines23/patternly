from django.db import migrations, models


def backfill_team_from_logged_by(apps, schema_editor):
    """Set CaseFile.team to logged_by.team for rows where logged_by is set."""
    CaseFile = apps.get_model("briefs", "CaseFile")
    for cf in CaseFile.objects.filter(team__isnull=True, logged_by__isnull=False).iterator():
        team_id = getattr(cf.logged_by, "team_id", None)
        if team_id:
            cf.team_id = team_id
            cf.save(update_fields=["team"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0022_projectupdate_minutes_spent"),
        ("users", "0006_team_user_team"),
    ]

    operations = [
        migrations.AddField(
            model_name="casefile",
            name="team",
            field=models.ForeignKey(
                blank=True,
                help_text=(
                    "Team that owns this case file. Gates visibility; per-project "
                    "API integrations live alongside this and inherit the same scope."
                ),
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="case_files",
                to="users.team",
            ),
        ),
        migrations.RunPython(backfill_team_from_logged_by, noop_reverse),
    ]
