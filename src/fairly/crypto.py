"""Symmetric encryption for sensitive settings (API keys).

Uses Fernet (AES-128-CBC + HMAC-SHA256) with a machine-local key stored
in .fairly/secret.key.  The key is auto-generated on first use.
"""

import base64
import hashlib
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from fairly.config import FAIRLY_DIR

_KEY_FILE = FAIRLY_DIR / "secret.key"


def _get_or_create_key() -> bytes:
    """Return the Fernet key, creating it if missing."""
    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes().strip()
    key = Fernet.generate_key()
    _KEY_FILE.write_bytes(key)
    return key


_fernet = Fernet(_get_or_create_key())


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string and return a base64 token."""
    if not plaintext:
        return ""
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    """Decrypt a Fernet token back to plaintext."""
    if not token:
        return ""
    try:
        return _fernet.decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        # If token is not a valid Fernet token, return as-is
        # (handles migration from plaintext)
        return token


def mask(value: str) -> str:
    """Return a masked version for display (e.g. 'AKIA............')."""
    if not value:
        return ""
    if len(value) <= 4:
        return "*" * len(value)
    return value[:4] + "·" * min(12, len(value) - 4)
