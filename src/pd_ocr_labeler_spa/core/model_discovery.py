"""Pure local-model-pair discovery (slice 8c-iii-a).

Walks an on-disk model store laid out by ``pd-ocr-trainer`` and returns
``LocalModelPair`` records — one per ``(profile, signature)`` whose
detection and recognition ``.pt`` weights both exist. The output feeds
``pairs_to_model_option_records`` to produce the
``ModelOptionRecord`` list consumed by
``model_selection.pick_default_keys``.

Source of truth: legacy
``pd_ocr_labeler/operations/ocr/model_selection_operations.py``,
``ModelSelectionOperations.discover_local_models`` (lines 257-304) plus
the ``_stem_signature`` (lines 117-124) and ``latest_local_mtime``
(lines 306-327) helpers.

Slice scope: filesystem walk + records translation only. HF probing
(``fetch_hf_last_modified``) is slice 8c-iii-b; wiring this into
``api/ocr_config._build_snapshot`` to replace the hardcoded
``stock-fallback`` is slice 8c-iii-c.

Layout::

    <root>/
      <profile>/
        detection/
          <stem>.pt          # detection weights (required)
          <stem>.vocab       # optional sidecar (ignored here)
        recognition/
          <stem>.pt          # recognition weights (required)
          <stem>.vocab       # optional sidecar (ignored here)

A "pair" is the intersection of det/reco *signatures* (after
``_stem_signature`` collapses ``-detection-``/``-recognition-`` infix)
under the same profile.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from pd_ocr_labeler_spa.core.model_selection import (
    _PREFERRED_PROFILES,
    ModelOptionRecord,
)


@dataclass(frozen=True)
class LocalModelPair:
    """A discovered local detection/recognition pair plus its mtime.

    The path fields are retained so downstream model loading can use
    the actual ``.pt`` files; ``pairs_to_model_option_records`` drops
    them on the way to ``ModelOptionRecord`` (which is path-agnostic).
    """

    profile: str
    signature: str
    key: str  # ``"<profile>/<signature>"``
    detection_weights_path: Path
    recognition_weights_path: Path
    mtime: datetime  # max(stat(det).st_mtime, stat(reco).st_mtime), UTC


def _stem_signature(stem: str) -> str:
    """Collapse ``-detection-`` / ``-recognition-`` infix.

    Legacy lines 117-124 — first occurrence only, never both. A stem
    that lacks either infix passes through verbatim.
    """
    if "-detection-" in stem:
        return stem.replace("-detection-", "-", 1)
    if "-recognition-" in stem:
        return stem.replace("-recognition-", "-", 1)
    return stem


def _file_mtime_utc(path: Path) -> datetime | None:
    """Return ``path`` mtime as a tz-aware UTC datetime, or ``None`` if
    unreadable. Mirrors legacy lines 319-323's defensive ``OSError``
    swallowing.
    """
    try:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=UTC)
    except OSError:
        return None


def discover_local_pairs(root: Path) -> list[LocalModelPair]:
    """Return every complete (det+reco) local model pair under ``root``.

    Returns an empty list when ``root`` is missing or not a directory —
    matching legacy line 262's "no models, no error" semantics. The
    list is ordered by profile-name lower-case (legacy line 266) and
    then by signature ascending (legacy line 285's ``sorted(...)``).
    """
    if not root.exists() or not root.is_dir():
        return []

    pairs: list[LocalModelPair] = []
    for profile_dir in sorted(
        (p for p in root.iterdir() if p.is_dir()),
        key=lambda p: p.name.lower(),
    ):
        detection_dir = profile_dir / "detection"
        recognition_dir = profile_dir / "recognition"
        if not detection_dir.is_dir() or not recognition_dir.is_dir():
            continue

        detection_by_signature: dict[str, Path] = {
            _stem_signature(p.stem): p for p in detection_dir.glob("*.pt") if p.is_file()
        }
        recognition_by_signature: dict[str, Path] = {
            _stem_signature(p.stem): p for p in recognition_dir.glob("*.pt") if p.is_file()
        }

        for signature in sorted(set(detection_by_signature).intersection(recognition_by_signature)):
            det_path = detection_by_signature[signature]
            reco_path = recognition_by_signature[signature]
            det_mtime = _file_mtime_utc(det_path)
            reco_mtime = _file_mtime_utc(reco_path)
            # If both stat() calls fail, skip — the pair is unusable.
            if det_mtime is None and reco_mtime is None:
                continue
            mtimes = [m for m in (det_mtime, reco_mtime) if m is not None]
            mtime = max(mtimes)
            pairs.append(
                LocalModelPair(
                    profile=profile_dir.name,
                    signature=signature,
                    key=f"{profile_dir.name}/{signature}",
                    detection_weights_path=det_path,
                    recognition_weights_path=reco_path,
                    mtime=mtime,
                )
            )

    return pairs


def pairs_to_model_option_records(
    pairs: list[LocalModelPair],
) -> list[ModelOptionRecord]:
    """Translate discovery output into the algorithm's input shape.

    Every pair, by construction, has both detection and recognition
    weights → ``has_detection=True`` and ``has_recognition=True``.
    Profile preference uses the same case-insensitive shortlist as
    ``model_selection._is_preferred_profile_key``; we replicate the
    set membership here directly to avoid a runtime cycle on the
    private helper.
    """
    return [
        ModelOptionRecord(
            key=p.key,
            source="local",
            hf_last_modified=None,
            local_mtime=p.mtime,
            has_detection=True,
            has_recognition=True,
            is_preferred_profile=p.profile.strip().lower() in _PREFERRED_PROFILES,
        )
        for p in pairs
    ]


__all__ = [
    "LocalModelPair",
    "discover_local_pairs",
    "pairs_to_model_option_records",
]
