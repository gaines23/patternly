from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0021_projectupdate_hours_spent"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="projectupdate",
            name="hours_spent",
        ),
        migrations.AddField(
            model_name="projectupdate",
            name="minutes_spent",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
