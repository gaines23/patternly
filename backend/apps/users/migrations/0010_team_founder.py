from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Add Team.founder. Intentionally NOT backfilled automatically — the
    "founder" of a pre-existing team is a deliberate product decision (the
    bootstrapped Default Team has no obvious owner, multi-person teams need
    a chosen founder). The first user to join an empty team going forward
    is auto-promoted to admin + founder by the register/accept-invite flow.
    Existing teams without a founder are managed manually via shell or
    Django admin.
    """

    dependencies = [
        ("users", "0009_drop_user_team_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="founder",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="founded_teams",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
