from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0002_partial_unique_active_integration"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectintegration",
            name="auth_method",
            field=models.CharField(
                choices=[
                    ("oauth", "OAuth"),
                    ("personal_token", "Personal API Token"),
                ],
                default="oauth",
                help_text=(
                    "How the user authorized this connection. Affects nothing in "
                    "the export pipeline — both methods produce a working token."
                ),
                max_length=20,
            ),
        ),
    ]
