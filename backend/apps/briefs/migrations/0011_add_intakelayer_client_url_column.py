from django.db import migrations


class Migration(migrations.Migration):
    """
    Migration 0010 used SeparateDatabaseAndState with empty database_operations,
    so the client_url column was never actually created in the production database.
    This migration adds it safely using IF NOT EXISTS.
    """

    dependencies = [
        ("briefs", "0010_intakelayer_client_url"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE intake_layers ADD COLUMN IF NOT EXISTS client_url VARCHAR(500) NOT NULL DEFAULT '';",
            reverse_sql="ALTER TABLE intake_layers DROP COLUMN IF EXISTS client_url;",
        ),
    ]
