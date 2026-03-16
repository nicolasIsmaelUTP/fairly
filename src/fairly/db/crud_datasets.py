"""CRUD helpers for Datasets and Column Mappings."""

from sqlalchemy.orm import Session

from fairly.db.models import ColumnMapping, Dataset


def list_datasets(db: Session) -> list[Dataset]:
    """Return all datasets.

    Args:
        db: Active database session.

    Returns:
        List of Dataset rows.
    """
    return db.query(Dataset).all()


def get_dataset(db: Session, dataset_id: int) -> Dataset | None:
    """Get a single dataset by ID.

    Args:
        db: Active database session.
        dataset_id: Primary key.

    Returns:
        The Dataset or None.
    """
    return db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()


def create_dataset(
    db: Session, name: str, imgs_route: str = "", csv_route: str = "", image_column: str = ""
) -> Dataset:
    """Insert a new dataset record.

    Args:
        db: Active database session.
        name: Human-readable name.
        imgs_route: Path or S3 URI to images.
        csv_route: Path to the CSV metadata file.
        image_column: CSV column name containing image paths.

    Returns:
        The newly created Dataset.
    """
    ds = Dataset(name=name, imgs_route=imgs_route, csv_route=csv_route, image_column=image_column)
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds


def delete_dataset(db: Session, dataset_id: int) -> bool:
    """Delete a dataset by ID.

    Args:
        db: Active database session.
        dataset_id: Primary key.

    Returns:
        True if deleted, False otherwise.
    """
    row = get_dataset(db, dataset_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


# ── Column Mappings ──────────────────────────────────────────────────────────


def list_columns(db: Session, dataset_id: int) -> list[ColumnMapping]:
    """Return all column mappings for a dataset.

    Args:
        db: Active database session.
        dataset_id: FK to filter by.

    Returns:
        List of ColumnMapping rows.
    """
    return (
        db.query(ColumnMapping)
        .filter(ColumnMapping.dataset_id == dataset_id)
        .all()
    )


def create_column_mapping(
    db: Session, name: str, dataset_id: int, dimension_id: int
) -> ColumnMapping:
    """Map a CSV column to a bias dimension.

    Args:
        db: Active database session.
        name: The CSV column header.
        dataset_id: FK to dataset.
        dimension_id: FK to dimension.

    Returns:
        The newly created ColumnMapping.
    """
    col = ColumnMapping(name=name, dataset_id=dataset_id, dimension_id=dimension_id)
    db.add(col)
    db.commit()
    db.refresh(col)
    return col


def update_dataset(db: Session, dataset_id: int, **kwargs) -> Dataset | None:
    """Update one or more fields on an existing dataset."""
    ds = get_dataset(db, dataset_id)
    if ds is None:
        return None
    for k, v in kwargs.items():
        if hasattr(ds, k):
            setattr(ds, k, v)
    db.commit()
    db.refresh(ds)
    return ds


def delete_column_mapping(db: Session, column_id: int) -> bool:
    """Delete a column mapping by ID."""
    col = db.query(ColumnMapping).filter(ColumnMapping.column_id == column_id).first()
    if col is None:
        return False
    db.delete(col)
    db.commit()
    return True
