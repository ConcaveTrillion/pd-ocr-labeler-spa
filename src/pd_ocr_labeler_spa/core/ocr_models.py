"""OCR config DTOs — ``specs/01-data-models.md`` lines 377-400.

These shapes are M3 prerequisites. The M3 router
(``api/ocr_config.py`` — `GET /api/ocr-config`,
`POST /api/ocr-config/models`, `POST /api/ocr-config/rescan`) reads
and writes them; the legacy provenance/model-selection logic in
``pd_ocr_labeler/operations/model_selection_operations.py`` is the
behavioral source.

Carved into a separate module from ``core/models.py`` (where
``Project`` lives) because OCR config is a distinct concern: it
travels independently of any project, gets exercised on app startup
(model rescan) and on user "tune" actions, and will gain quite a bit
more surface in M3+ (provenance, predictor cache shape, etc.).
``core/models.py`` is for *project-scoped* domain shapes.

Generated TS via ``make openapi-export`` keys on field name + position
— append-only, never reorder.

Validation — top-level envelopes, so ``extra="forbid"`` per
``specs/01-data-models.md`` line 15. (Per workspace memory
``project_d003_extras_tolerance.md``, the extras-tolerance carve-out
is ``session_state.json``-specific and does not apply here.)
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class OCRModelOption(BaseModel):
    """One detection or recognition model entry — spec lines 377-383.

    ``key`` is the opaque identifier the frontend round-trips on
    ``POST /api/ocr-config/models``: ``"stock"`` for the bundled
    DocTR weights, ``"hf:<name>"`` for HuggingFace-hosted weights
    (with ``revision`` carrying the pinned commit), ``"local:<path>"``
    for a local weights file. ``label`` is the user-visible string;
    ``source`` is the discriminant the picker UI uses for the badge
    color.
    """

    model_config = ConfigDict(extra="forbid")

    key: str
    label: str
    source: Literal["stock", "huggingface", "local"]
    revision: str | None = None
    is_default: bool = False
    weights_id: str | None = None


class GetOCRConfigResponse(BaseModel):
    """OCR config snapshot — spec lines 385-396.

    Returned from ``GET /api/ocr-config`` and from both POST
    endpoints (so the frontend always sees the post-mutation state).
    ``selection_reason`` is the explanation string the OCRConfigModal
    shows under the selected pair — pinning the literal set lets the
    frontend exhaustively switch on it for tooltip text.
    """

    model_config = ConfigDict(extra="forbid")

    detection_options: list[OCRModelOption]
    recognition_options: list[OCRModelOption]
    selected_detection: str
    selected_recognition: str
    hf_pinned_revision: str | None
    selection_reason: Literal[
        "hf-latest",
        "hf-only",
        "local-newer-than-hf",
        "local-only-hf-unreachable",
        "hf-unreachable-no-local",
        "stock-fallback",
    ]


class SetOCRModelsRequest(BaseModel):
    """Body of ``POST /api/ocr-config/models`` — spec lines 397-400."""

    model_config = ConfigDict(extra="forbid")

    detection_key: str
    recognition_key: str
    hf_pinned_revision: str | None = None


__all__ = [
    "GetOCRConfigResponse",
    "OCRModelOption",
    "SetOCRModelsRequest",
]
