from django.contrib import admin
from .models import (
    CaseFile, AuditLayer, CurrentBuild,
    IntakeLayer, BuildLayer, DeltaLayer,
    Roadblock, ReasoningLayer, OutcomeLayer,
)


class CurrentBuildInline(admin.TabularInline):
    model = CurrentBuild
    extra = 0


class RoadblockInline(admin.TabularInline):
    model = Roadblock
    extra = 0


@admin.register(CaseFile)
class CaseFileAdmin(admin.ModelAdmin):
    list_display = [
        "id", "workflow_type", "logged_by_name",
        "satisfaction_score", "roadblock_count", "created_at",
    ]
    list_filter = ["built_outcome", "satisfaction_score"]
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
