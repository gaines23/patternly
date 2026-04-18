from django.urls import path
from . import views

urlpatterns = [
    path("", views.CaseFileListCreateView.as_view(), name="case_file_list_create"),
    path("<uuid:pk>/", views.CaseFileDetailView.as_view(), name="case_file_detail"),
    path("<uuid:pk>/share/", views.toggle_share, name="case_file_toggle_share"),
    path("<uuid:pk>/client-share/", views.toggle_client_share, name="case_file_toggle_client_share"),
    path("<uuid:pk>/status/", views.toggle_status, name="case_file_toggle_status"),
    path("<uuid:pk>/summary/", views.project_summary, name="case_file_summary"),
    path("shared/<uuid:share_token>/", views.public_brief, name="case_file_public"),
    path("client/<uuid:share_token>/", views.public_client_brief, name="case_file_client_public"),
    path("roadblocks/warnings/", views.roadblock_warnings, name="roadblock_warnings"),
    path("stats/", views.stats, name="brief_stats"),
    path("platforms/", views.platform_list, name="platform_list"),
    path("knowledge/", views.knowledge_list, name="knowledge_list"),
    path("insights/", views.insights_list, name="insights_list"),
    path("ingest/", views.ingest_url, name="ingest_url"),
]
