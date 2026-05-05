"""
ClickUp OAuth + connection-management endpoints.

Step 2 (this file) implements the OAuth happy path:
  - GET  clickup/<case_file_id>/connect/      → returns ClickUp authorize URL
  - GET  clickup/callback/                    → completes the handshake
  - GET  clickup/<case_file_id>/status/       → reports connection state
  - POST clickup/<case_file_id>/disconnect/   → soft-revokes the connection

The push pipeline that *uses* the stored token lives in step 3+.
"""
import logging
from urllib.parse import urlencode

from django.contrib.auth import get_user_model
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.briefs.models import CaseFile

from .clickup.oauth import (
    ClickUpOAuthError,
    build_authorize_url,
    exchange_code,
    fetch_teams,
)
from .models import AuthMethod, IntegrationProvider, ProjectIntegration
from .permissions import CanManageIntegrations
from .serializers import ProjectIntegrationStatusSerializer
from .state import BadSignature, SignatureExpired, sign_state, verify_state

logger = logging.getLogger(__name__)


def _get_case_file_for_user(case_file_id, user):
    """
    Fetch a CaseFile and verify the user's team owns it.

    Returns (case_file, error_response). Exactly one of the two will be set.
    """
    case_file = get_object_or_404(CaseFile, pk=case_file_id)
    user_team_id = getattr(user, "team_id", None)

    if case_file.team_id is None:
        # Legacy rows pre-team backfill: allow only if the user logged it.
        if case_file.logged_by_id != user.id:
            return None, Response(
                {"detail": "This case file has no team assigned. Ask an admin to set its team."},
                status=status.HTTP_403_FORBIDDEN,
            )
    elif case_file.team_id != user_team_id:
        return None, Response(
            {"detail": "You do not have access to this case file."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return case_file, None


def _redirect_to_frontend(*, success: bool = False, error: str | None = None,
                         case_file_id=None) -> HttpResponseRedirect:
    """Send the user back to the frontend with the result of the OAuth flow."""
    base = settings.FRONTEND_URL.rstrip("/")
    target = f"/projects/{case_file_id}" if case_file_id else "/projects"
    params = {"integration": "connected" if success else "error"}
    if error:
        params["reason"] = error
    return HttpResponseRedirect(f"{base}{target}?{urlencode(params)}")


# ── Connect ──────────────────────────────────────────────────────────────────

class ClickUpConnectView(APIView):
    """Return a ClickUp authorize URL bound to a signed state token."""

    permission_classes = [IsAuthenticated, CanManageIntegrations]

    def get(self, request, case_file_id):
        case_file, err = _get_case_file_for_user(case_file_id, request.user)
        if err:
            return err

        if not settings.CLICKUP_CLIENT_ID or not settings.CLICKUP_REDIRECT_URI:
            return Response(
                {"detail": "ClickUp OAuth is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        state = sign_state(case_file_id=case_file.id, user_id=request.user.id)
        return Response({"authorize_url": build_authorize_url(state)})


# ── Callback ─────────────────────────────────────────────────────────────────

class ClickUpCallbackView(APIView):
    """
    Receive ClickUp's authorization code and persist the connection.

    This endpoint is publicly reachable: ClickUp redirects the user's browser
    here without our JWT. The signed state token is what authenticates the
    request and binds it to the original (case_file, user).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")

        if not code or not state:
            return _redirect_to_frontend(error="missing_params")

        try:
            payload = verify_state(state)
        except SignatureExpired:
            return _redirect_to_frontend(error="state_expired")
        except BadSignature:
            return _redirect_to_frontend(error="invalid_state")

        case_file_id = payload["cf"]
        user_id = payload["u"]

        case_file = CaseFile.objects.filter(pk=case_file_id).first()
        if case_file is None:
            return _redirect_to_frontend(error="case_file_not_found")

        User = get_user_model()
        connected_by = User.objects.filter(pk=user_id).first()
        if connected_by is None or not connected_by.is_active:
            return _redirect_to_frontend(error="user_not_active",
                                         case_file_id=case_file_id)
        if connected_by.role not in ("admin", "engineer"):
            return _redirect_to_frontend(error="permission_revoked",
                                         case_file_id=case_file_id)
        # Re-verify ownership at completion time. (Tolerate legacy null teams.)
        if case_file.team_id is not None and case_file.team_id != connected_by.team_id:
            return _redirect_to_frontend(error="permission_revoked",
                                         case_file_id=case_file_id)

        try:
            access_token = exchange_code(code)
            teams = fetch_teams(access_token)
        except ClickUpOAuthError:
            logger.exception("ClickUp OAuth: token exchange or workspace lookup failed")
            return _redirect_to_frontend(error="clickup_api_error",
                                         case_file_id=case_file_id)
        except Exception:
            logger.exception("ClickUp OAuth: unexpected error in callback")
            return _redirect_to_frontend(error="unexpected_error",
                                         case_file_id=case_file_id)

        if not teams:
            return _redirect_to_frontend(error="no_workspaces",
                                         case_file_id=case_file_id)

        # Auto-pick the first workspace. Multi-workspace selection is a
        # follow-up; users with >1 workspace can disconnect/reconnect for now.
        workspace = teams[0]

        # Soft-revoke any existing active connection so the unique constraint
        # on (case_file, provider) is preserved.
        ProjectIntegration.objects.filter(
            case_file=case_file,
            provider=IntegrationProvider.CLICKUP,
            revoked_at__isnull=True,
        ).update(revoked_at=timezone.now())

        ProjectIntegration.objects.create(
            case_file=case_file,
            provider=IntegrationProvider.CLICKUP,
            auth_method=AuthMethod.OAUTH,
            workspace_id=str(workspace["id"]),
            workspace_name=workspace.get("name", ""),
            access_token=access_token,
            scopes=[],
            connected_by=connected_by,
        )
        return _redirect_to_frontend(success=True, case_file_id=case_file_id)


# ── Personal API Token (paste-in) ────────────────────────────────────────────

def _summarize_workspaces(teams: list[dict]) -> list[dict]:
    """Return only the public-safe fields of each workspace for the frontend."""
    return [
        {"id": str(t["id"]), "name": t.get("name", ""), "color": t.get("color", "")}
        for t in teams
    ]


class ClickUpValidateTokenView(APIView):
    """
    Confirm that a personal API token works and return the workspaces it can
    reach. Side-effect-free: never writes a ProjectIntegration row.
    """

    permission_classes = [IsAuthenticated, CanManageIntegrations]

    def post(self, request, case_file_id):
        _, err = _get_case_file_for_user(case_file_id, request.user)
        if err:
            return err

        token = (request.data.get("access_token") or "").strip()
        if not token:
            return Response(
                {"detail": "access_token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            teams = fetch_teams(token)
        except ClickUpOAuthError:
            logger.info("ClickUp token validation failed (likely bad token)")
            return Response(
                {"detail": "ClickUp rejected this token. Check that you copied it correctly."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Unexpected error while validating ClickUp token")
            return Response(
                {"detail": "Could not reach ClickUp. Try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not teams:
            return Response(
                {"detail": "This token has no accessible workspaces."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"workspaces": _summarize_workspaces(teams)})


class ClickUpConnectTokenView(APIView):
    """Persist a personal API token as the project's ClickUp connection."""

    permission_classes = [IsAuthenticated, CanManageIntegrations]

    def post(self, request, case_file_id):
        case_file, err = _get_case_file_for_user(case_file_id, request.user)
        if err:
            return err

        token = (request.data.get("access_token") or "").strip()
        requested_workspace_id = request.data.get("workspace_id")

        if not token:
            return Response(
                {"detail": "access_token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Always re-validate by fetching workspaces, even when the caller
        # already supplied a workspace_id. This guards against bait-and-switch
        # (a different token sent at save time) and confirms the token still
        # works at the moment we persist it.
        try:
            teams = fetch_teams(token)
        except ClickUpOAuthError:
            return Response(
                {"detail": "ClickUp rejected this token. Check that you copied it correctly."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Unexpected error while validating ClickUp token")
            return Response(
                {"detail": "Could not reach ClickUp. Try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not teams:
            return Response(
                {"detail": "This token has no accessible workspaces."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Pick workspace: explicit choice > only option > error.
        if requested_workspace_id:
            workspace = next(
                (t for t in teams if str(t["id"]) == str(requested_workspace_id)),
                None,
            )
            if workspace is None:
                return Response(
                    {"detail": "This token does not have access to the selected workspace.",
                     "workspaces": _summarize_workspaces(teams)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif len(teams) == 1:
            workspace = teams[0]
        else:
            return Response(
                {"detail": "Multiple workspaces available — pick one and resubmit.",
                 "workspaces": _summarize_workspaces(teams)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Replace any existing active connection for this case_file+provider.
        ProjectIntegration.objects.filter(
            case_file=case_file,
            provider=IntegrationProvider.CLICKUP,
            revoked_at__isnull=True,
        ).update(revoked_at=timezone.now())

        connection = ProjectIntegration.objects.create(
            case_file=case_file,
            provider=IntegrationProvider.CLICKUP,
            auth_method=AuthMethod.PERSONAL_TOKEN,
            workspace_id=str(workspace["id"]),
            workspace_name=workspace.get("name", ""),
            access_token=token,
            scopes=[],
            connected_by=request.user,
        )

        return Response(
            {
                "connected": True,
                "connection": ProjectIntegrationStatusSerializer(connection).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ── Status ───────────────────────────────────────────────────────────────────

class ClickUpStatusView(APIView):
    """Report whether this project has an active ClickUp connection."""

    permission_classes = [IsAuthenticated]

    def get(self, request, case_file_id):
        case_file, err = _get_case_file_for_user(case_file_id, request.user)
        if err:
            return err

        connection = (
            ProjectIntegration.objects
            .filter(
                case_file=case_file,
                provider=IntegrationProvider.CLICKUP,
                revoked_at__isnull=True,
            )
            .order_by("-connected_at")
            .first()
        )

        if connection is None:
            return Response({"connected": False})

        return Response({
            "connected": True,
            "connection": ProjectIntegrationStatusSerializer(connection).data,
        })


# ── Disconnect ───────────────────────────────────────────────────────────────

class ClickUpDisconnectView(APIView):
    """Soft-revoke the active ClickUp connection for a project."""

    permission_classes = [IsAuthenticated, CanManageIntegrations]

    def post(self, request, case_file_id):
        case_file, err = _get_case_file_for_user(case_file_id, request.user)
        if err:
            return err

        connection = (
            ProjectIntegration.objects
            .filter(
                case_file=case_file,
                provider=IntegrationProvider.CLICKUP,
                revoked_at__isnull=True,
            )
            .order_by("-connected_at")
            .first()
        )

        if connection is None:
            return Response(
                {"detail": "No active connection."},
                status=status.HTTP_404_NOT_FOUND,
            )

        connection.revoked_at = timezone.now()
        connection.save(update_fields=["revoked_at"])
        return Response({"detail": "Disconnected."})
