from django.urls import path
from . import views

urlpatterns = [
    path("generate/", views.generate_brief, name="workflow_generate"),
    path("parse/", views.parse_prompt, name="workflow_parse"),
    path("briefs/", views.GeneratedBriefListView.as_view(), name="generated_brief_list"),
    path("briefs/<uuid:pk>/", views.GeneratedBriefDetailView.as_view(), name="generated_brief_detail"),
    path("briefs/<uuid:pk>/convert/", views.brief_convert, name="generated_brief_convert"),
    path("briefs/<uuid:pk>/feedback/", views.brief_feedback, name="generated_brief_feedback"),
    path("match/", views.match_templates, name="workflow_match"),
]
