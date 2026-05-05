from rest_framework import permissions


class CanManageIntegrations(permissions.BasePermission):
    """
    Allow only admins and engineers to use management endpoints (connect,
    disconnect, push). Viewers are blocked even for GET requests on these
    endpoints, because GETs here have side effects (e.g. issuing a state
    token bound to the user and case file).

    Read-only status endpoints use `IsAuthenticated` directly so any
    authenticated team member — including viewers — can see connection state.

    Team-membership / project-ownership checks belong in the view body
    (they require fetching the CaseFile from URL kwargs).
    """

    message = "Your role does not permit managing integrations."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, "role", None) in ("admin", "engineer")
