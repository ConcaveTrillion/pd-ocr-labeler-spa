# Parity status — pd-ocr-labeler-spa vs pd-ocr-labeler

**Snapshot.** 2026-05-15 (updated after iter-15 / spec 21+22+23 sweep).
**Previous version.** 2026-05-14 (rewritten after parity audit;
[`PARITY_GAPS_2026_05_14.md`](PARITY_GAPS_2026_05_14.md) explains that rewrite).
**Audience.** CT, deciding next priorities.
**Scope.** What the SPA replacement covers today vs what the legacy
NiceGUI labeler ships, with explicit columns for **component-built**
vs **wired-into-the-page**.

> **What changed since the 2026-05-14 snapshot.** The 20 commits
> following the audit landed all three gap-filling spec sweeps
> (spec 21 / 22 / 23).  The SPA now has a real Konva renderer,
> a real `ProjectPage` shell (477 LOC, all components mounted), and
> real backend handlers for every page payload, save/load/reload-ocr,
> all 11 word mutations, all 8 line/paragraph mutations, rematch-gt,
> and selection.  The remaining gaps are integration-level
> (image-cache → page-image plumbing, WeightsResolver wiring for
> non-default OCR models) and polish (export launcher, source-folder
> UI).

---

## 1. One-paragraph status

The SPA is now functionally end-to-end for the core labeling loop.
Backend: every per-page endpoint has a real handler — `GET
/pages/{idx}` assembles a full `PagePayload` via `_page_payload`;
save/load/reload-ocr job handlers call `persist_page_to_file` and
`LocalDoctrPageLoader.run_ocr` respectively; word/line/paragraph
mutation endpoints mutate `ProjectState` and return a refreshed
payload; rematch-gt and selection are wired. Frontend:
`ProjectPage.tsx` is a 477-LOC real shell that mounts
`PageImageCanvas` (real Konva Stage with four drag modes),
`BBoxOverlay` (Konva rects), `ImageTabsHeader`, `PageActions`,
`ToolbarActionGrid`, `TextTabs`, `WordMatchView`, `WordEditDialog`,
`BusyOverlay`, `InlineBanners`, `Splitter`, `ProjectNavigationControls`,
`FilterToggle`, and `PlaintextEditor`. Dialogs (`OCRConfigModal`,
`ExportDialog`, `HotkeyHelpModal`, `ConfirmDialog`) are mounted in
`App.tsx` and triggered via `useDialogStore`. **Remaining gaps** are
at the integration boundary: `reload_ocr` requires
`page_loader` injected into `runner.context` at startup (currently
NOT wired — returns 503 `page_loader_not_wired` in production);
`ExportDialog` has no launcher button visible to users (dialog exists,
trigger in `useDialogStore` exists, but no button calls
`dialogStore.open("export")`); the image-cache HTTP route works but
nothing points the page image URL at a real file yet; source-folder
picker UI is stub-only.

---

## 2. Legend

- ✅ **done** — built, tested, in the running tree.
- 🟩 **built** — built and unit-tested but **not wired into the page**.
- 🟡 **partial** — some parts built, others stub.
- ⬜ **not started** — no implementation.
- ⛔ **blocked** — explicitly waiting on a decision or upstream.

The `Wired` column says yes/no for whether the component renders in
the actual running app.

---

## 3. Backend parity table

| Capability | Status | Wired | Notes |
|---|---|---|---|
| CLI entry (`pd-ocr-labeler-ui`) | ✅ done | yes | iter 47 |
| `/healthz` | ✅ done | yes | M0 |
| Lifespan + shutdown clean | ✅ done | yes | iter 48 |
| Settings (env-driven, frozen) | ✅ done | yes | B-63 closed |
| Storage adapter (filesystem) | ✅ done | yes | S3 deferred per D-019/D-042 |
| Auth adapter (none) | ✅ done | yes | B-42 minor signature drift |
| OCR adapter Protocol | 🟡 partial | partial | `LocalDoctrPageLoader` + `PredictorCache` shipped; `WeightsResolver` default returns `None` (falls through to stock DocTR); `modal`/`shared_container` are `NotImplementedYet` per D-042 |
| Request-ID middleware + audit log | ✅ done | yes | |
| Error handler (500 envelope) | ✅ done | yes | D-040 |
| `/env.js` | ✅ done | yes | |
| Static SPA fallback | ✅ done | yes | |
| Image-cache HTTP route | 🟡 partial | yes | Route works; `_build_image_url` produces URL; real file serving not yet plumbed end-to-end |
| Project discovery / enumeration | ✅ done | yes | `GET /api/projects`, `POST /api/projects/load`, `POST /api/projects/discover`, `POST /api/projects/source-root` |
| Session restore (last project, last page) | ✅ done | yes | session_state read+write, D-041 |
| Ground-truth + project envelope read | ✅ done | yes | `core/persistence/ground_truth.py`, `project_envelope.py` |
| Three-lane persistence model (labeled/cached/ocr) | ✅ done | yes | `ensure_page_model` dispatcher + `LaneResolver` |
| `GET /api/projects/{id}/pages/{idx}` payload | ✅ done | yes | spec-23-A (#306) — `_page_payload` helper assembles full `PagePayload` |
| `POST .../pages/{idx}/save` | ✅ done | yes | spec-23-B2 (#308) — calls `persist_page_to_file` |
| `POST .../pages/{idx}/load` | ✅ done | yes | spec-23-B2 (#308) — calls `ensure_page_model` + `_page_payload` |
| `POST .../pages/{idx}/reload-ocr` | 🟡 partial | no | spec-23-B1 (#307) — handler calls `LocalDoctrPageLoader.run_ocr`; but `page_loader` NOT injected in `bootstrap.py` → 503 in production |
| `POST .../pages/{idx}/rematch-gt` | ✅ done | yes | spec-23-F (#320) — real `rematch_page` wrapper |
| `POST .../pages/{idx}/rotate` (manual) | ✅ done | yes | M9.1 (#263); endpoint live; frontend rotate button in `PageActions` now mounted |
| `POST .../auto-rotate-all` | ✅ done | yes | M9.2 (#264); endpoint live; `OCRConfigModal` auto-rotation section mounted in `App.tsx` |
| Word mutation endpoints (×11) | ✅ done | yes | spec-23-C1+C2 (#315+#316) — GT/style/component/validated/batch/add/rebox/nudge/split/merge/erase all real |
| Line / paragraph mutation endpoints (×8) | ✅ done | yes | spec-23-D1+D2 (#317+#318) — copy/validate/delete/merge/split/refine-batch all real |
| Selection endpoint | ✅ done | yes | spec-23-E (#319) — `POST .../selection` wired |
| Refine bboxes (page + project) | ✅ done | yes | Job handler shipped; `PageActions` refine button now mounted |
| Save Project (multi-page job) | ✅ done | yes | spec-23-B2 (#308) — `handle_save_project` iterates pages |
| Export (per-style `labels.json`) | ✅ done | no | `handle_export` real (#226); `ExportDialog` mounted in `App.tsx` but **no trigger button** calls `dialogStore.open("export")` |
| Notification SSE | ✅ done | yes | NotificationQueue + `/api/notifications/stream` + `useNotificationStream` |
| OCR config snapshot endpoint | ✅ done | yes | `GET /api/ocr-config` etc.; `OCRConfigModal` mounted in `App.tsx` and triggered from `HeaderBar` |

---

## 4. Frontend parity table — built vs wired

| Capability | Built | Wired | Notes |
|---|---|---|---|
| Vite + React 19 + Vitest scaffold | ✅ | yes | #246 — toolchain works, MSW + Konva mock + coverage |
| Tailwind | ✅ | yes | B-18 resolved |
| ESLint + tsc + pyright in CI | ✅ | yes | #176 |
| Router (`react-router-dom`) + `QueryClient` | ✅ | yes | #240, #193 |
| Header bar | ✅ | yes | #272 — tune-icon triggers OCR config modal via `useDialogStore` |
| `ProjectLoadControls` (dropdown + LOAD) | ✅ | yes | shipped; powers M2 load flow |
| `EmptyProjectState` + `RootPage` | ✅ | yes | #84, #274 |
| `Toaster` (sonner) | ✅ | yes | #231 |
| `useNotificationStream` (SSE → toasts) | ✅ | yes | #231 |
| **`ProjectPage` (real shell)** | ✅ | yes | spec-22-C (#314) — 477 LOC; all components mounted |
| `ProjectNavigationControls` (Prev/Next/GoTo) | ✅ | yes | spec-22-B2 (#311) — real; replaces `display:none` stubs |
| `PageActions` (Reload/Save/Load/Rematch/Rotate) | ✅ | yes | mounted in `ProjectPage` |
| `ImageTabsHeader` (layer checkboxes + selection mode + Erase) | ✅ | yes | spec-21-A4 (#299) fixed `SelectionMode` type + paragraph radio bug |
| `PageImageCanvas` (Konva) | ✅ | yes | spec-21-A2+A3+A5+A6+A7+A8 (#297–#304) — real `<Stage>` + image + overlay rects + all drag modes |
| `BBoxOverlay` (Konva rects) | ✅ | yes | spec-21-A3 (#298) — real Konva rects with sidecar `data-testid` divs |
| `Splitter` (horizontal pane resize) | ✅ | yes | spec-22-B1 (#310) |
| `TextTabs` (Matches / GT / OCR) | ✅ | yes | spec-22-C wires it in `ProjectPage` |
| `FilterToggle` (Unvalidated/Mismatched/All) | ✅ | yes | spec-22-B3 (#312) |
| `WordMatchView` (virtualized) | ✅ | yes | mounted in `TextTabs` → `ProjectPage` |
| `LineCard` (per-line GT/OCR + per-word controls) | ✅ | yes | rendered via `WordMatchView` |
| `WordCell` + GT-input | ✅ | yes | #203 |
| `WordTagRow` + tag chips | ✅ | yes | |
| `PlaintextEditor` (GT / OCR sub-tabs) | ✅ | yes | spec-22-B4 (#313) |
| `ToolbarActionGrid` (Page/Paragraph/Line/Word × actions) | ✅ | yes | mounted in `ProjectPage` (#314) |
| `WordEditDialog` (merge/split/erase/nudge/refine) | ✅ | yes | mounted in `ProjectPage` (#314); opened via word double-click |
| `WordImageCanvas` (Konva, in dialog) | ✅ | yes | real Konva; opens when `WordEditDialog` is triggered |
| `WordActionRows`, `WordRefineNudgeRows` | ✅ | yes | part of `WordEditDialog` |
| `OCRConfigModal` | ✅ | yes | mounted in `App.tsx` (#309); header tune-icon triggers via `useDialogStore` |
| `ExportDialog` | 🟩 | no | mounted in `App.tsx` (#309); **no trigger button yet** — no button calls `dialogStore.open("export")` |
| `HotkeyHelpModal` | ✅ | yes | mounted in `App.tsx`; `?` key triggers it |
| `ConfirmDialog` | ✅ | yes | mounted in `ProjectPage`; `useConfirm()` drives it |
| `BusyOverlay` | ✅ | yes | mounted in `ProjectPage` (#314) |
| `InlineBanners` (OCR-failed / not-found / image-drift) | ✅ | yes | mounted in `ProjectPage` (#314) |
| Hotkey hooks (`useHotkey`, `useGlobalHotkeys`, viewport/matches/dialog) | ✅ | yes | #235/#236/#237/#202 — wired via mounted consumers |
| Data hooks (`useProject`, `usePage`, `useJobProgress`, mutations) | ✅ | yes | #192/#215/#216/#202 |
| Driver-contract conformance E2E test | ✅ | yes | #241/#242/#247 — passes; real testids now in real components |

---

## 5. Outstanding blockers (user-decision queue)

**Q-A7** (per-mark glyph provenance) is open but only blocks M11; not
on the critical path.

**Remaining integration gaps** (no user decision needed, but work is
outstanding):

1. **`page_loader` not injected at startup.** `bootstrap.py` does not
   wire a `LocalDoctrPageLoader` instance into `runner.context["page_loader"]`.
   The `reload_ocr` job handler exists and is correct but returns 503
   `page_loader_not_wired` in production. Fix: instantiate
   `LocalDoctrPageLoader` (with `PredictorCache` + default resolver)
   in `bootstrap.py` after the runner context dict is populated.

2. **`ExportDialog` has no trigger.** The dialog exists and is mounted,
   but no UI element calls `dialogStore.open("export")`. Fix: add an
   Export button to `PageActions` or `HeaderBar`.

3. **Image-cache file serving.** `_build_image_url` generates URLs;
   the image-cache HTTP route exists. The missing link is that the
   image file is not guaranteed to be present in the cache directory
   before first `GET /pages/{idx}` — the `ensure_page_model` path
   needs to copy/symlink the page image into the image cache so the
   URL is actually resolvable.

---

## 6. Open bugs of consequence (medium+)

| ID | Severity | One-line |
|---|---|---|
| **B-42** | low | `IAuth.verify` signature drift; one-line fix |

Closed since previous snapshot: B-58, B-72, Q-A12, BBL-AUDIT-1
(ImageTabsHeader paragraph + SelectionMode fixed in spec-21-A4).
See [`docs/archive/BUGS_RESOLVED.md`](archive/BUGS_RESOLVED.md).

---

## 7. Recommendation: next priorities

(As of 2026-05-15 — specs 21/22/23 are all landed.)

1. **Wire `page_loader` in `bootstrap.py`.** One-slice fix; unblocks
   `reload_ocr` in production. This is the highest-value remaining gap
   since without it the user can never trigger fresh OCR.
2. **Add Export trigger button.** One-liner in `PageActions` or
   `HeaderBar` calling `dialogStore.open("export")`. Unblocks the
   entire export user flow.
3. **Image-cache population on first `GET /pages/{idx}`.** Ensure the
   page image file is present in the image-cache dir when
   `_build_image_url` returns a URL. May require a small helper in
   `_page_payload` or `LaneResolver`.
4. **Source-folder picker UI.** Current `POST /api/projects/source-root`
   exists and persists `config.yaml`, but the UI has stub buttons with
   no dialog. Spec 22 §10 covers the picker.
5. **Export trigger + `useProject` shape alignment.** Memory note
   `project_useProject_shape_drift.md` flags that `GET /api/projects/{id}`
   returns a flat `Project`, not `LoadProjectResponse`; hook types may
   diverge; audit and fix if needed.

---

## 8. Risk register

1. **`WeightsResolver` resolves to `None` → stock DocTR models only.**
   Custom HF weights not yet resolvable. The OCR config modal lets
   users pick a model key but the resolver doesn't act on it.
   Mitigation: the default stock model is usable; custom weights is
   a follow-on (M3-proper scope per memory note).
2. **Driver-contract sidecar divs.** Spec 21 §6 keeps `data-testid`
   sidecar divs alongside Konva nodes. Mitigation: dev/test-only via
   `import.meta.env.MODE !== "production"`; bundle stays clean.
3. **pd-book-tools mutation gaps.** spec-23-C1 notes `Word.set_validated`
   is missing upstream (pd-book-tools#52); spec-23-C2 notes
   `Page.merge_words` + `Page.erase_pixels` are missing (pd-book-tools#53).
   These stubs fall back gracefully per handler comments.

---

## 9. References

- Audit: [`docs/PARITY_GAPS_2026_05_14.md`](PARITY_GAPS_2026_05_14.md)
- Konva spec: [`specs/21-konva-renderer.md`](../specs/21-konva-renderer.md)
- Wireup spec: [`specs/22-page-surface-wireup.md`](../specs/22-page-surface-wireup.md)
- Backend payload spec: [`specs/23-page-payload-backend.md`](../specs/23-page-payload-backend.md)
- D-043: [`specs/17-decisions.md`](../specs/17-decisions.md#d-043--konva-renderer-commitment-supersedes-d-020)
- Legacy UI inventory: [`pd-ocr-labeler/docs/architecture/ui-action-buttons.md`](../../pd-ocr-labeler/docs/architecture/ui-action-buttons.md)
