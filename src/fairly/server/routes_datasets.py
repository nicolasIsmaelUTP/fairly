"""API routes for dataset management and column mapping."""

import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fairly.data.loader import get_csv_headers
from fairly.db.crud_datasets import (
    create_column_mapping,
    create_dataset,
    delete_dataset,
    get_dataset,
    list_columns,
    list_datasets,
)
from fairly.db.database import get_db

router = APIRouter()


class DatasetOut(BaseModel):
    """Response schema for a dataset."""

    dataset_id: int
    name: str
    imgs_route: str
    csv_route: str

    model_config = {"from_attributes": True}


class DatasetCreate(BaseModel):
    """Request schema for creating a dataset."""

    name: str
    imgs_route: str = ""
    csv_route: str = ""


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
    return create_dataset(db, name=body.name, imgs_route=body.imgs_route, csv_route=body.csv_route)


@router.delete("/{dataset_id}")
def remove_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Delete a dataset by ID."""
    if not delete_dataset(db, dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"ok": True}


# ── CSV Headers (Smart Mapping helper) ───────────────────────────────────────


@router.get("/{dataset_id}/csv-headers", response_model=list[str])
def read_csv_headers(dataset_id: int, db: Session = Depends(get_db)):
    """Return column headers of the dataset's CSV file."""
    ds = get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not ds.csv_route:
        raise HTTPException(status_code=400, detail="No CSV path configured")
    return get_csv_headers(ds.csv_route)


# ── Column Mappings ──────────────────────────────────────────────────────────


@router.get("/{dataset_id}/columns", response_model=list[ColumnOut])
def read_columns(dataset_id: int, db: Session = Depends(get_db)):
    """List column mappings for a dataset."""
    return list_columns(db, dataset_id)


@router.post("/{dataset_id}/columns", response_model=ColumnOut, status_code=201)
def add_column(dataset_id: int, body: ColumnCreate, db: Session = Depends(get_db)):
    """Map a CSV column to a bias dimension."""
    return create_column_mapping(db, name=body.name, dataset_id=dataset_id, dimension_id=body.dimension_id)
