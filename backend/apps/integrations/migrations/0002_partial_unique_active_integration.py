from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="projectintegration",
            name="uniq_project_integration_per_provider",
        ),
        migrations.AddConstraint(
            model_name="projectintegration",
            constraint=models.UniqueConstraint(
                condition=models.Q(("revoked_at__isnull", True)),
                fields=("case_file", "provider"),
                name="uniq_active_project_integration",
            ),
        ),
    ]
