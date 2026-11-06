"""MAISON INTELLIGENCE API — TASK-001 foundation only.

Only the ops health endpoint is defined here. Business endpoints, models and
error contracts belong to later tasks and must be implemented from
``contracts/openapi.json`` / ``docs/API_CONTRACT.md`` behind the M1 gate; they
must not be added ahead of that gate.

Run locally (see .env.example for configuration):

    python -m uvicorn app.main:app --app-dir backend --port 8000
    curl http://127.0.0.1:8000/api/v1/health
"""

from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

API_VERSION = "0.1.0"
API_V1_PREFIX = "/api/v1"
_HEALTH_PATH = f"{API_V1_PREFIX}/health"
_DEFAULT_CORS_ORIGINS = "http://127.0.0.1:3000,http://localhost:3000"
_ALLOWED_ENVIRONMENTS = frozenset({"development", "test", "production"})


class HealthResponse(BaseModel):
    """TASK-001 ops payload: exactly ``status: "ok"``, no business fields."""

    status: Literal["ok"]


def _read_environment() -> str:
    """Validate ``MAISON_ENV`` so a bad configuration fails loudly at startup."""
    value = os.environ.get("MAISON_ENV", "development").strip().lower()
    if value not in _ALLOWED_ENVIRONMENTS:
        raise RuntimeError(
            f"Invalid MAISON_ENV={value!r}: expected one of "
            f"{', '.join(sorted(_ALLOWED_ENVIRONMENTS))}. See .env.example."
        )
    return value


def _read_cors_origins() -> list[str]:
    """Validate ``MAISON_CORS_ORIGINS``; the local demo never uses a wildcard."""
    raw = os.environ.get("MAISON_CORS_ORIGINS", _DEFAULT_CORS_ORIGINS)
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    if not origins:
        raise RuntimeError(
            "Invalid MAISON_CORS_ORIGINS: expected a comma-separated origin list, "
            "e.g. http://127.0.0.1:3000. See .env.example."
        )
    if "*" in origins:
        raise RuntimeError(
            "Invalid MAISON_CORS_ORIGINS: wildcard '*' is not allowed for the local "
            "demo; list explicit origins. See .env.example."
        )
    return origins


_ENVIRONMENT = _read_environment()

app = FastAPI(
    title="MAISON INTELLIGENCE API",
    version=API_VERSION,
    description=(
        "MAISON INTELLIGENCE · Lavish Perfumes — foundation API. "
        "TASK-001 exposes the ops health endpoint only."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_read_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/v1/health", response_model=HealthResponse, tags=["ops"])
def health() -> HealthResponse:
    """Liveness probe: always ``{"status": "ok"}``; no business data is modelled."""
    return HealthResponse(status="ok")
