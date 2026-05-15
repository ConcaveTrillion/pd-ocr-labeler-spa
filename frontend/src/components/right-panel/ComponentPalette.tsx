// ComponentPalette.tsx — COMPONENT chip palette for word component tags (P2.e, Gaps 31, 53 component half).
//
// Renders a row of tristate Chip primitives for component tags:
//   drop-cap, footnote-ref, page-num, running-head, abbreviation, proper-noun
//
// Reuses the ChipPalette building block from P2.d (StylePalette.tsx).
// Wires to useWordMutations.applyComponent.
//
// data-testids:
//   component-palette             — outer container
//   component-chip-{componentKey} — individual chip

import { ChipPalette } from "./StylePalette";
import type { TristateValue } from "../ui/Chip";
import type { ChipPaletteItem } from "./StylePalette";

// Component tags defined by the API (spec §2 / WordMatch.word_components).
// These are string keys passed to ApplyComponentRequest.component.
export const COMPONENT_ITEMS: ChipPaletteItem[] = [
  { key: "drop-cap", label: "Drop Cap" },
  { key: "footnote-ref", label: "Fn Ref" },
  { key: "page-num", label: "Page #" },
  { key: "running-head", label: "Run Hd" },
  { key: "abbreviation", label: "Abbr" },
  { key: "proper-noun", label: "Proper" },
];

export interface ComponentPaletteProps {
  /** Currently active component tags on the word. */
  activeComponents: string[];
  /** Called when a chip is toggled — component key + new tristate value. */
  onComponentChange: (componentKey: string, next: TristateValue) => void;
}

export function ComponentPalette({ activeComponents, onComponentChange }: ComponentPaletteProps) {
  const activeSet = new Set(activeComponents);

  return (
    <div data-testid="component-palette" className="flex flex-col gap-1.5 px-3 py-2">
      <div className="text-[9px] font-semibold tracking-wider uppercase text-ink-3">Component</div>
      <ChipPalette
        items={COMPONENT_ITEMS}
        activeKeys={activeSet}
        data-testid-prefix="component-chip"
        onChange={onComponentChange}
      />
    </div>
  );
}
