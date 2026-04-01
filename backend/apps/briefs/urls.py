from django.urls import path
from . import views

urlpatterns = [
    path("", views.CaseFileListCreateView.as_view(), name="case_file_list_create"),
    path("<uuid:pk>/", views.CaseFileDetailView.as_view(), name="case_file_detail"),
    path("roadblocks/warnings/", views.roadblock_warnings, name="roadblock_warnings"),
    path("stats/", views.stats, name="brief_stats"),
]
