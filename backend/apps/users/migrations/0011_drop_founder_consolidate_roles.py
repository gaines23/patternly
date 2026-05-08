from django.db import migrations, models


def consolidate_roles(apps, schema_editor):
    """
    Collapse the old three-role taxonomy down to two: anyone who was
    "engineer" or "viewer" becomes a plain "member". Admins are unchanged.
    The product no longer differentiates between solutions-engineer and
    viewer — they're all just teammates.
    """
    TeamMembership = apps.get_model("users", "TeamMembership")
    TeamMembership.objects.filter(role__in=["engineer", "viewer"]).update(role="member")


def restore_legacy_roles(apps, schema_editor):
    """Reverse: best-effort restore. Everyone non-admin becomes engineer
    (the previous default) since we can't recover whether a row was
    originally engineer or viewer."""
    TeamMembership = apps.get_model("users", "TeamMembership")
    TeamMembership.objects.filter(role="member").update(role="engineer")


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0010_team_founder"),
    ]

    operations = [
        # Walk back the founder field — the product doesn't need a separate
        # founder concept; the team admin role covers what we need today.
        migrations.RemoveField(
            model_name="team",
            name="founder",
        ),
        # Migrate role data BEFORE altering the choices, otherwise the new
        # choices' validators (Django doesn't enforce at the DB level, but
        # admin/serializer validation does) would balk on legacy rows.
        migrations.RunPython(consolidate_roles, restore_legacy_roles),
        migrations.AlterField(
            model_name="teammembership",
            name="role",
            field=models.CharField(
                choices=[("admin", "Admin"), ("member", "Member")],
                default="member",
                max_length=50,
            ),
        ),
    ]
