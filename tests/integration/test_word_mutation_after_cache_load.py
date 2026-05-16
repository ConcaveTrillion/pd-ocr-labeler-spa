"""BUG-SMOKE-1 regression: word mutations must work when page loaded via labeled/cached lane.

Root cause: ``_resolve_page_object`` returned the raw ``UserPageEnvelope``
stored in ``PageLoadOutcome.payload`` for the labeled/cached lanes.
``_resolve_word`` then did ``getattr(envelope, "lines", None)`` which is
``None`` → every mutation returned 404 ``word_not_found``.

Fix: ``_resolve_page_object`` must lift envelope → ``Page`` before returning,
mirroring the lift already present in ``_page_payload``.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from pd_ocr_labeler_spa.bootstrap import build_app
from pd_ocr_labeler_spa.core.page_state import PageLoadOutcome, PageSource
from pd_ocr_labeler_spa.core.persistence.user_page_envelope import (
    UserPageEnvelope,
    UserPagePayload,
)
from pd_ocr_labeler_spa.core.project_state import PageState
from pd_ocr_labeler_spa.settings import Settings


def _minimal_page_dict() -> dict[str, Any]:
    """Build a ``Page.to_dict()``-compatible dict with one word.

    This is the format that ``UserPagePayload.page`` stores and that
    ``Page.from_dict`` expects — nested ``items`` (Block → Paragraph →
    Line → Word), not the ``lines/words`` flat layout.
    """
    bb_dict = {
        "top_left": {"x": 0, "y": 0, "is_normalized": False},
        "bottom_right": {"x": 10, "y": 10, "is_normalized": False},
        "is_normalized": False,
    }
    word_dict = {
        "type": "Word",
        "text": "hello",
        "bounding_box": bb_dict,
        "ocr_confidence": None,
        "word_labels": [],
        "text_style_labels": ["regular"],
        "text_style_label_scopes": {"regular": "whole"},
        "word_components": [],
        "baseline": None,
        "ground_truth_text": None,
        "ground_truth_bounding_box": None,
        "ground_truth_match_keys": {},
    }
    line_block = {
        "type": "Block",
        "child_type": "WORDS",
        "block_category": "LINE",
        "block_labels": None,
        "block_role_labels": [],
        "block_position_labels": [],
        "line_role_labels": [],
        "line_position_labels": [],
        "baseline": None,
        "bounding_box": bb_dict,
        "items": [word_dict],
        "override_page_sort_order": None,
        "unmatched_ground_truth_words": [],
        "additional_block_attributes": {},
        "base_ground_truth_text": "",
    }
    para_block = {
        "type": "Block",
        "child_type": "BLOCKS",
        "block_category": "PARAGRAPH",
        "block_labels": None,
        "block_role_labels": [],
        "block_position_labels": [],
        "line_role_labels": [],
        "line_position_labels": [],
        "baseline": None,
        "bounding_box": bb_dict,
        "items": [line_block],
        "override_page_sort_order": None,
        "unmatched_ground_truth_words": [],
        "additional_block_attributes": {},
        "base_ground_truth_text": "",
    }
    top_block = {
        "type": "Block",
        "child_type": "BLOCKS",
        "block_category": "BLOCK",
        "block_labels": None,
        "block_role_labels": [],
        "block_position_labels": [],
        "line_role_labels": [],
        "line_position_labels": [],
        "baseline": None,
        "bounding_box": bb_dict,
        "items": [para_block],
        "override_page_sort_order": None,
        "unmatched_ground_truth_words": [],
        "additional_block_attributes": {},
        "base_ground_truth_text": "",
    }
    return {
        "type": "Page",
        "width": 100,
        "height": 100,
        "page_index": 0,
        "bounding_box": bb_dict,
        "items": [top_block],
        "ocr_provenance": None,
    }


def _make_settings(tmp_path: Path, **overrides: object) -> Settings:
    base: dict[str, object] = {
        "host": "127.0.0.1",
        "port": 8080,
        "config_root": tmp_path / "config",
        "data_root": tmp_path / "data",
        "cache_root": tmp_path / "cache",
        "mode": "api_only",
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


@pytest.fixture
def projects_root(tmp_path: Path) -> Path:
    root = tmp_path / "projects"
    root.mkdir()
    proj = root / "book1"
    proj.mkdir()
    (proj / "001.png").write_bytes(b"\x00")
    (proj / "002.png").write_bytes(b"\x00")
    return root


@pytest.fixture
def loaded_client(tmp_path: Path, projects_root: Path) -> Iterator[TestClient]:
    """TestClient with a project already loaded (book1, 2 pages)."""
    settings = _make_settings(tmp_path, source_projects_root=projects_root)
    app = build_app(settings)
    with TestClient(app) as c:
        resp = c.post(
            "/api/projects/load",
            json={"project_root": str(projects_root / "book1")},
        )
        assert resp.status_code == 200, resp.text
        yield c


def _seed_envelope_page_state(
    client: TestClient,
    *,
    page_index: int,
    page_dict: dict[str, Any],
) -> None:
    """Inject a ``UserPageEnvelope`` into ``PageState.page_record.payload``.

    This simulates a page loaded via the labeled or cached lane where the
    ``PageLoadOutcome.payload`` is a ``UserPageEnvelope`` rather than a
    ``Page`` object directly.
    """
    project_state = client.app.state.project_state  # type: ignore[attr-defined]
    envelope = UserPageEnvelope(
        payload=UserPagePayload(page=page_dict),
    )
    outcome = PageLoadOutcome(
        page_index=page_index,
        source=PageSource.FILESYSTEM,
        payload=envelope,
    )
    pstate = PageState(page_index=page_index, page_record=outcome)
    project_state._page_states[page_index] = pstate


# ── The regression test ────────────────────────────────────────────────────


def test_word_gt_edit_works_on_cached_envelope_lane(
    loaded_client: TestClient,
) -> None:
    """Words loaded via labeled/cached envelope should accept GT edits.

    BUG-SMOKE-1: before the fix, ``_resolve_page_object`` returned the raw
    ``UserPageEnvelope`` which has no ``.lines`` → ``_resolve_word`` returned
    ``None`` → 404 ``word_not_found`` for every mutation.
    """
    # Wrap a proper Page.to_dict()-shaped dict in a UserPageEnvelope —
    # simulating a page loaded via the labeled lane.
    _seed_envelope_page_state(loaded_client, page_index=0, page_dict=_minimal_page_dict())

    resp = loaded_client.post(
        "/api/projects/book1/pages/0/words/0/0/gt",
        json={"text": "fixed"},
    )
    # Before fix: 404 word_not_found because UserPageEnvelope has no .lines.
    # After fix: 200 with updated page payload.
    assert resp.status_code == 200, (
        f"Expected 200 but got {resp.status_code}: {resp.text}\n"
        "BUG-SMOKE-1: _resolve_page_object must lift UserPageEnvelope → Page."
    )
    data = resp.json()
    assert data.get("page_index") == 0


def test_word_validated_toggle_works_on_cached_envelope_lane(
    loaded_client: TestClient,
) -> None:
    """Validate toggle also affected by BUG-SMOKE-1 — test second mutation path."""
    _seed_envelope_page_state(loaded_client, page_index=0, page_dict=_minimal_page_dict())

    resp = loaded_client.post(
        "/api/projects/book1/pages/0/words/0/0/validated",
        json={"validated": True},
    )
    assert resp.status_code == 200, (
        f"Expected 200 but got {resp.status_code}: {resp.text}\n"
        "BUG-SMOKE-1: validated toggle must work on envelope lane."
    )
