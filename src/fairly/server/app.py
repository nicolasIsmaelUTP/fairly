"""FastAPI application entry point.

Registers all API routers and serves the React static build.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from fairly.server.routes_datasets import router as datasets_router
from fairly.server.routes_evaluations import router as evaluations_router
from fairly.server.routes_models import router as models_router
from fairly.server.routes_prompts import router as prompts_router
from fairly.server.routes_settings import router as settings_router

app = FastAPI(title="fairly", version="0.1.0")

# CORS — allow local React dev server during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register API routes ──────────────────────────────────────────────────────

app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
app.include_router(models_router, prefix="/api/models", tags=["models"])
app.include_router(datasets_router, prefix="/api/datasets", tags=["datasets"])
app.include_router(prompts_router, prefix="/api/prompts", tags=["prompts"])
app.include_router(evaluations_router, prefix="/api/evaluations", tags=["evaluations"])

# ── Serve thumbnail images ───────────────────────────────────────────────────

from fairly.config import THUMBNAILS_DIR

if THUMBNAILS_DIR.exists():
    app.mount("/thumbnails", StaticFiles(directory=str(THUMBNAILS_DIR)), name="thumbnails")

# ── Serve React static build ─────────────────────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback — serve index.html for all non-API, non-asset paths."""
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
