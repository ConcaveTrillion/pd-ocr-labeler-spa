"""``WeightsResolver`` factory for HF and local fine-tuned model keys.

Spec authority: ``docs/architecture/02-backend.md §7`` (WeightsResolver
injection point in PredictorCache) and the plan-to-usable F3 item.

Legacy reference:
- ``pd-ocr-labeler/pd_ocr_labeler/operations/ocr/page_operations.py:219-267``
  (``_resolve_hf_weights`` — HF download + sidecar read).
- ``pd-ocr-labeler/pd_ocr_labeler/operations/ocr/model_selection_operations.py:18-19``
  (``HF_DEFAULT_DETECTION_FILENAME``, ``HF_DEFAULT_RECOGNITION_FILENAME``).

Three key domains:
- ``"stock"`` (detection AND recognition): handled upstream by
  ``PredictorCache._build`` — returns ``None`` here so the cache falls
  through to ``get_default_doctr_predictor``.
- ``HF_LATEST_KEY`` (both keys equal ``"huggingface"``): download both
  weight files from ``HF_DEFAULT_REPO`` via ``pdomain_book_tools.hf.hf_download``.
  ``ImportError`` (hub not installed) returns ``None`` → stock fallback.
- ``"<profile>/<signature>"`` (local pair keys as emitted by
  ``discover_local_pairs``): look up the matching ``LocalModelPair`` entry
  and return its filesystem paths. Unknown keys return ``None`` → stock.

Mixed-key pairs (one stock, one HF/local) also return ``None`` → stock.
This mirrors legacy behaviour where the predictor was always built from
a consistent pair.
"""

from __future__ import annotations

import importlib
import logging
from pathlib import Path

from ...core.hf_probe import HF_DEFAULT_REPO
from ...core.model_selection import HF_LATEST_KEY
from ..model_discovery import discover_local_pairs
from ..ocr.predictor import ResolvedWeights, WeightsResolver

logger = logging.getLogger(__name__)

# HF filenames — legacy model_selection_operations.py lines 18-19.
_HF_DETECTION_FILENAME = "detection/pd-all-detection-model-finetuned.pt"
_HF_RECOGNITION_FILENAME = "recognition/pd-all-recognition-model-finetuned.pt"


def build_weights_resolver(local_models_root: Path) -> WeightsResolver:
    """Return a ``WeightsResolver`` that handles HF and local-pair keys.

    The returned callable is pure (no I/O on construction) — the
    filesystem walk for local pairs happens lazily on first call and is
    cached inside the closure for the lifetime of the resolver instance.

    Parameters
    ----------
    local_models_root:
        Root of the trainer model store (output of
        ``_resolve_local_models_root()`` in ``api/ocr_config.py``).
        Missing or empty root yields no local pairs; only HF resolution
        remains available.
    """
    # Lazy-cached local pair map: built once on first non-stock/non-HF call.
    _local_pair_cache: dict[str, tuple[Path, Path]] | None = None

    def _get_local_pairs() -> dict[str, tuple[Path, Path]]:
        nonlocal _local_pair_cache
        if _local_pair_cache is None:
            pairs = discover_local_pairs(local_models_root)
            _local_pair_cache = {p.key: (p.detection_weights_path, p.recognition_weights_path) for p in pairs}
        return _local_pair_cache

    def resolver(
        detection_key: str,
        recognition_key: str,
        hf_revision: str | None,
    ) -> ResolvedWeights | None:
        # Stock handled upstream — pass through.
        if detection_key == "stock" or recognition_key == "stock":
            return None

        # HF path: both keys must be HF_LATEST_KEY.
        if detection_key == HF_LATEST_KEY and recognition_key == HF_LATEST_KEY:
            return _resolve_hf_weights(hf_revision)

        # Local path: look up by key (detection and recognition share the pair key).
        # Mixed pairs (one local, one HF) fall through to stock.
        if detection_key == recognition_key:
            return _resolve_local_weights(detection_key, _get_local_pairs())

        # Unrecognised / mixed configuration → stock fallback.
        logger.info(
            "weights_resolver: unrecognised key pair (det=%r, reco=%r) — stock fallback",
            detection_key,
            recognition_key,
        )
        return None

    return resolver


def _resolve_hf_weights(hf_revision: str | None) -> ResolvedWeights | None:
    """Download HF detection + recognition weights; return paths.

    Returns ``None`` on any failure (missing dep, network error) so the
    predictor cache falls back to stock — matching legacy
    ``page_operations.py:233-238``.
    """
    try:
        hf_mod = importlib.import_module("pdomain_book_tools.hf")
    except ImportError:
        logger.debug("pdomain_book_tools.hf not available; HF weight resolution disabled")
        return None

    hf_download = hf_mod.hf_download
    ocr_model_sidecars: tuple[str, ...] = getattr(hf_mod, "OCR_MODEL_SIDECARS", (".arch", ".vocab"))

    try:
        det_path = hf_download(
            HF_DEFAULT_REPO,
            _HF_DETECTION_FILENAME,
            hf_revision,
            sidecars=ocr_model_sidecars,
        )
        reco_path = hf_download(
            HF_DEFAULT_REPO,
            _HF_RECOGNITION_FILENAME,
            hf_revision,
            sidecars=ocr_model_sidecars,
        )
    except Exception as exc:
        logger.info(
            "HF weight download failed (revision=%r): %s — stock fallback",
            hf_revision,
            exc,
        )
        return None

    # Read vocab sidecar if present (legacy page_operations.py:247-254).
    vocab_text = ""
    vocab_path = reco_path.with_suffix(".vocab")
    if vocab_path.is_file():
        try:
            vocab_text = vocab_path.read_text(encoding="utf-8")
        except OSError:
            vocab_text = ""

    return ResolvedWeights(
        detection_path=str(det_path),
        recognition_path=str(reco_path),
        recognition_vocab=vocab_text,
    )


def _resolve_local_weights(
    key: str,
    pairs: dict[str, tuple[Path, Path]],
) -> ResolvedWeights | None:
    """Look up a local model pair by key; return paths or None."""
    entry = pairs.get(key)
    if entry is None:
        logger.debug("weights_resolver: local key %r not found in pairs", key)
        return None

    det_path, reco_path = entry

    # Read vocab sidecar if present (same as HF path above).
    vocab_text = ""
    vocab_sidecar = reco_path.with_suffix(".vocab")
    if vocab_sidecar.is_file():
        try:
            vocab_text = vocab_sidecar.read_text(encoding="utf-8")
        except OSError:
            vocab_text = ""

    return ResolvedWeights(
        detection_path=str(det_path),
        recognition_path=str(reco_path),
        recognition_vocab=vocab_text,
    )


__all__ = [
    "build_weights_resolver",
]
