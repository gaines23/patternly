from django.conf import settings
from django.contrib import admin
from django.urls import path, re_path, include
from django.http import JsonResponse
from django.views.static import serve as static_serve


def health_check(request):
    return JsonResponse({"status": "ok", "service": "patternly-api"})


urlpatterns = [
    # Health check — used by Docker and nginx
    path("api/health/", health_check, name="health_check"),

    # Admin
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/", include("config.api_router")),

    # User-uploaded media (team logos, etc.). Internal-use only — replace with
    # cloud storage (S3) before opening to external traffic.
    re_path(r"^media/(?P<path>.*)$", static_serve, {"document_root": settings.MEDIA_ROOT}),
]

# Debug toolbar in dev
import os
if os.environ.get("DEBUG", "False") == "True":
    try:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
