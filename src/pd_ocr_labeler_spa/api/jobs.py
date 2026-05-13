"""``/api/jobs`` router (M3+).

Spec authority:
- ``specs/01-data-models.md §2`` — ``Job``, ``JobStatus``, ``JobType``,
  ``JobProgress`` shapes. Mirrors pgdp-prep ``core/models.py``.
- ``specs/02-backend.md §5.9`` — endpoint contracts.

Route handlers are stubs returning 501 until M3 job-runner plumbing lands.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..core.models import Job

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# ──────────────────────────────────────────────────────────────────────
# Stub routes — domain models (Job, JobStatus, JobType, JobProgress)
# live in core/models.py per the no-DTO-layer rule (they are shared
# with the storage adapter and the job runner).
# ──────────────────────────────────────────────────────────────────────


@router.get("", response_model=list[Job])
def list_jobs() -> JSONResponse:
    """``GET /api/jobs`` — stub; M3."""
    return JSONResponse(
        status_code=501,
        content={"error": "not_implemented", "message": "job routes land in M3"},
    )


@router.get("/{job_id}", response_model=Job)
def get_job(job_id: str) -> JSONResponse:
    """``GET /api/jobs/{job_id}`` — stub; M3."""
    return JSONResponse(
        status_code=501,
        content={"error": "not_implemented", "message": "job routes land in M3"},
    )


def install_jobs_router(app) -> None:  # type: ignore[no-untyped-def]
    """Register the jobs router. Called from ``bootstrap.build_app``."""
    app.include_router(router)


__all__ = [
    "install_jobs_router",
    "router",
]
