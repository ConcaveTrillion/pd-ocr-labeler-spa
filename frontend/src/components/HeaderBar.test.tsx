// HeaderBar.test.tsx — Vitest tests for HeaderBar + ProjectLoadControls.
// Issue #272: four required testids + disabled-state contract.
import { describe, it, expect } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import HeaderBar from "./HeaderBar";

// --- helpers -----------------------------------------------------------------

function renderHeaderBar() {
  return render(<HeaderBar />);
}

// --- test suites -------------------------------------------------------------

describe("HeaderBar: renders_with_testids", () => {
  it("renders all four required testids on mount", async () => {
    server.use(
      http.get("/api/projects", () =>
        HttpResponse.json({
          projects: [],
          selected: null,
          projects_root: "",
          config_source: "default",
        }),
      ),
    );

    renderHeaderBar();

    // Wait for async project fetch to settle before asserting
    await waitFor(() => {
      expect(screen.getByTestId("project-select")).toBeInTheDocument();
    });

    expect(screen.getByTestId("load-project-button")).toBeInTheDocument();
    expect(screen.getByTestId("source-folder-button")).toBeInTheDocument();
    expect(screen.getByTestId("ocr-config-trigger-button")).toBeInTheDocument();
  });
});

describe("HeaderBar: load_disabled_before_selection", () => {
  it("load-project-button is disabled when no project is selected", async () => {
    server.use(
      http.get("/api/projects", () =>
        HttpResponse.json({
          projects: [{ project_id: "proj-1", project_root: "/data/proj1", label: "Project One" }],
          selected: null,
          projects_root: "/data",
          config_source: "default",
        }),
      ),
    );

    renderHeaderBar();

    await waitFor(() => {
      expect(screen.getByTestId("load-project-button")).toBeInTheDocument();
    });

    const loadBtn = screen.getByTestId("load-project-button");
    expect(loadBtn).toBeDisabled();
  });
});

describe("HeaderBar: load_enabled_after_selection", () => {
  it("load-project-button is enabled after a project is selected", async () => {
    server.use(
      http.get("/api/projects", () =>
        HttpResponse.json({
          projects: [{ project_id: "proj-1", project_root: "/data/proj1", label: "Project One" }],
          selected: null,
          projects_root: "/data",
          config_source: "default",
        }),
      ),
    );

    renderHeaderBar();

    // Wait for projects to load and select dropdown to be ready
    await waitFor(() => {
      const select = screen.getByTestId("project-select") as HTMLSelectElement;
      // Wait until the option is rendered (component fetches projects)
      expect(select.options.length).toBeGreaterThan(1);
    });

    // Load button should be disabled before selection
    const loadBtn = screen.getByTestId("load-project-button");
    expect(loadBtn).toBeDisabled();

    // Select a project from the dropdown
    const select = screen.getByTestId("project-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "proj-1" } });

    // Load button should now be enabled
    await waitFor(() => {
      expect(screen.getByTestId("load-project-button")).not.toBeDisabled();
    });
  });
});

describe("HeaderBar: empty project list", () => {
  it("shows placeholder when project list is empty and keeps LOAD disabled", async () => {
    server.use(
      http.get("/api/projects", () =>
        HttpResponse.json({
          projects: [],
          selected: null,
          projects_root: "",
          config_source: "default",
        }),
      ),
    );

    renderHeaderBar();

    await waitFor(() => {
      expect(screen.getByTestId("project-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("project-select");
    // Placeholder option should be present
    expect(select).toHaveTextContent("No projects found");

    const loadBtn = screen.getByTestId("load-project-button");
    expect(loadBtn).toBeDisabled();
  });
});
