"""
workflows/signals.py

Listens to OutcomeLayer saves. When a project is marked as successfully
built with satisfaction >= 4, promotes its build data into a WorkflowTemplate
so future users can match against real, validated builds.

Threshold:
  - OutcomeLayer.satisfaction >= 4  (good or excellent outcome)
  - OutcomeLayer.built in {"yes", "partially"}  (something was actually built)

One template per project — identified by source_project_id. Updates in place
if the outcome is later revised upward.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

SATISFACTION_THRESHOLD = 4
ELIGIBLE_BUILT = {"yes", "partially"}


def _extract_template_data(case_file):
    """
    Pull build structure and metadata from a CaseFile's related layers.
    Returns a dict suitable for WorkflowTemplate.objects.update_or_create,
    or None if there isn't enough data to make a useful template.
    """
    try:
        intake = case_file.intake
        build = case_file.build
    except Exception:
        return None  # layers not saved yet

    # Require at least spaces or statuses to be meaningful
    if not any([build.spaces, build.statuses, build.lists]):
        return None

    workflow_type = intake.workflow_type or case_file.workflow_type
    if not workflow_type:
        return None

    complexity = 3
    description = ""
    try:
        reasoning = case_file.reasoning
        complexity = reasoning.complexity or 3
        description = (reasoning.why_structure or "")[:400]
    except Exception:
        pass

    name = case_file.name or f"{workflow_type} — Auto Template"

    return {
        "name": name,
        "description": description,
        "workflow_type": workflow_type,
        "industries": intake.industries or case_file.industries or [],
        "pain_points": intake.pain_points or [],
        "tools": intake.tools or case_file.tools or [],
        "process_frameworks": intake.process_frameworks or [],
        "spaces": build.spaces or "",
        "lists": build.lists or "",
        "statuses": build.statuses or "",
        "custom_fields": build.custom_fields or "",
        "automations": build.automations or "",
        "integrations": build.integrations or [],
        "build_notes": build.build_notes or "",
        "estimated_complexity": complexity,
        "is_auto_generated": True,
        "is_active": True,
    }


def promote_to_template(case_file):
    """
    Public function — creates or updates a WorkflowTemplate from a CaseFile.
    Called by the signal handler and the backfill management command.
    Returns (template, created) or (None, False) if ineligible.
    """
    from .models import WorkflowTemplate  # local import avoids circular at module load

    data = _extract_template_data(case_file)
    if data is None:
        return None, False

    template, created = WorkflowTemplate.objects.update_or_create(
        source_project_id=case_file.id,
        defaults=data,
    )
    action = "Created" if created else "Updated"
    logger.info("%s template '%s' from project %s", action, template.name, case_file.id)
    return template, created


@receiver(post_save, sender="briefs.OutcomeLayer")
def on_outcome_saved(sender, instance, **kwargs):
    """
    Fire whenever an OutcomeLayer is saved. Promote to template if it meets
    the quality threshold; skip silently if not.
    """
    if instance.satisfaction < SATISFACTION_THRESHOLD:
        return
    if instance.built not in ELIGIBLE_BUILT:
        return

    try:
        promote_to_template(instance.case_file)
    except Exception:
        # Never let template promotion crash a project save
        logger.exception(
            "Template promotion failed for project %s", instance.case_file_id
        )
