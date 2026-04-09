import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_passwordresettoken"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(
                    max_length=50,
                    choices=[
                        ("login", "Login"),
                        ("login_failed", "Failed Login"),
                        ("password_change", "Password Changed"),
                        ("password_reset_request", "Password Reset Requested"),
                        ("password_reset_confirm", "Password Reset Confirmed"),
                        ("profile_update", "Profile Updated"),
                        ("invite_sent", "Invite Sent"),
                        ("account_created", "Account Created"),
                        ("case_file_created", "Case File Created"),
                        ("case_file_updated", "Case File Updated"),
                        ("case_file_deleted", "Case File Deleted"),
                    ],
                )),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True)),
                ("details", models.JSONField(blank=True, default=dict)),
                ("success", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "audit_logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["user", "-created_at"], name="audit_logs_user_created_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["-created_at"], name="audit_logs_created_idx"),
        ),
    ]
