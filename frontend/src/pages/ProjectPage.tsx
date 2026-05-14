// ProjectPage.tsx — stub for the main labeling surface.
// Full implementation: M2–M9 milestones per specs/16-milestones.md.
// This stub provides the route target so React Router doesn't 404 on
// /projects/:id/pages/pageno/:n while the full UI is being built.
//
// Issue #240 (router setup). Full feature: #192 and downstream.
//
// Stub driver-contract testids (#241): nav controls, source-folder dialog stubs.
// These carry data-testid-stub="true" and are hidden until real UI ships.

import { useParams } from "react-router-dom";

export default function ProjectPage() {
  const { projectId, pageNo } = useParams<{ projectId: string; pageNo: string }>();

  return (
    <div data-testid="project-page" className="flex flex-col h-full">
      <p className="p-4 text-sm text-gray-500">
        Project: {projectId} — Page {pageNo} (full UI in progress)
      </p>

      {/* Stub nav controls — driver-contract §2.4, not yet implemented */}
      <div style={{ display: "none" }}>
        <button
          data-testid="nav-prev-button"
          data-testid-stub="true"
          aria-label="Previous page (stub)"
        >
          Prev
        </button>
        <button data-testid="nav-next-button" data-testid-stub="true" aria-label="Next page (stub)">
          Next
        </button>
        <button
          data-testid="nav-goto-button"
          data-testid-stub="true"
          aria-label="Go to page (stub)"
        >
          Go
        </button>
        <input
          data-testid="nav-page-input"
          data-testid-stub="true"
          aria-label="Page number (stub)"
        />
        <span data-testid="nav-page-total-label" data-testid-stub="true">
          / 0
        </span>
      </div>

      {/* Stub source-folder dialog — driver-contract §2.2, not yet implemented */}
      <div style={{ display: "none" }}>
        <span data-testid="source-folder-current-path-label" data-testid-stub="true" />
        <input data-testid="source-folder-path-input" data-testid-stub="true" />
        <button data-testid="source-folder-home-button" data-testid-stub="true">
          Home
        </button>
        <button data-testid="source-folder-up-button" data-testid-stub="true">
          Up
        </button>
        <button data-testid="source-folder-open-typed-button" data-testid-stub="true">
          Open
        </button>
        <button data-testid="source-folder-use-current-button" data-testid-stub="true">
          Use Current
        </button>
        <button data-testid="source-folder-cancel-button" data-testid-stub="true">
          Cancel
        </button>
        <button data-testid="source-folder-apply-button" data-testid-stub="true">
          Apply
        </button>
      </div>
    </div>
  );
}
