"""API routes for prompts, domains, and dimensions."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from fairly.db.database import get_db
from fairly.db.models import Dimension, Domain, Prompt, PromptDimension

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
    dimension_ids: list[int]
    text: str
    expected_result: str
    bias_type: str
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


def _prompt_to_out(p: Prompt) -> dict:
    """Convert a Prompt ORM object to a dict matching PromptOut."""
    return {
        "prompt_id": p.prompt_id,
        "domain_id": p.domain_id,
        "dimension_ids": [d.dimension_id for d in p.dimensions],
        "text": p.text,
        "expected_result": p.expected_result or "",
        "bias_type": p.bias_type or "",
        "is_active": p.is_active,
    }


@router.get("", response_model=list[PromptOut])
def read_prompts(
    domain_id: int | None = None,
    dimension_id: int | None = None,
    db: Session = Depends(get_db),
):
    """List prompts with optional domain / dimension filtering."""
    q = db.query(Prompt).options(joinedload(Prompt.dimensions)).filter(Prompt.is_active.is_(True))
    if domain_id is not None:
        q = q.filter(Prompt.domain_id == domain_id)
    if dimension_id is not None:
        q = q.join(PromptDimension).filter(PromptDimension.dimension_id == dimension_id)
    prompts = q.all()
    # Deduplicate (joinedload + join can produce duplicates)
    seen = set()
    unique = []
    for p in prompts:
        if p.prompt_id not in seen:
            seen.add(p.prompt_id)
            unique.append(p)
    return [_prompt_to_out(p) for p in unique]
