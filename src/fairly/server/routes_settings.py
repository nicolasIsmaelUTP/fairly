"""API routes for application settings."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fairly.crypto import decrypt, encrypt, mask
from fairly.db.crud_settings import get_settings, update_settings
from fairly.db.database import get_db

router = APIRouter()

_SENSITIVE_FIELDS = {"featherless_key", "aws_access_key", "aws_secret_access_key"}


class SettingsOut(BaseModel):
    """Response schema for settings — keys are masked."""

    settings_id: int
    featherless_key: str
    aws_access_key: str
    aws_secret_access_key: str
    theme: str
    # Extra fields so the frontend knows whether keys are set
    has_featherless_key: bool = False
    has_aws_keys: bool = False


class SettingsUpdate(BaseModel):
    """Request schema for updating settings."""

    featherless_key: str | None = None
    aws_access_key: str | None = None
    aws_secret_access_key: str | None = None
    theme: str | None = None


def _settings_to_out(row) -> SettingsOut:
    """Convert a Settings ORM row to a SettingsOut with masked values."""
    raw_fl = decrypt(row.featherless_key or "")
    raw_aws = decrypt(row.aws_access_key or "")
    raw_aws_secret = decrypt(row.aws_secret_access_key or "")
    return SettingsOut(
        settings_id=row.settings_id,
        featherless_key=mask(raw_fl),
        aws_access_key=mask(raw_aws),
        aws_secret_access_key=mask(raw_aws_secret),
        theme=row.theme or "light",
        has_featherless_key=bool(raw_fl),
        has_aws_keys=bool(raw_aws and raw_aws_secret),
    )


@router.get("", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db)):
    """Get global application settings (keys are masked)."""
    return _settings_to_out(get_settings(db))


@router.put("", response_model=SettingsOut)
def write_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    """Update one or more settings fields. Sensitive fields get encrypted."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    # Encrypt sensitive fields before storage
    for field in _SENSITIVE_FIELDS:
        if field in data and data[field]:
            data[field] = encrypt(data[field])
    row = update_settings(db, **data)
    return _settings_to_out(row)
