"""API routes for evaluations, inferences, and metrics."""

import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fairly.db.crud_evaluations import (
    create_evaluation,
    get_evaluation,
    list_evaluations,
    list_inferences,
    list_metrics,
    update_audit_status,
)
from fairly.db.database import get_db

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────


class EvaluationOut(BaseModel):
    """Response schema for an evaluation."""

    evaluation_id: int
    model_id: int
    dataset_id: int
    domain_id: int
    num_images: int
    images_resolution: str
    status: str

    model_config = {"from_attributes": True}


class EvaluationCreate(BaseModel):
    """Request schema for launching a benchmark."""

    model_id: int
    dataset_id: int
    domain_id: int
    dimension_ids: list[int]
    num_images: int = 50
    images_resolution: str = "low"


class InferenceOut(BaseModel):
    """Response schema for a single inference result."""

    inference_id: int
    image_id: int
    prompt_id: int
    evaluation_id: int
    response: str
    audit_status: str
    prompt_text: str = ""
    thumbnail_url: str = ""
    img_route: str = ""

    model_config = {"from_attributes": True}


class AuditUpdate(BaseModel):
    """Request schema for auditing an inference."""

    audit_status: str  # "pass" | "flag" | "unreviewed"


class MetricOut(BaseModel):
    """Response schema for a metric."""

    metric_id: int
    evaluation_id: int
    name: str
    value_json: str
    chart_type: str

    model_config = {"from_attributes": True}


# ── Evaluation CRUD ──────────────────────────────────────────────────────────


@router.get("", response_model=list[EvaluationOut])
def read_evaluations(db: Session = Depends(get_db)):
    """List all evaluations (newest first)."""
    return list_evaluations(db)


@router.get("/{evaluation_id}", response_model=EvaluationOut)
def read_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    """Get a single evaluation by ID."""
    row = get_evaluation(db, evaluation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return row


@router.post("", response_model=EvaluationOut, status_code=201)
def launch_evaluation(
    body: EvaluationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Create a new evaluation and start it running in the background."""
    ev = create_evaluation(
        db,
        model_id=body.model_id,
        dataset_id=body.dataset_id,
        domain_id=body.domain_id,
        dimension_ids=body.dimension_ids,
        num_images=body.num_images,
        images_resolution=body.images_resolution,
    )

    # Run the actual benchmark in the background so the endpoint returns fast
    from fairly.db.database import SessionLocal
    from fairly.eval.runner import run_evaluation

    def _run():
        session = SessionLocal()
        try:
            run_evaluation(session, ev.evaluation_id)
        finally:
            session.close()

    background_tasks.add_task(_run)
    return ev


# ── Inferences ───────────────────────────────────────────────────────────────


@router.get("/{evaluation_id}/inferences", response_model=list[InferenceOut])
def read_inferences(evaluation_id: int, db: Session = Depends(get_db)):
    """List all inferences for an evaluation, enriched with prompt text and thumbnail."""
    rows = list_inferences(db, evaluation_id)
    results = []
    for inf in rows:
        thumb = ""
        img_route = ""
        if inf.image:
            img_route = inf.image.img_route or ""
            if inf.image.local_thumbnail_route:
                # Serve via static mount: /thumbnails/<filename>
                from pathlib import Path
                thumb = "/thumbnails/" + Path(inf.image.local_thumbnail_route).name
        results.append(InferenceOut(
            inference_id=inf.inference_id,
            image_id=inf.image_id,
            prompt_id=inf.prompt_id,
            evaluation_id=inf.evaluation_id,
            response=inf.response,
            audit_status=inf.audit_status,
            prompt_text=inf.prompt.text if inf.prompt else "",
            thumbnail_url=thumb,
            img_route=img_route,
        ))
    return results


@router.patch("/inferences/{inference_id}", response_model=InferenceOut)
def audit_inference(
    inference_id: int, body: AuditUpdate, db: Session = Depends(get_db)
):
    """Update the audit status of an inference (pass / flag)."""
    allowed = {"pass", "flag", "unreviewed"}
    if body.audit_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of {allowed}")
    row = update_audit_status(db, inference_id, body.audit_status)
    if row is None:
        raise HTTPException(status_code=404, detail="Inference not found")
    return row


# ── Metrics ──────────────────────────────────────────────────────────────────


@router.get("/{evaluation_id}/metrics", response_model=list[MetricOut])
def read_metrics(evaluation_id: int, db: Session = Depends(get_db)):
    """List all metrics for an evaluation."""
    return list_metrics(db, evaluation_id)


# ── PDF Export ───────────────────────────────────────────────────────────────


@router.get("/{evaluation_id}/export-pdf")
def export_pdf(evaluation_id: int, db: Session = Depends(get_db)):
    """Generate and return a PDF report for the evaluation."""
    from fastapi.responses import FileResponse

    from fairly.config import FAIRLY_DIR
    from fairly.reporting.pdf import generate_pdf

    output_path = FAIRLY_DIR / f"report_{evaluation_id}.pdf"
    generate_pdf(db, evaluation_id, output_path)

    return FileResponse(
        path=str(output_path),
        filename=f"fairly_report_{evaluation_id}.pdf",
        media_type="application/pdf",
    )
