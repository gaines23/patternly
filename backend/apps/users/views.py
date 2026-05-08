from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.utils import timezone
from datetime import timedelta

from .audit import log_action
from .models import (
    User, Invitation, PasswordResetToken, AuditLog, Team, TeamMembership,
    ACTION_LOGIN, ACTION_LOGIN_FAILED, ACTION_PASSWORD_CHANGE,
    ACTION_PASSWORD_RESET_REQUEST, ACTION_PASSWORD_RESET_CONFIRM,
    ACTION_PROFILE_UPDATE, ACTION_INVITE_SENT, ACTION_ACCOUNT_CREATED,
)
from .serializers import (
    UserSerializer, UserAdminSerializer, RegisterSerializer, ChangePasswordSerializer,
    InviteSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    AuditLogSerializer, EmailTokenObtainPairSerializer, TeamSerializer,
    TeamMembershipSerializer,
)


# ── Custom throttle scopes ────────────────────────────────────────────────────

class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        # Throttle by IP for login attempts
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = "password_reset"


# ── Custom permissions ────────────────────────────────────────────────────────

class IsAdmin(BasePermission):
    """
    Allows access to users who are admin of their active team (or is_staff).
    With multi-team membership, "admin" is per-team — a user can be admin of
    one team and a member of another.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_staff:
            return True
        return user.is_admin_of(user.active_team)


class AuditedTokenObtainPairView(TokenObtainPairView):
    """JWT login view that records success and failure in the audit log."""

    throttle_classes = [LoginRateThrottle]
    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "")
        try:
            response = super().post(request, *args, **kwargs)
            try:
                user = User.objects.get(email=email)
                log_action(user=user, action=ACTION_LOGIN, request=request, success=True)
            except User.DoesNotExist:
                pass
            return response
        except (AuthenticationFailed, InvalidToken):
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = None
            log_action(
                user=user,
                action=ACTION_LOGIN_FAILED,
                request=request,
                success=False,
                details={"email": email},
            )
            raise


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(user=user, action=ACTION_ACCOUNT_CREATED, request=self.request, success=True)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        serializer.save()
        log_action(user=self.request.user, action=ACTION_PROFILE_UPDATE, request=self.request, success=True)


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = AuditLog.objects.select_related("user")
        if user.is_staff or user.is_admin_of(user.active_team):
            return qs
        return qs.filter(user=user)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sign_out_all(request):
    """
    POST /api/v1/users/sign-out-all/
    Blacklists every outstanding refresh token for the current user,
    forcing sign-out on all devices.
    """
    tokens = OutstandingToken.objects.filter(user=request.user)
    for token in tokens:
        BlacklistedToken.objects.get_or_create(token=token)
    return Response({"detail": "Signed out of all devices."})


def _active_team_or_default(user):
    team = user.active_team
    if team is None:
        team, _ = Team.objects.get_or_create(slug="default", defaults={"name": "Default Team"})
    return team


class MyTeamView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/users/me/team/  — return the user's active team.
    PATCH /api/v1/users/me/team/  — update active team's name/logo. Accepts
                                    multipart/form-data when uploading a logo.
    """
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return _active_team_or_default(self.request.user)


class TeamMembersView(generics.ListAPIView):
    """
    GET /api/v1/users/me/team/members/  — list members of the active team.
    """
    serializer_class = UserAdminSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["team"] = self.request.user.active_team
        return ctx

    def get_queryset(self):
        team = self.request.user.active_team
        if team is None:
            return User.objects.none()
        return User.objects.filter(team_memberships__team=team).distinct().order_by("-created_at")


class UserListView(generics.ListAPIView):
    """
    GET /api/v1/users/members/
    Admin-only: list members of the requesting admin's active team.
    """
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdmin]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["team"] = self.request.user.active_team
        return ctx

    def get_queryset(self):
        team = self.request.user.active_team
        if team is None:
            return User.objects.none()
        return User.objects.filter(team_memberships__team=team).distinct().order_by("-created_at")


class UserUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/v1/users/members/<id>/
    Admin-only: update role (within the active team) or is_active for a user
    in your team. Cannot change your own.
    """
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["patch"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["team"] = self.request.user.active_team
        return ctx

    def get_queryset(self):
        team = self.request.user.active_team
        if team is None:
            return User.objects.none()
        return User.objects.filter(team_memberships__team=team).distinct()

    def partial_update(self, request, *args, **kwargs):
        target = self.get_object()
        if target.id == request.user.id:
            return Response(
                {"detail": "You cannot change your own role or status here."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)


# ── Multi-team endpoints ─────────────────────────────────────────────────────

class MyTeamsView(generics.ListAPIView):
    """
    GET /api/v1/users/me/teams/  — every team the current user belongs to,
    with their role per team. Used by the team switcher.
    """
    serializer_class = TeamMembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.request.user.team_memberships.select_related("team").order_by("team__name")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def switch_active_team(request):
    """
    POST /api/v1/users/me/active-team/  body: {team_id}

    Switches the requesting user's active team. Subsequent team-scoped
    queries (briefs, library, members) will resolve to the new team. The
    JWT does NOT need to be re-issued — active_team is a column on the
    user row, not a token claim, so the switch is immediate.
    """
    team_id = request.data.get("team_id")
    if not team_id:
        return Response({"detail": "team_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    membership = request.user.team_memberships.filter(team_id=team_id).select_related("team").first()
    if membership is None:
        return Response(
            {"detail": "You are not a member of that team."},
            status=status.HTTP_403_FORBIDDEN,
        )
    request.user.active_team = membership.team
    request.user.save(update_fields=["active_team"])
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_invite_existing_user(request):
    """
    POST /api/v1/users/me/invites/accept/  body: {token}

    Lets an already-registered user accept an invite to a NEW team. Adds a
    TeamMembership for the invited team, marks the invite used, and switches
    the user's active team to the team they just joined so they land there
    immediately. Idempotent if the user is already a member.
    """
    token = request.data.get("token")
    if not token:
        return Response({"detail": "token is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invite = Invitation.objects.select_related("invited_to_team").get(token=token)
    except Invitation.DoesNotExist:
        return Response({"detail": "Invalid invite link."}, status=status.HTTP_404_NOT_FOUND)

    if not invite.is_valid():
        return Response(
            {"detail": "This invite has already been used or has expired."},
            status=status.HTTP_410_GONE,
        )

    team = invite.invited_to_team
    if team is None:
        return Response(
            {"detail": "This invite is not bound to a team and cannot be accepted by an existing user."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # First member into an empty team becomes admin automatically — otherwise
    # nobody on a fresh team would have permission to manage members.
    # Subsequent invitees are plain members; admins can promote them later.
    is_first_member = not team.memberships.exists()
    membership, created = TeamMembership.objects.get_or_create(
        user=request.user,
        team=team,
        defaults={"role": "admin" if is_first_member else "member"},
    )

    # Only mark used when the user was actually new to this team — otherwise
    # a teammate clicking their own old link shouldn't burn it for someone else.
    if created:
        invite.is_used = True
        invite.save(update_fields=["is_used"])

    request.user.active_team = team
    request.user.save(update_fields=["active_team"])

    return Response(
        {
            "joined": created,
            "user": UserSerializer(request.user).data,
        },
        status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(serializer.validated_data["current_password"]):
        log_action(user=user, action=ACTION_PASSWORD_CHANGE, request=request, success=False)
        return Response(
            {"current_password": "Incorrect password."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(serializer.validated_data["new_password"])
    user.save()
    log_action(user=user, action=ACTION_PASSWORD_CHANGE, request=request, success=True)
    return Response({"detail": "Password updated."})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def request_password_reset(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"]
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"detail": "No account found with that email."}, status=status.HTTP_404_NOT_FOUND)

    reset_token = PasswordResetToken.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    log_action(user=user, action=ACTION_PASSWORD_RESET_REQUEST, request=request, success=True)
    return Response({"token": str(reset_token.token)})


@api_view(["POST"])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        reset_token = PasswordResetToken.objects.select_related("user").get(
            token=serializer.validated_data["token"]
        )
    except PasswordResetToken.DoesNotExist:
        return Response({"detail": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)

    if not reset_token.is_valid():
        return Response({"detail": "This reset link has already been used or has expired."}, status=status.HTTP_400_BAD_REQUEST)

    user = reset_token.user
    user.set_password(serializer.validated_data["new_password"])
    user.save()

    reset_token.is_used = True
    reset_token.save(update_fields=["is_used"])
    log_action(user=user, action=ACTION_PASSWORD_RESET_CONFIRM, request=request, success=True)
    return Response({"detail": "Password updated. You can now sign in."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_invite(request):
    email = request.data.get("email", "")
    team = _active_team_or_default(request.user)
    invite = Invitation.objects.create(
        created_by=request.user,
        email=email,
        invited_to_team=team,
        expires_at=timezone.now() + timedelta(days=2),
    )
    log_action(
        user=request.user,
        action=ACTION_INVITE_SENT,
        request=request,
        success=True,
        details={"invited_email": email, "team_id": str(team.id)} if email else {"team_id": str(team.id)},
    )
    serializer = InviteSerializer(invite)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def validate_invite(request, token):
    try:
        invite = Invitation.objects.select_related("invited_to_team").get(token=token)
    except Invitation.DoesNotExist:
        return Response({"valid": False, "detail": "Invalid invite link."}, status=status.HTTP_404_NOT_FOUND)

    if not invite.is_valid():
        return Response({"valid": False, "detail": "This invite has already been used or has expired."}, status=status.HTTP_410_GONE)

    team = invite.invited_to_team
    return Response({
        "valid": True,
        "email": invite.email,
        "team": TeamSerializer(team).data if team else None,
    })
