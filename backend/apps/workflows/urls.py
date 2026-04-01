from django.urls import path
from . import views

urlpatterns = [
    path("generate/", views.generate_brief, name="workflow_generate"),
    path("briefs/", views.GeneratedBriefListView.as_view(), name="generated_brief_list"),
    path("briefs/<uuid:pk>/", views.GeneratedBriefDetailView.as_view(), name="generated_brief_detail"),
    path("briefs/<uuid:pk>/feedback/", views.brief_feedback, name="generated_brief_feedback"),
]
