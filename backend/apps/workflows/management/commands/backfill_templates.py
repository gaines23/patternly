"""
management command: backfill_templates

Scans all existing CaseFiles and promotes qualifying builds to WorkflowTemplates.
Useful on first run after deploying the auto-promotion signal, so historical
builds aren't left out of the template library.

Qualification criteria (mirrors the signal handler):
  - OutcomeLayer.satisfaction >= 4
  - OutcomeLayer.built in {"yes", "partially"}

Usage:
    python manage.py backfill_templates
    python manage.py backfill_templates --dry-run   # preview without writing
    python manage.py backfill_templates --threshold 3  # lower the bar
"""
from django.core.management.base import BaseCommand

from apps.briefs.models import CaseFile
from apps.workflows.signals import promote_to_template, SATISFACTION_THRESHOLD, ELIGIBLE_BUILT


class Command(BaseCommand):
    help = "Promote qualifying past builds to WorkflowTemplates"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created without writing anything",
        )
        parser.add_argument(
            "--threshold",
            type=int,
            default=SATISFACTION_THRESHOLD,
            help=f"Minimum satisfaction score (default: {SATISFACTION_THRESHOLD})",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        threshold = options["threshold"]

        eligible = (
            CaseFile.objects
            .filter(
                satisfaction_score__gte=threshold,
                built_outcome__in=ELIGIBLE_BUILT,
            )
            .select_related("intake", "build", "reasoning")
        )

        total = eligible.count()
        if total == 0:
            self.stdout.write("No qualifying builds found.")
            return

        self.stdout.write(f"Found {total} qualifying build(s). threshold={threshold}, dry_run={dry_run}\n")

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for case_file in eligible:
            if dry_run:
                from apps.workflows.signals import _extract_template_data
                data = _extract_template_data(case_file)
                if data:
                    self.stdout.write(f"  Would promote: [{case_file.id}] {data['name']} ({data['workflow_type']})")
                else:
                    self.stdout.write(self.style.WARNING(f"  Would skip (insufficient data): [{case_file.id}] {case_file.name or 'Unnamed'}"))
                continue

            template, created = promote_to_template(case_file)
            if template is None:
                skipped_count += 1
                self.stdout.write(self.style.WARNING(f"  Skipped (insufficient data): [{case_file.id}] {case_file.name or 'Unnamed'}"))
            elif created:
                created_count += 1
                self.stdout.write(f"  Created: {template.name}")
            else:
                updated_count += 1
                self.stdout.write(f"  Updated: {template.name}")

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(
                f"\nDone. {created_count} created, {updated_count} updated, {skipped_count} skipped."
            ))
