from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0008_teammembership_active_team_invite_team"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="team",
        ),
        migrations.RemoveField(
            model_name="user",
            name="role",
        ),
    ]
