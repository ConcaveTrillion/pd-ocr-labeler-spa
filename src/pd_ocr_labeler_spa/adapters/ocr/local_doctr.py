"""Local-DocTR OCR backend.

Spec: ``specs/02-backend.md §7`` (``local_doctr.py wraps
pd_book_tools.ocr.document.Document.from_image_ocr_via_doctr and a
predictor cache``) and ``specs/16-milestones.md`` M3.

Two seam classes:

- ``LocalDoctrOCR`` — implements ``IOCREngine``. Body still
  ``NotImplementedError`` at this slice; the SPA's primary OCR seam
  is the ``PageLoader`` protocol (which delivers a ``PageLoadOutcome``
  the page-state cache can consume directly), so the ``IOCREngine``
  surface stays unwired until either a Modal/SharedContainer backend
  lands or the route layer calls ``ocr_page`` directly. Distinct from
  ``NotImplementedYet`` (which marks "never wired in v1") — see B-46.
- ``LocalDoctrPageLoader`` — implements ``PageLoader`` from
  ``core/page_state``. ``run_ocr`` wires the predictor cache + the
  pd_book_tools entry point. ``load_labeled`` and ``load_cached``
  return ``None`` until ``core/persistence/user_page_envelope.py``
  ships (a separate M3 slice).

Legacy reference: ``pd-ocr-labeler/pd_ocr_labeler/operations/ocr/
page_operations.py:339-360`` (``_parse_page`` inside
``build_initial_page_parser``).
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from ...core.models import Project
from ...core.ocr.predictor import PredictorCache
from ...core.page_state import (
    PageImageNotFoundError,
    PageLoadOutcome,
    PageSource,
)
from .base import OCRProvenance

if TYPE_CHECKING:
    from pd_book_tools.ocr.document import Page


class LocalDoctrOCR:
    """Wrapper around DocTR; predictor-cached.

    Conformance to ``IOCREngine`` is purely structural (PEP 544); no
    explicit subclass — see ``adapters/__init__.py`` for the policy.
    (B-46.) Body intentionally unwired at M3; primary OCR seam is
    ``LocalDoctrPageLoader.run_ocr`` below.
    """

    async def ocr_page(
        self,
        image: Any,
        *,
        detection_key: str,
        recognition_key: str,
        hf_revision: str | None,
    ) -> tuple[Page, OCRProvenance]:
        raise NotImplementedError(
            "LocalDoctrOCR.ocr_page is unwired — use LocalDoctrPageLoader.run_ocr "
            "for in-process OCR runs (specs/02-backend.md §7)."
        )


@dataclass
class LocalDoctrPageLoader:
    """``PageLoader`` impl that runs DocTR via pd_book_tools.

    Constructed per OCR session — bound to one ``Project`` plus a
    chosen ``(detection_key, recognition_key, hf_revision)`` triple.
    The ``PredictorCache`` is shared across loaders / route handlers
    so successive page loads with the same models reuse the predictor.

    Slice 8b-ii contract:

    - ``run_ocr(page_index)`` is wired and returns a
      ``PageLoadOutcome(page_index, source=OCR, payload=Page)``.
    - ``load_labeled(page_index)`` and ``load_cached(page_index)``
      return ``None`` — the on-disk envelope reader
      (``core/persistence/user_page_envelope.py``) is a separate slice.
    - ``run_ocr`` raises ``PageImageNotFoundError`` if the on-disk
      image is missing, ``IndexError`` if ``page_index`` is out of
      range. OCR engine errors propagate verbatim (page-state cache
      *does not* cache the failure — next call retries).
    """

    project: Project
    predictor_cache: PredictorCache
    detection_key: str
    recognition_key: str
    hf_revision: str | None

    def load_labeled(self, page_index: int) -> PageLoadOutcome | None:
        # Slice 8b-ii deferral — wires when user_page_envelope lands.
        # See class docstring + specs/09-persistence.md lines 32-40.
        return None

    def load_cached(self, page_index: int) -> PageLoadOutcome | None:
        # Slice 8b-ii deferral — wires when user_page_envelope lands.
        return None

    def run_ocr(self, page_index: int) -> PageLoadOutcome:
        if page_index < 0 or page_index >= len(self.project.image_paths):
            raise IndexError(
                f"page_index {page_index} out of range (total_pages={len(self.project.image_paths)})"
            )
        image_path = self.project.image_paths[page_index]
        if not image_path.exists():
            raise PageImageNotFoundError(f"Page image not found on disk: {image_path}")

        predictor = self.predictor_cache.get_or_create(
            self.detection_key, self.recognition_key, self.hf_revision
        )

        # Lazy import — keeps test collection torch-free; matches the
        # pattern in core/ocr/predictor._build.
        document_module = importlib.import_module("pd_book_tools.ocr.document")
        doc = document_module.Document.from_image_ocr_via_doctr(
            image_path,
            source_identifier=image_path.name,
            predictor=predictor,
        )
        # Legacy parity (ocr_service.py:80, page_operations.py:351):
        # ``Document`` produced from a single image has exactly one
        # ``Page`` at ``pages[0]``.
        page_obj: Page = doc.pages[0]
        return PageLoadOutcome(
            page_index=page_index,
            source=PageSource.OCR,
            payload=page_obj,
        )


__all__ = [
    "LocalDoctrOCR",
    "LocalDoctrPageLoader",
]
