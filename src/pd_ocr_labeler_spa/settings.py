"""Runtime configuration for ``pd-ocr-labeler-spa``.

Reads ``PDLABELER_*`` env vars. Read **once** in
``pd_ocr_labeler_spa.__main__.main()`` and passed into ``build_app(settings)``.

The Settings shape mirrors ``specs/02-backend.md §3`` verbatim — every
field listed there must exist here, even if its consumer is M2 / M3
deferred. The "lean stub" policy from earlier milestones was retired
in iter 51 (B-63) after the iter-47 M1.g work added pre-emptive fields
for `--projects-root` / positional `project_dir`: keeping some
no-consumer-yet fields and rejecting others created spec-vs-impl drift
that was harder to reason about than just declaring the full shape.
Fields with deferred consumers are tagged ``M{n}-deferred consumer``
in their docstring so future readers know which milestone wires them.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

LogFormat = Literal["plain", "json"]
Mode = Literal["normal", "api_only"]
StorageBackend = Literal["filesystem", "s3"]
AuthMode = Literal["none"]
OCREngine = Literal["local_doctr", "modal", "shared_container"]


class Settings(BaseSettings):
    """One process-wide settings instance. Chosen at startup; never mutated."""

    model_config = SettingsConfigDict(
        env_prefix="PDLABELER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # Spec §3 (specs/02-backend.md:148-149): "override after construction
        # is forbidden." Enforce via pydantic frozen so any future regression
        # to mutate ``settings.<field> = …`` post-construction fails loudly
        # at the call-site instead of silently desyncing process state.
        frozen=True,
    )

    # ── Server ───────────────────────────────────────────────────────────────
    host: str = "127.0.0.1"
    port: int = 8080
    frontend_dev_url: str | None = None
    """When set, the SPA mount falls through to this Vite dev server."""

    # ── Logging ──────────────────────────────────────────────────────────────
    log_format: LogFormat = "plain"
    request_id_header: str = "X-Request-ID"

    # ── OS-aware roots (specs/01-data-models.md §5) ──────────────────────────
    config_root: Path = Field(default_factory=lambda: Path.home() / ".config" / "pd-ocr-labeler")
    data_root: Path = Field(default_factory=lambda: Path.home() / "pd-ocr-labeler")
    cache_root: Path = Field(default_factory=lambda: Path.home() / ".cache" / "pd-ocr-labeler")

    # ── Project discovery (specs/02-backend.md §3 lines 130-132) ─────────────
    # Both fields are CLI-overridable seams; their consumers land in M2
    # (project discovery + load). Declared here so the M1.g ``__main__``
    # CLI can thread CLI args through ``Settings(**overrides)`` today.
    source_projects_root: Path | None = None
    """Root directory whose subdirectories are selectable projects.

    Set by ``--projects-root``; falls back to ``config.yaml``'s
    ``source_projects_root``. ``None`` until M2 wires the discovery
    layer.
    """

    cli_project_dir: Path | None = None
    """Optional positional ``project_dir`` from the CLI.

    When set, project discovery + restore overrides session_state's
    ``last_project_path`` and eagerly loads this dir. Same contract as
    legacy ``pd-ocr-labeler-ui [project_dir]`` (legacy
    ``cli.py:18-23``).
    """

    # ── Mode flag ────────────────────────────────────────────────────────────
    mode: Mode = "normal"
    """``api_only`` skips the SPA static mount — useful for tests and headless ops."""

    # ── Adapter axes (specs/02-backend.md §3) ────────────────────────────────
    # Wired by ``core.app_state.build_app_state`` (M1.d). Flipping these
    # fields is the only entry point for swapping backends; route code
    # never branches on adapter choice.
    storage_backend: StorageBackend = "filesystem"
    """``s3`` is ``NotImplementedYet`` (D-019); only ``filesystem`` is wired in v1."""

    auth_mode: AuthMode = "none"
    """``none`` returns a single anonymous ``UserContext`` for every request (D-005)."""

    ocr_engine: OCREngine = "local_doctr"
    """``modal`` / ``shared_container`` are ``NotImplementedYet`` (D-018); only ``local_doctr`` is wired."""

    # ── Job runner (specs/02-backend.md §3 line 138) ─────────────────────────
    # Consumer lands in M3 (JobRunner background loop). Declared now so
    # the Settings shape matches spec §3 verbatim — drift between spec
    # and impl is the failure mode B-63 was filed against, even though
    # no consumer is wired today.
    poll_interval_seconds: float = 0.5
    """Background JobRunner poll cadence — M3-deferred consumer."""

    # ── OCR (specs/02-backend.md §3 lines 141-142) ───────────────────────────
    # Consumers land in M3 (OCR predictor cache + model prefetch). The
    # `hf_repo` default mirrors legacy `pd-ocr-labeler/...` — see
    # spec §3 for the canonical name.
    hf_repo: str = "CT2534/pd-ocr-models"
    """HuggingFace repo for OCR model weights — M3-deferred consumer."""

    no_prefetch: bool = False
    """When True, skip the startup model-prefetch step — M3-deferred consumer."""
