// ui-prefs.ts — UI preferences store (line filter, layer visibility,
// splitter ratio, selection mode).
//
// Spec: specs/22-page-surface-wireup.md §9 (Splitter), D-021 (UI prefs).
// `splitterRatio` is the canonical field name (matches spec 22). The
// legacy alias `splitterPosition` was renamed; no production callers
// exist yet — only the store + this test relied on the old name.

export interface LayerVisibility {
  paragraph: boolean;
  line: boolean;
  word: boolean;
}

export interface UiPrefsState {
  lineFilter: string | null;
  layerVisibility: LayerVisibility;
  /** Horizontal splitter ratio in [0.2, 0.8]. 0.5 = panes equal width. */
  splitterRatio: number;
  selectionMode: "paragraph" | "line" | "word";
}

type SetStateArg<T> = T | ((state: T) => T);

interface Store<T> {
  getState: () => T;
  setState: (arg: SetStateArg<T>) => void;
  /** Convenience setter for splitter ratio (clamps to [0.2, 0.8]). */
  setSplitterRatio: (ratio: number) => void;
}

/** Clamp the splitter ratio to the spec-22 §9 range [0.2, 0.8]. */
export function clampSplitterRatio(ratio: number): number {
  if (Number.isNaN(ratio)) return 0.5;
  if (ratio < 0.2) return 0.2;
  if (ratio > 0.8) return 0.8;
  return ratio;
}

function createStore<T>(initialState: T): Store<T> {
  let state = initialState;

  const setState = (arg: SetStateArg<T>) => {
    const newState = typeof arg === "function" ? (arg as (s: T) => T)(state) : arg;
    state = { ...state, ...newState };
  };

  return {
    getState: () => state,
    setState,
    setSplitterRatio: (ratio: number) => {
      const clamped = clampSplitterRatio(ratio);
      setState({ splitterRatio: clamped } as unknown as SetStateArg<T>);
    },
  };
}

export const useUiPrefs = createStore<UiPrefsState>({
  lineFilter: null,
  layerVisibility: {
    paragraph: true,
    line: true,
    word: true,
  },
  splitterRatio: 0.5,
  selectionMode: "paragraph",
});
