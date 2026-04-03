from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0007_casefile_share_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="casefile",
            name="status",
            field=models.CharField(
                choices=[("open", "Open"), ("closed", "Closed")],
                default="open",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="casefile",
            name="closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
