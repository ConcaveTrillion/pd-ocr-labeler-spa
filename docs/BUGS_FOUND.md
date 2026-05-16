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
