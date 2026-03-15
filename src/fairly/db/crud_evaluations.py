"""CRUD helpers for Evaluations, Inferences, and Metrics."""

import json

from sqlalchemy.orm import Session

from fairly.db.models import (
    Evaluation,
    EvaluationDimension,
    Inference,
    Metric,
)


# ── Evaluations ──────────────────────────────────────────────────────────────


def list_evaluations(db: Session) -> list[Evaluation]:
    """Return all evaluations ordered newest first.

    Args:
        db: Active database session.

    Returns:
        List of Evaluation rows.
    """
    return (
        db.query(Evaluation)
        .order_by(Evaluation.evaluation_id.desc())
        .all()
    )


def get_evaluation(db: Session, evaluation_id: int) -> Evaluation | None:
    """Get an evaluation by ID.

    Args:
        db: Active database session.
        evaluation_id: Primary key.

    Returns:
        The Evaluation or None.
    """
    return (
        db.query(Evaluation)
        .filter(Evaluation.evaluation_id == evaluation_id)
        .first()
    )


def create_evaluation(
    db: Session,
    model_id: int,
    dataset_id: int,
    domain_id: int,
    dimension_ids: list[int],
    num_images: int = 50,
    images_resolution: str = "low",
) -> Evaluation:
    """Create a new evaluation with its activated dimensions.

    Args:
        db: Active database session.
        model_id: FK to model.
        dataset_id: FK to dataset.
        domain_id: FK to domain.
        dimension_ids: List of dimension PKs that the user activated.
        num_images: Sample size.
        images_resolution: "low" or "high".

    Returns:
        The newly created Evaluation.
    """
    ev = Evaluation(
        model_id=model_id,
        dataset_id=dataset_id,
        domain_id=domain_id,
        num_images=num_images,
        images_resolution=images_resolution,
        status="pending",
    )
    db.add(ev)
    db.flush()  # get evaluation_id before inserting bridge rows

    for dim_id in dimension_ids:
        bridge = EvaluationDimension(
            evaluation_id=ev.evaluation_id, dimension_id=dim_id
        )
        db.add(bridge)

    db.commit()
    db.refresh(ev)
    return ev


# ── Inferences ───────────────────────────────────────────────────────────────


def list_inferences(db: Session, evaluation_id: int) -> list[Inference]:
    """Return all inferences for a given evaluation.

    Args:
        db: Active database session.
        evaluation_id: FK filter.

    Returns:
        List of Inference rows.
    """
    return (
        db.query(Inference)
        .filter(Inference.evaluation_id == evaluation_id)
        .all()
    )


def update_audit_status(
    db: Session, inference_id: int, status: str
) -> Inference | None:
    """Set the audit status of an inference (pass / flag / unreviewed).

    Args:
        db: Active database session.
        inference_id: Primary key.
        status: New audit status.

    Returns:
        Updated Inference or None if not found.
    """
    inf = db.query(Inference).filter(Inference.inference_id == inference_id).first()
    if inf is None:
        return None
    inf.audit_status = status
    db.commit()
    db.refresh(inf)
    return inf


# ── Metrics ──────────────────────────────────────────────────────────────────


def list_metrics(db: Session, evaluation_id: int) -> list[Metric]:
    """Return all metrics for a given evaluation.

    Args:
        db: Active database session.
        evaluation_id: FK filter.

    Returns:
        List of Metric rows.
    """
    return (
        db.query(Metric)
        .filter(Metric.evaluation_id == evaluation_id)
        .all()
    )


def create_metric(
    db: Session,
    evaluation_id: int,
    name: str,
    value: dict,
    chart_type: str = "kpi_delta",
) -> Metric:
    """Insert an aggregated metric for an evaluation.

    Args:
        db: Active database session.
        evaluation_id: FK to evaluation.
        name: Metric label (e.g. "Overall Bias Delta").
        value: Dict payload that will be stored as JSON.
        chart_type: One of "kpi_delta", "radar_chart", "bar_chart".

    Returns:
        The newly created Metric.
    """
    m = Metric(
        evaluation_id=evaluation_id,
        name=name,
        value_json=json.dumps(value),
        chart_type=chart_type,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m
