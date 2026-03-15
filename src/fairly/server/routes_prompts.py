"""API routes for prompts, domains, and dimensions."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fairly.db.database import get_db
from fairly.db.models import Dimension, Domain, Prompt

router = APIRouter()


class DomainOut(BaseModel):
    """Response schema for a domain."""

    domain_id: int
    name: str

    model_config = {"from_attributes": True}


class DimensionOut(BaseModel):
    """Response schema for a dimension."""

    dimension_id: int
    name: str

    model_config = {"from_attributes": True}


class PromptOut(BaseModel):
    """Response schema for a prompt."""

    prompt_id: int
    domain_id: int
    dimension_id: int
    text: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.get("/domains", response_model=list[DomainOut])
def read_domains(db: Session = Depends(get_db)):
    """List all domains (use cases)."""
    return db.query(Domain).all()


@router.get("/dimensions", response_model=list[DimensionOut])
def read_dimensions(db: Session = Depends(get_db)):
    """List all bias dimensions."""
    return db.query(Dimension).all()


@router.get("", response_model=list[PromptOut])
def read_prompts(
    domain_id: int | None = None,
    dimension_id: int | None = None,
    db: Session = Depends(get_db),
):
    """List prompts with optional domain / dimension filtering."""
    q = db.query(Prompt).filter(Prompt.is_active.is_(True))
    if domain_id is not None:
        q = q.filter(Prompt.domain_id == domain_id)
    if dimension_id is not None:
        q = q.filter(Prompt.dimension_id == dimension_id)
    return q.all()
