"""CRUD helpers for the Settings singleton."""

from sqlalchemy.orm import Session

from fairly.db.models import Settings


def get_settings(db: Session) -> Settings:
    """Return the global settings row, creating it if missing.

    Args:
        db: Active database session.

    Returns:
        The single Settings row.
    """
    row = db.query(Settings).first()
    if row is None:
        row = Settings(settings_id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_settings(db: Session, **kwargs) -> Settings:
    """Update one or more settings fields.

    Args:
        db: Active database session.
        **kwargs: Field names and new values (e.g. theme="dark").

    Returns:
        The updated Settings row.
    """
    row = get_settings(db)
    for key, value in kwargs.items():
        if hasattr(row, key):
            setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row
