from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("briefs", "0011_add_intakelayer_client_url_column"),
    ]

    operations = [
        migrations.AddField(
            model_name="casefile",
            name="updates_summary",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
    ]
