from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)
from apps.users.views import AuditedTokenObtainPairView

urlpatterns = [
    # Auth
    path("auth/token/", AuditedTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # App routes
    path("users/", include("apps.users.urls")),
    path("workflows/", include("apps.workflows.urls")),
    path("briefs/", include("apps.briefs.urls")),
    path("todos/", include("apps.tasks.urls")),
]
