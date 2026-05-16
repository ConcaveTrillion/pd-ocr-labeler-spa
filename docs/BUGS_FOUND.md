# BUGS_FOUND — open code-review findings

> **Resolved bugs are archived in [`archive/BUGS_RESOLVED.md`](archive/BUGS_RESOLVED.md).**
> Only currently-open findings live below. When a bug is closed, move its full entry
> to the archive in the same commit that closes it (see
> [`DEVELOPMENT.md` § Archive on close](DEVELOPMENT.md#archive-on-close)).

Severity legend: blocker > high > medium > low > nit.

New findings are filed at code-review checkpoints driven by the dev `/loop`. Each
entry includes **Status / Severity / Where / Issue / Why-it-matters / Suggested-fix**.
The closing-commit hash and iter number are recorded on the **Status** line at
close time, then the entry moves to the archive.

---

## BUG-KBD-1 — `Mod+,` not registered — OCR Config modal unreachable by keyboard

- **Status:** open
- **Severity:** high
- **Where:** `frontend/src/hooks/useGlobalHotkeys.ts` / `frontend/src/App.tsx`
- **Issue:** `HOTKEY_MAP` lists `{ combo: "mod+,", scope: "global", description: "OCR Config" }` but
  no `useHotkey("mod+,", ...)` call exists anywhere in the codebase. `useGlobalHotkeys` does not
  include it, and `App.tsx` has no separate binding. The only way to open `OCRConfigModal` is
  clicking a button.
- **Why it matters:** The hotkey is advertised in the `?` help modal (via the bridge) but pressing
  it does nothing. Users who rely on keyboard-only workflows cannot reach OCR config.
- **Suggested fix:** Add `useHotkey("mod+,", () => dialogStore.open("ocrConfig"))` inside
  `useGlobalHotkeys` (or directly in `AppShell`) alongside the `?` binding.

## BUG-KBD-2 — `useGlobalHotkeys` hook never called — global save/nav hotkeys dead

- **Status:** open
- **Severity:** high
- **Where:** `frontend/src/hooks/useGlobalHotkeys.ts` — no import in any `.tsx` file
- **Issue:** `useGlobalHotkeys` exports `Mod+S`, `Mod+Shift+S`, `Mod+L`, `Mod+G`, `Mod+E`,
  `Mod+ArrowLeft`, `Mod+ArrowRight`, `Mod+Home`, `Mod+End`. The hook has unit tests but is
  never `import`ed or called from any component or page. The bindings are completely inactive.
  `PageActions.tsx` does call `useHotkey("mod+r", ...)` and `useHotkey("mod+shift+r", ...)` as
  a separate island, but the rest of the global map is dead.
- **Why it matters:** Save Page (`Mod+S`), page navigation (`Mod+Arrow*`), and Export (`Mod+E`)
  all appear in the help modal but silently do nothing when pressed.
- **Suggested fix:** Call `useGlobalHotkeys({ onSavePage, onSaveProject, ... })` in `ProjectPage`
  (or `AppShell`) wired to the appropriate mutation/navigation callbacks.

## BUG-KBD-3 — `useMatchesHotkeys` hook never called — J/K/V/U/D/R/M in matches list dead

- **Status:** open
- **Severity:** high
- **Where:** `frontend/src/hooks/useMatchesHotkeys.ts` — no import in any `.tsx` file
- **Issue:** `useMatchesHotkeys` exports J, K, V, U, D, R, Shift+R, M, O, G. The hook has unit
  tests but is never called from `WordMatchView`, `TextTabs`, `ProjectPage`, or anywhere else.
  All matches-list keyboard navigation and actions are inactive.
- **Why it matters:** The matches panel is the primary review surface; keyboard-only users cannot
  navigate line cards or validate/merge words without a mouse.
- **Suggested fix:** Call `useMatchesHotkeys({ onLineNav, onValidate, ... })` inside
  `WordMatchView` (or its parent) wired to the existing line-mutation hooks.

## BUG-KBD-4 — `ConfirmDialog` has no keyboard bindings — Escape and Enter do nothing

- **Status:** open
- **Severity:** medium
- **Where:** `frontend/src/components/ConfirmDialog.tsx`
- **Issue:** `ConfirmDialog` renders Confirm and Cancel buttons but has no `onKeyDown` handler and
  no `useHotkey` registration. The global `escape` listener in `HotkeyHelpModal` only closes the
  help modal. When `ConfirmDialog` is open, pressing Escape or Enter does not dismiss it.
  Clicking backdrop (`e.target === e.currentTarget`) does call `onCancel`, but this requires a
  mouse.
- **Why it matters:** Destructive-action flows (Mod+L, Mod+G, line Delete) require confirmation;
  if the confirm dialog ignores keyboard, the workflow is broken for keyboard-only users.
- **Suggested fix:** Add `useHotkey("escape", () => onCancel(), { enabled: open })` and
  `useHotkey("enter", () => onConfirm(), { enabled: open })` inside `ConfirmDialog`, or add an
  `onKeyDown` on the outer div. The Confirm button already has `autoFocus`, so Enter naturally
  fires on the focused button — verify this is enough in browser (may resolve without extra code).

## BUG-KBD-5 — `Mod+J` jump-to-page not registered — no `useHotkey` call exists

- **Status:** open
- **Severity:** low
- **Where:** `frontend/src/hooks/useGlobalHotkeys.ts` (missing) and `HOTKEY_MAP` line 37
- **Issue:** `HOTKEY_MAP` lists `{ combo: "mod+j", scope: "global", description: "Jump to page…" }`.
  No `useHotkey("mod+j", ...)` call exists anywhere. The jump-to-page dialog / inline page-input
  is not wired to this key.
- **Why it matters:** Users expect to jump to an arbitrary page number from keyboard; it's
  advertised in the help modal but silently inert.
- **Suggested fix:** Add `onJumpToPage` to `GlobalHotkeyHandlers` and register `mod+j` in
  `useGlobalHotkeys`. Wire it to the page-number input focus / jump dialog.

---

## BUG-SMOKE-3 — data_root default mismatches legacy labeler's XDG path on Linux

- **Status:** open
- **Severity:** medium
- **Where:** `src/pd_ocr_labeler_spa/settings.py` — `data_root` default factory
- **Issue:** The SPA defaults `data_root` to `~/pd-ocr-labeler/`. The legacy
  NiceGUI labeler uses XDG-aware `~/.local/share/pd-ocr-labeler/` on Linux.
  Labeled envelopes live under `~/.local/share/pd-ocr-labeler/labeled-projects/`;
  the SPA looks in `~/pd-ocr-labeler/labeled-projects/` by default and finds
  nothing. Users must set `PDLABELER_DATA_ROOT=~/.local/share/pd-ocr-labeler`
  explicitly to access legacy-labeled pages.
- **Why it matters:** Upgrading users see all previously-labeled pages as blank
  (falls through to OCR re-run) without the env var. Breaks continuity with
  existing labeled work.
- **Suggested fix:** Mirror `PersistencePathsOperations.get_data_root()` from the
  legacy codebase: on Linux use `$XDG_DATA_HOME/pd-ocr-labeler` (default
  `~/.local/share/pd-ocr-labeler`); on macOS `~/Library/Application Support/…`;
  on Windows `%APPDATA%/…`.
