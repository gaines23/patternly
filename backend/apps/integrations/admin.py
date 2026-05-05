from django.contrib import admin

from .models import IntegrationExport, IntegrationObjectMap, ProjectIntegration


@admin.register(ProjectIntegration)
class ProjectIntegrationAdmin(admin.ModelAdmin):
    list_display = (
        "provider",
        "workspace_name",
        "case_file",
        "connected_by",
        "connected_at",
        "revoked_at",
    )
    list_filter = ("provider", "revoked_at")
    search_fields = ("workspace_name", "workspace_id", "case_file__name")
    readonly_fields = ("access_token", "connected_at", "last_used_at")
    raw_id_fields = ("case_file", "connected_by")


@admin.register(IntegrationExport)
class IntegrationExportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "integration",
        "source_type",
        "source_id",
        "status",
        "started_at",
        "completed_at",
    )
    list_filter = ("status", "source_type")
    search_fields = ("source_id", "integration__workspace_name")
    raw_id_fields = ("integration", "triggered_by")


@admin.register(IntegrationObjectMap)
class IntegrationObjectMapAdmin(admin.ModelAdmin):
    list_display = (
        "export",
        "patternly_type",
        "patternly_id",
        "external_type",
        "external_id",
        "created_at",
    )
    list_filter = ("patternly_type", "external_type")
    search_fields = ("patternly_id", "external_id")
    raw_id_fields = ("export",)
