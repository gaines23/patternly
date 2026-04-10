from django.contrib import admin
from .models import Todo


@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "priority", "case_file_name", "assigned_to_name", "due_date", "created_by_name", "created_at"]
    list_filter = ["status", "priority", "layer_reference"]
    search_fields = ["title", "description", "case_file_name", "assigned_to_name", "created_by_name"]
    readonly_fields = ["id", "created_at", "updated_at", "created_by_name", "assigned_to_name", "case_file_name"]
    ordering = ["status", "due_date"]
