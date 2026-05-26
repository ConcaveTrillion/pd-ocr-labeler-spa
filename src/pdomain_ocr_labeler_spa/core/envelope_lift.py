"""Shared envelope->Page lifting logic.

Duplicated in api/pages.py and api/words.py before this module.
Centralised here so both callers get consistent behaviour and the
double-nested-envelope handling lives in one place.

Returns either the lifted Page object or an EnvelopeLiftError dataclass.
Callers use isinstance() on the result -- no exception handling needed.
"""

from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass

from .persistence.user_page_envelope import USER_PAGE_SCHEMA_NAME as _SCHEMA_NAME

log = logging.getLogger(__name__)


@dataclass
class EnvelopeLiftError:
    """Returned (not raised) when envelope->Page lift fails.

    Callers check ``isinstance(result, EnvelopeLiftError)`` and map to
    their appropriate error response (500 in mutations, log.warning + empty
    line_matches in reads).
    """

    message: str
    cause: BaseException


def lift_envelope_to_page(payload: object) -> object | EnvelopeLiftError:
    """Lift a payload to a Page object.

    Handles three cases:
    - Plain Page (OCR lane): returned unchanged -- no ``.payload`` attribute.
    - Single-nested UserPageEnvelope (cached/labeled lane): lifts via
      ``Page.from_dict(envelope.payload.page)``.
    - Double-nested UserPageEnvelope (legacy labeled-lane saves): unwraps
      one extra level before calling ``Page.from_dict``.

    Returns the original ``payload`` if it doesn't look like an envelope
    (no ``.payload.page`` dict).  Returns ``EnvelopeLiftError`` when
    ``Page.from_dict`` raises -- never raises itself.

    Returns: the original payload (unchanged), a lifted Page object, or
    EnvelopeLiftError on failure.
    """
    if payload is None:
        # None is a valid payload ("no page yet"); object return type doesn't include None
        return payload  # type: ignore[return-value]

    envelope_inner = getattr(payload, "payload", None)
    if envelope_inner is None:
        # No .payload -- already a Page or unknown; return as-is.
        return payload

    page_dict = getattr(envelope_inner, "page", None)
    if not isinstance(page_dict, dict):
        # Has .payload but .payload.page isn't a dict -- not an envelope we know.
        return payload

    # Double-nested envelope detection: legacy labeled-lane files store
    # payload.page as another full UserPageEnvelope dict.
    schema = page_dict.get("schema")
    if isinstance(schema, dict) and schema.get("name") == _SCHEMA_NAME:
        log.warning("lift_envelope_to_page: double-nested envelope detected -- unwrapping")
        page_dict = page_dict.get("payload", {}).get("page")

    if not isinstance(page_dict, dict):
        return EnvelopeLiftError(
            message=f"envelope.payload.page is not a dict after unwrap (got {type(page_dict).__name__})",
            cause=TypeError(f"expected dict, got {type(page_dict).__name__}"),
        )

    try:
        _page_mod = importlib.import_module("pdomain_book_tools.ocr.page")
        return _page_mod.Page.from_dict(page_dict)
    except Exception as exc:
        return EnvelopeLiftError(
            message=f"Page.from_dict failed: {exc}",
            cause=exc,
        )
