// HotkeyHelpModal.test.tsx — unit tests for the refreshed hotkey modal.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 25.
//
// Acceptance:
//   - Every registered hotkey group section renders (selection, navigation,
//     editing, view).
//   - Each group's entries render with at least one KeyCap.
//   - The close button works.
//   - data-testid="hotkey-help-dialog" is present when open.

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HotkeyHelpModal } from "./HotkeyHelpModal";
import { dialogStore } from "../stores/dialog-store";
import { getPopulatedGroups } from "../lib/hotkey-registry";

// ─── helpers ─────────────────────────────────────────────────────────────────

function renderModal() {
  return render(<HotkeyHelpModal />);
}

beforeEach(() => {
  dialogStore.reset();
  // Open the modal before each relevant test via the store.
  dialogStore.open("hotkeyHelp");
});

// ─── basic rendering ─────────────────────────────────────────────────────────

describe("HotkeyHelpModal: dialog rendering", () => {
  it("renders the hotkey-help-dialog testid when open", () => {
    renderModal();
    expect(screen.getByTestId("hotkey-help-dialog")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    dialogStore.close("hotkeyHelp");
    renderModal();
    expect(screen.queryByTestId("hotkey-help-dialog")).not.toBeInTheDocument();
  });

  it("close button is present", () => {
    renderModal();
    expect(screen.getByTestId("hotkey-help-close")).toBeInTheDocument();
  });

  it("clicking close button closes the modal", async () => {
    renderModal();
    const closeBtn = screen.getByTestId("hotkey-help-close");
    await userEvent.click(closeBtn);
    expect(dialogStore.getState().hotkeyHelp.open).toBe(false);
  });

  it("heading reads 'Keyboard Shortcuts'", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });
});

// ─── groups ──────────────────────────────────────────────────────────────────

describe("HotkeyHelpModal: groups", () => {
  it("renders the selection group section", () => {
    renderModal();
    expect(screen.getByTestId("hotkey-group-selection")).toBeInTheDocument();
  });

  it("renders the navigation group section", () => {
    renderModal();
    expect(screen.getByTestId("hotkey-group-navigation")).toBeInTheDocument();
  });

  it("renders the editing group section", () => {
    renderModal();
    expect(screen.getByTestId("hotkey-group-editing")).toBeInTheDocument();
  });

  it("renders the view group section", () => {
    renderModal();
    expect(screen.getByTestId("hotkey-group-view")).toBeInTheDocument();
  });

  it("all populated groups from the registry are rendered", () => {
    renderModal();
    const groups = getPopulatedGroups();
    for (const group of groups) {
      expect(screen.getByTestId(`hotkey-group-${group.id}`)).toBeInTheDocument();
    }
  });
});

// ─── KeyCap rendering ────────────────────────────────────────────────────────

describe("HotkeyHelpModal: KeyCap components", () => {
  it("Selection group contains at least one key label visible in the DOM", () => {
    renderModal();
    // The selection group has entries like "1", "2", "3", "V", "R", "A", "E"
    // These render inside KeyCap pills. Check some of them are visible.
    const groupEl = screen.getByTestId("hotkey-group-selection");
    expect(groupEl.textContent).toMatch(/1/);
    expect(groupEl.textContent).toMatch(/2/);
    expect(groupEl.textContent).toMatch(/3/);
  });

  it("Navigation group contains arrow key labels", () => {
    renderModal();
    const groupEl = screen.getByTestId("hotkey-group-navigation");
    // Navigation entries contain arrow chars.
    expect(groupEl.textContent).toMatch(/←|→|↑|⌥|Ctrl/);
  });

  it("Editing group contains Enter and Esc labels", () => {
    renderModal();
    const groupEl = screen.getByTestId("hotkey-group-editing");
    expect(groupEl.textContent).toMatch(/Enter/);
    expect(groupEl.textContent).toMatch(/Esc/);
  });

  it("View group contains ? (hotkey help) label", () => {
    renderModal();
    const groupEl = screen.getByTestId("hotkey-group-view");
    expect(groupEl.textContent).toContain("?");
  });
});

// ─── registry: getPopulatedGroups ────────────────────────────────────────────

describe("hotkey-registry: getPopulatedGroups", () => {
  it("returns at least 4 groups (selection, navigation, editing, view)", () => {
    const groups = getPopulatedGroups();
    const ids = groups.map((g) => g.id);
    expect(ids).toContain("selection");
    expect(ids).toContain("navigation");
    expect(ids).toContain("editing");
    expect(ids).toContain("view");
  });

  it("selection group has at least 7 entries (1/2/3/V/R/A/E)", () => {
    const groups = getPopulatedGroups();
    const sel = groups.find((g) => g.id === "selection");
    expect(sel).toBeDefined();
    expect(sel!.entries.length).toBeGreaterThanOrEqual(7);
  });

  it("navigation group has at least 5 entries", () => {
    const groups = getPopulatedGroups();
    const nav = groups.find((g) => g.id === "navigation");
    expect(nav).toBeDefined();
    expect(nav!.entries.length).toBeGreaterThanOrEqual(5);
  });

  it("every entry has a non-empty label and at least one keyCap", () => {
    const groups = getPopulatedGroups();
    for (const group of groups) {
      for (const entry of group.entries) {
        expect(entry.label, `entry missing label in group ${group.id}`).toBeTruthy();
        expect(entry.keyCaps.length, `entry "${entry.label}" missing keyCaps`).toBeGreaterThan(0);
      }
    }
  });
});
