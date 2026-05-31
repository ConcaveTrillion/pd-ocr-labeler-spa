"""Tests for ``core/ocr/weights_resolver.py`` — WeightsResolver factory.

Hermetic: ``pdomain_book_tools.hf`` is stubbed via ``sys.modules`` injection so
the tests never hit HuggingFace or the network.
"""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from pdomain_ocr_labeler_spa.core.model_selection import HF_LATEST_KEY
from pdomain_ocr_labeler_spa.core.ocr.predictor import ResolvedWeights

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def local_models_root(tmp_path: Path) -> Path:
    """Create a minimal trainer-layout model store.

    Structure::

        <root>/
          myprofile/
            detection/
              myprofile-detection-v1.pt
            recognition/
              myprofile-recognition-v1.pt
    """
    root = tmp_path / "pdomain-ml-models"
    det_dir = root / "myprofile" / "detection"
    reco_dir = root / "myprofile" / "recognition"
    det_dir.mkdir(parents=True)
    reco_dir.mkdir(parents=True)
    (det_dir / "myprofile-detection-v1.pt").write_bytes(b"det-weights")
    (reco_dir / "myprofile-recognition-v1.pt").write_bytes(b"reco-weights")
    return root


@pytest.fixture
def local_models_root_with_vocab(tmp_path: Path) -> Path:
    """Like ``local_models_root`` but recognition weights come with a vocab sidecar."""
    root = tmp_path / "pdomain-ml-models"
    det_dir = root / "profvocab" / "detection"
    reco_dir = root / "profvocab" / "recognition"
    det_dir.mkdir(parents=True)
    reco_dir.mkdir(parents=True)
    (det_dir / "profvocab-detection-v1.pt").write_bytes(b"det-weights")
    reco_pt = reco_dir / "profvocab-recognition-v1.pt"
    reco_pt.write_bytes(b"reco-weights")
    reco_pt.with_suffix(".vocab").write_text("abc def", encoding="utf-8")
    return root


@pytest.fixture
def stub_hf_module(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    """Inject a fake ``pdomain_book_tools.hf`` module.

    The stub's ``hf_download`` creates tiny temp ``.pt`` files and optional
    ``.vocab`` sidecars so the resolver can read them without network access.
    """
    call_log: list[dict[str, Any]] = []
    hf_det_path = tmp_path / "hf_det.pt"
    hf_reco_path = tmp_path / "hf_reco.pt"
    hf_vocab_path = tmp_path / "hf_reco.vocab"
    hf_det_path.write_bytes(b"hf-det")
    hf_reco_path.write_bytes(b"hf-reco")
    hf_vocab_path.write_text("hf-vocab", encoding="utf-8")

    def _hf_download(
        repo_id: str,
        filename: str,
        revision: str | None = None,
        sidecars: tuple[str, ...] = (),
    ) -> Path:
        call_log.append({"repo_id": repo_id, "filename": filename, "revision": revision})
        if "detection" in filename:
            return hf_det_path
        return hf_reco_path

    fake_module = SimpleNamespace(
        hf_download=_hf_download,
        OCR_MODEL_SIDECARS=(".arch", ".vocab"),
    )
    monkeypatch.setitem(sys.modules, "pdomain_book_tools.hf", fake_module)
    return SimpleNamespace(module=fake_module, calls=call_log, det=hf_det_path, reco=hf_reco_path)


# ---------------------------------------------------------------------------
# Stock key pass-through
# ---------------------------------------------------------------------------


class TestStockPassThrough:
    def test_stock_stock_returns_none(self, local_models_root: Path) -> None:
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        resolver = build_weights_resolver(local_models_root)
        result = resolver("stock", "stock", None)
        assert result is None

    def test_stock_detection_returns_none(self, local_models_root: Path) -> None:
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        resolver = build_weights_resolver(local_models_root)
        # One key stock, one key not stock — falls through (resolver can't load
        # a mixed pair; returns None so cache defaults to stock)
        result = resolver("stock", HF_LATEST_KEY, None)
        assert result is None


# ---------------------------------------------------------------------------
# HF key resolution
# ---------------------------------------------------------------------------


class TestHFKeyResolution:
    def test_hf_key_calls_hf_download(self, local_models_root: Path, stub_hf_module: SimpleNamespace) -> None:
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        resolver = build_weights_resolver(local_models_root)
        result = resolver(HF_LATEST_KEY, HF_LATEST_KEY, None)
        assert result is not None
        assert isinstance(result, ResolvedWeights)
        # Should have downloaded two files (detection + recognition)
        assert len(stub_hf_module.calls) == 2

    def test_hf_key_with_revision(self, local_models_root: Path, stub_hf_module: SimpleNamespace) -> None:
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        resolver = build_weights_resolver(local_models_root)
        result = resolver(HF_LATEST_KEY, HF_LATEST_KEY, "abc123")
        assert result is not None
        # Revision should be forwarded to hf_download
        assert all(c["revision"] == "abc123" for c in stub_hf_module.calls)

    def test_hf_key_reads_vocab_sidecar(
        self, local_models_root: Path, stub_hf_module: SimpleNamespace
    ) -> None:
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        resolver = build_weights_resolver(local_models_root)
        result = resolver(HF_LATEST_KEY, HF_LATEST_KEY, None)
        assert result is not None
        # The stub reco .vocab exists alongside hf_reco.pt
        assert result.recognition_vocab == "hf-vocab"

    def test_hf_key_returns_none_when_pdomain_book_tools_hf_missing(
        self, local_models_root: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """When ``pdomain_book_tools.hf`` is not available, resolver returns None
        (matches legacy ''ImportError → stock'' pattern in page_operations.py:234-238)."""
        import sys

        # Remove stub if present; ensure the module is absent.
        monkeypatch.delitem(sys.modules, "pdomain_book_tools.hf", raising=False)

        # Patch importlib.import_module to raise ImportError for pdomain_book_tools.hf.
        import importlib as _importlib

        original_import = _importlib.import_module

        def _patched(name: str, *args: Any, **kwargs: Any) -> Any:
            if name == "pdomain_book_tools.hf":
                raise ImportError("not installed")
            return original_import(name, *args, **kwargs)

        monkeypatch.setattr(_importlib, "import_module", _patched)

        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        resolver = build_weights_resolver(local_models_root)
        result = resolver(HF_LATEST_KEY, HF_LATEST_KEY, None)
        assert result is None


# ---------------------------------------------------------------------------
# Local key resolution
# ---------------------------------------------------------------------------


class TestLocalKeyResolution:
    def test_local_pair_key_returns_paths(self, local_models_root: Path) -> None:
        from pdomain_ocr_labeler_spa.core.model_discovery import discover_local_pairs
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        pairs = discover_local_pairs(local_models_root)
        assert len(pairs) == 1
        pair_key = pairs[0].key  # "<profile>/<signature>"

        resolver = build_weights_resolver(local_models_root)
        result = resolver(pair_key, pair_key, None)
        assert result is not None
        assert Path(result.detection_path).exists()
        assert Path(result.recognition_path).exists()

    def test_local_pair_key_reads_vocab_sidecar(self, local_models_root_with_vocab: Path) -> None:
        from pdomain_ocr_labeler_spa.core.model_discovery import discover_local_pairs
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        pairs = discover_local_pairs(local_models_root_with_vocab)
        assert len(pairs) == 1
        pair_key = pairs[0].key

        resolver = build_weights_resolver(local_models_root_with_vocab)
        result = resolver(pair_key, pair_key, None)
        assert result is not None
        assert result.recognition_vocab == "abc def"

    def test_unknown_key_returns_none(self, local_models_root: Path) -> None:
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        resolver = build_weights_resolver(local_models_root)
        result = resolver("unknown-profile/unknown-sig", "unknown-profile/unknown-sig", None)
        assert result is None

    def test_empty_models_root_returns_none_for_local_key(self, tmp_path: Path) -> None:
        from pdomain_ocr_labeler_spa.core.ocr.weights_resolver import build_weights_resolver

        resolver = build_weights_resolver(tmp_path / "does-not-exist")
        result = resolver("myprofile/v1", "myprofile/v1", None)
        assert result is None
