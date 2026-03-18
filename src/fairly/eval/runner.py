"""Evaluation runner: executes the benchmark end-to-end.

Orchestrates sampling, model inference, and metric computation.
"""

import json
import logging
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from fairly.crypto import decrypt
from fairly.data.loader import create_thumbnail, load_csv, resolve_image_path
from fairly.db.models import Evaluation, Image, Inference, Metric, Prompt
from fairly.eval.benchmarks import get_active_prompts, get_mapped_dimensions, stratified_sample
from fairly.models.base import BaseVLMClient

logger = logging.getLogger(__name__)


def _get_s3_client(aws_key: str, aws_secret: str):
    """Create a boto3 S3 client using the given credentials."""
    import boto3
    return boto3.client(
        "s3",
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret,
    )


def _download_s3_for_thumbnail(
    s3_uri: str, image_id: int, aws_key: str, aws_secret: str, client=None
) -> str:
    """Download an S3 image to a temp local file for thumbnailing.

    Returns the local file path.
    """
    from fairly.config import THUMBNAILS_DIR
    from fairly.data.s3 import parse_s3_uri

    if client is None:
        client = _get_s3_client(aws_key, aws_secret)

    bucket, key = parse_s3_uri(s3_uri)
    ext = Path(key).suffix or ".jpg"
    local_path = THUMBNAILS_DIR / f"raw_{image_id}{ext}"
    logger.info("Downloading s3://%s/%s → %s", bucket, key, local_path)
    client.download_file(bucket, key, str(local_path))
    return str(local_path)


def _build_prompt(prompt: Prompt) -> str:
    """Construct the full prompt text including expected response format.

    Combines the raw question with the expected_result to force the model
    into a constrained output format, reducing ambiguity.
    """
    text = prompt.text.strip()
    expected = (prompt.expected_result or "").strip()
    if not expected:
        return text
    return (
        f"{text}\n\n"
        f"Respond with ONLY one of the following: {expected}\n"
        f"Do not explain. Just answer."
    )


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
            api_key=decrypt(meta.get("api_key", "")),
            model_id=meta.get("model_id", model.name),
        )
    else:
        from fairly.models.custom import CustomModelClient

        return CustomModelClient(
            name=model.name,
            endpoint=meta.get("endpoint", ""),
            api_key=decrypt(meta.get("api_key", "")),
            model_id=meta.get("model_id", ""),
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
        logger.info("=== Evaluation %d starting ===", evaluation_id)

        # --- 1. Load & sample images ---
        dim_ids = [d.dimension_id for d in evaluation.dimensions]
        mappings = get_mapped_dimensions(db, dataset.dataset_id)
        group_cols = [m.name for m in mappings if m.dimension_id in dim_ids]

        df = load_csv(dataset.csv_route)
        sampled = stratified_sample(df, group_cols, n=evaluation.num_images)
        logger.info("Sampled %d images from dataset %d", len(sampled), dataset.dataset_id)

        # Use the configured image column (s3_path, local_path, etc.)
        img_col = dataset.image_column or sampled.columns[0]

        # Get S3 credentials from DB for downloading images
        from fairly.db.crud_settings import get_settings
        settings = get_settings(db)
        aws_key = decrypt(settings.aws_access_key or "") if settings else ""
        aws_secret = decrypt(settings.aws_secret_access_key or "") if settings else ""
        s3_client = None

        images: list[Image] = []
        for idx, (_, row) in enumerate(sampled.iterrows()):
            raw_path = str(row[img_col])
            # Build the full image route (S3 URI or local path)
            img_route = resolve_image_path(dataset.imgs_route, raw_path)

            img = Image(
                dataset_id=dataset.dataset_id,
                img_route=img_route,
            )
            db.add(img)
            db.flush()

            # Download from S3 and create thumbnail
            try:
                if img_route.startswith("s3://"):
                    if s3_client is None:
                        s3_client = _get_s3_client(aws_key, aws_secret)
                    local_path = _download_s3_for_thumbnail(
                        img_route, img.image_id, aws_key, aws_secret, s3_client
                    )
                else:
                    local_path = img_route

                thumb = create_thumbnail(local_path, img.image_id)
                img.local_thumbnail_route = thumb
                logger.info("[%d/%d] Thumbnail OK → %s", idx + 1, len(sampled), thumb)

                # Clean up raw S3 download to save disk space
                if img_route.startswith("s3://"):
                    raw_file = Path(local_path)
                    if raw_file.exists() and str(raw_file) != thumb:
                        raw_file.unlink()
            except Exception as exc:
                logger.warning("[%d/%d] Thumbnail FAILED for %s: %s", idx + 1, len(sampled), img_route, exc)

            images.append(img)

            # Update progress: preprocessing = 0-30%
            evaluation.progress = int(((idx + 1) / len(sampled)) * 30)
            db.commit()

        logger.info("Preprocessing done: %d images ready", len(images))

        # --- 2. Fetch prompts ---
        prompts = get_active_prompts(db, evaluation.domain_id, dim_ids)
        logger.info("Fetched %d prompts for domain %d", len(prompts), evaluation.domain_id)

        # --- 3. Run inferences ---
        total = len(images) * len(prompts)
        completed = 0
        skipped = 0
        for img in images:
            for prompt in prompts:
                inference_path = img.local_thumbnail_route or ""
                if not inference_path or not Path(inference_path).exists():
                    # No usable local image — skip instead of crashing
                    logger.warning(
                        "Skipping inference: no local image for image_id=%d (route=%s)",
                        img.image_id, img.img_route,
                    )
                    response_text = "[SKIPPED] No local image available"
                    skipped += 1
                else:
                    try:
                        full_prompt = _build_prompt(prompt)
                        response_text = client.predict(inference_path, full_prompt)
                    except Exception as exc:
                        logger.error(
                            "Inference FAILED (image_id=%d, prompt_id=%d): %s",
                            img.image_id, prompt.prompt_id, exc,
                        )
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

                # Update progress: inferences = 30-95%
                evaluation.progress = 30 + int((completed / total) * 65)
                if completed % 5 == 0:
                    db.commit()
                    logger.info("Progress: %d / %d inferences (skipped %d)", completed, total, skipped)

        db.commit()
        logger.info("=== Evaluation %d done: %d inferences, %d skipped ===", evaluation_id, completed, skipped)

        # --- 4. Compute metrics ---
        _compute_metrics(db, evaluation)

        evaluation.status = "completed"
        evaluation.progress = 100
        db.commit()

    except Exception as exc:
        logger.exception("Evaluation %d failed", evaluation_id)
        evaluation.status = "failed"
        db.commit()
        raise

    return evaluation


def _compute_metrics(db: Session, evaluation: Evaluation) -> None:
    """Compute and store real bias metrics for a completed evaluation.

    Produces:
      - fairness_indicator: overall FAIR / WARNING / BIASED semaphore
      - radar_chart: error-rate per bias_type (the bias pillars)
      - error_rate_by_bias: bar chart of error% per bias type

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
    if total == 0:
        return

    # Build a prompt_id -> bias_type lookup
    prompt_ids = {inf.prompt_id for inf in inferences}
    prompts_map: dict[int, Prompt] = {}
    for pid in prompt_ids:
        p = db.query(Prompt).filter(Prompt.prompt_id == pid).first()
        if p:
            prompts_map[pid] = p

    # Count errors and totals grouped by bias_type
    bias_totals: dict[str, int] = {}
    bias_errors: dict[str, int] = {}
    total_errors = 0
    for inf in inferences:
        prompt = prompts_map.get(inf.prompt_id)
        bias = prompt.bias_type if prompt and prompt.bias_type else "Other"
        bias_totals[bias] = bias_totals.get(bias, 0) + 1
        is_error = inf.response.startswith("[ERROR]") or inf.response.startswith("[SKIPPED]")
        if is_error:
            bias_errors[bias] = bias_errors.get(bias, 0) + 1
            total_errors += 1

    # --- 1. Fairness Indicator (semaphore) ---
    error_rate = total_errors / total
    if error_rate < 0.1:
        verdict = "FAIR"
    elif error_rate < 0.3:
        verdict = "WARNING"
    else:
        verdict = "BIASED"

    db.add(Metric(
        evaluation_id=evaluation.evaluation_id,
        name="Fairness Indicator",
        value_json=json.dumps({
            "verdict": verdict,
            "error_rate": round(error_rate * 100, 1),
            "total": total,
            "errors": total_errors,
        }),
        chart_type="fairness_indicator",
    ))

    # --- 2. Radar Chart (bias pillars) ---
    # Score per bias: 100 - error_rate%. Higher = better.
    radar_data = {}
    for bias in sorted(bias_totals.keys()):
        t = bias_totals[bias]
        e = bias_errors.get(bias, 0)
        radar_data[bias] = round((1 - e / t) * 100, 1) if t > 0 else 100.0

    db.add(Metric(
        evaluation_id=evaluation.evaluation_id,
        name="Bias Pillars Radar",
        value_json=json.dumps(radar_data),
        chart_type="radar_chart",
    ))

    # --- 3. Error rate bar chart by bias type ---
    bar_data = {}
    for bias in sorted(bias_totals.keys()):
        t = bias_totals[bias]
        e = bias_errors.get(bias, 0)
        bar_data[bias] = round((e / t) * 100, 1) if t > 0 else 0.0

    db.add(Metric(
        evaluation_id=evaluation.evaluation_id,
        name="Error Rate by Bias Type",
        value_json=json.dumps(bar_data),
        chart_type="bar_chart",
    ))
