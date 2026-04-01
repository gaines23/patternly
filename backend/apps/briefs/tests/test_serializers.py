import pytest
from apps.briefs.serializers import (
    CaseFileWriteSerializer,
    CaseFileDetailSerializer,
    RoadblockSerializer,
)
from apps.briefs.models import CaseFile, Roadblock, DeltaLayer


@pytest.mark.django_db
class TestCaseFileWriteSerializer:

    def test_valid_payload_creates_all_layers(self, user, minimal_case_file_payload):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        serializer = CaseFileWriteSerializer(
            data=minimal_case_file_payload,
            context={"request": request},
        )
        assert serializer.is_valid(), serializer.errors
        cf = serializer.save()

        assert CaseFile.objects.filter(id=cf.id).exists()
        assert hasattr(cf, "audit")
        assert hasattr(cf, "intake")
        assert hasattr(cf, "build")
        assert hasattr(cf, "delta")
        assert hasattr(cf, "reasoning")
        assert hasattr(cf, "outcome")

    def test_logged_by_set_from_request_user(self, user, minimal_case_file_payload):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        serializer = CaseFileWriteSerializer(
            data=minimal_case_file_payload,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        cf = serializer.save()
        assert cf.logged_by == user

    def test_intake_fields_denormalised(self, user, minimal_case_file_payload):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        serializer = CaseFileWriteSerializer(
            data=minimal_case_file_payload,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        cf = CaseFile.objects.latest("created_at")
        assert cf.workflow_type == "Sprint Planning"
        assert "Slack" in cf.tools
        assert cf.satisfaction_score == 4

    def test_roadblocks_created_in_delta(self, user, minimal_case_file_payload):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        serializer = CaseFileWriteSerializer(
            data=minimal_case_file_payload,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        cf = serializer.save()

        assert cf.delta.roadblocks.count() == 1
        rb = cf.delta.roadblocks.first()
        assert rb.type == "integration_limitation"
        assert rb.severity == "medium"
        assert rb.flag_for_future is True


@pytest.mark.django_db
class TestRoadblockSerializer:

    def test_valid_roadblock(self):
        data = {
            "type": "api_limitation",
            "severity": "high",
            "tools_affected": ["ClickUp", "Zapier"],
            "description": "Webhook delays cause task duplication",
            "workaround_found": False,
            "flag_for_future": True,
            "future_warning": "Expect 5-10min webhook lag with Zapier + ClickUp",
        }
        s = RoadblockSerializer(data=data)
        assert s.is_valid(), s.errors

    def test_empty_roadblock_is_valid(self):
        """Roadblocks can be partially filled."""
        s = RoadblockSerializer(data={})
        assert s.is_valid(), s.errors
