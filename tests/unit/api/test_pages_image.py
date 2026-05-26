"""Unit tests for ``GET /api/projects/{id}/pages/{idx}/image`` (Task C).

Spec authority:
- ``specs/23-page-payload-backend.md §3`` — ``_build_image_url`` shape
  ``/api/projects/{id}/pages/{idx}/image?w={display_width}``.

Contract:
- 200 + ``image/jpeg`` Content-Type on valid project + page.
- ``?w=N`` causes the image to be resized to width N (height proportional).
- No ``?w=`` returns original-size image (still JPEG).
- No loaded project → 404.
- Page index out of range → 404.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from pdomain_ocr_labeler_spa.bootstrap import build_app
from pdomain_ocr_labeler_spa.settings import Settings

# Tiny 1x1 real PNGs that PIL can open.
TINY_FIXTURE = Path(__file__).resolve().parents[2] / "e2e" / "fixtures" / "projects" / "tiny-fixture"


def _make_settings(tmp_path: Path, source_projects_root: Path | None = None) -> Settings:
    return Settings(
        host="127.0.0.1",
        port=8080,
        config_root=tmp_path / "config",
        data_root=tmp_path / "data",
        cache_root=tmp_path / "cache",
        mode="api_only",
        source_projects_root=source_projects_root,
    )


@pytest.fixture
def projects_root(tmp_path: Path) -> Path:
    root = tmp_path / "projects"
    root.mkdir()
    proj = root / "tiny-fixture"
    proj.mkdir()
    for src in sorted(TINY_FIXTURE.glob("*.png")):
        (proj / src.name).write_bytes(src.read_bytes())
    return root


@pytest.fixture
def loaded_client(tmp_path: Path, projects_root: Path) -> Iterator[TestClient]:
    settings = _make_settings(tmp_path, source_projects_root=projects_root)
    app = build_app(settings)
    with TestClient(app) as c:
        resp = c.post(
            "/api/projects/load",
            json={"project_root": str(projects_root / "tiny-fixture")},
        )
        assert resp.status_code == 200, resp.text
        yield c


@pytest.fixture
def bare_client(tmp_path: Path) -> Iterator[TestClient]:
    settings = _make_settings(tmp_path)
    app = build_app(settings)
    with TestClient(app) as c:
        yield c


# ── Happy path ────────────────────────────────────────────────────────


def test_get_page_image_returns_200_jpeg(loaded_client: TestClient) -> None:
    """Valid project + page → 200, Content-Type image/jpeg."""
    resp = loaded_client.get("/api/projects/tiny-fixture/pages/0/image")
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "image/jpeg"
    assert len(resp.content) > 0


def test_get_page_image_has_cache_control_header(loaded_client: TestClient) -> None:
    """Image response includes ``Cache-Control: public, max-age=3600``."""
    resp = loaded_client.get("/api/projects/tiny-fixture/pages/0/image")
    assert resp.status_code == 200
    cc = resp.headers.get("cache-control", "")
    assert "public" in cc
    assert "max-age=3600" in cc


def test_get_page_image_with_width_param_returns_jpeg(loaded_client: TestClient) -> None:
    """``?w=50`` → 200, Content-Type image/jpeg (resize path)."""
    resp = loaded_client.get("/api/projects/tiny-fixture/pages/0/image?w=50")
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "image/jpeg"
    assert len(resp.content) > 0


def test_get_page_image_without_width_param_still_ok(loaded_client: TestClient) -> None:
    """No ``?w=`` param → 200 (no resize needed)."""
    resp = loaded_client.get("/api/projects/tiny-fixture/pages/0/image")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/jpeg"


# ── Error paths ───────────────────────────────────────────────────────


def test_get_page_image_no_project_returns_404(bare_client: TestClient) -> None:
    """No project loaded → 404."""
    resp = bare_client.get("/api/projects/nonexistent/pages/0/image")
    assert resp.status_code == 404


def test_get_page_image_wrong_project_returns_404(loaded_client: TestClient) -> None:
    """Wrong project_id → 404."""
    resp = loaded_client.get("/api/projects/other_book/pages/0/image")
    assert resp.status_code == 404


def test_get_page_image_out_of_range_page_returns_404(loaded_client: TestClient) -> None:
    """``page_index >= total_pages`` → 404."""
    resp = loaded_client.get("/api/projects/tiny-fixture/pages/999/image")
    assert resp.status_code == 404
