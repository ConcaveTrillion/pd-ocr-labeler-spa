// QuickSearch.tsx — centred ⌘K search field in the header.
// P1.c (Gap 6): placeholder input + ⌘K keycap chip that opens the hotkey overlay.
// Search submit is a follow-up; this slice wires the affordance only.
//
// data-testids:
//   quick-search           — outer wrapper div
//   quick-search-input     — the <input> element
//   quick-search-keycap    — the ⌘K keycap chip button

import { useCallback } from "react";
import { Search } from "lucide-react";
import { dialogStore } from "../../stores/dialog-store";

export function QuickSearch() {
  const openHotkeyHelp = useCallback(() => {
    dialogStore.open("hotkeyHelp");
  }, []);

  return (
    <div
      data-testid="quick-search"
      className="flex items-center gap-1.5 h-7 px-2 rounded border border-border-2 bg-bg-sunk text-ink-3 min-w-[160px] max-w-[240px] w-full cursor-text"
      onClick={(e) => {
        // Focus the input when clicking anywhere in the widget
        const input = (e.currentTarget as HTMLElement).querySelector("input");
        input?.focus();
      }}
    >
      <Search size={11} aria-hidden="true" className="shrink-0 text-ink-3" />

      <input
        type="text"
        data-testid="quick-search-input"
        placeholder="Search…"
        aria-label="Quick search"
        // Non-functional in this slice; submit is a follow-up.
        readOnly
        className="flex-1 bg-transparent text-[11px] text-ink-2 placeholder:text-ink-3 focus:outline-none cursor-text"
      />

      {/* ⌘K keycap chip — opens the hotkey overlay */}
      <button
        type="button"
        data-testid="quick-search-keycap"
        aria-label="Show keyboard shortcuts (⌘K)"
        title="Show keyboard shortcuts"
        onClick={(e) => {
          e.stopPropagation();
          openHotkeyHelp();
        }}
        className="shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded border border-border-2 bg-bg-raised text-[9px] font-medium text-ink-3 hover:text-ink-1 hover:border-ink-3 transition-colors leading-none"
      >
        <span aria-hidden="true">⌘K</span>
      </button>
    </div>
  );
}
