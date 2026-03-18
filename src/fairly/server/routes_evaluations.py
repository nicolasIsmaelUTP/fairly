"""API routes for evaluations, inferences, and metrics."""

import json
from collections import defaultdict
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
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
    progress: int = 0
    created_at: Optional[datetime] = None

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
    classified_response: str = ""
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
            classified_response=inf.classified_response or "",
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


# ── Dimension Analysis ───────────────────────────────────────────────────────


@router.get("/{evaluation_id}/dimensions")
def evaluation_dimensions(evaluation_id: int, db: Session = Depends(get_db)):
    """List all dimensions available for cross-analysis on this evaluation's dataset."""
    from fairly.db.models import ColumnMapping, Dimension

    evaluation = get_evaluation(db, evaluation_id)
    if evaluation is None:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    mappings = (
        db.query(ColumnMapping)
        .filter(ColumnMapping.dataset_id == evaluation.dataset_id)
        .all()
    )

    seen = set()
    dimensions = []
    for m in mappings:
        if m.dimension_id in seen:
            continue
        seen.add(m.dimension_id)
        dim = db.query(Dimension).filter(Dimension.dimension_id == m.dimension_id).first()
        if dim:
            dimensions.append({
                "dimension_id": dim.dimension_id,
                "name": dim.name,
                "csv_column": m.name,
            })
    return dimensions


@router.get("/{evaluation_id}/analysis")
def dimension_analysis(
    evaluation_id: int,
    dimension_id: int = Query(..., description="Dimension to cross-analyze"),
    db: Session = Depends(get_db),
):
    """Cross-dimensional analysis: group classified responses by dimension values per prompt."""
    from fairly.db.models import ColumnMapping
    from fairly.eval.runner import classify_response

    evaluation = get_evaluation(db, evaluation_id)
    if evaluation is None:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    mapping = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.dataset_id == evaluation.dataset_id,
            ColumnMapping.dimension_id == dimension_id,
        )
        .first()
    )
    if mapping is None:
        raise HTTPException(status_code=404, detail="Dimension not mapped for this dataset")

    csv_column = mapping.name
    inferences = list_inferences(db, evaluation_id)

    # Fallback: load CSV for images that have empty metadata_json
    csv_lookup: dict[str, dict] = {}
    needs_csv = any(
        not inf.image or not inf.image.metadata_json or inf.image.metadata_json in ("{}", "")
        for inf in inferences
    )
    if needs_csv and evaluation.dataset.csv_route:
        try:
            import pandas as pd
            df = pd.read_csv(evaluation.dataset.csv_route)
            img_col = evaluation.dataset.image_column or df.columns[0]
            for _, row in df.iterrows():
                key = str(row[img_col])
                csv_lookup[key] = {str(c): str(v) for c, v in row.items()}
        except Exception:
            pass

    # Build per-prompt distribution: dimension_value → classified_response → count
    result: dict[int, dict] = {}
    for inf in inferences:
        metadata = {}
        if inf.image and getattr(inf.image, "metadata_json", None):
            try:
                metadata = json.loads(inf.image.metadata_json)
            except (json.JSONDecodeError, TypeError):
                pass

        # Fallback to CSV lookup when metadata is empty
        if not metadata and inf.image and csv_lookup:
            img_route = inf.image.img_route or ""
            # Try matching by full route or just the filename
            metadata = csv_lookup.get(img_route, {})
            if not metadata:
                from pathlib import PurePosixPath
                fname = PurePosixPath(img_route).name
                for csv_key, csv_row in csv_lookup.items():
                    if str(csv_key).endswith(fname) or fname in str(csv_key):
                        metadata = csv_row
                        break

        dim_value = str(metadata.get(csv_column, "Unknown"))
        classified = inf.classified_response if inf.classified_response else classify_response(inf.response)
        raw_response = (inf.response or "").strip()

        pid = inf.prompt_id
        if pid not in result:
            result[pid] = {
                "prompt_id": pid,
                "prompt_text": inf.prompt.text if inf.prompt else f"Prompt #{pid}",
                "distribution": defaultdict(lambda: defaultdict(int)),
                "raw_values": defaultdict(list),  # dim_value -> [raw responses]
            }

        result[pid]["distribution"][dim_value][classified] += 1
        result[pid]["raw_values"][dim_value].append(raw_response)

    charts = []
    for pid in sorted(result.keys()):
        data = result[pid]
        dist = {k: dict(v) for k, v in data["distribution"].items()}

        # Detect if the prompt has mostly numeric responses
        all_raw = [v for vals in data["raw_values"].values() for v in vals]
        numeric_count = 0
        for v in all_raw:
            try:
                float(v)
                numeric_count += 1
            except (ValueError, TypeError):
                pass

        is_numeric = len(all_raw) > 0 and numeric_count / len(all_raw) > 0.5

        entry = {
            "prompt_id": data["prompt_id"],
            "prompt_text": data["prompt_text"],
            "distribution": dist,
            "chart_hint": "numeric" if is_numeric else "categorical",
        }

        if is_numeric:
            # Build boxplot-style data: per dimension value, list of numeric values
            numeric_data = []
            for dim_val in sorted(data["raw_values"].keys()):
                values = []
                for v in data["raw_values"][dim_val]:
                    try:
                        values.append(float(v))
                    except (ValueError, TypeError):
                        pass
                if values:
                    values.sort()
                    n = len(values)
                    q1 = values[n // 4] if n >= 4 else values[0]
                    median = values[n // 2]
                    q3 = values[(3 * n) // 4] if n >= 4 else values[-1]
                    numeric_data.append({
                        "dimension": dim_val,
                        "min": values[0],
                        "q1": q1,
                        "median": median,
                        "q3": q3,
                        "max": values[-1],
                        "mean": round(sum(values) / n, 2),
                        "count": n,
                    })
            entry["numeric_data"] = numeric_data

        charts.append(entry)

    return charts


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
