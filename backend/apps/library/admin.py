from django.contrib import admin

from .models import LibraryItem, LibraryItemComment, LibraryItemUsage


@admin.register(LibraryItem)
class LibraryItemAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "team", "platform", "version", "updated_at")
    list_filter = ("kind", "team", "platform", "visibility")
    search_fields = ("name", "description")


@admin.register(LibraryItemUsage)
class LibraryItemUsageAdmin(admin.ModelAdmin):
    list_display = ("library_item", "used_in_case_file", "used_by", "used_at")
    list_filter = ("used_at",)


@admin.register(LibraryItemComment)
class LibraryItemCommentAdmin(admin.ModelAdmin):
    list_display = ("library_item", "author", "created_at")
    search_fields = ("body",)
