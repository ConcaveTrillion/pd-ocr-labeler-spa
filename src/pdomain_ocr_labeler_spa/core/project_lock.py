"""Per-project write serialization lock.

Spec authority:
- ``docs/specs/2026-05-12-persistence-design.md §Concurrency``
  "Single-process backend; all writes serialize through AppState-level
  lock per project."
- Issue #223 acceptance: "Per-project lock serializes concurrent writes."

``ProjectLockManager`` holds a dict of ``asyncio.Lock`` objects keyed by
``project_id``.  Route handlers that mutate per-project state acquire
the lock before writing, ensuring that concurrent POST requests to the
same project are serialized.

Usage in a FastAPI route handler::

    lock_mgr = get_app_state(request).project_locks
    async with lock_mgr.lock_for(project_id):
        # perform write
        ...

The dict grows lazily (a new lock is created on first access for a given
``project_id``).  Locks are never removed — in a single-process server
the number of ever-loaded projects is small and bounded by the user's
library size, so accumulation is harmless.

This module is deliberately import-free from ``asyncio`` at module level
so it can be instantiated in synchronous test code without an event loop;
the ``lock_for`` method is async-only.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager


class ProjectLockManager:
    """Holds one ``asyncio.Lock`` per project ID.

    Instantiated once per ``AppState``; passed by reference to route
    handlers.  Thread-safety assumptions: single-process asyncio server
    (uvicorn with one worker thread) — no external locking beyond
    asyncio primitives is needed.
    """

    def __init__(self) -> None:
        self._locks: dict[str, asyncio.Lock] = {}

    def _get_or_create(self, project_id: str) -> asyncio.Lock:
        """Return the lock for *project_id*, creating it if absent."""
        if project_id not in self._locks:
            self._locks[project_id] = asyncio.Lock()
        return self._locks[project_id]

    @asynccontextmanager
    async def lock_for(self, project_id: str) -> AsyncIterator[None]:
        """Async context manager that acquires the per-project lock.

        Usage::

            async with lock_mgr.lock_for("my_project"):
                # serialized write
                ...
        """
        lock = self._get_or_create(project_id)
        async with lock:
            yield

    def is_locked(self, project_id: str) -> bool:
        """Return True when *project_id*'s lock is currently acquired.

        Useful for tests and health checks; not a transactional guarantee.
        """
        if project_id not in self._locks:
            return False
        return self._locks[project_id].locked()


__all__ = ["ProjectLockManager"]
