from rest_framework import serializers

from apps.briefs.models import CaseFile, Platform
from apps.briefs.serializers import PlatformSerializer

from .models import LibraryItem, LibraryItemComment, LibraryItemUsage


class LibraryItemCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()

    class Meta:
        model = LibraryItemComment
        fields = ["id", "body", "author", "author_name", "author_email", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "author_name", "author_email", "created_at", "updated_at"]

    def get_author_name(self, obj):
        return obj.author.full_name if obj.author else ""

    def get_author_email(self, obj):
        return obj.author.email if obj.author else ""


class LibraryItemListSerializer(serializers.ModelSerializer):
    """Compact representation for the library index grid."""
    platform = PlatformSerializer(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    source_case_file_name = serializers.SerializerMethodField()
    usage_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = LibraryItem
        fields = [
            "id", "kind", "name", "description",
            "platform", "tags", "industries", "tools", "workflow_types",
            "source_case_file", "source_case_file_name", "source_layer",
            "visibility", "version",
            "created_by", "created_by_name",
            "usage_count", "comment_count",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else ""

    def get_source_case_file_name(self, obj):
        if not obj.source_case_file:
            return ""
        cf = obj.source_case_file
        return cf.name or cf.workflow_type or "Untitled"


class LibraryItemDetailSerializer(serializers.ModelSerializer):
    """Full payload including body + comments for the detail view."""
    platform = PlatformSerializer(read_only=True)
    platform_id = serializers.PrimaryKeyRelatedField(
        queryset=Platform.objects.all(),
        source="platform",
        write_only=True,
        required=False,
        allow_null=True,
    )
    source_case_file_name = serializers.SerializerMethodField(read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)
    updated_by_name = serializers.SerializerMethodField(read_only=True)
    comments = LibraryItemCommentSerializer(many=True, read_only=True)
    usage_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = LibraryItem
        fields = [
            "id", "team", "kind", "name", "description", "body",
            "platform", "platform_id",
            "tags", "industries", "tools", "workflow_types",
            "source_case_file", "source_case_file_name", "source_layer", "source_path",
            "visibility", "version",
            "created_by", "created_by_name",
            "updated_by", "updated_by_name",
            "comments", "usage_count",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "team", "version",
            "source_case_file_name", "created_by", "created_by_name",
            "updated_by", "updated_by_name", "comments", "usage_count",
            "created_at", "updated_at",
        ]

    def get_source_case_file_name(self, obj):
        if not obj.source_case_file:
            return ""
        cf = obj.source_case_file
        return cf.name or cf.workflow_type or "Untitled"

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else ""

    def get_updated_by_name(self, obj):
        return obj.updated_by.full_name if obj.updated_by else ""

    def get_usage_count(self, obj):
        return obj.usages.count()


class LibraryPromoteSerializer(serializers.Serializer):
    """
    Promote a fragment of a project's build into a standalone Library item.
    The frontend extracts the relevant body chunk and posts it here so the
    server records provenance + ownership.
    """
    case_file = serializers.PrimaryKeyRelatedField(queryset=CaseFile.objects.all())
    source_layer = serializers.ChoiceField(choices=LibraryItem._meta.get_field("source_layer").choices)
    source_path = serializers.CharField(max_length=255, required=False, allow_blank=True)

    kind = serializers.ChoiceField(choices=LibraryItem._meta.get_field("kind").choices)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    body = serializers.JSONField(required=False)
    tags = serializers.ListField(child=serializers.CharField(), required=False)


class LibraryItemUsageSerializer(serializers.ModelSerializer):
    used_by_name = serializers.SerializerMethodField()
    used_in_case_file_name = serializers.SerializerMethodField()

    class Meta:
        model = LibraryItemUsage
        fields = [
            "id", "library_item", "used_in_case_file", "used_in_case_file_name",
            "used_by", "used_by_name", "used_at",
        ]
        read_only_fields = fields

    def get_used_by_name(self, obj):
        return obj.used_by.full_name if obj.used_by else ""

    def get_used_in_case_file_name(self, obj):
        if not obj.used_in_case_file:
            return ""
        cf = obj.used_in_case_file
        return cf.name or cf.workflow_type or "Untitled"
