// useLayerColors.ts — Read layer color CSS custom properties from the document.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 13.
// Issue #328 (FO-4): expose LayerColorSpec variants for BBoxOverlay.
//
// Returns the resolved hex/rgb strings for each layer token so Konva rects
// can use theme-accurate stroke/fill colors rather than hardcoded constants.
//
// Reading is done via getComputedStyle(document.documentElement) so dark/light
// theme switches are reflected without a remount.
//
// Note: LayerColorSpec is defined here (not in BBoxOverlay) to avoid a circular
// import. BBoxOverlay re-exports it for backwards compatibility.

/** Fill + stroke RGBA string pair per layer. */
export interface LayerColorSpec {
  fill: string;
  stroke: string;
  /** Stroke width in display pixels (default 1). */
  strokeWidth: number;
}

export interface LayerColors {
  block: string;
  para: string;
  line: string;
  word: string;
}

const FALLBACKS: LayerColors = {
  block: "#a89074",
  para: "#7fb56a",
  line: "#d088a8",
  word: "#6e9cdf",
};

/**
 * Read the `--layer-*` CSS custom properties from the root element.
 * Returns fallback values when the tokens are not defined (e.g., jsdom without
 * a real CSS engine).
 */
export function readLayerColors(): LayerColors {
  try {
    const style = getComputedStyle(document.documentElement);
    const block = style.getPropertyValue("--layer-block").trim() || FALLBACKS.block;
    const para = style.getPropertyValue("--layer-para").trim() || FALLBACKS.para;
    const line = style.getPropertyValue("--layer-line").trim() || FALLBACKS.line;
    const word = style.getPropertyValue("--layer-word").trim() || FALLBACKS.word;
    return { block, para, line, word };
  } catch {
    return { ...FALLBACKS };
  }
}

/** Static layer colors hook — reads once from the document on call.
 *
 * If you need live theme-switch reactivity, subscribe to a matchMedia or
 * data-theme attribute mutation and call readLayerColors() again. For the
 * current slice (Slice 13), a static read on render is sufficient.
 */
export function useLayerColors(): LayerColors {
  return readLayerColors();
}

// ─── Hex → RGBA utility ───────────────────────────────────────────────────────

/**
 * Convert a 6-digit hex color string (e.g. "#7fb56a") to an rgba() string
 * with the given alpha value.
 *
 * Returns the fallback rgba if the input is not a valid 6-digit hex.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.startsWith("#") ? hex.slice(1) : hex;
  if (cleaned.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Alpha levels used for Konva overlay fill and stroke. */
export const LAYER_FILL_ALPHA = 0.2;
export const LAYER_STROKE_ALPHA = 0.65;

/**
 * Build a LayerColorSpec from a base hex color using standard fill/stroke alpha.
 */
export function hexToLayerColorSpec(hexColor: string): LayerColorSpec {
  return {
    fill: hexToRgba(hexColor, LAYER_FILL_ALPHA),
    stroke: hexToRgba(hexColor, LAYER_STROKE_ALPHA),
    strokeWidth: 1,
  };
}

// ─── Hardcoded specs for non-token layers ────────────────────────────────────

/** Selection overlay colors (same across para/line/word selection layers). */
export const SELECTION_LAYER_SPEC: LayerColorSpec = {
  fill: "rgba(37,99,235,0.20)",
  stroke: "#1d4ed8",
  strokeWidth: 1,
};

/** Drag-rect layer spec (transparent fill, solid accent stroke). */
export const DRAG_RECT_LAYER_SPEC: LayerColorSpec = {
  fill: "transparent",
  stroke: "#2563eb",
  strokeWidth: 2,
};
