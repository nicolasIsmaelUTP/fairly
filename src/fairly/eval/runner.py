"""Evaluation runner: executes the benchmark end-to-end.

Orchestrates sampling, model inference, and metric computation.
"""

import json
import logging

import pandas as pd
from sqlalchemy.orm import Session

from fairly.data.loader import create_thumbnail, load_csv, resolve_image_path
from fairly.db.models import Evaluation, Image, Inference, Metric
from fairly.eval.benchmarks import get_active_prompts, get_mapped_dimensions, stratified_sample
from fairly.models.base import BaseVLMClient

logger = logging.getLogger(__name__)


def _build_model_client(evaluation: Evaluation) -> BaseVLMClient:
    """Instantiate the right VLM client based on the model's source.

    Args:
        evaluation: The current evaluation (with model relationship loaded).

    Returns:
        A concrete BaseVLMClient subclass instance.
    """
    model = evaluation.model
    meta = json.loads(model.metadata_json or "{}")

    if model.source == "featherless":
        from fairly.models.featherless import FeatherlessClient

        return FeatherlessClient(
            name=model.name,
            api_key=meta.get("api_key", ""),
            model_id=meta.get("model_id", model.name),
        )
    else:
        from fairly.models.custom import CustomModelClient

        return CustomModelClient(
            name=model.name,
            endpoint=meta.get("endpoint", ""),
            api_key=meta.get("api_key", ""),
        )


def run_evaluation(db: Session, evaluation_id: int) -> Evaluation:
    """Execute a full benchmark run.

    Steps:
        1. Load CSV and stratified-sample images.
        2. Fetch matching prompts.
        3. For each image × prompt pair, call the model.
        4. Compute and store aggregated metrics.

    Args:
        db: Active database session.
        evaluation_id: PK of the evaluation to run.

    Returns:
        The updated Evaluation with status "completed" or "failed".
    """
    evaluation = (
        db.query(Evaluation)
        .filter(Evaluation.evaluation_id == evaluation_id)
        .first()
    )
    if evaluation is None:
        raise ValueError(f"Evaluation {evaluation_id} not found")

    evaluation.status = "running"
    db.commit()

    try:
        client = _build_model_client(evaluation)
        dataset = evaluation.dataset

        # --- 1. Load & sample images ---
        dim_ids = [d.dimension_id for d in evaluation.dimensions]
        mappings = get_mapped_dimensions(db, dataset.dataset_id)
        group_cols = [m.name for m in mappings if m.dimension_id in dim_ids]

        df = load_csv(dataset.csv_route)
        sampled = stratified_sample(df, group_cols, n=evaluation.num_images)

        # Pick the column that holds the image path (first column by default)
        img_col = sampled.columns[0]

        images: list[Image] = []
        for _, row in sampled.iterrows():
            img_route = resolve_image_path(dataset.imgs_route, str(row[img_col]))
            img = Image(
                dataset_id=dataset.dataset_id,
                img_route=img_route,
            )
            db.add(img)
            db.flush()

            # Create thumbnail for fast UI rendering
            try:
                thumb = create_thumbnail(img_route, img.image_id)
                img.local_thumbnail_route = thumb
            except Exception:
                logger.warning("Could not create thumbnail for %s", img_route)

            images.append(img)

        # --- 2. Fetch prompts ---
        prompts = get_active_prompts(db, evaluation.domain_id, dim_ids)

        # --- 3. Run inferences ---
        total = len(images) * len(prompts)
        completed = 0
        for img in images:
            for prompt in prompts:
                try:
                    response_text = client.predict(img.img_route, prompt.text)
                except Exception as exc:
                    logger.error("Inference failed: %s", exc)
                    response_text = f"[ERROR] {exc}"

                inf = Inference(
                    image_id=img.image_id,
                    prompt_id=prompt.prompt_id,
                    evaluation_id=evaluation.evaluation_id,
                    response=response_text,
                    audit_status="unreviewed",
                )
                db.add(inf)
                completed += 1
                if completed % 10 == 0:
                    logger.info("Progress: %d / %d inferences", completed, total)

        # --- 4. Compute placeholder metrics ---
        _compute_metrics(db, evaluation)

        evaluation.status = "completed"
        db.commit()

    except Exception as exc:
        logger.exception("Evaluation %d failed", evaluation_id)
        evaluation.status = "failed"
        db.commit()
        raise

    return evaluation


def _compute_metrics(db: Session, evaluation: Evaluation) -> None:
    """Compute and store aggregated metrics for a completed evaluation.

    For the MVP, this generates placeholder summary metrics.
    A future version will run real statistical bias tests.

    Args:
        db: Active database session.
        evaluation: The evaluation to compute metrics for.
    """
    inferences = (
        db.query(Inference)
        .filter(Inference.evaluation_id == evaluation.evaluation_id)
        .all()
    )

    total = len(inferences)
    flagged = sum(1 for i in inferences if i.audit_status == "flag")
    delta = round((flagged / total * 100) if total > 0 else 0, 2)

    # KPI metric
    kpi = Metric(
        evaluation_id=evaluation.evaluation_id,
        name="Overall Bias Delta",
        value_json=json.dumps({"delta_percent": delta, "total": total, "flagged": flagged}),
        chart_type="kpi_delta",
    )
    db.add(kpi)

    # Placeholder bar chart data per dimension
    dim_names = [d.dimension.name for d in evaluation.dimensions]
    bar_data = {name: round(delta + (i * 1.5), 2) for i, name in enumerate(dim_names)}
    bar = Metric(
        evaluation_id=evaluation.evaluation_id,
        name="Bias by Dimension",
        value_json=json.dumps(bar_data),
        chart_type="bar_chart",
    )
    db.add(bar)
