from django.db.models import Q
from rest_framework import generics, filters, status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Todo
from .serializers import TodoSerializer, TodoWriteSerializer


def _is_admin(user):
    try:
        return getattr(user, "role", None) == "admin" or user.is_staff
    except AttributeError:
        return False


class TodoListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/todos/   → list of todos (filtered by role; unpaginated —
                            the Tasks page groups everything client-side by
                            due date, so partial pages would hide items)
    POST /api/v1/todos/   → create a new todo
    """
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "case_file_name"]
    ordering_fields = ["due_date", "priority", "status", "created_at"]
    # Newest first so freshly-created todos are obvious in the list; the
    # frontend does its own grouping/sorting on top of this.
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Todo.objects.select_related("case_file", "assigned_to", "created_by")

        # Admins see all todos; others see todos they created or are assigned to
        if not _is_admin(user):
            qs = qs.filter(Q(created_by=user) | Q(assigned_to=user))

        # Optional query param filters
        status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        case_file_id = self.request.query_params.get("case_file")

        if status:
            qs = qs.filter(status=status)
        if priority:
            qs = qs.filter(priority=priority)
        if case_file_id:
            qs = qs.filter(case_file_id=case_file_id)

        return qs

    def get_serializer_class(self):
        return TodoWriteSerializer if self.request.method == "POST" else TodoSerializer

    def create(self, request, *args, **kwargs):
        serializer = TodoWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        todo = serializer.save()
        return Response(TodoSerializer(todo).data, status=http_status.HTTP_201_CREATED)


class TodoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/todos/<id>/   → single todo
    PATCH  /api/v1/todos/<id>/   → partial update
    DELETE /api/v1/todos/<id>/   → delete
    """
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Todo.objects.select_related("case_file", "assigned_to", "created_by")
        if not _is_admin(user):
            qs = qs.filter(Q(created_by=user) | Q(assigned_to=user))
        return qs

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return TodoWriteSerializer
        return TodoSerializer

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = TodoWriteSerializer(
            instance, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        todo = serializer.save()
        return Response(TodoSerializer(todo).data)
