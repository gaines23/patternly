from rest_framework import serializers

from .models import ProjectIntegration


class ProjectIntegrationStatusSerializer(serializers.ModelSerializer):
    """Read-only summary of a connection. Never exposes the access token."""

    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProjectIntegration
        fields = [
            "id",
            "provider",
            "auth_method",
            "workspace_id",
            "workspace_name",
            "scopes",
            "connected_at",
            "last_used_at",
            "revoked_at",
            "is_active",
        ]
        read_only_fields = fields
