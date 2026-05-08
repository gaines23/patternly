from django.db.models import Count, Q
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LibraryItem, LibraryItemComment, LibraryItemUsage
from .serializers import (
    LibraryItemCommentSerializer,
    LibraryItemDetailSerializer,
    LibraryItemListSerializer,
    LibraryItemUsageSerializer,
    LibraryPromoteSerializer,
)


def _user_team(user):
    """
    Resolve the user's currently active team. Library items are scoped per
    team, so a user with multiple memberships sees a different library when
    they switch teams. Falls back to None for users without any team yet —
    the queryset below handles that case.
    """
    return getattr(user, "active_team", None)


def _scoped_queryset(user):
    team = _user_team(user)
    qs = LibraryItem.objects.select_related(
        "platform", "team", "source_case_file", "created_by", "updated_by",
    ).annotate(
        usage_count=Count("usages", distinct=True),
        comment_count=Count("comments", distinct=True),
    )
    if team is None:
        # No team yet: only show user's own private/team items.
        return qs.filter(created_by=user)
    return qs.filter(
        Q(team=team) | Q(visibility="public") | Q(created_by=user)
    ).distinct()


class LibraryItemListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/library/items/  → list items, filterable
    POST /api/v1/library/items/  → create a standalone item
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "tags", "tools", "industries"]
    ordering_fields = ["created_at", "updated_at", "name", "usage_count"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        qs = _scoped_queryset(self.request.user)

        params = self.request.query_params
        kind = params.get("kind")
        platform = params.get("platform")
        tag = params.get("tag")
        industry = params.get("industry")
        tool = params.get("tool")
        case_file = params.get("case_file")

        if kind:
            qs = qs.filter(kind=kind)
        if platform:
            qs = qs.filter(platform__slug=platform)
        if tag:
            qs = qs.filter(tags__contains=[tag])
        if industry:
            qs = qs.filter(industries__contains=[industry])
        if tool:
            qs = qs.filter(tools__contains=[tool])
        if case_file:
            qs = qs.filter(source_case_file_id=case_file)

        sort = params.get("sort")
        if sort == "popular":
            qs = qs.order_by("-usage_count", "-updated_at")
        elif sort == "recent":
            qs = qs.order_by("-updated_at")
        elif sort == "alpha":
            qs = qs.order_by("name")

        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return LibraryItemDetailSerializer
        return LibraryItemListSerializer

    def perform_create(self, serializer):
        team = _user_team(self.request.user)
        serializer.save(
            team=team,
            created_by=self.request.user,
            updated_by=self.request.user,
        )


class LibraryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/library/items/<id>/
    PATCH  /api/v1/library/items/<id>/  (auto-bumps version)
    DELETE /api/v1/library/items/<id>/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = LibraryItemDetailSerializer

    def get_queryset(self):
        return _scoped_queryset(self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        serializer.save(
            updated_by=self.request.user,
            version=instance.version + 1,
        )


class LibraryPromoteView(APIView):
    """
    POST /api/v1/library/items/promote/

    Promote a fragment of a project's build into a Library item. The body the
    frontend sends is whatever JSON shape it extracted from the source layer.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = LibraryPromoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        team = _user_team(request.user)
        case_file = data["case_file"]
        item = LibraryItem.objects.create(
            team=team,
            kind=data["kind"],
            name=data["name"],
            description=data.get("description", ""),
            body=data.get("body") or {},
            tags=data.get("tags") or [],
            platform=getattr(case_file, "primary_platform", None),
            industries=list(case_file.industries or []),
            tools=list(case_file.tools or []),
            workflow_types=[case_file.workflow_type] if case_file.workflow_type else [],
            source_case_file=case_file,
            source_layer=data["source_layer"],
            source_path=data.get("source_path", ""),
            created_by=request.user,
            updated_by=request.user,
        )
        return Response(
            LibraryItemDetailSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )


class LibraryItemUseView(APIView):
    """
    POST /api/v1/library/items/<id>/use/

    Record a usage event when a user copies/applies a library item.
    Optional body: { case_file: <uuid> } — links the usage to a project.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            item = _scoped_queryset(request.user).get(pk=pk)
        except LibraryItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        case_file_id = request.data.get("case_file")
        usage = LibraryItemUsage.objects.create(
            library_item=item,
            used_in_case_file_id=case_file_id,
            used_by=request.user,
        )
        return Response(
            LibraryItemUsageSerializer(usage).data,
            status=status.HTTP_201_CREATED,
        )


class LibraryItemCommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/library/items/<id>/comments/
    POST /api/v1/library/items/<id>/comments/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = LibraryItemCommentSerializer

    def _item(self):
        try:
            return _scoped_queryset(self.request.user).get(pk=self.kwargs["pk"])
        except LibraryItem.DoesNotExist:
            return None

    def get_queryset(self):
        item = self._item()
        if item is None:
            return LibraryItemComment.objects.none()
        return item.comments.select_related("author")

    def perform_create(self, serializer):
        item = self._item()
        if item is None:
            raise generics.Http404
        serializer.save(library_item=item, author=self.request.user)


class LibraryItemCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    PATCH/DELETE /api/v1/library/items/<id>/comments/<comment_id>/
    Only the comment author (or admin) can edit/delete.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = LibraryItemCommentSerializer
    lookup_url_kwarg = "comment_id"

    def get_queryset(self):
        try:
            item = _scoped_queryset(self.request.user).get(pk=self.kwargs["pk"])
        except LibraryItem.DoesNotExist:
            return LibraryItemComment.objects.none()
        qs = item.comments.select_related("author")
        user = self.request.user
        is_admin = user.is_staff or user.is_admin_of(getattr(user, "active_team", None))
        if self.request.method in ("PATCH", "PUT", "DELETE") and not is_admin:
            qs = qs.filter(author=user)
        return qs
