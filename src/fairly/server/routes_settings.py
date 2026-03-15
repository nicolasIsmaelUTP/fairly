"""API routes for application settings."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fairly.db.crud_settings import get_settings, update_settings
from fairly.db.database import get_db

router = APIRouter()


class SettingsOut(BaseModel):
    """Response schema for settings."""

    settings_id: int
    featherless_key: str
    aws_access_key: str
    aws_secret_access_key: str
    theme: str

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    """Request schema for updating settings."""

    featherless_key: str | None = None
    aws_access_key: str | None = None
    aws_secret_access_key: str | None = None
    theme: str | None = None


@router.get("", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db)):
    """Get global application settings."""
    return get_settings(db)


@router.put("", response_model=SettingsOut)
def write_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    """Update one or more settings fields."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    return update_settings(db, **data)
