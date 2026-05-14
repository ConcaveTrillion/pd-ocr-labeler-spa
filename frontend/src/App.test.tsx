// App.test.tsx — Vitest tests for App shell routing.
// Issue #240: React Router routes, QueryClient provider wiring.
// Spec: docs/specs/2026-05-12-frontend-shell-design.md §Routing
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "./test/server";
import App from "./App";

// Helper: setup session-state mock (null = no project loaded)
function withNoSession() {
  server.use(
    http.get("/api/session-state", () =>
      HttpResponse.json({
        schema_version: "1.0",
        last_project_path: null,
        last_page_index: 0,
      }),
    ),
  );
}

describe("App: routing shell", () => {
  it("renders header-bar on the root route", async () => {
    withNoSession();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("header-bar")).toBeInTheDocument();
    });
  });

  it("renders empty-project-state on / when no session", async () => {
    withNoSession();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("empty-project-state")).toBeInTheDocument();
    });
  });
});
