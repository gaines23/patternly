from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="user_register"),
    path("me/", views.MeView.as_view(), name="user_me"),
    path("me/password/", views.change_password, name="user_change_password"),
    path("invites/", views.create_invite, name="user_create_invite"),
    path("invites/<uuid:token>/", views.validate_invite, name="user_validate_invite"),
]
