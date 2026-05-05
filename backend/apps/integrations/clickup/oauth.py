"""
Thin client for ClickUp's OAuth + workspace-discovery endpoints.

Kept narrow on purpose: just the three calls the connect flow needs. The
broader ClickUp client used by the export pipeline lives elsewhere.

ClickUp OAuth notes:
- Tokens do NOT expire (no refresh flow). They only stop working if the user
  revokes the app in ClickUp's UI.
- ClickUp uses `Authorization: <token>` (NOT `Bearer <token>`).
- "Teams" in ClickUp's API are what the UI calls "Workspaces".
"""
from urllib.parse import urlencode

import requests
from django.conf import settings

CLICKUP_API_BASE = "https://api.clickup.com/api/v2"
CLICKUP_AUTHORIZE_URL = "https://app.clickup.com/api"
HTTP_TIMEOUT_SECONDS = 15


class ClickUpOAuthError(Exception):
    """Raised when a ClickUp OAuth/API call fails."""


def build_authorize_url(state: str) -> str:
    """Return the URL to send the user's browser to for consent."""
    params = {
        "client_id": settings.CLICKUP_CLIENT_ID,
        "redirect_uri": settings.CLICKUP_REDIRECT_URI,
        "state": state,
    }
    return f"{CLICKUP_AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code(code: str) -> str:
    """Trade an authorization code for a long-lived access token."""
    resp = requests.post(
        f"{CLICKUP_API_BASE}/oauth/token",
        params={
            "client_id": settings.CLICKUP_CLIENT_ID,
            "client_secret": settings.CLICKUP_CLIENT_SECRET,
            "code": code,
        },
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    if resp.status_code != 200:
        raise ClickUpOAuthError(
            f"Token exchange failed: {resp.status_code}"
        )
    body = resp.json()
    token = body.get("access_token")
    if not token:
        raise ClickUpOAuthError("Token exchange returned no access_token.")
    return token


def fetch_teams(access_token: str) -> list[dict]:
    """Return the workspaces (Teams in CU's vocabulary) the token can access."""
    resp = requests.get(
        f"{CLICKUP_API_BASE}/team",
        headers={"Authorization": access_token},
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    if resp.status_code != 200:
        raise ClickUpOAuthError(
            f"Workspace lookup failed: {resp.status_code}"
        )
    return resp.json().get("teams", [])
