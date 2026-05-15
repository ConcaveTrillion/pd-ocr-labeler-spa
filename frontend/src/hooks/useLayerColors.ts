// useLayerColors.ts — Read layer color CSS custom properties from the document.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 13.
//
// Returns the resolved hex/rgb strings for each layer token so Konva rects
// can use theme-accurate stroke/fill colors rather than hardcoded constants.
//
// Reading is done via getComputedStyle(document.documentElement) so dark/light
// theme switches are reflected without a remount.

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
