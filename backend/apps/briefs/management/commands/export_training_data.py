"""
management command: export_training_data

Exports all training data to a JSON fixture for loading in production.
Includes:
  - ALL CaseFiles (both user-created projects and ingested data) and their layers
  - All PlatformKnowledge records
  - All CommunityInsight records
  - All IntegrationPattern records

User-created projects (is_training_data=False) are included because they
provide real-world build patterns for the AI recommendation engine.

Usage:
    python manage.py export_training_data
    python manage.py export_training_data --output custom_path.json
    python manage.py export_training_data --ingested-only   # legacy: ingested data only
"""
import json
from django.core.management.base import BaseCommand
from django.core.serializers import serialize
from apps.briefs.models import (
    CaseFile, AuditLayer, CurrentBuild, IntakeLayer,
    BuildLayer, DeltaLayer, Roadblock, ReasoningLayer,
    OutcomeLayer, ProjectUpdate, IntegrationPattern,
    PlatformKnowledge, CommunityInsight,
)

DEFAULT_OUTPUT = "apps/briefs/fixtures/training_data.json"


class Command(BaseCommand):
    help = "Export ingested training data to a fixture file for production deployment."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default=DEFAULT_OUTPUT,
            help=f"Output file path (default: {DEFAULT_OUTPUT})",
        )
        parser.add_argument(
            "--ingested-only",
            action="store_true",
            default=False,
            help="Only export ingested training data (exclude user-created projects)",
        )

    def handle(self, *args, **options):
        output_path = options["output"]

        # All case files feed the AI — user projects provide real build patterns
        training_cfs = CaseFile.objects.all()
        if options["ingested_only"]:
            training_cfs = training_cfs.filter(is_training_data=True)
        cf_ids = list(training_cfs.values_list("id", flat=True))

        self.stdout.write(f"Found {len(cf_ids)} training case files")

        # Gather related layer objects for training case files
        audits = AuditLayer.objects.filter(case_file_id__in=cf_ids)
        audit_ids = list(audits.values_list("id", flat=True))
        builds = CurrentBuild.objects.filter(audit_id__in=audit_ids)
        intakes = IntakeLayer.objects.filter(case_file_id__in=cf_ids)
        build_layers = BuildLayer.objects.filter(case_file_id__in=cf_ids)
        deltas = DeltaLayer.objects.filter(case_file_id__in=cf_ids)
        delta_ids = list(deltas.values_list("id", flat=True))
        roadblocks = Roadblock.objects.filter(delta_id__in=delta_ids)
        reasonings = ReasoningLayer.objects.filter(case_file_id__in=cf_ids)
        outcomes = OutcomeLayer.objects.filter(case_file_id__in=cf_ids)
        updates = ProjectUpdate.objects.filter(case_file_id__in=cf_ids)

        # Platform intelligence (all records — these are all from ingestion)
        platform_knowledge = PlatformKnowledge.objects.all()
        community_insights = CommunityInsight.objects.all()
        integration_patterns = IntegrationPattern.objects.all()

        self.stdout.write(
            f"  - {audits.count()} audit layers\n"
            f"  - {builds.count()} current builds\n"
            f"  - {intakes.count()} intake layers\n"
            f"  - {build_layers.count()} build layers\n"
            f"  - {deltas.count()} delta layers\n"
            f"  - {roadblocks.count()} roadblocks\n"
            f"  - {reasonings.count()} reasoning layers\n"
            f"  - {outcomes.count()} outcome layers\n"
            f"  - {updates.count()} project updates\n"
            f"  - {platform_knowledge.count()} platform knowledge records\n"
            f"  - {community_insights.count()} community insights\n"
            f"  - {integration_patterns.count()} integration patterns"
        )

        # Serialize all objects — order matters for foreign key dependencies
        all_objects = []
        querysets = [
            training_cfs,
            audits,
            builds,
            intakes,
            build_layers,
            deltas,
            roadblocks,
            reasonings,
            outcomes,
            updates,
            integration_patterns,
            platform_knowledge,
            community_insights,
        ]

        for qs in querysets:
            serialized = serialize("json", qs)
            all_objects.extend(json.loads(serialized))

        # Write fixture
        with open(output_path, "w") as f:
            json.dump(all_objects, f, indent=2)

        total = len(all_objects)
        self.stdout.write(
            self.style.SUCCESS(
                f"\nExported {total} objects to {output_path}"
            )
        )
