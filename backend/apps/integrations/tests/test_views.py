"""
End-to-end behavior tests for the ClickUp OAuth views. HTTP calls to ClickUp
are mocked — these tests verify our wiring, not ClickUp's API.
"""
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.briefs.models import CaseFile
from apps.integrations.models import IntegrationProvider, ProjectIntegration
from apps.integrations.state import sign_state
from apps.users.models import Team


@pytest.fixture
def team(db):
    return Team.objects.create(name="Acme Consulting", slug="acme")


@pytest.fixture
def engineer(db, team):
    from django.contrib.auth import get_user_model
    return get_user_model().objects.create_user(
        email="eng@patternly.dev",
        password="x",
        role="engineer",
        team=team,
    )


@pytest.fixture
def viewer(db, team):
    from django.contrib.auth import get_user_model
    return get_user_model().objects.create_user(
        email="viewer@patternly.dev",
        password="x",
        role="viewer",
        team=team,
    )


@pytest.fixture
def case_file(db, team, engineer):
    return CaseFile.objects.create(
        team=team,
        logged_by=engineer,
        name="Acme Onboarding",
    )


def _auth(client, user):
    client.force_authenticate(user=user)
    return client


# ── Status ───────────────────────────────────────────────────────────────────

class TestClickUpStatusView:
    def test_returns_not_connected_when_no_integration_exists(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_status", kwargs={"case_file_id": case_file.id})
        resp = client.get(url)
        assert resp.status_code == 200
        assert resp.json() == {"connected": False}

    def test_returns_connected_payload_when_integration_exists(
        self, engineer, case_file, settings
    ):
        # An encryption key is required for EncryptedTextField writes.
        settings.FIELD_ENCRYPTION_KEY = "VgAFmf3eQ-cyEnEjp8Qx-6mZdvcGvQyP1NXzHuNQqLs="
        ProjectIntegration.objects.create(
            case_file=case_file,
            provider=IntegrationProvider.CLICKUP,
            workspace_id="9999",
            workspace_name="Acme HQ",
            access_token="cu_token_xyz",
            connected_by=engineer,
        )
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_status", kwargs={"case_file_id": case_file.id})
        resp = client.get(url)
        body = resp.json()
        assert resp.status_code == 200
        assert body["connected"] is True
        assert body["connection"]["workspace_name"] == "Acme HQ"
        assert "access_token" not in body["connection"]  # never expose

    def test_403_when_user_team_does_not_own_case_file(self, db, engineer):
        other_team = Team.objects.create(name="Other", slug="other")
        from django.contrib.auth import get_user_model
        outsider = get_user_model().objects.create_user(
            email="out@x.dev", password="x", role="engineer", team=other_team,
        )
        cf = CaseFile.objects.create(team=engineer.team, logged_by=engineer)
        client = _auth(APIClient(), outsider)
        url = reverse("clickup_status", kwargs={"case_file_id": cf.id})
        assert client.get(url).status_code == 403


# ── Connect ──────────────────────────────────────────────────────────────────

class TestClickUpConnectView:
    def test_returns_authorize_url(self, engineer, case_file, settings):
        settings.CLICKUP_CLIENT_ID = "test_client"
        settings.CLICKUP_REDIRECT_URI = "http://testserver/callback/"
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_connect", kwargs={"case_file_id": case_file.id})
        resp = client.get(url)
        assert resp.status_code == 200
        body = resp.json()
        assert "authorize_url" in body
        assert "client_id=test_client" in body["authorize_url"]
        assert "state=" in body["authorize_url"]

    def test_503_when_oauth_not_configured(self, engineer, case_file, settings):
        settings.CLICKUP_CLIENT_ID = ""
        settings.CLICKUP_REDIRECT_URI = ""
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_connect", kwargs={"case_file_id": case_file.id})
        assert client.get(url).status_code == 503

    def test_403_for_viewer_role(self, viewer, case_file):
        client = _auth(APIClient(), viewer)
        url = reverse("clickup_connect", kwargs={"case_file_id": case_file.id})
        assert client.get(url).status_code == 403


# ── Callback (the meat) ──────────────────────────────────────────────────────

class TestClickUpCallbackView:
    @pytest.fixture(autouse=True)
    def _encryption_key(self, settings):
        settings.FIELD_ENCRYPTION_KEY = "VgAFmf3eQ-cyEnEjp8Qx-6mZdvcGvQyP1NXzHuNQqLs="
        settings.FRONTEND_URL = "http://localhost:5173"

    def test_happy_path_creates_integration_and_redirects(self, engineer, case_file):
        state = sign_state(case_file_id=case_file.id, user_id=engineer.id)
        with patch("apps.integrations.views.exchange_code", return_value="cu_token_abc"), \
             patch(
                 "apps.integrations.views.fetch_teams",
                 return_value=[{"id": "12345", "name": "Acme HQ"}],
             ):
            url = reverse("clickup_callback") + f"?code=xyz&state={state}"
            resp = APIClient().get(url)

        assert resp.status_code == 302
        assert "integration=connected" in resp.url
        assert str(case_file.id) in resp.url

        integration = ProjectIntegration.objects.get(case_file=case_file)
        assert integration.workspace_id == "12345"
        assert integration.workspace_name == "Acme HQ"
        assert integration.access_token == "cu_token_abc"  # decrypts on read
        assert integration.connected_by_id == engineer.id

    def test_invalid_state_redirects_with_error(self):
        url = reverse("clickup_callback") + "?code=xyz&state=not-a-real-token"
        resp = APIClient().get(url)
        assert resp.status_code == 302
        assert "integration=error" in resp.url
        assert "reason=invalid_state" in resp.url

    def test_missing_params_redirect_with_error(self):
        resp = APIClient().get(reverse("clickup_callback"))
        assert resp.status_code == 302
        assert "reason=missing_params" in resp.url

    def test_clickup_api_error_redirects_without_creating_row(
        self, engineer, case_file
    ):
        state = sign_state(case_file_id=case_file.id, user_id=engineer.id)
        from apps.integrations.clickup.oauth import ClickUpOAuthError
        with patch(
            "apps.integrations.views.exchange_code",
            side_effect=ClickUpOAuthError("boom"),
        ):
            url = reverse("clickup_callback") + f"?code=xyz&state={state}"
            resp = APIClient().get(url)

        assert resp.status_code == 302
        assert "reason=clickup_api_error" in resp.url
        assert not ProjectIntegration.objects.filter(case_file=case_file).exists()

    def test_replacing_existing_connection_revokes_the_old_one(
        self, engineer, case_file
    ):
        ProjectIntegration.objects.create(
            case_file=case_file,
            provider=IntegrationProvider.CLICKUP,
            workspace_id="111",
            workspace_name="Old",
            access_token="old_token",
            connected_by=engineer,
        )
        state = sign_state(case_file_id=case_file.id, user_id=engineer.id)
        with patch("apps.integrations.views.exchange_code", return_value="new_token"), \
             patch(
                 "apps.integrations.views.fetch_teams",
                 return_value=[{"id": "222", "name": "New"}],
             ):
            url = reverse("clickup_callback") + f"?code=xyz&state={state}"
            APIClient().get(url)

        old = ProjectIntegration.objects.get(workspace_id="111")
        new = ProjectIntegration.objects.get(workspace_id="222")
        assert old.revoked_at is not None
        assert new.revoked_at is None


# ── Disconnect ───────────────────────────────────────────────────────────────

# ── Validate Token ───────────────────────────────────────────────────────────

class TestClickUpValidateTokenView:
    def test_returns_workspaces_when_token_is_valid(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_validate_token", kwargs={"case_file_id": case_file.id})
        with patch(
            "apps.integrations.views.fetch_teams",
            return_value=[
                {"id": "1", "name": "Acme HQ", "color": "#000"},
                {"id": "2", "name": "Acme EU", "color": "#fff"},
            ],
        ):
            resp = client.post(url, {"access_token": "pk_abc"}, format="json")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["workspaces"]) == 2
        assert body["workspaces"][0] == {"id": "1", "name": "Acme HQ", "color": "#000"}

    def test_400_when_token_is_missing(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_validate_token", kwargs={"case_file_id": case_file.id})
        resp = client.post(url, {}, format="json")
        assert resp.status_code == 400

    def test_400_when_clickup_rejects_token(self, engineer, case_file):
        from apps.integrations.clickup.oauth import ClickUpOAuthError
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_validate_token", kwargs={"case_file_id": case_file.id})
        with patch(
            "apps.integrations.views.fetch_teams",
            side_effect=ClickUpOAuthError("401"),
        ):
            resp = client.post(url, {"access_token": "bad"}, format="json")
        assert resp.status_code == 400
        assert "rejected" in resp.json()["detail"].lower()

    def test_400_when_token_has_no_workspaces(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_validate_token", kwargs={"case_file_id": case_file.id})
        with patch("apps.integrations.views.fetch_teams", return_value=[]):
            resp = client.post(url, {"access_token": "pk_abc"}, format="json")
        assert resp.status_code == 400

    def test_does_not_create_integration_row(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_validate_token", kwargs={"case_file_id": case_file.id})
        with patch(
            "apps.integrations.views.fetch_teams",
            return_value=[{"id": "1", "name": "Acme"}],
        ):
            client.post(url, {"access_token": "pk_abc"}, format="json")
        assert not ProjectIntegration.objects.filter(case_file=case_file).exists()

    def test_403_for_viewer_role(self, viewer, case_file):
        client = _auth(APIClient(), viewer)
        url = reverse("clickup_validate_token", kwargs={"case_file_id": case_file.id})
        assert client.post(url, {"access_token": "x"}, format="json").status_code == 403


# ── Connect Token ────────────────────────────────────────────────────────────

class TestClickUpConnectTokenView:
    @pytest.fixture(autouse=True)
    def _encryption_key(self, settings):
        settings.FIELD_ENCRYPTION_KEY = "VgAFmf3eQ-cyEnEjp8Qx-6mZdvcGvQyP1NXzHuNQqLs="

    def test_auto_picks_when_only_one_workspace(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_connect_token", kwargs={"case_file_id": case_file.id})
        with patch(
            "apps.integrations.views.fetch_teams",
            return_value=[{"id": "9", "name": "Acme HQ"}],
        ):
            resp = client.post(url, {"access_token": "pk_abc"}, format="json")
        assert resp.status_code == 201
        connection = ProjectIntegration.objects.get(case_file=case_file)
        assert connection.workspace_id == "9"
        assert connection.workspace_name == "Acme HQ"
        assert connection.access_token == "pk_abc"
        assert connection.auth_method == "personal_token"
        assert connection.connected_by_id == engineer.id

    def test_requires_workspace_choice_when_multiple(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_connect_token", kwargs={"case_file_id": case_file.id})
        with patch(
            "apps.integrations.views.fetch_teams",
            return_value=[
                {"id": "1", "name": "A"},
                {"id": "2", "name": "B"},
            ],
        ):
            resp = client.post(url, {"access_token": "pk_abc"}, format="json")
        assert resp.status_code == 400
        body = resp.json()
        assert len(body["workspaces"]) == 2
        assert not ProjectIntegration.objects.filter(case_file=case_file).exists()

    def test_persists_when_workspace_explicit(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_connect_token", kwargs={"case_file_id": case_file.id})
        with patch(
            "apps.integrations.views.fetch_teams",
            return_value=[
                {"id": "1", "name": "A"},
                {"id": "2", "name": "B"},
            ],
        ):
            resp = client.post(
                url,
                {"access_token": "pk_abc", "workspace_id": "2"},
                format="json",
            )
        assert resp.status_code == 201
        assert ProjectIntegration.objects.get(case_file=case_file).workspace_id == "2"

    def test_400_when_workspace_not_in_token_scope(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_connect_token", kwargs={"case_file_id": case_file.id})
        with patch(
            "apps.integrations.views.fetch_teams",
            return_value=[{"id": "1", "name": "A"}],
        ):
            resp = client.post(
                url,
                {"access_token": "pk_abc", "workspace_id": "999"},
                format="json",
            )
        assert resp.status_code == 400
        assert not ProjectIntegration.objects.filter(case_file=case_file).exists()

    def test_replacing_existing_connection_revokes_the_old_one(
        self, engineer, case_file
    ):
        ProjectIntegration.objects.create(
            case_file=case_file,
            provider=IntegrationProvider.CLICKUP,
            workspace_id="111",
            workspace_name="Old",
            access_token="old_token",
            connected_by=engineer,
        )
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_connect_token", kwargs={"case_file_id": case_file.id})
        with patch(
            "apps.integrations.views.fetch_teams",
            return_value=[{"id": "222", "name": "New"}],
        ):
            client.post(url, {"access_token": "new_token"}, format="json")

        old = ProjectIntegration.objects.get(workspace_id="111")
        new = ProjectIntegration.objects.get(workspace_id="222")
        assert old.revoked_at is not None
        assert new.revoked_at is None
        assert new.auth_method == "personal_token"

    def test_400_when_token_missing(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_connect_token", kwargs={"case_file_id": case_file.id})
        resp = client.post(url, {}, format="json")
        assert resp.status_code == 400

    def test_403_for_viewer_role(self, viewer, case_file):
        client = _auth(APIClient(), viewer)
        url = reverse("clickup_connect_token", kwargs={"case_file_id": case_file.id})
        assert client.post(url, {"access_token": "x"}, format="json").status_code == 403


class TestClickUpDisconnectView:
    @pytest.fixture(autouse=True)
    def _encryption_key(self, settings):
        settings.FIELD_ENCRYPTION_KEY = "VgAFmf3eQ-cyEnEjp8Qx-6mZdvcGvQyP1NXzHuNQqLs="

    def test_disconnect_marks_revoked_at(self, engineer, case_file):
        ProjectIntegration.objects.create(
            case_file=case_file,
            provider=IntegrationProvider.CLICKUP,
            workspace_id="111",
            workspace_name="X",
            access_token="t",
            connected_by=engineer,
        )
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_disconnect", kwargs={"case_file_id": case_file.id})
        resp = client.post(url)
        assert resp.status_code == 200
        assert ProjectIntegration.objects.get().revoked_at is not None

    def test_404_when_no_active_connection(self, engineer, case_file):
        client = _auth(APIClient(), engineer)
        url = reverse("clickup_disconnect", kwargs={"case_file_id": case_file.id})
        assert client.post(url).status_code == 404

    def test_403_for_viewer_role(self, viewer, case_file):
        client = _auth(APIClient(), viewer)
        url = reverse("clickup_disconnect", kwargs={"case_file_id": case_file.id})
        assert client.post(url).status_code == 403
