import uuid
from django.db import migrations, models


def populate_client_share_tokens(apps, schema_editor):
    CaseFile = apps.get_model("briefs", "CaseFile")
    for cf in CaseFile.objects.all():
        cf.client_share_token = uuid.uuid4()
        cf.save(update_fields=["client_share_token"])


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0013_casefile_full_summary_and_timestamps"),
    ]

    operations = [
        # Step 1: Add field as nullable without unique constraint
        migrations.AddField(
            model_name="casefile",
            name="client_share_token",
            field=models.UUIDField(null=True),
        ),
        migrations.AddField(
            model_name="casefile",
            name="client_share_enabled",
            field=models.BooleanField(default=False),
        ),
        # Step 2: Populate unique UUIDs
        migrations.RunPython(populate_client_share_tokens, migrations.RunPython.noop),
        # Step 3: Make non-null + unique
        migrations.AlterField(
            model_name="casefile",
            name="client_share_token",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
