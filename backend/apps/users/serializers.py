from rest_framework import serializers
from .models import User, Invitation, PasswordResetToken, AuditLog


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "role", "created_at"]
        read_only_fields = ["id", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=True)
    invite_token = serializers.UUIDField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "invite_token"]

    def validate_invite_token(self, value):
        try:
            invite = Invitation.objects.get(token=value)
        except Invitation.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired invite link.")
        if not invite.is_valid():
            raise serializers.ValidationError("This invite link has already been used or has expired.")
        self._invite = invite
        return value

    def create(self, validated_data):
        validated_data.pop("invite_token")
        user = User.objects.create_user(**validated_data)
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
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = ["token", "email", "is_used", "is_valid", "created_by", "created_at", "expires_at"]
        read_only_fields = ["token", "is_used", "created_at", "expires_at"]

    def get_is_valid(self, obj):
        return obj.is_valid()


class UserAdminSerializer(serializers.ModelSerializer):
    """Used by admins to list/update users. Never exposes password."""

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "role", "is_active", "created_at"]
        read_only_fields = ["id", "email", "full_name", "created_at"]


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
