"""Pin the pure local-model-pair discovery walk (slice 8c-iii-a).

Source of truth: legacy
``pd_ocr_labeler/operations/ocr/model_selection_operations.py`` —
``discover_local_models`` (lines 257-304) plus the
``_stem_signature`` / ``latest_local_mtime`` helpers (lines 117-124,
306-327).

Slice 8c-iii-a lands ONLY the filesystem walk + the records translation
so ``pick_default_keys`` can consume real on-disk pairs. HF probing
(``fetch_hf_last_modified``) and the discovery composer that wires
this into ``api/ocr_config._build_snapshot`` slip to 8c-iii-b/-c.

The walk shape is:

    <root>/
        <profile>/
            detection/
                <stem>.pt          # detection weights
                <stem>.vocab       # optional sidecar (ignored here)
            recognition/
                <stem>.pt          # recognition weights
                <stem>.vocab       # optional sidecar (ignored here)

A "pair" is the intersection of det/reco *signatures* under the same
profile. Stems like ``base-ocr-detection-1700000000`` and
``base-ocr-recognition-1700000000`` collapse to the shared signature
``base-ocr-1700000000`` via ``_stem_signature``. Only signatures that
appear under both ``detection/`` and ``recognition/`` become pairs.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest

from pd_ocr_labeler_spa.core.model_discovery import (
    LocalModelPair,
    discover_local_pairs,
    pairs_to_model_option_records,
)
from pd_ocr_labeler_spa.core.model_selection import (
    ModelOptionRecord,
    pick_default_keys,
)


def _touch(path: Path, *, mtime: float | None = None) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"")
    if mtime is not None:
        import os

        os.utime(path, (mtime, mtime))
    return path


# ---- discover_local_pairs ----


def test_discover_returns_empty_when_root_missing(tmp_path: Path) -> None:
    """Legacy line 262 — non-existent root yields an empty result, never raises."""
    missing = tmp_path / "nope"
    assert discover_local_pairs(missing) == []


def test_discover_returns_empty_when_root_not_a_directory(tmp_path: Path) -> None:
    """Legacy line 262 — a file at the root path is treated like a missing root."""
    not_a_dir = tmp_path / "file.txt"
    not_a_dir.write_text("hi")
    assert discover_local_pairs(not_a_dir) == []


def test_discover_returns_empty_for_empty_root(tmp_path: Path) -> None:
    """An empty root directory yields no pairs."""
    assert discover_local_pairs(tmp_path) == []


def test_discover_skips_profile_missing_detection_dir(tmp_path: Path) -> None:
    """Legacy lines 270-271 — both subdirs must exist or the profile is skipped."""
    profile = tmp_path / "all"
    _touch(profile / "recognition" / "weights.pt")
    assert discover_local_pairs(tmp_path) == []


def test_discover_skips_profile_missing_recognition_dir(tmp_path: Path) -> None:
    profile = tmp_path / "all"
    _touch(profile / "detection" / "weights.pt")
    assert discover_local_pairs(tmp_path) == []


def test_discover_emits_paired_signatures_only(tmp_path: Path) -> None:
    """Legacy lines 284-303 — signature must appear under both det and reco."""
    profile = tmp_path / "all"
    _touch(profile / "detection" / "all-detection-1700000000.pt")
    _touch(profile / "recognition" / "all-recognition-1700000000.pt")
    # Det-only signature — should not produce a pair.
    _touch(profile / "detection" / "all-detection-1800000000.pt")
    # Reco-only signature — should not produce a pair.
    _touch(profile / "recognition" / "all-recognition-1900000000.pt")

    pairs = discover_local_pairs(tmp_path)
    assert len(pairs) == 1
    pair = pairs[0]
    assert pair.profile == "all"
    assert pair.signature == "all-1700000000"
    assert pair.key == "all/all-1700000000"
    assert pair.detection_weights_path.name == "all-detection-1700000000.pt"
    assert pair.recognition_weights_path.name == "all-recognition-1700000000.pt"


def test_discover_groups_by_profile(tmp_path: Path) -> None:
    """Multiple profile dirs each contribute their own pairs."""
    for profile_name, ts in [("all", "1700000000"), ("base-ocr", "1800000000")]:
        profile = tmp_path / profile_name
        _touch(profile / "detection" / f"{profile_name}-detection-{ts}.pt")
        _touch(profile / "recognition" / f"{profile_name}-recognition-{ts}.pt")

    pairs = discover_local_pairs(tmp_path)
    keys = sorted(p.key for p in pairs)
    assert keys == ["all/all-1700000000", "base-ocr/base-ocr-1800000000"]


def test_discover_uses_max_mtime_across_pair(tmp_path: Path) -> None:
    """``mtime`` on the pair is the max over its det + reco weights — the
    legacy ``latest_local_mtime`` walks both paths individually (lines
    313-326), so the per-pair mtime should follow that semantics.
    """
    profile = tmp_path / "all"
    det = _touch(
        profile / "detection" / "all-detection-1700000000.pt",
        mtime=1_700_000_000,
    )
    reco = _touch(
        profile / "recognition" / "all-recognition-1700000000.pt",
        mtime=1_800_000_000,
    )

    pairs = discover_local_pairs(tmp_path)
    assert len(pairs) == 1
    expected = datetime.fromtimestamp(1_800_000_000, tz=UTC)
    assert pairs[0].mtime == expected
    # paths preserved
    assert pairs[0].detection_weights_path == det
    assert pairs[0].recognition_weights_path == reco


def test_discover_sorts_profiles_case_insensitively(tmp_path: Path) -> None:
    """Legacy line 266 sorts profiles by ``name.lower()``; preserve that
    so iteration order is deterministic across filesystems.
    """
    for profile_name in ["zeta", "Alpha", "beta"]:
        profile = tmp_path / profile_name
        sig = f"{profile_name.lower()}-1700000000"
        _touch(profile / "detection" / f"{profile_name.lower()}-detection-1700000000.pt")
        _touch(profile / "recognition" / f"{profile_name.lower()}-recognition-1700000000.pt")
        del sig  # unused, just exercising the loop

    pairs = discover_local_pairs(tmp_path)
    profiles = [p.profile for p in pairs]
    assert profiles == ["Alpha", "beta", "zeta"]


def test_discover_ignores_non_pt_files(tmp_path: Path) -> None:
    """Legacy lines 274-278 glob ``*.pt`` only — vocab sidecars and stray
    files mustn't be treated as weights.
    """
    profile = tmp_path / "all"
    _touch(profile / "detection" / "all-detection-1700000000.pt")
    _touch(profile / "detection" / "all-detection-1700000000.vocab")
    _touch(profile / "detection" / "README.md")
    _touch(profile / "recognition" / "all-recognition-1700000000.pt")
    _touch(profile / "recognition" / "all-recognition-1700000000.vocab")

    pairs = discover_local_pairs(tmp_path)
    assert len(pairs) == 1
    assert pairs[0].detection_weights_path.suffix == ".pt"


def test_discover_handles_signature_without_detection_or_recognition_in_stem(
    tmp_path: Path,
) -> None:
    """Stems lacking the ``-detection-``/``-recognition-`` infix fall
    through ``_stem_signature`` unchanged; matching pairs (det stem ==
    reco stem) still work.
    """
    profile = tmp_path / "all"
    _touch(profile / "detection" / "rawname.pt")
    _touch(profile / "recognition" / "rawname.pt")

    pairs = discover_local_pairs(tmp_path)
    assert len(pairs) == 1
    assert pairs[0].signature == "rawname"
    assert pairs[0].key == "all/rawname"


# ---- pairs_to_model_option_records ----


def test_records_translation_marks_preferred_profiles(tmp_path: Path) -> None:
    """Legacy line 64 — ``all`` and ``base-ocr`` are preferred profiles."""
    pair_all = LocalModelPair(
        profile="all",
        signature="all-1700000000",
        key="all/all-1700000000",
        detection_weights_path=tmp_path / "d.pt",
        recognition_weights_path=tmp_path / "r.pt",
        mtime=datetime(2026, 1, 1, tzinfo=UTC),
    )
    pair_base = LocalModelPair(
        profile="base-ocr",
        signature="base-ocr-1800000000",
        key="base-ocr/base-ocr-1800000000",
        detection_weights_path=tmp_path / "d2.pt",
        recognition_weights_path=tmp_path / "r2.pt",
        mtime=datetime(2026, 2, 1, tzinfo=UTC),
    )
    pair_other = LocalModelPair(
        profile="legacy",
        signature="legacy-1700000000",
        key="legacy/legacy-1700000000",
        detection_weights_path=tmp_path / "d3.pt",
        recognition_weights_path=tmp_path / "r3.pt",
        mtime=datetime(2026, 3, 1, tzinfo=UTC),
    )

    records = pairs_to_model_option_records([pair_all, pair_base, pair_other])
    by_key = {r.key: r for r in records}
    assert by_key["all/all-1700000000"].is_preferred_profile is True
    assert by_key["base-ocr/base-ocr-1800000000"].is_preferred_profile is True
    assert by_key["legacy/legacy-1700000000"].is_preferred_profile is False


def test_records_translation_sets_source_and_pair_completeness(tmp_path: Path) -> None:
    """Every pair has both det and reco by construction → has_detection
    AND has_recognition both True; ``source="local"`` always.
    """
    pair = LocalModelPair(
        profile="all",
        signature="all-1700000000",
        key="all/all-1700000000",
        detection_weights_path=tmp_path / "d.pt",
        recognition_weights_path=tmp_path / "r.pt",
        mtime=datetime(2026, 1, 1, tzinfo=UTC),
    )
    [record] = pairs_to_model_option_records([pair])
    assert record.source == "local"
    assert record.has_detection is True
    assert record.has_recognition is True
    assert record.local_mtime == pair.mtime
    assert record.hf_last_modified is None


def test_records_translation_preserves_input_order(tmp_path: Path) -> None:
    """Sort order is the caller's responsibility (``discover_local_pairs``
    already sorts by profile name); the translator must not reshuffle.
    """
    pairs = [
        LocalModelPair(
            profile=p,
            signature=f"{p}-1700000000",
            key=f"{p}/{p}-1700000000",
            detection_weights_path=tmp_path / f"{p}_d.pt",
            recognition_weights_path=tmp_path / f"{p}_r.pt",
            mtime=datetime(2026, 1, 1, tzinfo=UTC),
        )
        for p in ["zeta", "alpha", "beta"]
    ]
    records = pairs_to_model_option_records(pairs)
    assert [r.key for r in records] == [
        "zeta/zeta-1700000000",
        "alpha/alpha-1700000000",
        "beta/beta-1700000000",
    ]


# ---- end-to-end with pick_default_keys ----


def test_e2e_local_only_pairs_drive_pick_default_keys(tmp_path: Path) -> None:
    """Discovery → records → pick_default_keys with no HF record
    reaches case 2 (``local-only-hf-unreachable``).

    Note: ``hf_reachable`` is False when no HF record is in the input
    list (the only branch in ``pick_default_keys`` that distinguishes
    "HF reachable" vs "HF unreachable" both require an HF record
    object). When local pair exists and HF is *not reachable* (either
    absent or unreachable), the algorithm picks the local pair with
    ``local-only-hf-unreachable``.
    """
    profile = tmp_path / "all"
    _touch(profile / "detection" / "all-detection-1700000000.pt", mtime=1_700_000_000)
    _touch(profile / "recognition" / "all-recognition-1700000000.pt", mtime=1_700_000_000)

    pairs = discover_local_pairs(tmp_path)
    records = pairs_to_model_option_records(pairs)

    det, reco, reason = pick_default_keys(records)
    assert reason == "local-only-hf-unreachable"
    assert det == "all/all-1700000000"
    assert reco == "all/all-1700000000"


def test_e2e_local_pair_plus_unreachable_hf_picks_local(tmp_path: Path) -> None:
    """When discovery yields a local pair AND an HF record that's
    unreachable, ``pick_default_keys`` chooses the local pair with
    reason ``local-only-hf-unreachable`` — case 2b.
    """
    profile = tmp_path / "all"
    _touch(profile / "detection" / "all-detection-1700000000.pt", mtime=1_700_000_000)
    _touch(profile / "recognition" / "all-recognition-1700000000.pt", mtime=1_700_000_000)

    records = pairs_to_model_option_records(discover_local_pairs(tmp_path))
    # Add an unreachable HF record (last_modified=None).
    hf_record = ModelOptionRecord(
        key="huggingface",
        source="huggingface",
        hf_last_modified=None,
        local_mtime=None,
        has_detection=True,
        has_recognition=True,
        is_preferred_profile=False,
    )
    det, reco, reason = pick_default_keys([hf_record, *records])
    assert reason == "local-only-hf-unreachable"
    assert det == "all/all-1700000000"
    assert reco == "all/all-1700000000"


@pytest.mark.parametrize(
    "stem,expected_signature",
    [
        ("base-ocr-detection-1700000000", "base-ocr-1700000000"),
        ("all-detection-1700000000", "all-1700000000"),
        ("plain-name", "plain-name"),
        ("foo-recognition-bar", "foo-bar"),
    ],
)
def test_stem_signature_collapses_detection_or_recognition_infix(stem: str, expected_signature: str) -> None:
    """Legacy lines 117-124 — first occurrence only is replaced; any
    stem without either infix passes through verbatim.
    """
    from pd_ocr_labeler_spa.core.model_discovery import _stem_signature

    assert _stem_signature(stem) == expected_signature
