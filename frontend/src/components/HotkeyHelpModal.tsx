// HotkeyHelpModal.tsx — ? help modal listing all registered hotkeys.
// Spec: docs/specs/2026-05-12-hotkeys-a11y-design.md §Hotkey help modal
//       specs/22-page-surface-wireup.md §5 (uses dialog store)
// Issues: #235 (initial), #309 (spec-22-A — wire to dialog store)
//
// Opens when ? is pressed outside a form input, OR when something calls
// `dialogStore.open('hotkeyHelp')` (e.g. the HeaderBar trigger button).
// Reads from HOTKEY_MAP — always in sync with registered keys.
// testid: hotkey-help-dialog

import { HOTKEY_MAP, type Scope } from "../lib/hotkeyMap";
import { useHotkey } from "../hooks/useHotkey";
import { dialogStore, useDialogStore } from "../stores/dialog-store";

const SCOPE_ORDER: Scope[] = [
  "global",
  "viewport",
  "matches",
  "dialog",
  "source-folder",
  "gt-input",
];

const SCOPE_LABELS: Record<Scope, string> = {
  global: "Global",
  viewport: "Viewport",
  matches: "Word Matches",
  dialog: "Word Edit Dialog",
  "source-folder": "Source Folder Dialog",
  "gt-input": "GT Input",
};

/**
 * Hotkey help modal.
 *
 * Register this component once near the top of the component tree so the
 * `?` listener is always active. Open-state lives in `useDialogStore` so
 * other UI surfaces (HeaderBar trigger button, future programmatic
 * callers) can open the same dialog without prop drilling.
 */
export function HotkeyHelpModal() {
  const open = useDialogStore((s) => s.hotkeyHelp.open);

  // ? key opens help outside inputs (enableOnFormTags: false is default)
  useHotkey("?", () => dialogStore.open("hotkeyHelp"));
  // Esc closes when open
  useHotkey("escape", () => dialogStore.close("hotkeyHelp"), { enabled: open });

  if (!open) return null;

  const close = () => dialogStore.close("hotkeyHelp");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      data-testid="hotkey-help-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
          <button
            data-testid="hotkey-help-close"
            onClick={close}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto px-4 py-3 space-y-4">
          {SCOPE_ORDER.map((scope) => {
            const entries = HOTKEY_MAP.filter((e) => e.scope === scope);
            if (entries.length === 0) return null;
            return (
              <section key={scope}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  {SCOPE_LABELS[scope]}
                </h3>
                <table className="w-full text-sm">
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={`${entry.scope}-${entry.combo}`} className="hover:bg-gray-50">
                        <td className="py-0.5 pr-4 font-mono text-gray-700 whitespace-nowrap w-36">
                          {entry.combo}
                        </td>
                        <td className="py-0.5 text-gray-600">{entry.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
