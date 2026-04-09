from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0009_casefile_case_files_satisfa_f687bd_idx_and_more"),
    ]

    operations = [
        # The column already exists in the database (added directly).
        # SeparateDatabaseAndState lets Django record the field in its state
        # without issuing a redundant ALTER TABLE that would fail.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="intakelayer",
                    name="client_url",
                    field=models.URLField(blank=True, default="", max_length=500),
                ),
            ],
            database_operations=[],
        ),
    ]
