"""S3 helper utilities for downloading images from AWS.

Handles downloading individual files and creating local thumbnails.
"""

from pathlib import Path

import boto3

from fairly.config import AWS_ACCESS_KEY, AWS_REGION, AWS_SECRET_ACCESS_KEY, THUMBNAILS_DIR


def get_s3_client():
    """Create and return a boto3 S3 client using configured credentials.

    Returns:
        A boto3 S3 client instance.
    """
    return boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
    )


def parse_s3_uri(uri: str) -> tuple[str, str]:
    """Split an S3 URI into bucket and key.

    Args:
        uri: Full S3 URI (e.g. "s3://my-bucket/path/to/file.jpg").

    Returns:
        Tuple of (bucket_name, object_key).
    """
    without_prefix = uri.replace("s3://", "", 1)
    bucket, _, key = without_prefix.partition("/")
    return bucket, key


def download_s3_image(s3_uri: str, local_dest: Path) -> Path:
    """Download a single image from S3 to a local path.

    Args:
        s3_uri: Full S3 URI of the image.
        local_dest: Local directory to save the file into.

    Returns:
        Path to the downloaded file.
    """
    bucket, key = parse_s3_uri(s3_uri)
    filename = Path(key).name
    dest_path = local_dest / filename
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    client = get_s3_client()
    client.download_file(bucket, key, str(dest_path))

    return dest_path
