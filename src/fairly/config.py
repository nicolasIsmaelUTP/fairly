"""Global configuration for the fairly package.

Handles paths, environment variables and default settings.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the current working directory (if present)
load_dotenv()

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# The .fairly/ directory lives in the user's current working directory
FAIRLY_DIR = Path(os.getcwd()) / ".fairly"
FAIRLY_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = FAIRLY_DIR / "fairly.db"
THUMBNAILS_DIR = FAIRLY_DIR / "thumbnails"
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Environment-based defaults
# ---------------------------------------------------------------------------

FEATHERLESS_API_KEY: str = os.getenv("FEATHERLESS_API_KEY", "")
AWS_ACCESS_KEY: str = os.getenv("AWS_ACCESS_KEY", "")
AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
