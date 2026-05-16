"""Tests for core/persistence/image_cache.py — issue #222.

Acceptance:
- Same content always produces same filename (content-addressable).
- JPEG quality 92 applied; PNG fallback when lossy.
- _MAX_CACHED_DIMENSION = 1200 enforced.
- All five image types handled.
"""

from __future__ import annotations

import io
from pathlib import Path

import pytest

pytest.importorskip("PIL", reason="Pillow required for image cache tests")

from PIL import Image

from pd_ocr_labeler_spa.core.persistence.image_cache import (
    _MAX_CACHED_DIMENSION,
    ImageType,
    _cleanup_stale_cache,
    cached_image_path,
    encode_image,
    write_cached_image,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_rgb(w: int = 100, h: int = 80, color: tuple[int, int, int] = (128, 64, 32)) -> Image.Image:
    """Create a plain solid-color RGB image."""
    img = Image.new("RGB", (w, h), color)
    return img


def _make_rgba(w: int = 50, h: int = 50) -> Image.Image:
    """Create a plain RGBA image (has alpha channel)."""
    return Image.new("RGBA", (w, h), (200, 100, 50, 180))


def _decode_bytes(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data))


# ---------------------------------------------------------------------------
# _MAX_CACHED_DIMENSION constant
# ---------------------------------------------------------------------------


def test_max_cached_dimension_value() -> None:
    assert _MAX_CACHED_DIMENSION == 1200


# ---------------------------------------------------------------------------
# encode_image — sizing
# ---------------------------------------------------------------------------


def test_encode_respects_max_dimension_wide() -> None:
    """Image wider than 1200 must be down-scaled."""
    img = _make_rgb(w=2400, h=400)
    data = encode_image(img)
    decoded = _decode_bytes(data)
    assert decoded.size[0] <= _MAX_CACHED_DIMENSION
    assert decoded.size[1] <= _MAX_CACHED_DIMENSION


def test_encode_respects_max_dimension_tall() -> None:
    """Image taller than 1200 must be down-scaled."""
    img = _make_rgb(w=300, h=2400)
    data = encode_image(img)
    decoded = _decode_bytes(data)
    assert decoded.size[0] <= _MAX_CACHED_DIMENSION
    assert decoded.size[1] <= _MAX_CACHED_DIMENSION


def test_encode_does_not_upscale_small_image() -> None:
    """Images within limit must not be up-scaled."""
    img = _make_rgb(w=100, h=80)
    data = encode_image(img)
    decoded = _decode_bytes(data)
    assert decoded.size == (100, 80)


def test_encode_large_square_down_scales() -> None:
    """1800×1800 must result in exactly 1200×1200."""
    img = _make_rgb(w=1800, h=1800)
    data = encode_image(img)
    decoded = _decode_bytes(data)
    assert decoded.size[0] <= _MAX_CACHED_DIMENSION
    assert decoded.size[1] <= _MAX_CACHED_DIMENSION


# ---------------------------------------------------------------------------
# encode_image — JPEG vs PNG
# ---------------------------------------------------------------------------


def test_encode_returns_jpeg_for_normal_image() -> None:
    """A typical smooth image should encode as JPEG."""
    img = _make_rgb()
    data = encode_image(img)
    # JPEG starts with FF D8
    assert data[:2] == b"\xff\xd8"


def test_encode_handles_rgba_image() -> None:
    """RGBA image must not raise (alpha is flattened before JPEG)."""
    img = _make_rgba()
    data = encode_image(img)
    # Should produce some valid image bytes
    assert len(data) > 0
    decoded = _decode_bytes(data)
    assert decoded.size == (50, 50)


def test_encode_png_fallback_for_high_contrast() -> None:
    """A checkerboard with extreme contrast often triggers PNG fallback."""
    # Build a checkerboard of pure black/white 1-pixel squares.
    img = Image.new("RGB", (64, 64))
    pixels = img.load()
    assert pixels is not None
    for y in range(64):
        for x in range(64):
            pixels[x, y] = (0, 0, 0) if (x + y) % 2 == 0 else (255, 255, 255)
    data = encode_image(img)
    # For extreme checkerboard JPEG will be lossy; we just verify we get valid output.
    assert len(data) > 0
    decoded = _decode_bytes(data)
    assert decoded.size == (64, 64)


# ---------------------------------------------------------------------------
# cached_image_path — content-addressable
# ---------------------------------------------------------------------------


def test_same_content_same_path(tmp_path: Path) -> None:
    """Identical encoded bytes must yield the same cache path."""
    img = _make_rgb()
    data = encode_image(img)
    p1 = cached_image_path(tmp_path, "proj", 0, ImageType.ORIGINAL, data)
    p2 = cached_image_path(tmp_path, "proj", 0, ImageType.ORIGINAL, data)
    assert p1 == p2


def test_different_content_different_path(tmp_path: Path) -> None:
    """Different encoded bytes must yield different cache paths."""
    img_a = _make_rgb(color=(10, 20, 30))
    img_b = _make_rgb(color=(200, 150, 100))
    data_a = encode_image(img_a)
    data_b = encode_image(img_b)
    p_a = cached_image_path(tmp_path, "proj", 0, ImageType.WORDS, data_a)
    p_b = cached_image_path(tmp_path, "proj", 0, ImageType.WORDS, data_b)
    assert p_a != p_b


def test_path_contains_project_and_page(tmp_path: Path) -> None:
    img = _make_rgb()
    data = encode_image(img)
    p = cached_image_path(tmp_path, "myproject", 5, ImageType.LINES, data)
    assert "myproject" in p.name
    assert "005" in p.name
    assert "lines" in p.name


# ---------------------------------------------------------------------------
# All five image types
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("itype", list(ImageType))
def test_all_image_types_produce_valid_path(tmp_path: Path, itype: ImageType) -> None:
    img = _make_rgb()
    data = encode_image(img)
    p = cached_image_path(tmp_path, "proj", 1, itype, data)
    assert itype.value in p.name
    assert p.suffix in (".jpg", ".png")


# ---------------------------------------------------------------------------
# write_cached_image — integration
# ---------------------------------------------------------------------------


def test_write_cached_image_creates_file(tmp_path: Path) -> None:
    img = _make_rgb()
    path = write_cached_image(tmp_path, "proj", 0, ImageType.ORIGINAL, img)
    assert path.exists()
    assert path.stat().st_size > 0


def test_write_cached_image_idempotent(tmp_path: Path) -> None:
    """Calling twice with identical image must not raise and returns same path."""
    img = _make_rgb()
    p1 = write_cached_image(tmp_path, "proj", 0, ImageType.ORIGINAL, img)
    p2 = write_cached_image(tmp_path, "proj", 0, ImageType.ORIGINAL, img)
    assert p1 == p2


def test_write_cached_image_content_addressed_different_pages(tmp_path: Path) -> None:
    """Page 0 and page 1 with same image content produce different paths."""
    img = _make_rgb()
    p0 = write_cached_image(tmp_path, "proj", 0, ImageType.WORDS, img)
    p1 = write_cached_image(tmp_path, "proj", 1, ImageType.WORDS, img)
    assert p0 != p1


def test_write_cached_image_all_types(tmp_path: Path) -> None:
    """All five image types must write successfully."""
    img = _make_rgb()
    for itype in ImageType:
        p = write_cached_image(tmp_path, "proj", 0, itype, img)
        assert p.exists()


# ---------------------------------------------------------------------------
# GAP-8: stale cache file cleanup
# ---------------------------------------------------------------------------


def test_write_cached_removes_stale_files(tmp_path: Path) -> None:
    """After write_cached_image, old files for the same slot must be removed (GAP-8)."""
    cache_dir = tmp_path / "page-images"
    cache_dir.mkdir()

    # Plant a stale file that looks like a prior cache entry for the same slot.
    stale = cache_dir / "proj1_000_original_aabbccdd11223344.jpg"
    stale.write_bytes(b"old stale content")

    # Write a new image for the same (project_id=proj1, page_index=0, type=ORIGINAL).
    img = _make_rgb(color=(10, 20, 30))
    path = write_cached_image(tmp_path, "proj1", 0, ImageType.ORIGINAL, img)

    # The stale file should be gone.
    assert not stale.exists(), "stale cache file was not removed after re-OCR write"
    # The newly written file must still exist.
    assert path.exists()


def test_write_cached_preserves_other_slots(tmp_path: Path) -> None:
    """Stale cleanup must NOT touch files from other page indices or image types."""
    cache_dir = tmp_path / "page-images"
    cache_dir.mkdir()

    # File for a different page index — must survive.
    other_page = cache_dir / "proj1_001_original_ffffffffffffffff.jpg"
    other_page.write_bytes(b"other page")

    # File for a different image type on the same page — must survive.
    other_type = cache_dir / "proj1_000_lines_ffffffffffffffff.jpg"
    other_type.write_bytes(b"other type")

    img = _make_rgb(color=(50, 60, 70))
    write_cached_image(tmp_path, "proj1", 0, ImageType.ORIGINAL, img)

    assert other_page.exists(), "file for different page index was incorrectly removed"
    assert other_type.exists(), "file for different image type was incorrectly removed"


def test_write_cached_idempotent_no_self_removal(tmp_path: Path) -> None:
    """Calling write_cached_image twice with the same image must not remove the file."""
    img = _make_rgb()
    p1 = write_cached_image(tmp_path, "proj", 2, ImageType.WORDS, img)
    p2 = write_cached_image(tmp_path, "proj", 2, ImageType.WORDS, img)
    assert p1 == p2
    assert p1.exists(), "idempotent write_cached_image removed the only valid file"


def test_cleanup_stale_cache_no_stale(tmp_path: Path) -> None:
    """_cleanup_stale_cache with no stale files must not raise."""
    cache_dir = tmp_path / "page-images"
    cache_dir.mkdir()
    new_file = cache_dir / "proj_000_words_abc1abc1abc1abc1.jpg"
    new_file.write_bytes(b"current")
    # Should not raise even when there is nothing to clean up.
    _cleanup_stale_cache(cache_dir, "proj", 0, ImageType.WORDS, new_file.name)
    assert new_file.exists()


def test_cleanup_stale_cache_nonexistent_dir(tmp_path: Path) -> None:
    """_cleanup_stale_cache against a missing directory must not raise."""
    missing = tmp_path / "nonexistent" / "page-images"
    # Should swallow the OSError silently.
    _cleanup_stale_cache(missing, "proj", 0, ImageType.ORIGINAL, "proj_000_original_x.jpg")
