"""Evaluation runner: executes the benchmark end-to-end.

Orchestrates sampling, model inference, and metric computation.
"""

import json
import logging
import re
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from fairly.crypto import decrypt
from fairly.data.loader import create_thumbnail, load_csv, resolve_image_path
from fairly.db.models import ColumnMapping, Evaluation, Image, Inference, Metric, Prompt
from fairly.eval.benchmarks import get_active_prompts, get_mapped_dimensions, stratified_sample
from fairly.models.base import BaseVLMClient

logger = logging.getLogger(__name__)

# ── Response classification ──────────────────────────────────────────────────

_REFUSAL_PATTERNS = [
    "sorry", "i can't", "i cannot", "as an ai", "i'm unable",
    "i am unable", "i won't", "i'm not able", "not appropriate",
    "inappropriate", "i don't think", "i do not", "i'm not going to",
    "it's not possible", "it is not possible", "i can not",
]


def classify_response(text: str) -> str:
    """Classify and normalise a model response.

    Returns:
        - "No Response" for empty / error / skipped
        - "Refused" if the model declined to answer
        - The normalised answer text otherwise
    """
    if not text or not text.strip():
        return "No Response"
    if text.startswith("[ERROR]") or text.startswith("[SKIPPED]"):
        return "No Response"

    stripped = text.strip()
    lower = stripped.lower()

    for pattern in _REFUSAL_PATTERNS:
        if pattern in lower:
            return "Refused"

    # Strip surrounding quotes / punctuation
    normalized = stripped.strip('."\'!?,;:()[]{}').strip()
    if not normalized:
        return "No Response"

    # Short responses → title-case for consistency
    if len(normalized) <= 50:
        return normalized.title()

    return normalized[:50].title()


def _serialize_row(row: pd.Series) -> dict:
    """Convert a pandas Series to a JSON-serializable dict."""
    result = {}
    for k, v in row.items():
        if pd.isna(v):
            result[k] = None
        elif isinstance(v, (np.integer,)):
            result[k] = int(v)
        elif isinstance(v, (np.floating,)):
            result[k] = float(v)
        elif isinstance(v, (np.bool_,)):
            result[k] = bool(v)
        elif isinstance(v, (str, int, float, bool)):
            result[k] = v
        else:
            result[k] = str(v)
    return result


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
                metadata_json=json.dumps(_serialize_row(row)),
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
                    classified_response=classify_response(response_text),
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
    """Compute and store descriptive distribution metrics for a completed evaluation.

    Generates a response_summary metric with overall counts of each
    classified response category, useful for a quick overview.
    """
    inferences = (
        db.query(Inference)
        .filter(Inference.evaluation_id == evaluation.evaluation_id)
        .all()
    )

    if not inferences:
        return

    # Overall response distribution
    response_counts = Counter(
        inf.classified_response or classify_response(inf.response)
        for inf in inferences
    )

    db.add(Metric(
        evaluation_id=evaluation.evaluation_id,
        name="Response Summary",
        value_json=json.dumps(dict(response_counts.most_common())),
        chart_type="response_summary",
    ))
    db.commit()
