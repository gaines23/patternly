from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate
from .models import User, Invitation, PasswordResetToken, AuditLog, Team, TeamMembership


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Override the default TokenObtainPairSerializer so that the login
    endpoint accepts ``email`` + ``password`` instead of ``username`` +
    ``password``.  The User model already sets USERNAME_FIELD = "email",
    but simplejwt still labels the field "username" in its default
    serializer, which causes the frontend payload to be rejected.
    """

    username_field = "email"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Replace the auto-generated "username" field with an explicit
        # "email" field so that DRF validation accepts the frontend payload.
        self.fields.pop(User.USERNAME_FIELD, None)
        self.fields["email"] = serializers.EmailField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )

        if user is None:
            raise AuthenticationFailed(
                "No active account found with the given credentials."
            )

        # Let the parent class build the token pair now that we have a
        # validated user.  We temporarily set the expected key so the
        # parent's validate() can locate the user.
        attrs[User.USERNAME_FIELD] = email
        data = super().validate(attrs)
        return data


class TeamSerializer(serializers.ModelSerializer):
    LOGO_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
    LOGO_ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}

    logo = serializers.ImageField(required=False, allow_null=True)
    logo_clear = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Team
        fields = ["id", "name", "slug", "logo", "logo_clear", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]

    def validate_logo(self, value):
        if value is None:
            return value
        if value.size > self.LOGO_MAX_BYTES:
            raise serializers.ValidationError("Logo must be 2 MB or smaller.")
        content_type = getattr(value, "content_type", "") or ""
        if content_type and content_type not in self.LOGO_ALLOWED_TYPES:
            raise serializers.ValidationError("Logo must be a PNG, JPEG, WebP, or SVG image.")
        return value

    def update(self, instance, validated_data):
        clear = validated_data.pop("logo_clear", False)
        if clear:
            if instance.logo:
                instance.logo.delete(save=False)
            instance.logo = None
            validated_data.pop("logo", None)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        # Return a path-relative URL ("/media/team_logos/foo.png") so the browser
        # resolves it via the same-origin nginx /media/ proxy. Default DRF
        # behavior calls request.build_absolute_uri(), which on Railway uses the
        # backend's internal hostname (patternly.railway.internal) — unreachable
        # from the browser (NS_ERROR_UNKNOWN_HOST).
        rep = super().to_representation(instance)
        rep["logo"] = instance.logo.url if instance.logo else None
        return rep


class TeamMembershipSerializer(serializers.ModelSerializer):
    team = TeamSerializer(read_only=True)

    class Meta:
        model = TeamMembership
        fields = ["id", "team", "role", "joined_at"]
        read_only_fields = ["id", "team", "joined_at"]


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    role = serializers.ReadOnlyField()
    active_team = TeamSerializer(read_only=True)
    teams = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "active_team", "teams", "created_at",
        ]
        read_only_fields = ["id", "created_at", "active_team", "teams", "role"]

    def get_teams(self, obj):
        memberships = obj.team_memberships.select_related("team").all()
        return TeamMembershipSerializer(memberships, many=True).data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=True)
    invite_token = serializers.UUIDField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "invite_token"]

    def validate_invite_token(self, value):
        try:
            invite = Invitation.objects.select_related("invited_to_team").get(token=value)
        except Invitation.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired invite link.")
        if not invite.is_valid():
            raise serializers.ValidationError("This invite link has already been used or has expired.")
        self._invite = invite
        return value

    def create(self, validated_data):
        validated_data.pop("invite_token")
        user = User.objects.create_user(**validated_data)

        # An invite carries the team the inviter wants this user to join. Mint
        # a membership and set it as their active team so they land in the
        # right place on first login. The first user to ever join a team
        # becomes its admin automatically — otherwise nobody on a fresh team
        # would have permission to manage members or invite others.
        team = self._invite.invited_to_team
        if team is not None:
            is_first_member = not team.memberships.exists()
            role = "admin" if is_first_member else "member"
            TeamMembership.objects.create(user=user, team=team, role=role)
            user.active_team = team
            user.save(update_fields=["active_team"])

        self._invite.is_used = True
        self._invite.save(update_fields=["is_used"])
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, min_length=8)


class InviteSerializer(serializers.ModelSerializer):
    token = serializers.UUIDField(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    invited_to_team = TeamSerializer(read_only=True)
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = [
            "token", "email", "is_used", "is_valid",
            "created_by", "invited_to_team", "created_at", "expires_at",
        ]
        read_only_fields = ["token", "is_used", "created_at", "expires_at", "invited_to_team"]

    def get_is_valid(self, obj):
        return obj.is_valid()


class UserAdminSerializer(serializers.ModelSerializer):
    """
    Used by admins to list/update members of the active team. Role is sourced
    from the TeamMembership for the requested team (passed via context as
    ``team``), not from the user globally.
    """

    role = serializers.SerializerMethodField()
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "role", "is_active", "created_at"]
        read_only_fields = ["id", "email", "full_name", "created_at"]

    def _team(self):
        return self.context.get("team")

    def get_role(self, obj):
        team = self._team()
        if team is None:
            return ""
        m = obj.team_memberships.filter(team=team).first()
        return m.role if m else ""

    def update(self, instance, validated_data):
        # Role updates write to the active team's TeamMembership, not the user.
        # is_active stays on the user (it's a global account flag).
        role = self.initial_data.get("role")
        team = self._team()
        if role and team is not None:
            valid_roles = {choice[0] for choice in TeamMembership.ROLE_CHOICES}
            if role not in valid_roles:
                raise serializers.ValidationError({"role": "Invalid role."})
            TeamMembership.objects.filter(user=instance, team=team).update(role=role)
        is_active = validated_data.get("is_active")
        if is_active is not None:
            instance.is_active = is_active
            instance.save(update_fields=["is_active"])
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id", "user_email", "action", "action_display",
            "ip_address", "user_agent", "details", "success", "created_at",
        ]

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def get_action_display(self, obj):
        return obj.get_action_display()
