"""``/api/projects/{project_id}/pages`` router — page wire shapes (M3+).

Spec authority:
- ``specs/01-data-models.md §2`` — wire shapes for page routes.
- ``specs/02-backend.md §5.3`` — endpoint contracts.

Wire shapes are defined here per the no-DTO-layer rule. Route handlers
are stubs returning 501 until M3 OCR/page-cache plumbing lands.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..core.models import EncodedDims, LineFilter, LineMatch, PageRecord

router = APIRouter(prefix="/api/projects", tags=["pages"])


# ──────────────────────────────────────────────────────────────────────
# Wire shapes — spec §01-data-models.md §2 "Page routes"
# ──────────────────────────────────────────────────────────────────────


class PagePayload(BaseModel):
    """Full page data bundle returned by GET and POST page endpoints.

    Spec §2 lines 241-250.
    """

    record: PageRecord
    encoded: EncodedDims
    line_matches: list[LineMatch]
    paragraph_indices: list[int]
    page_text_ocr: str
    page_text_gt: str
    image_url: str
    overlay_urls: dict[str, str]
    has_edited_image: bool


class GetPageRequest(BaseModel):
    """Query parameters for ``GET /api/projects/{id}/pages/{idx}``.

    Spec §2 lines 252-255. Used as Depends() to declare query params;
    not a POST body — does not appear in the OpenAPI schema components
    directly, but ``LineFilter`` surfaces through route query params.
    """

    project_id: str
    page_index: int
    line_filter: LineFilter = LineFilter.UNVALIDATED


class SavePageRequest(BaseModel):
    """Body for ``POST /api/projects/{id}/pages/{idx}/save`` — spec §2 line 257."""

    saved_by: str = "Save Page"


class SavePageResponse(BaseModel):
    """Response for ``POST .../save`` — spec §2 lines 258-260."""

    page: PagePayload
    saved_path: Path


class SaveFailure(BaseModel):
    """One page's save failure record — spec §2 ``SaveFailure``."""

    page_index: int
    page_number: int
    reason: str


class SaveProjectResponse(BaseModel):
    """Response for ``POST /api/projects/{id}/save-all`` — spec §2 lines 262-267."""

    saved_count: int
    skipped_count: int
    failed_count: int
    total_count: int
    failures: list[SaveFailure] = []


class ReloadOCRRequest(BaseModel):
    """Body for ``POST .../reload-ocr`` — spec §2 lines 275-276."""

    use_edited_image: bool = False


class RematchGtRequest(BaseModel):
    """Body for ``POST .../rematch-gt`` — spec §2 line 278. Empty body."""


# ──────────────────────────────────────────────────────────────────────
# Stub routes — full implementations land in M3
# ──────────────────────────────────────────────────────────────────────

_NOT_IMPLEMENTED = JSONResponse(
    status_code=501,
    content={"error": "not_implemented", "message": "page routes land in M3"},
)


@router.get("/{project_id}/pages/{page_index}", response_model=PagePayload)
def get_page(
    project_id: str, page_index: int, line_filter: LineFilter = LineFilter.UNVALIDATED
) -> JSONResponse:
    """``GET /api/projects/{id}/pages/{idx}`` — stub; M3."""
    return _NOT_IMPLEMENTED


@router.post("/{project_id}/pages/{page_index}/save", response_model=SavePageResponse)
def save_page(project_id: str, page_index: int, body: SavePageRequest) -> JSONResponse:
    """``POST .../save`` — stub; M3."""
    return _NOT_IMPLEMENTED


@router.post("/{project_id}/save-all", response_model=SaveProjectResponse)
def save_project(project_id: str) -> JSONResponse:
    """``POST /api/projects/{id}/save-all`` — stub; M3."""
    return _NOT_IMPLEMENTED


@router.post("/{project_id}/pages/{page_index}/reload-ocr", response_model=PagePayload)
def reload_ocr(project_id: str, page_index: int, body: ReloadOCRRequest) -> JSONResponse:
    """``POST .../reload-ocr`` — stub; M3."""
    return _NOT_IMPLEMENTED


@router.post("/{project_id}/pages/{page_index}/rematch-gt", response_model=PagePayload)
def rematch_gt(project_id: str, page_index: int, body: RematchGtRequest) -> JSONResponse:
    """``POST .../rematch-gt`` — stub; M3."""
    return _NOT_IMPLEMENTED


def install_pages_router(app) -> None:  # type: ignore[no-untyped-def]
    """Register the pages router. Called from ``bootstrap.build_app``."""
    app.include_router(router)


__all__ = [
    "GetPageRequest",
    "PagePayload",
    "ReloadOCRRequest",
    "RematchGtRequest",
    "SaveFailure",
    "SavePageRequest",
    "SavePageResponse",
    "SaveProjectResponse",
    "install_pages_router",
    "router",
]
