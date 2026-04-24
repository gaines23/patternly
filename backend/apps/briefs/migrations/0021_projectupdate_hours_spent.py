from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0020_alter_casefile_is_training_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectupdate",
            name="hours_spent",
            field=models.FloatField(blank=True, null=True),
        ),
    ]
