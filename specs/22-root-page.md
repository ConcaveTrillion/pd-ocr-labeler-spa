# 22 — RootPage

> **Status**: Draft
> **Last updated**: 2026-05-11
> **Spec-Issue**: ConcaveTrillion/pd-ocr-labeler-spa#85

---

## TL;DR

`RootPage` is the route element for `/`. It calls `GET /api/projects`,
checks the `selected` field, and either shows `<EmptyProjectState>`
(nothing selected) or issues a replace-mode `<Navigate>` to
`/projects/{id}/pages/pageno/1`. Full last-page restoration is M3 scope.
While the query is in-flight, the page renders nothing (null).

---

## Context

M1.h is the final frontend gate before M1 closes. `RootPage` is the
content area for `/`; `HeaderBar` is mounted above it in `App.tsx` and
is NOT RootPage's concern. The backend's `GET /api/projects` already
returns `selected: string | null` (the active project id, set from the
carrier which is seeded from `session_state.json` at startup by
`startup_discovery`).

The SPA has no API client yet at the time of this spec; `api/client.ts`
is created as part of spec #83 (HeaderBar). This spec assumes that
prerequisite lands in the same M1.h PR set.

**Spec-03 vs spec-13 inconsistency (tracked as #87):** `specs/03-frontend.md:176`
says "first page" while `specs/13-driver-contract.md:34` says "last page".
Spec 13 is the driver-contract authority. For M1.h, RootPage redirects
to page 1 (spec 03 literal), because full last-page restoration requires
`ProjectState` to be populated via the M3 lifespan hook — that is out of
scope here. When M3 ships, RootPage will be updated to redirect to the
correct last page.

---

## Constraints

- `RootPage` is the route element for `routes.root` (`/`) only.
  It does NOT own `HeaderBar` (that's `App.tsx`).
- `EmptyProjectState` is rendered when `GET /api/projects` returns
  `selected: null`.
- The redirect target is `/projects/{id}/pages/pageno/1` for M1.h.
  Full last-page restoration (using `last_page_index` from session state)
  is deferred to M3 (see Open questions).
- The redirect uses `<Navigate ... replace />` (browser-history replace,
  matching legacy `ui.navigate.history.replace`).
- If `GET /api/projects` fails (network error), treat as no-project:
  show `EmptyProjectState`. Do not surface an error page.
- While the query is in-flight: render `null` (no spinner). HeaderBar
  is always visible above; the empty main area is acceptable for the
  100–200 ms the query takes.
- M1 acceptance test: `RootPage.test.tsx::renders_empty_state` must
  pass — shows "No project loaded" copy (from `EmptyProjectState`).

---

## Decision

### Data flow

```
RootPage (mounts at route '/')
  └── useQuery(['projects'], () => apiGet('/api/projects'))
        → ListProjectsResponse { projects, selected, ... }

  if (isLoading || isError) → return null
  if (selected) → <Navigate to={buildProjectUrl(selected) + '/pages/pageno/1'} replace />
  else          → <EmptyProjectState />
```

`buildProjectUrl` from `src/routes.ts` is the canonical URL builder.
`apiGet` from `api/client.ts` (created in spec #83).

### Why not `GET /api/session-state`

A `GET /api/session-state` endpoint would return `last_page_index`
directly, enabling redirect to the exact last page. This is deferred
to M3 for two reasons:

1. The `ProjectState.loaded_project` is empty at cold start (the
   carrier is set but no full `Project` model is loaded until a
   `POST /api/projects/load` call or the M3 lifespan hook fires).
   `GET /api/projects/{id}` would return 404 at startup, making
   a two-step fetch unreliable.
2. M3 will wire up `app_state.startup()` in the lifespan, which will
   load the project into `ProjectState`. At that point, `GET /api/projects/{id}`
   becomes reliable, and RootPage can use `current_page_index` from it.

### Error handling

`isError` from `useQuery` (network failure, 5xx): treat identically to
`selected: null` — render `<EmptyProjectState />`. The user can then
use the project dropdown in `HeaderBar` to manually load a project.
No error banner in `RootPage` itself; toast notifications (spec 11)
handle backend errors globally.

### Wiring into App.tsx

RootPage is the `element` of `<Route path={routes.root}>`. The App.tsx
rewrite (part of M1.h work) must import and register it:

```tsx
<Route path={routes.root} element={<RootPage />} />
```

---

## Contract / Acceptance

### Vitest tests — `RootPage.test.tsx`

All tests run with msw 2.x mock server; handler for `GET /api/projects`
is set per test.

| Test | Handler response | Expected render |
|---|---|---|
| `renders_empty_state` | `{ selected: null, projects: [] }` | `EmptyProjectState` in document |
| `redirects_to_last_project_page_1` | `{ selected: 'my-proj', projects: [...] }` | `<Navigate>` to `/projects/my-proj/pages/pageno/1` |
| `renders_nothing_while_loading` | (query pending) | document is empty |
| `renders_empty_state_on_error` | Network error | `EmptyProjectState` in document |

The `renders_empty_state` test is the M1 acceptance gate
(`specs/16-milestones.md`). It asserts the "No project loaded" copy
from `EmptyProjectState` is visible.

### Make targets

- `make frontend-test` — green
- `make frontend-build` — green (TypeScript strict)

### Driver-contract sanity (M1 acceptance)

From `specs/16-milestones.md`:

> `Frontend: RootPage.test.tsx::renders_empty_state` shows the "No project loaded" copy.
> `Driver-contract sanity: data-testid="project-load-button"` exists on the header even though it's disabled.

The `project-load-button` testid is in `HeaderBar` (spec #83/#21), not in
`RootPage`. The Vitest test for this sanity check lives in `HeaderBar.test.tsx`.

---

## Trade-offs considered

**Null during loading vs. skeleton:** A null render avoids a layout
flash but means the `<main>` area is blank for ~100–200 ms. A skeleton
or spinner would be more polished but adds complexity and is not required
by the M1 acceptance test. Null chosen for simplicity.

**Redirect to page 1 vs. last page:** Last-page restoration is correct
per spec 13 but requires M3 infrastructure. Redirecting to page 1 is
a known temporary deviation, explicitly documented here and tracked as
issue #87. When M3 lands, the implementation update is a one-liner.

**EmptyProjectState on error vs. error banner:** A dedicated error state
would tell the user "the backend is unreachable." However, the global
notification layer (spec 11) handles this. RootPage treating errors as
"no project" is simpler and consistent with the legacy labeler's
behavior on startup failures.

---

## Consequences

- When M3 ships the lifespan hook, RootPage's redirect target changes
  from `pageno/1` to `pageno/{last_page_index + 1}` (1-based). That
  change requires: (a) a `GET /api/projects/{selected}` call or a new
  `GET /api/session-state` endpoint, and (b) an update to
  `redirects_to_last_project_page_1` test.
- `specs/03-frontend.md:176` needs to be updated to say "last page"
  to align with spec 13. Tracked as #87 (doc-only fix).

---

## Open questions

1. **M3 update path for last-page redirect**: When `ProjectState` is
   populated at startup (M3 lifespan), should RootPage use
   `GET /api/projects/{id}` (existing endpoint) or a new
   `GET /api/session-state` endpoint to get `last_page_index`?
   Tracked as part of the M3 spec work; not a blocker for M1.h.

---

## References

- `specs/03-frontend.md:176` — `/` route placeholder / redirect rule (first vs last page inconsistency tracked as #87)
- `specs/13-driver-contract.md:33-34` — Canonical route table for `/` (authority for "last page")
- `specs/16-milestones.md` — M1 acceptance gates (`renders_empty_state`, driver-contract sanity)
- `specs/02-backend.md §5.2` — `GET /api/projects` contract (`selected` field)
- `specs/21-header-bar.md` — HeaderBar spec (prerequisite: `api/client.ts`)
- `specs/14-testing.md` — Vitest + msw test structure
