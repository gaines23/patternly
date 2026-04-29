"""
Auto-sync workflows to the team library when they are saved at the "Live"
lifecycle stage. Driven by post_save on BuildLayer.

This is intentionally a "create only" sync — existing library items at the
same (source_case_file, source_path) are preserved so that user edits or
comments aren't clobbered. To re-import a Live workflow's content after the
source has changed, delete the library item and save the build again.
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.briefs.models import BuildLayer

from .services import sync_case_file_workflows_to_library

logger = logging.getLogger(__name__)


@receiver(post_save, sender=BuildLayer)
def sync_live_workflows_to_library(sender, instance: BuildLayer, **kwargs):
    case_file = getattr(instance, "case_file", None)
    if case_file is None:
        return
    try:
        created = sync_case_file_workflows_to_library(case_file, only_live=True)
        if created:
            logger.info(
                "BuildLayer %s save → created %d library items from Live workflows",
                instance.pk, created,
            )
    except Exception:
        # Never fail the build save because of library sync.
        logger.exception("Library auto-sync from BuildLayer save failed")
