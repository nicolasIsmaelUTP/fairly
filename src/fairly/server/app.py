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

# ── Serve React static build ─────────────────────────────────────────────────

STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
