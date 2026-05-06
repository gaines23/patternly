from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="user_register"),
    path("me/", views.MeView.as_view(), name="user_me"),
    path("me/team/", views.MyTeamView.as_view(), name="user_my_team"),
    path("me/team/members/", views.TeamMembersView.as_view(), name="user_team_members"),
    path("me/password/", views.change_password, name="user_change_password"),
    path("me/sign-out-all/", views.sign_out_all, name="user_sign_out_all"),
    path("password-reset/", views.request_password_reset, name="user_password_reset_request"),
    path("password-reset/confirm/", views.confirm_password_reset, name="user_password_reset_confirm"),
    path("invites/", views.create_invite, name="user_create_invite"),
    path("invites/<uuid:token>/", views.validate_invite, name="user_validate_invite"),
    path("audit-log/", views.AuditLogListView.as_view(), name="user_audit_log"),
    # Admin-only
    path("members/", views.UserListView.as_view(), name="user_members_list"),
    path("members/<uuid:pk>/", views.UserUpdateView.as_view(), name="user_members_update"),
]
