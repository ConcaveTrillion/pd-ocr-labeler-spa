"""Headless CLI for DocTR training-data export.

Console script entry-point: ``pd-ocr-labeler-spa-export``.

Reads labeled-project envelopes directly from disk via ``parse_envelope``
(the same path as the async job handler) and calls the same
``_export_page`` + ``WordFilter`` logic from ``export.py``.

No FastAPI boot required — this module imports nothing from FastAPI or
``pd_ocr_labeler_spa.api``.

Spec: ``docs/specs/2026-05-12-export-design.md §Headless CLI``.
Issue: #228.

Usage example::

    pd-ocr-labeler-spa-export \\
        --data-root /data \\
        --project-id my-project \\
        --style italic bold \\
        --detection-only
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

log = logging.getLogger(__name__)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pd-ocr-labeler-spa-export",
        description=(
            "Export DocTR training data from labeled pd-ocr-labeler-spa envelopes. "
            "Reads envelopes directly from disk — no server required."
        ),
    )
    parser.add_argument(
        "--data-root",
        required=True,
        type=Path,
        help="Path to the data root directory (contains labeled-projects/).",
    )
    parser.add_argument("--project-id", required=True, help="Project identifier.")
    parser.add_argument(
        "--style",
        dest="style_filters",
        nargs="*",
        default=[],
        metavar="STYLE",
        help=(
            "Style label filter(s). When omitted, exports all words (subfolder 'all'). "
            "When provided, produces one subfolder per style label."
        ),
    )
    parser.add_argument(
        "--component",
        dest="component_filter",
        default=None,
        metavar="COMPONENT",
        help="Component filter (single label, e.g. 'footnote').",
    )

    output_group = parser.add_mutually_exclusive_group()
    output_group.add_argument(
        "--detection-only",
        action="store_true",
        default=False,
        help="Export detection labels only (no recognition images).",
    )
    output_group.add_argument(
        "--recognition-only",
        action="store_true",
        default=False,
        help="Export recognition images only (no detection labels).",
    )
    output_group.add_argument(
        "--classification",
        action="store_true",
        default=False,
        help="Export recognition with multi-label classification formatter.",
    )

    parser.add_argument(
        "--page-index",
        type=int,
        default=None,
        metavar="N",
        help="Export a single page (0-based index). Default: all validated pages.",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        default=False,
        help="Enable verbose logging.",
    )
    return parser


async def _run_export(
    data_root: Path,
    project_id: str,
    style_filters: list[str],
    component_filter: str | None,
    detection_only: bool,
    recognition_only: bool,
    classification: bool,
    page_index: int | None,
) -> int:
    """Core async export logic — mirrors handle_export without the SSE layer.

    Returns the count of pages exported.
    """
    # Import only inside the function to keep module-level imports FastAPI-free.
    from .export import (
        WordFilter,
        _export_page,
        _labeled_project_dir,
        _load_page_from_envelope_file,
        _page_is_validated,
        _resolve_image_path,
        _scan_labeled_pages,
        export_output_dir,
    )

    detection = not recognition_only
    recognition = not detection_only

    scope = "current" if page_index is not None else "all_validated"

    # Resolve pages
    pages_to_export: list[tuple[Path, Path]] = []

    if scope == "current":
        project_dir = _labeled_project_dir(data_root, project_id)
        candidate = project_dir / f"{project_id}_{page_index:03d}.json"
        if candidate.exists():
            img = _resolve_image_path(candidate)
            if img:
                pages_to_export.append((candidate, img))
        else:
            log.warning("Page file not found: %s", candidate)
    else:
        for json_path in _scan_labeled_pages(data_root, project_id):
            img = _resolve_image_path(json_path)
            if img:
                pages_to_export.append((json_path, img))

    total_pages = len(pages_to_export)
    log.info("Found %d page(s) to export for project '%s'.", total_pages, project_id)

    if not pages_to_export:
        log.warning("No pages found. Nothing exported.")
        return 0

    subfolders = style_filters or ["all"]
    output_roots = {sf: export_output_dir(data_root, project_id, sf) for sf in subfolders}

    exported_count = 0
    for page_num, (json_path, image_path) in enumerate(pages_to_export):
        page = _load_page_from_envelope_file(json_path)
        if page is None:
            log.warning("Could not load page from %s; skipping.", json_path)
            continue

        if scope != "current" and not _page_is_validated(page):
            log.debug("Skipping non-validated page %s.", json_path.name)
            continue

        for subfolder, output_root in output_roots.items():
            wf: WordFilter | None = None
            if style_filters and subfolder != "all":
                wf = WordFilter(style_labels=frozenset([subfolder]))
            elif component_filter:
                wf = WordFilter(word_components=frozenset([component_filter]))

            _export_page(
                page,
                image_path,
                output_root,
                word_filter=wf,
                detection=detection,
                recognition=recognition,
                classification=classification,
                prefix=project_id,
            )

        exported_count += 1
        log.info("[%d/%d] Exported page %s.", page_num + 1, total_pages, json_path.stem)

        # Yield to the event loop between pages.
        await asyncio.sleep(0)

    return exported_count


def main() -> None:
    """Entry-point for ``pd-ocr-labeler-spa-export`` console script."""
    parser = _build_parser()
    args = parser.parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        format="%(levelname)s %(name)s %(message)s",
        level=log_level,
    )

    count = asyncio.run(
        _run_export(
            data_root=args.data_root,
            project_id=args.project_id,
            style_filters=args.style_filters or [],
            component_filter=args.component_filter,
            detection_only=args.detection_only,
            recognition_only=args.recognition_only,
            classification=args.classification,
            page_index=args.page_index,
        )
    )

    if count == 0:
        log.warning("No pages were exported.")
        sys.exit(1)

    print(f"Exported {count} page(s) to {args.data_root}/doctr-export/{args.project_id}/.")
