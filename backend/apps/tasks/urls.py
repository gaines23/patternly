from django.urls import path
from . import views

urlpatterns = [
    path("", views.TodoListCreateView.as_view(), name="todo_list_create"),
    path("<uuid:pk>/", views.TodoDetailView.as_view(), name="todo_detail"),
]
