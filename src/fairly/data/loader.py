"""Dataset loader utilities.

Supports reading CSV metadata and downloading images from local paths or S3.
"""

from pathlib import Path

import pandas as pd

from fairly.config import THUMBNAILS_DIR


def load_csv(csv_path: str) -> pd.DataFrame:
    """Read a CSV file into a pandas DataFrame.

    Args:
        csv_path: Local path or S3 URI to the CSV.

    Returns:
        DataFrame with the CSV contents.
    """
    return pd.read_csv(csv_path)


def get_csv_headers(csv_path: str) -> list[str]:
    """Return the column headers of a CSV without loading all rows.

    Args:
        csv_path: Path to the CSV file.

    Returns:
        List of column name strings.
    """
    df = pd.read_csv(csv_path, nrows=0)
    return list(df.columns)


def resolve_image_path(base_route: str, relative_path: str) -> str:
    """Build the full image path from a base route and relative path.

    Args:
        base_route: The dataset's imgs_route (local dir or S3 prefix).
        relative_path: Image path from the CSV row.

    Returns:
        Full resolved path string.
    """
    # If the relative path is already an absolute S3 URI, return as-is
    if relative_path.startswith("s3://"):
        return relative_path
    if base_route.startswith("s3://"):
        # For S3, concatenate the prefix and relative path
        return f"{base_route.rstrip('/')}/{relative_path.lstrip('/')}"
    return str(Path(base_route) / relative_path)


def create_thumbnail(source_path: str, image_id: int) -> str:
    """Create a small local thumbnail for fast UI rendering.

    Args:
        source_path: Path to the original image.
        image_id: Unique ID used for the thumbnail filename.

    Returns:
        Local path to the saved thumbnail.
    """
    from PIL import Image

    thumb_path = THUMBNAILS_DIR / f"{image_id}.jpg"

    img = Image.open(source_path)
    img.thumbnail((512, 512))
    img.save(str(thumb_path), "JPEG", quality=85)

    return str(thumb_path)


def get_csv_preview(csv_path: str, nrows: int = 5) -> dict:
    """Return column headers and first N rows of a CSV.

    Args:
        csv_path: Path to the CSV file.
        nrows: Number of rows to return.

    Returns:
        Dict with headers, rows, total_rows, total_columns.
    """
    df = pd.read_csv(csv_path, nrows=nrows)
    with open(csv_path, encoding="utf-8") as f:
        total_rows = sum(1 for _ in f) - 1
    return {
        "headers": list(df.columns),
        "rows": df.fillna("").to_dict(orient="records"),
        "total_rows": total_rows,
        "total_columns": len(df.columns),
    }
