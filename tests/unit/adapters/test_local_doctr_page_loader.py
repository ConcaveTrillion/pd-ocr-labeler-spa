"""Tests for ``LocalDoctrPageLoader`` — slice 8b-ii.

The loader implements ``core.page_state.PageLoader`` (the dispatch
protocol). At this slice it wires ``run_ocr`` only; ``load_labeled``
and ``load_cached`` return ``None`` until ``core/persistence/
user_page_envelope.py`` ships (a separate M3 slice).

Hermetic: ``pd_book_tools.ocr.document.Document.from_image_ocr_via_doctr``
is stubbed via ``sys.modules`` injection; ``PredictorCache`` is stubbed
in-process so we don't pull torch.
"""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from pd_ocr_labeler_spa.adapters.ocr.local_doctr import LocalDoctrPageLoader
from pd_ocr_labeler_spa.core.models import Project
from pd_ocr_labeler_spa.core.ocr.predictor import PredictorCache
from pd_ocr_labeler_spa.core.page_state import PageLoadOutcome, PageSource


def _make_project(tmp_path: Path, n_pages: int = 3) -> Project:
    image_paths = []
    for i in range(n_pages):
        p = tmp_path / f"page_{i:03d}.png"
        p.write_bytes(b"fake-png")
        image_paths.append(p)
    return Project(
        project_id="proj1",
        project_root=tmp_path,
        image_paths=image_paths,
        ground_truth_map={},
        total_pages=len(image_paths),
        current_page_index=0,
    )


@pytest.fixture
def stub_pd_book_tools(monkeypatch: pytest.MonkeyPatch):
    """Inject fake ``pd_book_tools.ocr.document.Document``.

    ``from_image_ocr_via_doctr`` records call args and returns a
    ``Document``-shaped object whose ``pages[0]`` is the marker page.
    """

    calls: list[dict[str, Any]] = []

    class _FakePage:
        def __init__(self, source_identifier: str) -> None:
            self.source_identifier = source_identifier

    class _FakeDocument:
        def __init__(self, pages: list[_FakePage]) -> None:
            self.pages = pages

    def from_image_ocr_via_doctr(
        image_path: Any,
        *,
        source_identifier: str,
        predictor: Any,
    ) -> _FakeDocument:
        calls.append(
            {
                "image_path": image_path,
                "source_identifier": source_identifier,
                "predictor": predictor,
            }
        )
        return _FakeDocument(pages=[_FakePage(source_identifier=source_identifier)])

    fake_module = SimpleNamespace(
        Document=SimpleNamespace(from_image_ocr_via_doctr=from_image_ocr_via_doctr),
    )
    monkeypatch.setitem(sys.modules, "pd_book_tools.ocr.document", fake_module)
    return SimpleNamespace(calls=calls, FakePage=_FakePage)


@pytest.fixture
def stub_predictor_cache(monkeypatch: pytest.MonkeyPatch):
    """``PredictorCache`` that bypasses doctr_support entirely.

    The real cache imports ``pd_book_tools.ocr.doctr_support`` lazily;
    here we inject the stub module too so ``get_or_create`` can run
    without erroring.
    """

    fake_module = SimpleNamespace(
        get_default_doctr_predictor=lambda: SimpleNamespace(kind="stock"),
        get_finetuned_torch_doctr_predictor=lambda *a, **kw: SimpleNamespace(kind="finetuned"),
    )
    monkeypatch.setitem(sys.modules, "pd_book_tools.ocr.doctr_support", fake_module)
    return PredictorCache()


def test_loader_run_ocr_returns_page_load_outcome(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    project = _make_project(tmp_path)
    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    outcome = loader.run_ocr(1)
    assert isinstance(outcome, PageLoadOutcome)
    assert outcome.page_index == 1
    assert outcome.source == PageSource.OCR
    assert outcome.payload.source_identifier == "page_001.png"


def test_loader_run_ocr_passes_image_path_and_source_identifier(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    project = _make_project(tmp_path)
    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    loader.run_ocr(0)
    call = stub_pd_book_tools.calls[0]
    expected_path = project.image_paths[0]
    assert call["image_path"] == expected_path
    assert call["source_identifier"] == expected_path.name


def test_loader_run_ocr_uses_predictor_from_cache(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    project = _make_project(tmp_path)
    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    loader.run_ocr(0)
    loader.run_ocr(1)
    # Both calls received the same predictor (cache hit on the same key).
    assert stub_pd_book_tools.calls[0]["predictor"] is stub_pd_book_tools.calls[1]["predictor"]


def test_loader_run_ocr_raises_on_out_of_range_index(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    project = _make_project(tmp_path, n_pages=2)
    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    with pytest.raises(IndexError):
        loader.run_ocr(5)
    with pytest.raises(IndexError):
        loader.run_ocr(-1)


def test_loader_run_ocr_raises_page_image_not_found_when_file_missing(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    """Loader catches missing image *before* OCR — cheap fail.

    Subclass of FileNotFoundError per ``core/page_state.py`` contract.
    """
    project = _make_project(tmp_path, n_pages=2)
    project.image_paths[0].unlink()  # delete the file

    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    from pd_ocr_labeler_spa.core.page_state import PageImageNotFoundError

    with pytest.raises(PageImageNotFoundError):
        loader.run_ocr(0)
    # And no OCR was attempted.
    assert stub_pd_book_tools.calls == []


def test_load_labeled_returns_none_until_persistence_lands(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    """Slice contract: labeled lane is a no-op stub at this slice.

    Replaces with real envelope reader when
    ``core/persistence/user_page_envelope.py`` lands.
    """
    project = _make_project(tmp_path)
    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    assert loader.load_labeled(0) is None


def test_load_cached_returns_none_until_persistence_lands(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    project = _make_project(tmp_path)
    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    assert loader.load_cached(0) is None


def test_loader_conforms_to_page_loader_protocol(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    """Structural conformance via ``isinstance`` against the
    ``runtime_checkable`` Protocol."""
    from pd_ocr_labeler_spa.core.page_state import PageLoader

    project = _make_project(tmp_path)
    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    assert isinstance(loader, PageLoader)


def test_loader_integrates_with_ensure_page_model(
    tmp_path: Path, stub_pd_book_tools, stub_predictor_cache: PredictorCache
) -> None:
    """End-to-end: ``ensure_page_model`` dispatches through the
    loader's three lanes (labeled None → cached None → run_ocr) and
    caches the outcome."""
    from pd_ocr_labeler_spa.core.page_state import ensure_page_model
    from pd_ocr_labeler_spa.core.project_state import ProjectState

    project = _make_project(tmp_path, n_pages=2)
    state = ProjectState()
    state.set_loaded_project(project)

    loader = LocalDoctrPageLoader(
        project=project,
        predictor_cache=stub_predictor_cache,
        detection_key="stock",
        recognition_key="stock",
        hf_revision=None,
    )
    outcome1 = ensure_page_model(state, 0, loader=loader)
    assert outcome1 is not None
    assert outcome1.source == PageSource.OCR

    # Second call returns cache hit; OCR not re-invoked.
    outcome2 = ensure_page_model(state, 0, loader=loader)
    assert outcome2 is outcome1
    assert len(stub_pd_book_tools.calls) == 1
