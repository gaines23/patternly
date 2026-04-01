import pytest
from django.urls import reverse
from apps.briefs.models import CaseFile, DeltaLayer, Roadblock


@pytest.mark.django_db
class TestCaseFileCreateAPI:

    def test_create_requires_auth(self, api_client, minimal_case_file_payload):
        url = reverse("case_file_list_create")
        response = api_client.post(url, minimal_case_file_payload, format="json")
        assert response.status_code == 401

    def test_create_full_case_file(self, auth_client, minimal_case_file_payload):
        url = reverse("case_file_list_create")
        response = auth_client.post(url, minimal_case_file_payload, format="json")
        assert response.status_code == 201
        data = response.data
        assert data["id"] is not None
        # All 6 layers should be present
        assert data["audit"] is not None
        assert data["intake"] is not None
        assert data["build"] is not None
        assert data["delta"] is not None
        assert data["reasoning"] is not None
        assert data["outcome"] is not None

    def test_create_denormalises_fields(self, auth_client, minimal_case_file_payload):
        url = reverse("case_file_list_create")
        response = auth_client.post(url, minimal_case_file_payload, format="json")
        assert response.status_code == 201
        cf = CaseFile.objects.get(id=response.data["id"])
        assert cf.workflow_type == "Sprint Planning"
        assert "Slack" in cf.tools
        assert cf.satisfaction_score == 4
        assert cf.roadblock_count == 1

    def test_create_assigns_logged_by_user(self, auth_client, user, minimal_case_file_payload):
        url = reverse("case_file_list_create")
        response = auth_client.post(url, minimal_case_file_payload, format="json")
        assert response.status_code == 201
        cf = CaseFile.objects.get(id=response.data["id"])
        assert cf.logged_by == user

    def test_create_with_builds_in_audit(self, auth_client, minimal_case_file_payload):
        payload = dict(minimal_case_file_payload)
        payload["audit"] = {
            "has_existing": True,
            "overall_assessment": "Broken ClickUp",
            "tried_to_fix": True,
            "previous_fixes": "Tried reorganising Spaces",
            "pattern_summary": "Over-engineered fields",
            "builds": [
                {
                    "tool": "ClickUp (prior setup)",
                    "structure": "One list per client",
                    "failure_reasons": ["Automations breaking"],
                    "what_breaks": "Triggers fire on wrong tasks",
                    "workarounds_they_use": "Manual Slack updates",
                    "how_long_broken": "3-6 months",
                    "who_reported": "Team Lead",
                    "integrations_in_place": ["Slack"],
                    "impact_on_team": "2hrs/week manual work",
                    "urgency": "high",
                    "order": 0,
                }
            ],
        }
        url = reverse("case_file_list_create")
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == 201
        cf = CaseFile.objects.get(id=response.data["id"])
        assert cf.audit.builds.count() == 1
        assert cf.audit.builds.first().tool == "ClickUp (prior setup)"


@pytest.mark.django_db
class TestCaseFileListAPI:

    def _create(self, auth_client, payload):
        return auth_client.post(reverse("case_file_list_create"), payload, format="json")

    def test_list_returns_paginated(self, auth_client, minimal_case_file_payload):
        self._create(auth_client, minimal_case_file_payload)
        self._create(auth_client, minimal_case_file_payload)
        response = auth_client.get(reverse("case_file_list_create"))
        assert response.status_code == 200
        assert response.data["count"] == 2
        assert len(response.data["results"]) == 2

    def test_list_filter_by_industry(self, auth_client, minimal_case_file_payload):
        self._create(auth_client, minimal_case_file_payload)

        # Create one with a different industry
        different = dict(minimal_case_file_payload)
        different["intake"] = {**minimal_case_file_payload["intake"], "industries": ["Healthcare & Life Sciences"]}
        self._create(auth_client, different)

        response = auth_client.get(
            reverse("case_file_list_create"),
            {"industry": "SaaS / Software Product"},
        )
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_list_filter_by_tool(self, auth_client, minimal_case_file_payload):
        self._create(auth_client, minimal_case_file_payload)
        response = auth_client.get(
            reverse("case_file_list_create"),
            {"tool": "Slack"},
        )
        assert response.status_code == 200
        assert response.data["count"] >= 1

    def test_list_filter_min_satisfaction(self, auth_client, minimal_case_file_payload):
        self._create(auth_client, minimal_case_file_payload)

        low_sat = dict(minimal_case_file_payload)
        low_sat["outcome"] = {**minimal_case_file_payload["outcome"], "satisfaction": 2}
        self._create(auth_client, low_sat)

        response = auth_client.get(
            reverse("case_file_list_create"),
            {"min_satisfaction": 4},
        )
        assert response.status_code == 200
        for item in response.data["results"]:
            assert item["satisfaction_score"] >= 4

    def test_list_requires_auth(self, api_client):
        response = api_client.get(reverse("case_file_list_create"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestCaseFileDetailAPI:

    def _create(self, auth_client, payload):
        resp = auth_client.post(reverse("case_file_list_create"), payload, format="json")
        return resp.data["id"]

    def test_retrieve(self, auth_client, minimal_case_file_payload):
        cf_id = self._create(auth_client, minimal_case_file_payload)
        url = reverse("case_file_detail", kwargs={"pk": cf_id})
        response = auth_client.get(url)
        assert response.status_code == 200
        assert response.data["id"] == cf_id
        assert response.data["intake"]["raw_prompt"] == minimal_case_file_payload["intake"]["raw_prompt"]

    def test_retrieve_includes_roadblocks(self, auth_client, minimal_case_file_payload):
        cf_id = self._create(auth_client, minimal_case_file_payload)
        url = reverse("case_file_detail", kwargs={"pk": cf_id})
        response = auth_client.get(url)
        assert response.status_code == 200
        roadblocks = response.data["delta"]["roadblocks"]
        assert len(roadblocks) == 1
        assert roadblocks[0]["type"] == "integration_limitation"
        assert roadblocks[0]["future_warning"] != ""

    def test_delete(self, auth_client, minimal_case_file_payload):
        cf_id = self._create(auth_client, minimal_case_file_payload)
        url = reverse("case_file_detail", kwargs={"pk": cf_id})
        response = auth_client.delete(url)
        assert response.status_code == 204
        assert not CaseFile.objects.filter(id=cf_id).exists()

    def test_retrieve_nonexistent_returns_404(self, auth_client):
        import uuid
        url = reverse("case_file_detail", kwargs={"pk": str(uuid.uuid4())})
        response = auth_client.get(url)
        assert response.status_code == 404

    def test_retrieve_requires_auth(self, api_client, auth_client, minimal_case_file_payload):
        cf_id = self._create(auth_client, minimal_case_file_payload)
        url = reverse("case_file_detail", kwargs={"pk": cf_id})
        response = api_client.get(url)
        assert response.status_code == 401


@pytest.mark.django_db
class TestRoadblockWarningsAPI:

    def test_warnings_with_no_tools(self, auth_client):
        url = reverse("roadblock_warnings")
        response = auth_client.get(url)
        assert response.status_code == 200
        assert response.data["warnings"] == []

    def test_warnings_returns_flagged_roadblocks(self, auth_client, user, minimal_case_file_payload):
        # Create a case file with a flagged roadblock first
        auth_client.post(
            reverse("case_file_list_create"),
            minimal_case_file_payload,
            format="json",
        )
        url = reverse("roadblock_warnings")
        response = auth_client.get(url, {"tools": "GitHub,ClickUp"})
        assert response.status_code == 200
        warnings = response.data["warnings"]
        assert len(warnings) >= 1
        assert any("GitHub" in w["tools_affected"] for w in warnings)

    def test_warnings_requires_auth(self, api_client):
        url = reverse("roadblock_warnings")
        response = api_client.get(url, {"tools": "Slack"})
        assert response.status_code == 401


@pytest.mark.django_db
class TestStatsAPI:

    def test_stats_returns_structure(self, auth_client, minimal_case_file_payload):
        auth_client.post(
            reverse("case_file_list_create"),
            minimal_case_file_payload,
            format="json",
        )
        url = reverse("brief_stats")
        response = auth_client.get(url)
        assert response.status_code == 200
        assert "total_case_files" in response.data
        assert "avg_satisfaction" in response.data
        assert "total_roadblocks" in response.data
        assert "top_tools" in response.data
        assert response.data["total_case_files"] >= 1

    def test_stats_requires_auth(self, api_client):
        url = reverse("brief_stats")
        response = api_client.get(url)
        assert response.status_code == 401
