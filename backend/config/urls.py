from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({"status": "ok", "service": "flowpath-api"})


urlpatterns = [
    # Health check — used by Docker and nginx
    path("api/health/", health_check, name="health_check"),

    # Admin
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/", include("config.api_router")),
]

# Debug toolbar in dev
import os
if os.environ.get("DEBUG", "False") == "True":
    try:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
