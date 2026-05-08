from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Convert BillingShare from OneToOne (one share per user) to a per-scope
    model. Each user can now have up to three independently-toggleable
    shares — one per billing scope (mine / team_projects / all). Existing
    rows keep their token and enabled state and are tagged scope='mine'
    so any links already in the wild keep working.
    """

    dependencies = [
        ("briefs", "0027_projectupdate_created_by"),
    ]

    operations = [
        # Add the scope field with default 'mine'. Since defaults are
        # applied at the column level by Postgres, this also backfills
        # every existing row to scope='mine' in a single ALTER.
        migrations.AddField(
            model_name="billingshare",
            name="scope",
            field=models.CharField(
                choices=[
                    ("mine", "My hours"),
                    ("team_projects", "My projects"),
                    ("all", "Everyone"),
                ],
                default="mine",
                max_length=20,
            ),
        ),
        # Drop the OneToOne uniqueness on user_id, replace with a FK so
        # multiple rows per user are allowed.
        migrations.AlterField(
            model_name="billingshare",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="billing_shares",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Composite unique so a user can't have two share rows for the
        # same scope.
        migrations.AlterUniqueTogether(
            name="billingshare",
            unique_together={("user", "scope")},
        ),
    ]
