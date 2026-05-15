// ImageTabsHeader.tsx — viewport header: layer checkboxes, selection-mode, erase.
// Spec: docs/specs/2026-05-12-image-viewport-design.md §ImageTabsHeader
// Issue #196
//
// data-testids (driver-contract invariants):
//   layer-paragraphs-checkbox, layer-lines-checkbox, layer-words-checkbox
//   selection-mode-paragraph, selection-mode-line, selection-mode-word
//   erase-pixels-button

export interface LayerVisibility {
  paragraph: boolean;
  line: boolean;
  word: boolean;
}

/** Selection mode values (matches ui-prefs store). Aligned with legacy
 * labeler — see specs/21-konva-renderer.md §8. */
export type SelectionMode = "paragraph" | "line" | "word";

interface ImageTabsHeaderProps {
  layerVisibility: LayerVisibility;
  /** Which bounding-box unit is selected for drag-select. */
  selectionMode: SelectionMode;
  /** Whether Erase mode is currently active. */
  eraseActive: boolean;
  /** Called with the layer key ('paragraph' | 'line' | 'word') when toggled. */
  onLayerToggle: (layer: keyof LayerVisibility) => void;
  /**
   * Called with the new selection mode when a radio is clicked.
   * Values are the selection-unit names: "paragraph" | "line" | "word".
   */
  onSelectionModeChange: (mode: SelectionMode) => void;
  /** Called when the Erase Pixels button is clicked (toggle). */
  onEraseToggle: () => void;
}

/**
 * Header bar for the image viewport pane.
 *
 * Contains layer visibility checkboxes, selection-mode radio buttons,
 * and the Erase Pixels mode toggle.
 */
export function ImageTabsHeader({
  layerVisibility,
  selectionMode,
  eraseActive,
  onLayerToggle,
  onSelectionModeChange,
  onEraseToggle,
}: ImageTabsHeaderProps) {
  return (
    <div
      className="flex items-center gap-3 px-2 py-1 bg-bg-surface border-b border-border-1 flex-wrap text-xs"
      aria-label="Viewport controls"
    >
      {/* Layer checkboxes */}
      <fieldset className="flex items-center gap-2 border-0 p-0 m-0">
        <legend className="sr-only">Visible layers</legend>

        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            data-testid="layer-paragraphs-checkbox"
            checked={layerVisibility.paragraph}
            onChange={() => onLayerToggle("paragraph")}
            className="accent-layer-para"
            aria-label="Show paragraphs layer"
          />
          <span className="text-layer-para">Para</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            data-testid="layer-lines-checkbox"
            checked={layerVisibility.line}
            onChange={() => onLayerToggle("line")}
            className="accent-layer-line"
            aria-label="Show lines layer"
          />
          <span className="text-layer-line">Lines</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            data-testid="layer-words-checkbox"
            checked={layerVisibility.word}
            onChange={() => onLayerToggle("word")}
            className="accent-layer-word"
            aria-label="Show words layer"
          />
          <span className="text-layer-word">Words</span>
        </label>
      </fieldset>

      <div className="w-px h-4 bg-border-2" aria-hidden="true" />

      {/* Selection-mode radio buttons */}
      <fieldset className="flex items-center gap-2 border-0 p-0 m-0">
        <legend className="sr-only">Selection mode</legend>

        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="radio"
            name="selection-mode"
            data-testid="selection-mode-paragraph"
            checked={selectionMode === "paragraph"}
            onChange={() => onSelectionModeChange("paragraph")}
            aria-label="Select by paragraph"
          />
          <span>Para</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="radio"
            name="selection-mode"
            data-testid="selection-mode-line"
            checked={selectionMode === "line"}
            onChange={() => onSelectionModeChange("line")}
            aria-label="Select by line"
          />
          <span>Line</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="radio"
            name="selection-mode"
            data-testid="selection-mode-word"
            checked={selectionMode === "word"}
            onChange={() => onSelectionModeChange("word")}
            aria-label="Select by word"
          />
          <span>Word</span>
        </label>
      </fieldset>

      <div className="w-px h-4 bg-border-2" aria-hidden="true" />

      {/* Erase Pixels mode toggle */}
      <button
        data-testid="erase-pixels-button"
        aria-pressed={eraseActive}
        onClick={onEraseToggle}
        title="Erase Pixels mode (Shift+E)"
        className={[
          "px-2 py-0.5 text-xs rounded border transition-colors",
          eraseActive
            ? "bg-status-mismatch text-ink-1 border-status-mismatch hover:opacity-90"
            : "bg-bg-raised text-ink-2 border-border-2 hover:bg-bg-raised/80",
        ].join(" ")}
      >
        Erase
      </button>
    </div>
  );
}
