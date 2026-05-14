// HeaderBar.tsx — persistent top-chrome, present on every route.
// Issue #272. Spec: docs/specs/2026-05-12-header-bar-design.md.
//
// Contains ProjectLoadControls (same module). No app title or logo —
// controls-only, matching the legacy pd-ocr-labeler behaviour.
import ProjectLoadControls from "./ProjectLoadControls";

export default function HeaderBar() {
  return (
    <header data-testid="header-bar" className="flex items-center gap-2 px-4 py-2 border-b">
      <ProjectLoadControls />
    </header>
  );
}
