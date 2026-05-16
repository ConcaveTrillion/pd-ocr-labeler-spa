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

## BUG-SMOKE-1 — Word mutations fail when page loaded via labeled/cached lane

- **Status:** open
- **Severity:** high
- **Where:** `api/words.py` — `_resolve_page_object` / all word mutation handlers
- **Issue:** `pstate.page_record.payload` holds a raw `UserPageEnvelope` when
  the page was loaded via the labeled or cached lane (not OCR). `_resolve_page_object`
  returns that envelope directly. `_resolve_word` then calls
  `getattr(page, "lines", None)` on the envelope — but `UserPageEnvelope` has
  no `.lines` attribute — so every word mutation (GT edit, style, validated,
  rebox, split, merge) returns `word_not_found` 404. The `_page_payload` helper
  in `pages.py` does lift the envelope → `Page` object inline, but does not write
  the lifted `Page` back to `pstate.page_record.payload`.
- **Why it matters:** Any project with previously-saved (labeled) or cached pages
  cannot have words mutated. This blocks the core edit workflow for all returning
  users.
- **Suggested fix:** After `_page_payload` lifts `payload_obj` to a `Page` via
  `Page.from_dict(envelope.payload.page)`, write it back to
  `pstate.page_record.payload`. Alternatively, factor the lift into
  `ensure_page_model` so `PageLoadOutcome.payload` is always a `Page`.

## BUG-SMOKE-2 — GET /pages returns project-level generation; save checks page-level

- **Status:** open
- **Severity:** high
- **Where:** `api/pages.py` — `_page_payload` (line 637) and `save_page` (line 757)
- **Issue:** `_page_payload` stamps `generation=project_state.generation`
  (`ProjectState._generation`, bumped on project load / page-state set / page-nav).
  `save_page` checks `body.generation != pstate.generation` where `pstate.generation`
  is `PageState.generation` (bumped only by word mutations). After a fresh project
  load + GET /pages/0, the frontend receives e.g. `generation: 4` (project-level),
  sends it back on save, but the server has `pstate.generation == 0` → 409
  `generation_mismatch`. Confirmed: sending `generation: 0` saves correctly; the
  frontend uses the wrong value from the GET response.
- **Why it matters:** Every SPA save attempt fails with 409. This completely blocks
  the save workflow for unmodified pages.
- **Suggested fix:** Change `_page_payload` to stamp `pstate.generation` (page-level)
  instead of `project_state.generation`. This aligns the save-guard with the spec
  intent of a per-page dirty check.

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
