"""Unit tests for core.envelope_lift.lift_envelope_to_page."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, ClassVar

from pd_ocr_labeler_spa.core.envelope_lift import EnvelopeLiftError, lift_envelope_to_page


class _FakePage:
    """Minimal stand-in for pd_book_tools.ocr.page.Page."""

    lines: ClassVar[list] = []


@dataclass
class _FakeEnvelopePayload:
    page: Any


@dataclass
class _FakeEnvelope:
    payload: _FakeEnvelopePayload


def test_plain_object_passthrough():
    """An object with no .payload attribute is returned unchanged."""
    page = _FakePage()
    result = lift_envelope_to_page(page)
    assert result is page


def test_none_passthrough():
    """None is returned unchanged."""
    assert lift_envelope_to_page(None) is None


def test_envelope_lift_success(monkeypatch):
    """A well-formed UserPageEnvelope lifts to the Page.from_dict result."""
    import sys
    import types

    fake_page = _FakePage()
    fake_page_mod = types.ModuleType("pd_book_tools.ocr.page")
    fake_page_mod.Page = type("Page", (), {"from_dict": staticmethod(lambda d: fake_page)})  # type: ignore
    monkeypatch.setitem(sys.modules, "pd_book_tools.ocr.page", fake_page_mod)

    envelope = _FakeEnvelope(payload=_FakeEnvelopePayload(page={"items": []}))
    result = lift_envelope_to_page(envelope)
    assert result is fake_page


def test_envelope_lift_returns_error_on_from_dict_failure(monkeypatch):
    """When Page.from_dict raises, returns EnvelopeLiftError (not raises)."""
    import sys
    import types

    def _raise(d):
        raise KeyError("items")

    fake_page_mod = types.ModuleType("pd_book_tools.ocr.page")
    fake_page_mod.Page = type("Page", (), {"from_dict": staticmethod(_raise)})  # type: ignore
    monkeypatch.setitem(sys.modules, "pd_book_tools.ocr.page", fake_page_mod)

    envelope = _FakeEnvelope(payload=_FakeEnvelopePayload(page={"bad": "schema"}))
    result = lift_envelope_to_page(envelope)
    assert isinstance(result, EnvelopeLiftError)
    assert "items" in result.message or "KeyError" in result.message or "from_dict" in result.message


def test_envelope_with_non_dict_page_passthrough():
    """When envelope.payload.page is not a dict, returns original envelope unchanged."""

    class BadPayload:
        page = "not-a-dict"

    class BadEnvelope:
        payload = BadPayload()

    env = BadEnvelope()
    result = lift_envelope_to_page(env)
    assert result is env


def test_double_nested_envelope_unwrap(monkeypatch):
    """Double-nested envelope (legacy labeled-lane): unwraps two levels."""
    import sys
    import types

    from pd_ocr_labeler_spa.core.persistence.user_page_envelope import USER_PAGE_SCHEMA_NAME

    fake_page = _FakePage()
    fake_page_mod = types.ModuleType("pd_book_tools.ocr.page")
    fake_page_mod.Page = type("Page", (), {"from_dict": staticmethod(lambda d: fake_page)})  # type: ignore
    monkeypatch.setitem(sys.modules, "pd_book_tools.ocr.page", fake_page_mod)

    inner_page_dict = {"items": []}
    outer_page_dict = {
        "schema": {"name": USER_PAGE_SCHEMA_NAME},
        "payload": {"page": inner_page_dict},
    }
    envelope = _FakeEnvelope(payload=_FakeEnvelopePayload(page=outer_page_dict))
    result = lift_envelope_to_page(envelope)
    assert result is fake_page
