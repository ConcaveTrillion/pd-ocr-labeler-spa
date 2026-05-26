"""Startup pidfile check for the cache root.

Spec authority:
- ``docs/specs/2026-05-12-persistence-design.md §Concurrency``
  "Startup warning if another process holds the cache root via pidfile."
- Issue #223 acceptance: "Pidfile startup warning when cache root is held."

On startup the SPA writes a pidfile ``<cache_root>/pdomain-ocr-labeler-spa.pid``
containing the current PID.  Before writing, it checks whether a pidfile
already exists and whether that PID is still alive:

- If the PID is alive → emit WARNING with a human-readable message (the
  user may have two labeler instances open; operations could race).
- If the PID is dead (stale file) → silently overwrite.
- On any read/parse/OS error → log at DEBUG and write our pidfile anyway.

The warning is advisory only — we do NOT prevent startup.  The user is
warned; they decide.  This matches the legacy ``pd-ocr-labeler`` pattern
(``server.py`` line 47-54).

Shutdown: call ``release_pidfile(cache_root)`` in the lifespan shutdown
handler.  It removes the pidfile if it still contains our own PID
(avoids removing a file a racing successor wrote).  Failures are logged
at DEBUG and swallowed — a missing pidfile on shutdown is harmless.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

_PIDFILE_NAME = "pdomain-ocr-labeler-spa.pid"


def pidfile_path(cache_root: Path) -> Path:
    """``<cache_root>/pdomain-ocr-labeler-spa.pid``."""
    return cache_root / _PIDFILE_NAME


def _pid_is_alive(pid: int) -> bool:
    """Return True when *pid* refers to a running process on this machine."""
    try:
        # ``kill(pid, 0)`` sends no signal but errors if the process is gone.
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        # Process exists but we can't signal it (different uid).  Treat as alive.
        return True
    except OSError:
        return False


def check_and_write_pidfile(cache_root: Path) -> None:
    """Check for a live existing pidfile and write ours.

    Called during app startup (lifespan start).  Emits a WARNING when
    another live process appears to own the cache root; does not prevent
    startup.
    """
    cache_root.mkdir(parents=True, exist_ok=True)
    path = pidfile_path(cache_root)

    # --- check existing pidfile ---
    if path.exists():
        try:
            raw = path.read_text().strip()
            existing_pid = int(raw)
            if existing_pid != os.getpid() and _pid_is_alive(existing_pid):
                logger.warning(
                    "pdomain-ocr-labeler-spa startup: cache root %s appears to be held by "
                    "another process (PID %d). Concurrent writes may race.",
                    cache_root,
                    existing_pid,
                )
        except Exception as exc:
            logger.debug("pidfile check: could not read/parse %s: %s", path, exc)

    # --- write our own pidfile ---
    try:
        path.write_text(str(os.getpid()))
    except Exception as exc:
        logger.debug("pidfile write failed: %s: %s", path, exc)


def release_pidfile(cache_root: Path) -> None:
    """Remove the pidfile if it still contains our PID.

    Called during app shutdown (lifespan teardown).  Harmless if the
    file is missing or was overwritten by a successor process.
    """
    path = pidfile_path(cache_root)
    try:
        raw = path.read_text().strip()
        if int(raw) == os.getpid():
            path.unlink(missing_ok=True)
    except Exception as exc:
        logger.debug("pidfile release failed: %s: %s", path, exc)


__all__ = [
    "check_and_write_pidfile",
    "pidfile_path",
    "release_pidfile",
]
