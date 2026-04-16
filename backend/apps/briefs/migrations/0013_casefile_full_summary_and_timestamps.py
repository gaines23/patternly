from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0012_casefile_updates_summary"),
    ]

    operations = [
        migrations.AddField(
            model_name="casefile",
            name="full_summary",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="casefile",
            name="full_summary_generated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="casefile",
            name="updates_summary_generated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
