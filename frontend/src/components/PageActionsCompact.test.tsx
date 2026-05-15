// PageActionsCompact.test.tsx — unit tests for the compact header action bar.
// P1.b (Gap 4, 7): Reload OCR | Rematch GT | ✓ Save page | Export ▾
//
// Tests:
//   - Renders all 4 compact buttons with correct data-testid attributes.
//   - Buttons are disabled when projectId is absent (no route param).
//   - Export button opens the export dialog.
//   - Reload OCR, Rematch GT, Save Page trigger their mutations (smoke).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { PageActionsCompact } from "./PageActionsCompact";
import { dialogStore } from "../stores/dialog-store";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderCompact(route = "/projects/proj-1/pages/pageno/1") {
  const qc = makeQC();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="/projects/:projectId/pages/pageno/:pageNo"
            element={<PageActionsCompact />}
          />
          <Route path="/" element={<PageActionsCompact />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function stubJobNoop() {
  server.use(
    http.get("/api/jobs/:jobId", () =>
      HttpResponse.json({ job_id: "j1", status: "complete", progress: 1 }),
    ),
  );
}

beforeEach(() => {
  dialogStore.reset();
  stubJobNoop();
});

// ─── testids ──────────────────────────────────────────────────────────────────

describe("PageActionsCompact: testids (P1.b)", () => {
  it("renders page-actions-compact container", () => {
    renderCompact();
    expect(screen.getByTestId("page-actions-compact")).toBeInTheDocument();
  });

  it("renders all four compact button testids", () => {
    renderCompact();
    expect(screen.getByTestId("page-actions-compact-reload-ocr")).toBeInTheDocument();
    expect(screen.getByTestId("page-actions-compact-rematch-gt")).toBeInTheDocument();
    expect(screen.getByTestId("page-actions-compact-save-page")).toBeInTheDocument();
    expect(screen.getByTestId("page-actions-compact-export")).toBeInTheDocument();
  });

  it("shows labelled text on buttons", () => {
    renderCompact();
    expect(screen.getByText("Reload OCR")).toBeInTheDocument();
    expect(screen.getByText("Rematch")).toBeInTheDocument();
    expect(screen.getByText("Save page")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });
});

// ─── disabled state ───────────────────────────────────────────────────────────

describe("PageActionsCompact: disabled when no project", () => {
  it("reload-ocr is disabled when projectId is absent", () => {
    // Render on root route — no :projectId param
    const qc = makeQC();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<PageActionsCompact />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("page-actions-compact-reload-ocr")).toBeDisabled();
    expect(screen.getByTestId("page-actions-compact-save-page")).toBeDisabled();
  });
});

// ─── export opens dialog ──────────────────────────────────────────────────────

describe("PageActionsCompact: export opens dialog", () => {
  it("clicking export button opens the export dialog", async () => {
    const user = userEvent.setup();
    renderCompact();
    await user.click(screen.getByTestId("page-actions-compact-export"));
    expect(dialogStore.getState().export.open).toBe(true);
  });
});

// ─── mutation smoke tests ─────────────────────────────────────────────────────

describe("PageActionsCompact: mutation wiring (P1.b smoke)", () => {
  it("clicking Reload OCR calls POST reload-ocr endpoint", async () => {
    const reloadSpy = vi.fn(() => HttpResponse.json({ job_id: "test-job-1" }, { status: 202 }));
    server.use(http.post("/api/projects/proj-1/pages/0/reload-ocr", reloadSpy));

    const user = userEvent.setup();
    renderCompact();

    await user.click(screen.getByTestId("page-actions-compact-reload-ocr"));
    await waitFor(() => expect(reloadSpy).toHaveBeenCalled());
  });

  it("clicking Save page calls POST save-page endpoint", async () => {
    const saveSpy = vi.fn(() =>
      HttpResponse.json({
        project_id: "proj-1",
        page_index: 0,
        saved: true,
      }),
    );
    server.use(http.post("/api/projects/proj-1/pages/0/save", saveSpy));

    const user = userEvent.setup();
    renderCompact();

    await user.click(screen.getByTestId("page-actions-compact-save-page"));
    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
  });
});
