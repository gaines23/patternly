from django.urls import path

from . import views

urlpatterns = [
    path("items/", views.LibraryItemListCreateView.as_view(), name="library_items"),
    path("items/promote/", views.LibraryPromoteView.as_view(), name="library_promote"),
    path("items/<uuid:pk>/", views.LibraryItemDetailView.as_view(), name="library_item_detail"),
    path("items/<uuid:pk>/use/", views.LibraryItemUseView.as_view(), name="library_item_use"),
    path("items/<uuid:pk>/comments/", views.LibraryItemCommentListCreateView.as_view(), name="library_item_comments"),
    path("items/<uuid:pk>/comments/<uuid:comment_id>/", views.LibraryItemCommentDetailView.as_view(), name="library_item_comment_detail"),
]
