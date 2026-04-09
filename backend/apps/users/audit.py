"""
Utility for writing security audit log entries.

Usage:
    from apps.users.audit import log_action
    from apps.users.models import ACTION_LOGIN

    log_action(user=request.user, action=ACTION_LOGIN, request=request)
"""


def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_action(user, action, request=None, success=True, details=None):
    """
    Create an AuditLog entry.

    Args:
        user:    User instance (or None for unauthenticated events)
        action:  One of the ACTION_* constants from models.py
        request: Django request object used to extract IP and User-Agent
        success: Whether the action succeeded (default True)
        details: Optional dict with extra context (e.g. changed fields)
    """
    from .models import AuditLog

    ip = None
    ua = ""
    if request is not None:
        ip = _get_client_ip(request)
        ua = request.META.get("HTTP_USER_AGENT", "")[:500]

    AuditLog.objects.create(
        user=user,
        action=action,
        ip_address=ip,
        user_agent=ua,
        details=details or {},
        success=success,
    )
