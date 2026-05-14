// ProjectPage.tsx — stub for the main labeling surface.
// Full implementation: M2–M9 milestones per specs/16-milestones.md.
// This stub provides the route target so React Router doesn't 404 on
// /projects/:id/pages/pageno/:n while the full UI is being built.
//
// Issue #240 (router setup). Full feature: #192 and downstream.

import { useParams } from "react-router-dom";

export default function ProjectPage() {
  const { projectId, pageNo } = useParams<{ projectId: string; pageNo: string }>();

  return (
    <div data-testid="project-page" className="flex flex-col h-full">
      <p className="p-4 text-sm text-gray-500">
        Project: {projectId} — Page {pageNo} (full UI in progress)
      </p>
    </div>
  );
}
