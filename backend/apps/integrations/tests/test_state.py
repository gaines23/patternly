import time

import pytest
from django.core.signing import BadSignature, SignatureExpired

from apps.integrations.state import sign_state, verify_state


def test_sign_and_verify_round_trip():
    token = sign_state(case_file_id="11111111-1111-1111-1111-111111111111",
                       user_id="22222222-2222-2222-2222-222222222222")
    payload = verify_state(token)
    assert payload["cf"] == "11111111-1111-1111-1111-111111111111"
    assert payload["u"] == "22222222-2222-2222-2222-222222222222"


def test_tampered_token_is_rejected():
    token = sign_state(case_file_id="abc", user_id="def")
    tampered = token[:-1] + ("0" if token[-1] != "0" else "1")
    with pytest.raises(BadSignature):
        verify_state(tampered)


def test_expired_token_is_rejected():
    token = sign_state(case_file_id="abc", user_id="def")
    # Pretend the token was signed long ago by demanding a 0-second freshness
    time.sleep(1)
    with pytest.raises(SignatureExpired):
        verify_state(token, max_age=0)


def test_token_signed_with_different_salt_is_rejected():
    """A token signed for some other namespace must not validate as state."""
    from django.core.signing import TimestampSigner
    other = TimestampSigner(salt="some.other.salt").sign('{"cf": "x", "u": "y"}')
    with pytest.raises(BadSignature):
        verify_state(other)
