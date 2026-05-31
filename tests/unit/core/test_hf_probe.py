"""Pin the pure HF last-modified probe (slice 8c-iii-b).

Source of truth: legacy
``pd_ocr_labeler/operations/ocr/model_selection_operations.py`` —
``ModelSelectionOperations.fetch_hf_last_modified`` (lines 169-205).

Slice 8c-iii-b lands ONLY the network-side probe as a pure function
returning ``datetime | None``. Wiring this into
``api/ocr_config._build_snapshot`` (so a real ``selection_reason``
replaces the iter-10 hardcoded ``stock-fallback``) is slice 8c-iii-c.

Behaviour pins:
  * ``huggingface_hub`` not installed → ``None`` (no raise).
  * Any exception from ``HfApi().model_info`` → ``None`` (no raise).
  * ``model_info`` returns object without ``last_modified`` → ``None``.
  * ``last_modified`` is a naive ``datetime`` → tz-aware UTC.
  * ``last_modified`` is a tz-aware ``datetime`` → returned as-is.
  * ``revision`` and ``timeout`` kwargs forwarded to ``model_info``.
  * Default repo is ``pdomain/pdomain-ocr-models`` (legacy
    ``HF_DEFAULT_REPO``); default timeout is 5.0 seconds.
"""

from __future__ import annotations

import builtins
import sys
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest

from pdomain_ocr_labeler_spa.core.hf_probe import (
    HF_DEFAULT_REPO,
    fetch_hf_last_modified,
)


def _install_fake_hfapi(
    monkeypatch,
    *,
    info: Any | None = None,
    raise_on_call: BaseException | None = None,
) -> dict[str, Any]:
    """Inject a fake ``huggingface_hub.HfApi`` into ``sys.modules``.

    Returns a captured-call dict the test can introspect.
    """
    captured: dict[str, Any] = {"args": None, "kwargs": None, "instances": 0}

    class _FakeApi:
        def __init__(self):
            captured["instances"] += 1

        def model_info(self, *args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs
            if raise_on_call is not None:
                raise raise_on_call
            return info

    fake_module = SimpleNamespace(HfApi=_FakeApi)
    monkeypatch.setitem(sys.modules, "huggingface_hub", fake_module)
    return captured


def test_default_repo_constant_matches_legacy():
    # Legacy `HF_DEFAULT_REPO` is the source of truth; if upstream
    # republishes, the spa must follow in lockstep.
    assert HF_DEFAULT_REPO == "pdomain/pdomain-ocr-models"


def test_returns_none_when_huggingface_hub_missing(monkeypatch):
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "huggingface_hub":
            raise ImportError("not installed")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    # In case a prior test left it cached:
    monkeypatch.delitem(sys.modules, "huggingface_hub", raising=False)
    assert fetch_hf_last_modified() is None


def test_returns_none_on_network_error(monkeypatch):
    _install_fake_hfapi(monkeypatch, raise_on_call=OSError("offline"))
    assert fetch_hf_last_modified() is None


def test_returns_none_on_arbitrary_exception(monkeypatch):
    # Probe must "log but never raise" — any exception type is swallowed.
    _install_fake_hfapi(monkeypatch, raise_on_call=RuntimeError("hub 500"))
    assert fetch_hf_last_modified() is None


def test_returns_none_when_last_modified_attr_absent(monkeypatch):
    info = SimpleNamespace()  # no `last_modified` attribute at all
    _install_fake_hfapi(monkeypatch, info=info)
    assert fetch_hf_last_modified() is None


def test_returns_none_when_last_modified_is_none(monkeypatch):
    info = SimpleNamespace(last_modified=None)
    _install_fake_hfapi(monkeypatch, info=info)
    assert fetch_hf_last_modified() is None


def test_naive_datetime_is_assumed_utc(monkeypatch):
    naive = datetime(2026, 1, 15, 12, 30, 0)  # no tzinfo
    info = SimpleNamespace(last_modified=naive)
    _install_fake_hfapi(monkeypatch, info=info)

    result = fetch_hf_last_modified()

    assert result is not None
    assert result.tzinfo is not None
    # Same wall-clock components, just stamped UTC:
    assert result == naive.replace(tzinfo=UTC)


def test_tz_aware_datetime_passes_through(monkeypatch):
    aware = datetime(2026, 1, 15, 12, 30, 0, tzinfo=UTC)
    info = SimpleNamespace(last_modified=aware)
    _install_fake_hfapi(monkeypatch, info=info)

    assert fetch_hf_last_modified() == aware


def test_forwards_revision_and_timeout(monkeypatch):
    info = SimpleNamespace(last_modified=datetime(2026, 1, 1, tzinfo=UTC))
    captured = _install_fake_hfapi(monkeypatch, info=info)

    fetch_hf_last_modified(revision="abc123", timeout=2.5)

    assert captured["args"] == (HF_DEFAULT_REPO,)
    assert captured["kwargs"] == {"revision": "abc123", "timeout": 2.5}


def test_default_timeout_is_5_seconds(monkeypatch):
    info = SimpleNamespace(last_modified=datetime(2026, 1, 1, tzinfo=UTC))
    captured = _install_fake_hfapi(monkeypatch, info=info)

    fetch_hf_last_modified()

    # `revision=None` is the default; `timeout=5.0` is the default.
    assert captured["kwargs"]["revision"] is None
    assert captured["kwargs"]["timeout"] == pytest.approx(5.0)


def test_logs_but_does_not_raise_on_failure(monkeypatch, caplog):
    import logging

    _install_fake_hfapi(monkeypatch, raise_on_call=OSError("offline"))

    with caplog.at_level(logging.INFO, logger="pdomain_ocr_labeler_spa.core.hf_probe"):
        result = fetch_hf_last_modified(revision="main")

    assert result is None
    # The legacy logs at INFO with the repo + revision + exception. We
    # only require *something* was logged so a future operator has a
    # crumb; the exact format is not part of the public contract.
    assert any("hf" in rec.name.lower() or "HF" in rec.message for rec in caplog.records)
