from django.contrib import admin
from .models import (
    CaseFile, AuditLayer, CurrentBuild,
    IntakeLayer, BuildLayer, DeltaLayer,
    Roadblock, ReasoningLayer, OutcomeLayer,
    Platform, IntegrationPattern,
    PlatformKnowledge, CommunityInsight,
)


class CurrentBuildInline(admin.TabularInline):
    model = CurrentBuild
    extra = 0


class RoadblockInline(admin.TabularInline):
    model = Roadblock
    extra = 0


@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ["slug", "name", "category", "supported"]
    list_filter = ["category", "supported"]
    search_fields = ["slug", "name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(CaseFile)
class CaseFileAdmin(admin.ModelAdmin):
    list_display = [
        "id", "workflow_type", "logged_by_name",
        "primary_platform", "source_type",
        "satisfaction_score", "roadblock_count", "created_at",
    ]
    list_filter = ["built_outcome", "satisfaction_score", "primary_platform", "source_type"]
    search_fields = ["workflow_type", "logged_by_name", "industries"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(AuditLayer)
class AuditLayerAdmin(admin.ModelAdmin):
    inlines = [CurrentBuildInline]


@admin.register(DeltaLayer)
class DeltaLayerAdmin(admin.ModelAdmin):
    inlines = [RoadblockInline]


admin.site.register(IntakeLayer)
admin.site.register(BuildLayer)
admin.site.register(ReasoningLayer)
admin.site.register(OutcomeLayer)


@admin.register(IntegrationPattern)
class IntegrationPatternAdmin(admin.ModelAdmin):
    list_display = ["source_platform", "target_platform", "via_platform", "pattern_type", "case_file_count"]
    list_filter = ["pattern_type", "source_platform", "target_platform"]


@admin.register(PlatformKnowledge)
class PlatformKnowledgeAdmin(admin.ModelAdmin):
    list_display = ["title", "platform", "related_platform", "knowledge_type", "category", "verified_at"]
    list_filter = ["knowledge_type", "category", "platform"]
    search_fields = ["title", "content"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(CommunityInsight)
class CommunityInsightAdmin(admin.ModelAdmin):
    list_display = ["title", "insight_type", "source_attribution", "source_date", "confidence_score"]
    list_filter = ["insight_type", "platforms"]
    search_fields = ["title", "content"]
    readonly_fields = ["id", "created_at", "updated_at"]
