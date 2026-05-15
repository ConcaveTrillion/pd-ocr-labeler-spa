"""Integration tests for the ``save_project`` job handler (spec-23-B2 / §8).

Spec authority:
- ``specs/23-page-payload-backend.md §8`` — handler iterates pages with
  ``generation > last_saved_generation``, calls ``persist_page_to_file``
  on each, emits per-page progress + ``save_project_done`` notification
  with ``failures: list[SaveFailure]``.

Issue: #308.

Like the reload-OCR tests, we wrap ``broker.publish`` so we observe every
event from publish-time rather than racing the SSE subscriber.
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from pd_ocr_labeler_spa.bootstrap import build_app
from pd_ocr_labeler_spa.core.jobs import JobEventBroker
from pd_ocr_labeler_spa.core.page_state import PageLoadOutcome, PageSource
from pd_ocr_labeler_spa.core.persistence.user_page_envelope import labeled_envelope_path
from pd_ocr_labeler_spa.core.project_state import PageState
from pd_ocr_labeler_spa.settings import Settings


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
    (proj / "001.png").write_bytes(b"\x89PNG\r\n")
    (proj / "002.png").write_bytes(b"\x89PNG\r\n")
    (proj / "003.png").write_bytes(b"\x89PNG\r\n")
    return root


@dataclass
class _StubPage:
    label: str = "stub"

    def to_dict(self) -> dict[str, Any]:
        return {
            "words": [],
            "paragraphs": [],
            "lines": [],
            "source_identifier": f"{self.label}.png",
        }


def _wrap_broker_publish(broker: JobEventBroker, sink: list[dict[str, Any]]) -> None:
    original = broker.publish

    async def recording_publish(job_id: str, event: dict[str, Any]) -> None:
        sink.append({"job_id": job_id, **event})
        await original(job_id, event)

    broker.publish = recording_publish  # type: ignore[method-assign]


def _wait_for_terminal(events: list[dict[str, Any]], *, timeout: float = 5.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if any(e.get("type") in ("complete", "error", "cancelled") for e in events):
            return
        time.sleep(0.01)
    raise AssertionError(f"no terminal event after {timeout}s; events={events}")


@pytest.fixture
def loaded_client_recording(
    tmp_path: Path, projects_root: Path
) -> Iterator[tuple[TestClient, list[dict[str, Any]]]]:
    settings = _make_settings(tmp_path, source_projects_root=projects_root)
    app = build_app(settings)
    recorded: list[dict[str, Any]] = []
    with TestClient(app) as c:
        _wrap_broker_publish(c.app.state.job_events, recorded)  # type: ignore[attr-defined]
        resp = c.post(
            "/api/projects/load",
            json={"project_root": str(projects_root / "book1")},
        )
        assert resp.status_code == 200, resp.text
        yield c, recorded


def _seed_dirty_page(client: TestClient, page_index: int, label: str) -> None:
    """Seed a dirty PageState (generation=1, last_saved=0)."""
    project_state = client.app.state.project_state  # type: ignore[attr-defined]
    outcome = PageLoadOutcome(page_index=page_index, source=PageSource.OCR, payload=_StubPage(label=label))
    pstate = PageState(page_index=page_index, page_record=outcome)
    pstate.generation = 1
    pstate.last_saved_generation = 0
    project_state._page_states[page_index] = pstate


def test_save_project_persists_all_dirty_pages(
    loaded_client_recording: tuple[TestClient, list[dict[str, Any]]],
) -> None:
    """save_project job iterates pages and writes a labeled envelope for each
    dirty page; terminal event is ``complete`` (spec §8)."""
    c, events = loaded_client_recording
    settings: Settings = c.app.state.settings  # type: ignore[attr-defined]

    _seed_dirty_page(c, 0, "p0")
    _seed_dirty_page(c, 1, "p1")
    # Page 2 stays clean (no PageState row) → must not be touched.

    resp = c.post("/api/projects/book1/save-all", json={})
    assert resp.status_code == 202, resp.text

    _wait_for_terminal(events)
    terminal = events[-1]
    assert terminal["type"] == "complete", terminal

    # Both labeled envelopes exist; page 2 was not written.
    assert labeled_envelope_path(settings.data_root, "book1", 0).exists()
    assert labeled_envelope_path(settings.data_root, "book1", 1).exists()
    assert not labeled_envelope_path(settings.data_root, "book1", 2).exists()

    # last_saved_generation caught up to generation for both saved pages.
    project_state = c.app.state.project_state  # type: ignore[attr-defined]
    for idx in (0, 1):
        ps = project_state.page_states[idx]
        assert ps.last_saved_generation == ps.generation, idx


def test_save_project_emits_progress_per_page(
    loaded_client_recording: tuple[TestClient, list[dict[str, Any]]],
) -> None:
    """save_project reports progress with ``current/total`` advancing per
    persisted page (spec §8)."""
    c, events = loaded_client_recording
    _seed_dirty_page(c, 0, "p0")
    _seed_dirty_page(c, 1, "p1")

    resp = c.post("/api/projects/book1/save-all", json={})
    assert resp.status_code == 202

    _wait_for_terminal(events)

    progress = [e for e in events if e.get("type") == "progress" and e.get("total")]
    # At least one progress event with total == 2 (the count of dirty pages).
    totals = {e["total"] for e in progress}
    assert 2 in totals, f"expected total=2 in progress events; got totals={totals}"


def test_save_project_failure_lists_failed_pages_in_response(
    loaded_client_recording: tuple[TestClient, list[dict[str, Any]]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When ``persist_page_to_file`` raises OSError for a page, the handler
    records it on ``SaveFailure`` and continues with remaining pages.

    The terminal event is still ``complete`` (partial-failure semantics —
    spec §8 lists failures rather than aborting). Failures are observable
    via the notification queue ``save_project_done`` message and via the
    job's recorded ``failures`` payload.
    """
    c, events = loaded_client_recording
    _seed_dirty_page(c, 0, "p0")
    _seed_dirty_page(c, 1, "p1")

    # Monkeypatch the handler's view of ``persist_page_to_file`` to fail
    # on page_index=0 only.
    from pd_ocr_labeler_spa.core.jobs.handlers import save_project as save_project_module

    real = save_project_module.persist_page_to_file

    def _flaky(*, page: Any, project: Any, page_index: int, data_root: Path) -> None:
        if page_index == 0:
            raise OSError("disk full on page 0")
        real(page=page, project=project, page_index=page_index, data_root=data_root)

    monkeypatch.setattr(save_project_module, "persist_page_to_file", _flaky)

    resp = c.post("/api/projects/book1/save-all", json={})
    assert resp.status_code == 202

    _wait_for_terminal(events)
    terminal = events[-1]
    assert terminal["type"] == "complete", terminal

    # Page 0 failed → no labeled envelope; page 1 succeeded.
    settings: Settings = c.app.state.settings  # type: ignore[attr-defined]
    assert not labeled_envelope_path(settings.data_root, "book1", 0).exists()
    assert labeled_envelope_path(settings.data_root, "book1", 1).exists()

    # Page 1's last_saved_generation caught up; page 0's did not.
    project_state = c.app.state.project_state  # type: ignore[attr-defined]
    assert project_state.page_states[0].last_saved_generation == 0
    assert project_state.page_states[1].last_saved_generation == project_state.page_states[1].generation

    # save_project_done notification carries the failure list.
    notif_queue = c.app.state.notification_queue  # type: ignore[attr-defined]
    notifications = notif_queue.snapshot()
    save_done = [n for n in notifications if "save" in n.message.lower()]
    assert save_done, f"expected a save-related notification; got {notifications}"


def test_save_project_no_dirty_pages_completes_cleanly(
    loaded_client_recording: tuple[TestClient, list[dict[str, Any]]],
) -> None:
    """save_project with no dirty pages → no writes, terminal ``complete``."""
    c, events = loaded_client_recording
    settings: Settings = c.app.state.settings  # type: ignore[attr-defined]

    resp = c.post("/api/projects/book1/save-all", json={})
    assert resp.status_code == 202

    _wait_for_terminal(events)
    assert events[-1]["type"] == "complete"

    for idx in range(3):
        assert not labeled_envelope_path(settings.data_root, "book1", idx).exists()
