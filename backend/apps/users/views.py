from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
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
    User, Invitation, PasswordResetToken, AuditLog,
    ACTION_LOGIN, ACTION_LOGIN_FAILED, ACTION_PASSWORD_CHANGE,
    ACTION_PASSWORD_RESET_REQUEST, ACTION_PASSWORD_RESET_CONFIRM,
    ACTION_PROFILE_UPDATE, ACTION_INVITE_SENT, ACTION_ACCOUNT_CREATED,
)
from .serializers import (
    UserSerializer, UserAdminSerializer, RegisterSerializer, ChangePasswordSerializer,
    InviteSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    AuditLogSerializer, EmailTokenObtainPairSerializer,
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
    """Allows access only to users with role='admin' or is_staff=True."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == "admin" or request.user.is_staff)
        )


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
        if user.role == "admin" or user.is_staff:
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


class UserListView(generics.ListAPIView):
    """
    GET /api/v1/users/members/
    Admin-only: list all members with role and active status.
    """
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.all().order_by("-created_at")


class UserUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/v1/users/members/<id>/
    Admin-only: update role or is_active for any user.
    Cannot demote yourself.
    """
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdmin]
    http_method_names = ["patch"]

    def get_queryset(self):
        return User.objects.all()

    def partial_update(self, request, *args, **kwargs):
        target = self.get_object()
        if target.id == request.user.id:
            return Response(
                {"detail": "You cannot change your own role or status here."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)


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
    invite = Invitation.objects.create(
        created_by=request.user,
        email=email,
        expires_at=timezone.now() + timedelta(days=2),
    )
    log_action(
        user=request.user,
        action=ACTION_INVITE_SENT,
        request=request,
        success=True,
        details={"invited_email": email} if email else {},
    )
    serializer = InviteSerializer(invite)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def validate_invite(request, token):
    try:
        invite = Invitation.objects.get(token=token)
    except Invitation.DoesNotExist:
        return Response({"valid": False, "detail": "Invalid invite link."}, status=status.HTTP_404_NOT_FOUND)

    if not invite.is_valid():
        return Response({"valid": False, "detail": "This invite has already been used or has expired."}, status=status.HTTP_410_GONE)

    return Response({"valid": True, "email": invite.email})
