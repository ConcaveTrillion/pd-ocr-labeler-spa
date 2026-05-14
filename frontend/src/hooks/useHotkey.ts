// useHotkey.ts — thin wrapper around react-hotkeys-hook.
// Spec: docs/specs/2026-05-12-hotkeys-a11y-design.md §Keymap structure
// Issue #235
//
// Defaults:
//   - preventDefault: true (preempts browser defaults like Ctrl+S → Save As)
//   - enableOnFormTags: false (hotkeys must not fire while typing in inputs)
//
// Per-call overrides are accepted via the options param.

import { useHotkeys, type Options } from "react-hotkeys-hook";

export type HotkeyOptions = Pick<Options, "enableOnFormTags" | "enabled" | "scopes">;

/**
 * Register a hotkey with sensible SPA defaults.
 *
 * @param combo   Key combo string (e.g. "mod+s", "ctrl+shift+r", "?")
 * @param handler Callback to invoke when the combo fires
 * @param options Optional overrides for react-hotkeys-hook Options
 */
export function useHotkey(
  combo: string,
  handler: (event: KeyboardEvent) => void,
  options?: HotkeyOptions,
): void {
  useHotkeys(combo, handler, {
    preventDefault: true,
    enableOnFormTags: false,
    ...options,
  });
}
