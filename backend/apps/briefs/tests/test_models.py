import pytest
from apps.briefs.models import (
    CaseFile, AuditLayer, CurrentBuild, IntakeLayer,
    BuildLayer, DeltaLayer, Roadblock, ReasoningLayer, OutcomeLayer,
)


@pytest.mark.django_db
class TestCaseFileModel:

    def test_create_case_file(self, user):
        cf = CaseFile.objects.create(
            logged_by=user,
            workflow_type="Sprint Planning",
            industries=["SaaS / Software Product"],
            tools=["Slack", "GitHub"],
        )
        assert cf.id is not None
        assert str(cf.id)  # UUID stringifies
        assert cf.workflow_type == "Sprint Planning"
        assert "Slack" in cf.tools

    def test_str_representation(self, user):
        cf = CaseFile.objects.create(
            logged_by=user,
            workflow_type="Client Onboarding",
        )
        s = str(cf)
        assert "Client Onboarding" in s

    def test_default_roadblock_count(self, user):
        cf = CaseFile.objects.create(logged_by=user)
        assert cf.roadblock_count == 0

    def test_ordering_newest_first(self, user):
        cf1 = CaseFile.objects.create(logged_by=user, workflow_type="First")
        cf2 = CaseFile.objects.create(logged_by=user, workflow_type="Second")
        files = list(CaseFile.objects.all())
        assert files[0].id == cf2.id  # newest first


@pytest.mark.django_db
class TestLayerModels:

    def setup_method(self):
        """Create a base CaseFile for each test."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            email="layer_test@flowpath.dev",
            password="pass123",
        )
        self.cf = CaseFile.objects.create(logged_by=self.user)

    def test_audit_layer(self):
        audit = AuditLayer.objects.create(
            case_file=self.cf,
            has_existing=True,
            overall_assessment="They have a broken ClickUp setup.",
            tried_to_fix=False,
        )
        assert audit.case_file == self.cf
        assert audit.has_existing is True
        assert audit.tried_to_fix is False

    def test_current_build(self):
        audit = AuditLayer.objects.create(case_file=self.cf)
        build = CurrentBuild.objects.create(
            audit=audit,
            tool="ClickUp (prior setup)",
            urgency="high",
            failure_reasons=["Automations breaking", "Nobody using it consistently"],
        )
        assert build.audit == audit
        assert "Automations breaking" in build.failure_reasons
        assert build.urgency == "high"

    def test_intake_layer(self):
        intake = IntakeLayer.objects.create(
            case_file=self.cf,
            raw_prompt="We need sprint planning in ClickUp.",
            industries=["Technology"],
            tools=["Slack", "Jira"],
            workflow_type="Sprint Planning",
        )
        assert intake.raw_prompt == "We need sprint planning in ClickUp."
        assert "Technology" in intake.industries

    def test_delta_layer_with_roadblocks(self):
        delta = DeltaLayer.objects.create(
            case_file=self.cf,
            user_intent="Full automation",
            diverged=True,
            divergence_reason="API limitation",
        )
        rb = Roadblock.objects.create(
            delta=delta,
            type="api_limitation",
            severity="high",
            tools_affected=["GitHub", "ClickUp"],
            description="No native PR linking",
            workaround_found=True,
            flag_for_future=True,
            future_warning="Plan 3-4h for GitHub middleware",
        )
        assert delta.roadblocks.count() == 1
        assert rb.flag_for_future is True
        assert "GitHub" in rb.tools_affected

    def test_reasoning_layer(self):
        reasoning = ReasoningLayer.objects.create(
            case_file=self.cf,
            why_structure="Single space reduces navigation overhead",
            complexity=3,
        )
        assert reasoning.complexity == 3

    def test_outcome_layer(self):
        outcome = OutcomeLayer.objects.create(
            case_file=self.cf,
            built="yes",
            satisfaction=4,
            recommend="yes",
        )
        assert outcome.satisfaction == 4
        assert outcome.recommend == "yes"

    def test_cascade_delete(self):
        """Deleting a CaseFile should cascade to all layers."""
        audit = AuditLayer.objects.create(case_file=self.cf)
        IntakeLayer.objects.create(case_file=self.cf)
        DeltaLayer.objects.create(case_file=self.cf)

        cf_id = self.cf.id
        self.cf.delete()

        assert not CaseFile.objects.filter(id=cf_id).exists()
        assert not AuditLayer.objects.filter(case_file_id=cf_id).exists()
        assert not IntakeLayer.objects.filter(case_file_id=cf_id).exists()
