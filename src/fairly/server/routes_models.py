"""API routes for VLM model management."""

import json

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from fairly.crypto import decrypt, encrypt
from fairly.db.crud_models import create_model, delete_model, get_model, list_models, update_model
from fairly.db.database import get_db

router = APIRouter()


class ModelOut(BaseModel):
    """Response schema for a model."""

    model_id: int
    name: str
    source: str
    metadata_json: str

    model_config = {"from_attributes": True}


class ModelCreate(BaseModel):
    """Request schema for creating a model."""

    name: str
    source: str = "custom"
    metadata_json: str = "{}"


class ModelUpdate(BaseModel):
    """Request schema for updating a model's metadata."""

    metadata_json: str


class TestConnectionRequest(BaseModel):
    """Request schema for testing a model connection."""

    endpoint: str
    api_key: str
    model_id: str = ""


def _encrypt_metadata_api_key(metadata_json: str) -> str:
    """Encrypt the api_key field inside a metadata JSON blob."""
    meta = json.loads(metadata_json)
    if "api_key" in meta and meta["api_key"]:
        meta["api_key"] = encrypt(meta["api_key"])
    return json.dumps(meta)


def _extract_text(data: dict) -> str:
    """Extract text from either Chat Completions or Responses API output."""
    # Chat Completions: choices[0].message.content
    choices = data.get("choices") or []
    if choices:
        msg = choices[0].get("message", {})
        content = msg.get("content") or ""
        if isinstance(content, list):
            return " ".join(p.get("text", "") for p in content if isinstance(p, dict))
        if content:
            return content
    # Responses API: output[].content[].text where type == "output_text"
    for item in data.get("output", []):
        for part in item.get("content", []) if isinstance(item.get("content"), list) else []:
            if isinstance(part, dict) and part.get("type") == "output_text":
                text = part.get("text", "")
                if text:
                    return text
    # Convenience field some SDKs provide
    if data.get("output_text"):
        return data["output_text"]
    return ""


@router.get("", response_model=list[ModelOut])
def read_models(db: Session = Depends(get_db)):
    """List all registered models."""
    return list_models(db)


@router.get("/{model_id}", response_model=ModelOut)
def read_model(model_id: int, db: Session = Depends(get_db)):
    """Get a single model by ID."""
    row = get_model(db, model_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return row


@router.post("", response_model=ModelOut, status_code=201)
def add_model(body: ModelCreate, db: Session = Depends(get_db)):
    """Register a new model. API keys in metadata are encrypted."""
    safe_meta = _encrypt_metadata_api_key(body.metadata_json)
    return create_model(db, name=body.name, source=body.source, metadata_json=safe_meta)


@router.patch("/{model_id}", response_model=ModelOut)
def patch_model(model_id: int, body: ModelUpdate, db: Session = Depends(get_db)):
    """Update a model's metadata."""
    row = update_model(db, model_id, body.metadata_json)
    if row is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return row


@router.delete("/{model_id}")
def remove_model(model_id: int, db: Session = Depends(get_db)):
    """Delete a model by ID."""
    if not delete_model(db, model_id):
        raise HTTPException(status_code=404, detail="Model not found")
    return {"ok": True}


@router.post("/test-connection")
def test_connection(body: TestConnectionRequest):
    """Send a quick test message to verify the endpoint works."""
    is_responses = "/responses" in body.endpoint and "/chat/completions" not in body.endpoint

    if is_responses:
        # OpenAI Responses API format
        payload: dict = {
            "input": "Hello, respond as if you were a duck. Keep it under 2 sentences.",
            "max_output_tokens": 2048,
        }
    else:
        # Chat Completions API format (vLLM, Ollama, LM Studio, Featherless, etc.)
        payload = {
            "messages": [
                {"role": "user", "content": "Hello, respond as if you were a duck. Keep it under 2 sentences."}
            ],
            "max_completion_tokens": 128,
        }
    if body.model_id:
        payload["model"] = body.model_id
    try:
        resp = httpx.post(
            body.endpoint,
            json=payload,
            headers={"Authorization": f"Bearer {body.api_key}"},
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        answer = _extract_text(data)
        return {"ok": True, "response": answer or "(model returned empty response)"}
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Model returned {exc.response.status_code}: {exc.response.text[:300]}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:300])
