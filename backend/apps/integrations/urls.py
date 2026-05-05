from django.urls import path

from . import views

urlpatterns = [
    path(
        "clickup/callback/",
        views.ClickUpCallbackView.as_view(),
        name="clickup_callback",
    ),
    path(
        "clickup/<uuid:case_file_id>/connect/",
        views.ClickUpConnectView.as_view(),
        name="clickup_connect",
    ),
    path(
        "clickup/<uuid:case_file_id>/validate-token/",
        views.ClickUpValidateTokenView.as_view(),
        name="clickup_validate_token",
    ),
    path(
        "clickup/<uuid:case_file_id>/connect-token/",
        views.ClickUpConnectTokenView.as_view(),
        name="clickup_connect_token",
    ),
    path(
        "clickup/<uuid:case_file_id>/status/",
        views.ClickUpStatusView.as_view(),
        name="clickup_status",
    ),
    path(
        "clickup/<uuid:case_file_id>/disconnect/",
        views.ClickUpDisconnectView.as_view(),
        name="clickup_disconnect",
    ),
]
