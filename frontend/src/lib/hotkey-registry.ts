// hotkey-registry.ts — runtime hotkey registry for the HotkeyHelpModal.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 25.
//
// Purpose: each `useXHotkeys` hook registers its hotkeys here; the modal
// reads from the registry to build the grouped display with KeyCap components.
//
// Groups:
//   - Selection  (1/2/3, V/R/A/E keys)
//   - Navigation (←/→ pages, ⌥ arrows breadcrumb)
//   - Editing    (Enter/Esc)
//   - View       (theme toggle, drawer collapse, hotkey help)
//
// The registry is module-singleton; hooks call `registerHotkeys()` on mount
// and `unregisterHotkeys()` on unmount (both are no-ops in the current
// implementation — registry is populated from HOTKEY_MAP at module load and
// augmented by the static group definitions below).

export type HotkeyGroup = "selection" | "navigation" | "editing" | "view" | "other";

export interface RegistryEntry {
  /** Display label (human-readable). */
  label: string;
  /**
   * Keys to render as KeyCap components.
   * Each element is one KeyCap; within a single KeyCap, use an array of
   * strings (rendered as pill+pill joined by "+").
   * Example: [["⌥", "→"]] → one KeyCap with two pills.
   *          ["?"] → one KeyCap with one pill.
   */
  keyCaps: Array<string | string[]>;
  group: HotkeyGroup;
  /** Optional sort weight within a group; lower = earlier. */
  order?: number;
}

export interface HotkeyGroupDef {
  id: HotkeyGroup;
  label: string;
  entries: RegistryEntry[];
}

// ─── Static registry ─────────────────────────────────────────────────────────
//
// Populated from the spec-defined groups. Hooks may call `registerHotkeys()`
// to augment at runtime (e.g. when a section mounts).

const _entries: RegistryEntry[] = [
  // ── Selection ──────────────────────────────────────────────────────────────
  { group: "selection", label: "Paragraph mode", keyCaps: [["1"]], order: 1 },
  { group: "selection", label: "Line mode", keyCaps: [["2"]], order: 2 },
  { group: "selection", label: "Word mode", keyCaps: [["3"]], order: 3 },
  { group: "selection", label: "Validate line", keyCaps: [["V"]], order: 4 },
  { group: "selection", label: "Refine word", keyCaps: [["R"]], order: 5 },
  { group: "selection", label: "Add word mode", keyCaps: [["A"]], order: 6 },
  { group: "selection", label: "Erase mode", keyCaps: [["E"]], order: 7 },

  // ── Navigation ─────────────────────────────────────────────────────────────
  {
    group: "navigation",
    label: "Previous page",
    keyCaps: [["Ctrl", "←"]],
    order: 1,
  },
  {
    group: "navigation",
    label: "Next page",
    keyCaps: [["Ctrl", "→"]],
    order: 2,
  },
  {
    group: "navigation",
    label: "Breadcrumb — up",
    keyCaps: [["⌥", "↑"]],
    order: 3,
  },
  {
    group: "navigation",
    label: "Breadcrumb — previous",
    keyCaps: [["⌥", "←"]],
    order: 4,
  },
  {
    group: "navigation",
    label: "Breadcrumb — next",
    keyCaps: [["⌥", "→"]],
    order: 5,
  },

  // ── Editing ────────────────────────────────────────────────────────────────
  { group: "editing", label: "Commit / confirm", keyCaps: [["Enter"]], order: 1 },
  { group: "editing", label: "Cancel / close", keyCaps: [["Esc"]], order: 2 },

  // ── View ───────────────────────────────────────────────────────────────────
  { group: "view", label: "Toggle drawer", keyCaps: [["["]], order: 1 },
  { group: "view", label: "Show hotkey help", keyCaps: [["?"]], order: 2 },
  { group: "view", label: "Cycle theme", keyCaps: [["T"]], order: 3 },
];

/** Group metadata (label + display order). */
export const HOTKEY_GROUP_DEFS: HotkeyGroupDef[] = [
  { id: "selection", label: "Selection", entries: [] },
  { id: "navigation", label: "Navigation", entries: [] },
  { id: "editing", label: "Editing", entries: [] },
  { id: "view", label: "View", entries: [] },
  { id: "other", label: "Other", entries: [] },
];

/** Listeners called when registry changes. */
type Listener = () => void;
const _listeners = new Set<Listener>();

/** Stable snapshot cache — invalidated on every notify(). */
let _snapshot: HotkeyGroupDef[] | null = null;

function notify() {
  _snapshot = null;
  _listeners.forEach((fn) => fn());
}

/**
 * Register additional hotkeys at runtime (e.g. from a hook on mount).
 * Returns a cleanup function that removes the entries.
 */
export function registerHotkeys(entries: RegistryEntry[]): () => void {
  _entries.push(...entries);
  notify();
  return () => {
    for (const entry of entries) {
      const idx = _entries.indexOf(entry);
      if (idx !== -1) _entries.splice(idx, 1);
    }
    notify();
  };
}

/**
 * Returns all registered entries for a given group, sorted by `order`.
 */
export function getGroupEntries(group: HotkeyGroup): RegistryEntry[] {
  return _entries
    .filter((e) => e.group === group)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

/**
 * Returns all groups that have at least one entry, with entries populated.
 *
 * The result is cached and invalidated only when the registry changes.
 * This ensures `useSyncExternalStore` receives a stable reference across
 * renders when nothing has changed (required to avoid infinite loops).
 */
export function getPopulatedGroups(): HotkeyGroupDef[] {
  if (_snapshot !== null) return _snapshot;
  _snapshot = HOTKEY_GROUP_DEFS.map((g) => ({
    ...g,
    entries: getGroupEntries(g.id),
  })).filter((g) => g.entries.length > 0);
  return _snapshot;
}

/** Subscribe to registry changes. */
export function subscribeRegistry(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
