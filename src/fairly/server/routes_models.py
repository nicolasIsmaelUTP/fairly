"""API routes for VLM model management."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fairly.db.crud_models import create_model, delete_model, get_model, list_models
from fairly.db.database import get_db

router = APIRouter()


class ModelOut(BaseModel):
    """Response schema for a model."""

    model_id: int
    name: str
    source: str
    metadata_json: str

    model_config = {"from_attributes": True}


class ModelCreate(BaseModel):
    """Request schema for creating a model."""

    name: str
    source: str = "custom"
    metadata_json: str = "{}"


@router.get("", response_model=list[ModelOut])
def read_models(db: Session = Depends(get_db)):
    """List all registered models."""
    return list_models(db)


@router.get("/{model_id}", response_model=ModelOut)
def read_model(model_id: int, db: Session = Depends(get_db)):
    """Get a single model by ID."""
    row = get_model(db, model_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return row


@router.post("", response_model=ModelOut, status_code=201)
def add_model(body: ModelCreate, db: Session = Depends(get_db)):
    """Register a new model."""
    return create_model(db, name=body.name, source=body.source, metadata_json=body.metadata_json)


@router.delete("/{model_id}")
def remove_model(model_id: int, db: Session = Depends(get_db)):
    """Delete a model by ID."""
    if not delete_model(db, model_id):
        raise HTTPException(status_code=404, detail="Model not found")
    return {"ok": True}
