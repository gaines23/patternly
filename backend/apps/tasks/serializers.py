from rest_framework import serializers
from .models import Todo


class TodoSerializer(serializers.ModelSerializer):
    """
    Used for both list and detail reads.
    Exposes all fields the frontend needs, including denormalized name fields.
    """
    class Meta:
        model = Todo
        fields = [
            "id",
            "title",
            "description",
            "case_file",
            "case_file_name",
            "layer_reference",
            "assigned_to",
            "assigned_to_name",
            "created_by",
            "created_by_name",
            "status",
            "priority",
            "due_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]


class TodoWriteSerializer(serializers.ModelSerializer):
    """
    Used for POST (create) and PATCH (update).
    Accepts case_file and assigned_to as UUIDs.
    Auto-populates denormalized name fields and created_by.
    """
    class Meta:
        model = Todo
        fields = [
            "title",
            "description",
            "case_file",
            "layer_reference",
            "assigned_to",
            "status",
            "priority",
            "due_date",
        ]

    def _denormalize_names(self, validated_data):
        """Populate case_file_name and assigned_to_name from FK objects."""
        case_file = validated_data.get("case_file")
        if case_file is not None:
            validated_data["case_file_name"] = (
                case_file.name or case_file.workflow_type or ""
            )

        assigned_to = validated_data.get("assigned_to")
        if assigned_to is not None:
            full_name = f"{assigned_to.first_name} {assigned_to.last_name}".strip()
            validated_data["assigned_to_name"] = full_name or assigned_to.email
        elif "assigned_to" in validated_data and assigned_to is None:
            # Explicitly cleared
            validated_data["assigned_to_name"] = ""

        return validated_data

    def create(self, validated_data):
        request = self.context["request"]
        validated_data = self._denormalize_names(validated_data)
        user = request.user
        full_name = f"{user.first_name} {user.last_name}".strip()
        validated_data["created_by"] = user
        validated_data["created_by_name"] = full_name or user.email
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._denormalize_names(validated_data)
        return super().update(instance, validated_data)
