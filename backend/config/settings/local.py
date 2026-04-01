"""
Local development settings.
Loaded when DJANGO_SETTINGS_MODULE=config.settings.local
"""
from .base import *  # noqa

DEBUG = True

# Dev-only: allow all hosts inside Docker
ALLOWED_HOSTS = ["*"]

# Disable security enforcement in dev
CORS_ALLOW_ALL_ORIGINS = True

# Django Debug Toolbar
INSTALLED_APPS += ["debug_toolbar", "django_extensions"]  # noqa

MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa

INTERNAL_IPS = ["127.0.0.1", "::1"]

# Show all SQL in dev
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",
        },
    },
}

# Email to console in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
