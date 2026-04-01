import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False, verbose_name="superuser status")),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                ("role", models.CharField(
                    choices=[("admin", "Admin"), ("engineer", "Solutions Engineer"), ("viewer", "Viewer")],
                    default="engineer",
                    max_length=50,
                )),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("groups", models.ManyToManyField(
                    blank=True,
                    related_name="user_set",
                    related_query_name="user",
                    to="auth.group",
                    verbose_name="groups",
                )),
                ("user_permissions", models.ManyToManyField(
                    blank=True,
                    related_name="user_set",
                    related_query_name="user",
                    to="auth.permission",
                    verbose_name="user permissions",
                )),
            ],
            options={
                "db_table": "users",
                "ordering": ["-created_at"],
            },
        ),
    ]
