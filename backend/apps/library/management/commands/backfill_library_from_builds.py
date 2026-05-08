"""
Idempotent backfill: walk every CaseFile.build and create LibraryItem rows
for each workflow (template), each list's custom_fields (custom_field_set),
and each list's automations (automation).

Provenance (source_case_file, source_layer, source_path) is set so the same
fragment is recognised on re-runs and skipped. By default, every workflow
is backfilled regardless of lifecycle stage; pass --only-live to limit to
workflows at the "Live" stage (matches the post_save signal behaviour).

Attribution: items are created_by the project's logged_by user (and pinned
to that user's team). If a project has no logged_by, the item falls through
to the Default Team with created_by=null.

Usage:
    python manage.py backfill_library_from_builds [--dry-run] [--only-live] [--case-file <uuid>]
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.briefs.models import CaseFile
from apps.library.services import sync_case_file_workflows_to_library


class Command(BaseCommand):
    help = "Backfill LibraryItem rows from existing CaseFile build content."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be created without writing to the database.",
        )
        parser.add_argument(
            "--only-live",
            action="store_true",
            help="Only sync workflows whose lifecycle stage is 'Live'.",
        )
        parser.add_argument(
            "--case-file",
            type=str,
            default=None,
            help="Limit to a single case file id (UUID).",
        )

    def handle(self, *args, dry_run=False, only_live=False, case_file=None, **options):
        qs = CaseFile.objects.select_related("build", "logged_by", "team", "logged_by__active_team")
        if case_file:
            qs = qs.filter(id=case_file)

        scanned = 0
        created_total = 0

        for cf in qs.iterator():
            if getattr(cf, "build", None) is None:
                continue
            scanned += 1
            if dry_run:
                with transaction.atomic():
                    sid = transaction.savepoint()
                    created = sync_case_file_workflows_to_library(cf, only_live=only_live)
                    transaction.savepoint_rollback(sid)
            else:
                created = sync_case_file_workflows_to_library(cf, only_live=only_live)
            created_total += created

        suffix = " (only Live workflows)" if only_live else ""
        suffix += " (dry run — no writes)" if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"Scanned {scanned} case files{suffix}. Created {created_total} library items."
        ))
