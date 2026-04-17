import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return APIClient()


@pytest.fixture
def user(db):
    """A standard authenticated user."""
    return User.objects.create_user(
        email="test@patternly.dev",
        password="testpass123",
        first_name="Test",
        last_name="User",
        role="engineer",
    )


@pytest.fixture
def admin_user(db):
    """A superuser."""
    return User.objects.create_superuser(
        email="admin@patternly.dev",
        password="adminpass123",
    )


@pytest.fixture
def auth_client(user):
    """API client authenticated as a standard user."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_client(admin_user):
    """API client authenticated as admin."""
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def minimal_case_file_payload():
    """Minimal valid payload to create a CaseFile via POST /api/v1/briefs/."""
    return {
        "logged_by_name": "Test Engineer",
        "audit": {
            "has_existing": False,
            "overall_assessment": "",
            "tried_to_fix": None,
            "previous_fixes": "",
            "pattern_summary": "",
            "builds": [],
        },
        "intake": {
            "raw_prompt": "We are a 5-person SaaS team. We need sprint tracking.",
            "industries": ["SaaS / Software Product"],
            "team_size": "5",
            "workflow_type": "Sprint Planning",
            "process_frameworks": ["Agile / Scrum"],
            "tools": ["Slack", "GitHub"],
            "pain_points": ["Visibility", "Accountability"],
            "prior_attempts": "",
        },
        "build": {
            "spaces": "Engineering",
            "lists": "Sprints, Backlog",
            "statuses": "To Do → In Progress → Done",
            "custom_fields": "Story Points — Number",
            "automations": "When status → Done: update sprint velocity",
            "integrations": ["GitHub", "Slack"],
            "build_notes": "Keep it simple for now.",
        },
        "delta": {
            "user_intent": "Fully automated sprint tracking",
            "success_criteria": "No manual updates needed",
            "actual_build": "Semi-automated with manual velocity logging",
            "diverged": True,
            "divergence_reason": "ClickUp GitHub integration lacks PR → task linking",
            "compromises": "Manual story point entry at sprint close",
            "roadblocks": [
                {
                    "type": "integration_limitation",
                    "severity": "medium",
                    "tools_affected": ["GitHub", "ClickUp"],
                    "description": "No native PR-to-task link via API",
                    "workaround_found": True,
                    "workaround_description": "Use Zapier to watch GitHub webhooks",
                    "time_cost_hours": 3.0,
                    "future_warning": "GitHub integration needs middleware — plan 3-4h",
                    "flag_for_future": True,
                    "order": 0,
                }
            ],
        },
        "reasoning": {
            "why_structure": "Single Space keeps sprint context together",
            "alternatives": "Separate Space per sprint",
            "why_rejected": "Too many Spaces causes navigation overload",
            "assumptions": "Team runs 2-week sprints consistently",
            "when_opposite": "Teams with > 5 active sprints simultaneously",
            "lessons": "Keep statuses under 5 for adoption",
            "complexity": 2,
        },
        "outcome": {
            "built": "yes",
            "block_reason": "",
            "changes": "Added a Review status mid-sprint",
            "what_worked": "Status automation worked perfectly",
            "what_failed": "Velocity field was ignored by team",
            "satisfaction": 4,
            "recommend": "yes",
            "revisit_when": "When ClickUp GitHub integration matures",
        },
    }
