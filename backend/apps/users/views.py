from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

from .models import User, Invitation
from .serializers import UserSerializer, RegisterSerializer, ChangePasswordSerializer, InviteSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(serializer.validated_data["current_password"]):
        return Response(
            {"current_password": "Incorrect password."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(serializer.validated_data["new_password"])
    user.save()
    return Response({"detail": "Password updated."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_invite(request):
    email = request.data.get("email", "")
    invite = Invitation.objects.create(
        created_by=request.user,
        email=email,
        expires_at=timezone.now() + timedelta(days=2),
    )
    serializer = InviteSerializer(invite)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def validate_invite(request, token):
    try:
        invite = Invitation.objects.get(token=token)
    except Invitation.DoesNotExist:
        return Response({"valid": False, "detail": "Invalid invite link."}, status=status.HTTP_404_NOT_FOUND)

    if not invite.is_valid():
        return Response({"valid": False, "detail": "This invite has already been used or has expired."}, status=status.HTTP_410_GONE)

    return Response({"valid": True, "email": invite.email})
