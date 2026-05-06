from django.apps import AppConfig


class LibraryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.library"

    def ready(self):
        # Wire post_save signal that syncs Live workflows into the library.
        from . import signals  # noqa: F401
