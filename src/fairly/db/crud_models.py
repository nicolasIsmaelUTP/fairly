"""CRUD helpers for Models."""

from sqlalchemy.orm import Session

from fairly.db.models import Model


def list_models(db: Session) -> list[Model]:
    """Return all registered models.

    Args:
        db: Active database session.

    Returns:
        List of Model rows.
    """
    return db.query(Model).all()


def get_model(db: Session, model_id: int) -> Model | None:
    """Get a single model by its ID.

    Args:
        db: Active database session.
        model_id: Primary key.

    Returns:
        The Model or None if not found.
    """
    return db.query(Model).filter(Model.model_id == model_id).first()


def create_model(db: Session, name: str, source: str = "custom", metadata_json: str = "{}") -> Model:
    """Insert a new model record.

    Args:
        db: Active database session.
        name: Display name of the model.
        source: "featherless" or "custom".
        metadata_json: JSON blob with provider-specific info.

    Returns:
        The newly created Model.
    """
    model = Model(name=name, source=source, metadata_json=metadata_json)
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


def delete_model(db: Session, model_id: int) -> bool:
    """Delete a model by ID.

    Args:
        db: Active database session.
        model_id: Primary key to delete.

    Returns:
        True if a row was deleted, False otherwise.
    """
    row = get_model(db, model_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def update_model(db: Session, model_id: int, metadata_json: str) -> Model | None:
    """Update a model's metadata_json.

    Args:
        db: Active database session.
        model_id: Primary key.
        metadata_json: New JSON blob.

    Returns:
        The updated Model or None if not found.
    """
    row = get_model(db, model_id)
    if row is None:
        return None
    row.metadata_json = metadata_json
    db.commit()
    db.refresh(row)
    return row
