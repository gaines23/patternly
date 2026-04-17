import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()


# ── Model tests ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUserModel:

    def test_create_user(self):
        user = User.objects.create_user(
            email="jane@patternly.dev",
            password="securepass99",
            first_name="Jane",
            last_name="Doe",
        )
        assert user.email == "jane@patternly.dev"
        assert user.check_password("securepass99")
        assert not user.is_staff
        assert not user.is_superuser
        assert user.is_active
        assert user.role == "engineer"

    def test_full_name_property(self):
        user = User.objects.create_user(
            email="john@patternly.dev",
            password="pass",
            first_name="John",
            last_name="Smith",
        )
        assert user.full_name == "John Smith"

    def test_full_name_fallback_to_email(self):
        user = User.objects.create_user(email="noname@patternly.dev", password="pass")
        assert user.full_name == "noname@patternly.dev"

    def test_str_returns_email(self, user):
        assert str(user) == user.email

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email="admin@patternly.dev",
            password="adminpass",
        )
        assert admin.is_staff
        assert admin.is_superuser

    def test_email_is_unique(self, user):
        with pytest.raises(Exception):
            User.objects.create_user(email=user.email, password="anotherpass")


# ── Auth endpoint tests ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAuthEndpoints:

    def test_register(self, api_client):
        url = reverse("user_register")
        payload = {
            "email": "new@patternly.dev",
            "password": "strongpass99",
            "first_name": "New",
            "last_name": "User",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == 201
        assert User.objects.filter(email="new@patternly.dev").exists()

    def test_register_duplicate_email(self, api_client, user):
        url = reverse("user_register")
        payload = {"email": user.email, "password": "pass1234", "first_name": "X"}
        response = api_client.post(url, payload, format="json")
        assert response.status_code == 400

    def test_register_short_password(self, api_client):
        url = reverse("user_register")
        payload = {"email": "short@patternly.dev", "password": "abc"}
        response = api_client.post(url, payload, format="json")
        assert response.status_code == 400

    def test_token_obtain(self, api_client, user):
        url = reverse("token_obtain_pair")
        response = api_client.post(url, {"email": user.email, "password": "testpass123"}, format="json")
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data

    def test_token_wrong_password(self, api_client, user):
        url = reverse("token_obtain_pair")
        response = api_client.post(url, {"email": user.email, "password": "wrongpass"}, format="json")
        assert response.status_code == 401

    def test_me_authenticated(self, auth_client, user):
        url = reverse("user_me")
        response = auth_client.get(url)
        assert response.status_code == 200
        assert response.data["email"] == user.email
        assert response.data["role"] == "engineer"

    def test_me_unauthenticated(self, api_client):
        url = reverse("user_me")
        response = api_client.get(url)
        assert response.status_code == 401

    def test_update_me(self, auth_client):
        url = reverse("user_me")
        response = auth_client.patch(url, {"first_name": "Updated"}, format="json")
        assert response.status_code == 200
        assert response.data["first_name"] == "Updated"

    def test_change_password(self, auth_client, user):
        url = reverse("user_change_password")
        response = auth_client.post(url, {
            "current_password": "testpass123",
            "new_password": "newpassword99",
        }, format="json")
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.check_password("newpassword99")

    def test_change_password_wrong_current(self, auth_client):
        url = reverse("user_change_password")
        response = auth_client.post(url, {
            "current_password": "wrongpass",
            "new_password": "newpassword99",
        }, format="json")
        assert response.status_code == 400
