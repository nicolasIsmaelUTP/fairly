"""API routes for dataset management and column mapping."""

import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fairly.config import FAIRLY_DIR
from fairly.data.loader import get_csv_headers, get_csv_preview
from fairly.db.crud_datasets import (
    create_column_mapping,
    create_dataset,
    delete_column_mapping,
    delete_dataset,
    get_dataset,
    list_columns,
    list_datasets,
    update_dataset,
)
from fairly.db.database import get_db

router = APIRouter()


class DatasetOut(BaseModel):
    """Response schema for a dataset."""

    dataset_id: int
    name: str
    imgs_route: str
    csv_route: str
    image_column: str

    model_config = {"from_attributes": True}


class DatasetCreate(BaseModel):
    """Request schema for creating a dataset."""

    name: str
    imgs_route: str = ""
    csv_route: str = ""
    image_column: str = ""


class DatasetUpdate(BaseModel):
    """Request schema for updating a dataset."""

    name: str | None = None
    imgs_route: str | None = None
    csv_route: str | None = None
    image_column: str | None = None


class ColumnOut(BaseModel):
    """Response schema for a column mapping."""

    column_id: int
    name: str
    dataset_id: int
    dimension_id: int

    model_config = {"from_attributes": True}


class ColumnCreate(BaseModel):
    """Request schema for a column mapping."""

    name: str
    dimension_id: int


# ── Dataset CRUD ─────────────────────────────────────────────────────────────


@router.get("", response_model=list[DatasetOut])
def read_datasets(db: Session = Depends(get_db)):
    """List all datasets."""
    return list_datasets(db)


@router.get("/{dataset_id}", response_model=DatasetOut)
def read_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Get a single dataset by ID."""
    row = get_dataset(db, dataset_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return row


@router.post("", response_model=DatasetOut, status_code=201)
def add_dataset(body: DatasetCreate, db: Session = Depends(get_db)):
    """Create a new dataset."""
    return create_dataset(
        db, name=body.name, imgs_route=body.imgs_route,
        csv_route=body.csv_route, image_column=body.image_column,
    )


@router.delete("/{dataset_id}")
def remove_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Delete a dataset by ID."""
    if not delete_dataset(db, dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"ok": True}


@router.put("/{dataset_id}", response_model=DatasetOut)
def modify_dataset(dataset_id: int, body: DatasetUpdate, db: Session = Depends(get_db)):
    """Update a dataset."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    ds = update_dataset(db, dataset_id, **data)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return ds


# ── CSV Upload & Preview ─────────────────────────────────────────────────────


@router.post("/upload-csv")
async def upload_csv_file(file: UploadFile):
    """Upload a CSV file, save locally, return path and preview."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".csv", ".tsv"):
        raise HTTPException(status_code=400, detail="Only .csv and .tsv files are allowed")

    uploads_dir = FAIRLY_DIR / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    safe_name = re.sub(r"[^\w.\-]", "_", Path(file.filename).stem) + ext
    file_path = uploads_dir / safe_name

    content = await file.read()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 100 MB)")

    file_path.write_bytes(content)

    try:
        preview = get_csv_preview(str(file_path))
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}")

    preview["path"] = str(file_path)
    return preview


@router.get("/{dataset_id}/csv-headers", response_model=list[str])
def read_csv_headers(dataset_id: int, db: Session = Depends(get_db)):
    """Return column headers of the dataset's CSV file."""
    ds = get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not ds.csv_route:
        raise HTTPException(status_code=400, detail="No CSV path configured")
    return get_csv_headers(ds.csv_route)


@router.get("/{dataset_id}/csv-preview")
def read_csv_preview(dataset_id: int, db: Session = Depends(get_db)):
    """Return first rows of the dataset CSV with headers."""
    ds = get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not ds.csv_route:
        raise HTTPException(status_code=400, detail="No CSV path configured")
    return get_csv_preview(ds.csv_route)


# ── Column Mappings ──────────────────────────────────────────────────────────


@router.get("/{dataset_id}/columns", response_model=list[ColumnOut])
def read_columns(dataset_id: int, db: Session = Depends(get_db)):
    """List column mappings for a dataset."""
    return list_columns(db, dataset_id)


@router.post("/{dataset_id}/columns", response_model=ColumnOut, status_code=201)
def add_column(dataset_id: int, body: ColumnCreate, db: Session = Depends(get_db)):
    """Map a CSV column to a bias dimension."""
    return create_column_mapping(db, name=body.name, dataset_id=dataset_id, dimension_id=body.dimension_id)


@router.delete("/{dataset_id}/columns/{column_id}")
def remove_column(dataset_id: int, column_id: int, db: Session = Depends(get_db)):
    """Delete a column mapping."""
    if not delete_column_mapping(db, column_id):
        raise HTTPException(status_code=404, detail="Column mapping not found")
    return {"ok": True}
