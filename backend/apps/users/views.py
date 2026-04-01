from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import User
from .serializers import UserSerializer, RegisterSerializer, ChangePasswordSerializer


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
