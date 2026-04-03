import uuid
from django.db import migrations, models


def populate_share_tokens(apps, schema_editor):
    CaseFile = apps.get_model("briefs", "CaseFile")
    for cf in CaseFile.objects.filter(share_token__isnull=True):
        cf.share_token = uuid.uuid4()
        cf.save(update_fields=["share_token"])


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0006_projectupdate"),
    ]

    operations = [
        # Step 1: add nullable, no unique constraint yet
        migrations.AddField(
            model_name="casefile",
            name="share_token",
            field=models.UUIDField(null=True, blank=True, editable=False),
        ),
        migrations.AddField(
            model_name="casefile",
            name="share_enabled",
            field=models.BooleanField(default=False),
        ),
        # Step 2: populate a unique UUID for every existing row
        migrations.RunPython(populate_share_tokens, migrations.RunPython.noop),
        # Step 3: make non-nullable and add unique constraint
        migrations.AlterField(
            model_name="casefile",
            name="share_token",
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
