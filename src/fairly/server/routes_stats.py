"""API routes for dashboard statistics."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from fairly.db.database import get_db
from fairly.db.models import Dataset, Evaluation, Inference, Model

router = APIRouter()


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    """Return KPI counts and weekly evaluation activity."""
    models_count = db.query(func.count(Model.model_id)).scalar() or 0
    datasets_count = db.query(func.count(Dataset.dataset_id)).scalar() or 0
    evaluations_count = db.query(func.count(Evaluation.evaluation_id)).scalar() or 0
    inferences_count = db.query(func.count(Inference.inference_id)).scalar() or 0

    # Weekly evaluation activity (last 8 weeks)
    now = datetime.now(timezone.utc)
    activity = []
    for i in range(7, -1, -1):
        week_start = now - timedelta(weeks=i + 1)
        week_end = now - timedelta(weeks=i)
        count = (
            db.query(func.count(Evaluation.evaluation_id))
            .filter(
                Evaluation.created_at >= week_start,
                Evaluation.created_at < week_end,
            )
            .scalar()
            or 0
        )
        label = week_start.strftime("%b %d")
        activity.append({"week": label, "count": count})

    return {
        "models_connected": models_count,
        "datasets_mapped": datasets_count,
        "evaluations_run": evaluations_count,
        "total_inferences": inferences_count,
        "weekly_activity": activity,
    }
