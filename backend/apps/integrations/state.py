"""
Signed, short-lived state tokens for the OAuth handshake.

The token is included as ?state=... on the authorize redirect and verified on
the callback. It carries the case_file_id and user_id that initiated the
connection — so the callback (which has no JWT) can still trust who the user
was and which project they're connecting.

Backed by Django's TimestampSigner (HMAC + timestamp). A salt namespaces this
use of SECRET_KEY so a token signed elsewhere in the app can't be replayed here.
"""
import json

from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

SIGNER_SALT = "integrations.clickup.oauth_state.v1"
DEFAULT_MAX_AGE_SECONDS = 600  # 10 minutes — plenty for a human OAuth flow


def sign_state(*, case_file_id, user_id) -> str:
    """Return a signed, time-stamped state token."""
    payload = json.dumps({"cf": str(case_file_id), "u": str(user_id)})
    return TimestampSigner(salt=SIGNER_SALT).sign(payload)


def verify_state(token: str, *, max_age: int = DEFAULT_MAX_AGE_SECONDS) -> dict:
    """
    Return the {"cf": ..., "u": ...} payload of a valid state token.

    Raises SignatureExpired if older than max_age, BadSignature on tamper.
    """
    payload = TimestampSigner(salt=SIGNER_SALT).unsign(token, max_age=max_age)
    return json.loads(payload)


__all__ = ["sign_state", "verify_state", "BadSignature", "SignatureExpired"]
