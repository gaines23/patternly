from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0006_team_user_team"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="logo",
            field=models.ImageField(blank=True, null=True, upload_to="team_logos/"),
        ),
    ]
