from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_created_by(apps, schema_editor):
    """
    For every existing ProjectUpdate, attribute it to the user who created
    the parent project (case_file.logged_by). Pre-multi-team, only the
    project owner could log updates, so this exactly preserves the original
    billing roll-up. Going forward, new updates set created_by from the
    request user — which is what enables per-teammate hour attribution on
    shared projects.
    """
    ProjectUpdate = apps.get_model("briefs", "ProjectUpdate")
    # One UPDATE statement: copy logged_by_id from the parent CaseFile.
    schema_editor.execute(
        """
        UPDATE project_updates AS pu
        SET created_by_id = cf.logged_by_id
        FROM case_files AS cf
        WHERE pu.case_file_id = cf.id
          AND pu.created_by_id IS NULL
          AND cf.logged_by_id IS NOT NULL
        """
    )


def reverse_backfill(apps, schema_editor):
    ProjectUpdate = apps.get_model("briefs", "ProjectUpdate")
    ProjectUpdate.objects.update(created_by=None)


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0026_casefile_team"),
        ("users", "0009_drop_user_team_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectupdate",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="project_updates_created",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(backfill_created_by, reverse_backfill),
    ]
