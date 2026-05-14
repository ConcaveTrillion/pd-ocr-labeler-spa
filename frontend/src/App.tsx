// App.tsx — SPA root: router, QueryClient provider, and route table.
// Spec: docs/specs/2026-05-12-frontend-shell-design.md §Routing
// Issue #240
//
// Route table (from routes.ts):
//   /                                              → RootPage (session-state redirect or EmptyProjectState)
//   /projects/:projectId                           → redirect to pageno/1
//   /projects/:projectId/pages/pageno/:pageNo      → ProjectPage (main labeling surface)
//   /projects/:projectId/pages/index/:idx0         → redirect to pageno equivalent
//   *                                              → 404 fallback (redirect to /)

import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import HeaderBar from "./components/HeaderBar";
import RootPage from "./pages/RootPage";
import ProjectPage from "./pages/ProjectPage";
import { ROUTES } from "./lib/routes";

// One QueryClient for the app.
// staleTime: 30 000 ms — spec §Server state.
// refetchOnWindowFocus: false — avoids spurious re-fetches on tab switch.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Redirect /projects/:id → /projects/:id/pages/pageno/1 */
function ProjectRootRedirect() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={`/projects/${projectId}/pages/pageno/1`} replace />;
}

/** Redirect /projects/:id/pages/index/:idx0 → pageno equivalent */
function ProjectPageIndexRedirect() {
  const { projectId, idx0 } = useParams<{ projectId: string; idx0: string }>();
  const pageNo = (parseInt(idx0 ?? "0", 10) + 1).toString();
  return <Navigate to={`/projects/${projectId}/pages/pageno/${pageNo}`} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div data-testid="app-shell" className="flex flex-col h-screen">
          <HeaderBar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path={ROUTES.ROOT} element={<RootPage />} />
              <Route path={ROUTES.PROJECT} element={<ProjectRootRedirect />} />
              <Route path={ROUTES.PROJECT_PAGE_NO} element={<ProjectPage />} />
              <Route path={ROUTES.PROJECT_PAGE_IDX} element={<ProjectPageIndexRedirect />} />
              {/* Catch-all: redirect unknown routes to root */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
