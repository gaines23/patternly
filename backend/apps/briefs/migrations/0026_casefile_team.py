from django.db import migrations, models
import django.db.models.deletion


def backfill_casefile_team(apps, schema_editor):
    """
    Set CaseFile.team from the legacy logged_by.team relationship so existing
    projects show up under the team that originally owned them. Falls back to
    the Default Team for any orphan files (no logged_by, or logged_by had no
    team — shouldn't normally happen, but keep the data accessible).
    """
    CaseFile = apps.get_model("briefs", "CaseFile")
    Team = apps.get_model("users", "Team")
    User = apps.get_model("users", "User")

    default_team, _ = Team.objects.get_or_create(
        slug="default",
        defaults={"name": "Default Team"},
    )

    # Skip rows that already have a team — covers the case where an earlier
    # version of this migration was rolled out and partially populated the
    # column, then later removed/re-added.
    for cf in CaseFile.objects.filter(team__isnull=True).select_related("logged_by"):
        team = None
        if cf.logged_by_id:
            try:
                user = User.objects.only("active_team_id").get(pk=cf.logged_by_id)
                team = user.active_team_id
            except User.DoesNotExist:
                pass
        cf.team_id = team or default_team.id
        cf.save(update_fields=["team"])


def reverse_backfill(apps, schema_editor):
    CaseFile = apps.get_model("briefs", "CaseFile")
    CaseFile.objects.update(team=None)


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0025_casefile_header_summary"),
        # Must run after the users migration that creates active_team and
        # backfills it from the old user.team FK — we read active_team here.
        ("users", "0008_teammembership_active_team_invite_team"),
    ]

    operations = [
        # Idempotent: keep Django's model state in sync via state_operations,
        # but use IF NOT EXISTS at the SQL layer so this is safe to apply
        # against databases where an earlier version of the migration already
        # added the column out-of-band.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="casefile",
                    name="team",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="case_files",
                        to="users.team",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE "case_files" '
                        'ADD COLUMN IF NOT EXISTS "team_id" uuid NULL '
                        'REFERENCES "teams"("id") DEFERRABLE INITIALLY DEFERRED;'
                    ),
                    reverse_sql='ALTER TABLE "case_files" DROP COLUMN IF EXISTS "team_id";',
                ),
                migrations.RunSQL(
                    sql=(
                        'CREATE INDEX IF NOT EXISTS "case_files_team_id_idx" '
                        'ON "case_files" ("team_id");'
                    ),
                    reverse_sql='DROP INDEX IF EXISTS "case_files_team_id_idx";',
                ),
            ],
        ),
        migrations.RunPython(backfill_casefile_team, reverse_backfill),
    ]
