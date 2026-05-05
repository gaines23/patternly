from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models


class EncryptedTextField(models.TextField):
    """
    TextField that transparently encrypts on write and decrypts on read.

    Uses Fernet (AES-128-CBC + HMAC-SHA256) keyed by settings.FIELD_ENCRYPTION_KEY,
    a base64-encoded 32-byte key. Generate one with:

        python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    Stored ciphertext is opaque text; the model attribute returns plaintext.
    Empty strings and None pass through unchanged so .filter(field="") still works.
    """

    description = "Fernet-encrypted text"

    def _fernet(self):
        key = getattr(settings, "FIELD_ENCRYPTION_KEY", "") or ""
        if not key:
            raise ImproperlyConfigured(
                "FIELD_ENCRYPTION_KEY is not set. Generate one with "
                "`python -c \"from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())\"` and add it to .env."
            )
        if isinstance(key, str):
            key = key.encode()
        return Fernet(key)

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return value
        try:
            return self._fernet().decrypt(value.encode()).decode()
        except InvalidToken as exc:
            raise ValueError(
                "Failed to decrypt EncryptedTextField — wrong FIELD_ENCRYPTION_KEY "
                "or corrupted ciphertext."
            ) from exc

    def to_python(self, value):
        return value

    def get_prep_value(self, value):
        if value is None or value == "":
            return value
        return self._fernet().encrypt(value.encode()).decode()
