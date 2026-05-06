import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from datetime import timedelta


ACTION_LOGIN = "login"
ACTION_LOGIN_FAILED = "login_failed"
ACTION_PASSWORD_CHANGE = "password_change"
ACTION_PASSWORD_RESET_REQUEST = "password_reset_request"
ACTION_PASSWORD_RESET_CONFIRM = "password_reset_confirm"
ACTION_PROFILE_UPDATE = "profile_update"
ACTION_INVITE_SENT = "invite_sent"
ACTION_ACCOUNT_CREATED = "account_created"
ACTION_CASE_FILE_CREATED = "case_file_created"
ACTION_CASE_FILE_UPDATED = "case_file_updated"
ACTION_CASE_FILE_DELETED = "case_file_deleted"


class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    logo = models.ImageField(upload_to="team_logos/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "teams"
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(
        max_length=50,
        choices=[
            ("admin", "Admin"),
            ("engineer", "Solutions Engineer"),
            ("viewer", "Viewer"),
        ],
        default="engineer",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


class PasswordResetToken(models.Model):
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = "password_reset_tokens"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    def __str__(self):
        return f"PasswordResetToken for {self.user}"


class Invitation(models.Model):
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField(blank=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "invitations"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=2)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    def __str__(self):
        return f"Invite {self.token} by {self.created_by}"


class AuditLog(models.Model):
    ACTION_CHOICES = [
        (ACTION_LOGIN, "Login"),
        (ACTION_LOGIN_FAILED, "Failed Login"),
        (ACTION_PASSWORD_CHANGE, "Password Changed"),
        (ACTION_PASSWORD_RESET_REQUEST, "Password Reset Requested"),
        (ACTION_PASSWORD_RESET_CONFIRM, "Password Reset Confirmed"),
        (ACTION_PROFILE_UPDATE, "Profile Updated"),
        (ACTION_INVITE_SENT, "Invite Sent"),
        (ACTION_ACCOUNT_CREATED, "Account Created"),
        (ACTION_CASE_FILE_CREATED, "Case File Created"),
        (ACTION_CASE_FILE_UPDATED, "Case File Updated"),
        (ACTION_CASE_FILE_DELETED, "Case File Deleted"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "anonymous"
        return f"[{self.action}] {user_str} @ {self.created_at}"
