// ReboxSection.test.tsx — Tests for Slice 17 Rebox section.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 17.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReboxSection } from "./ReboxSection";

describe("ReboxSection (Slice 17)", () => {
  it("renders the rebox-section container", () => {
    render(<ReboxSection hasPrev={false} hasNext={true} />);
    expect(screen.getByTestId("rebox-section")).toBeInTheDocument();
  });

  it("renders WordRefineNudgeRows controls (Refine button)", () => {
    render(<ReboxSection hasPrev={false} hasNext={true} />);
    expect(screen.getByTestId("dialog-refine-button")).toBeInTheDocument();
  });

  it("renders WordActionRows merge buttons", () => {
    render(<ReboxSection hasPrev={true} hasNext={true} />);
    expect(screen.getByTestId("dialog-merge-prev-button")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-merge-next-button")).toBeInTheDocument();
  });

  it("merge-prev button is disabled when hasPrev=false", () => {
    render(<ReboxSection hasPrev={false} hasNext={true} />);
    expect(screen.getByTestId("dialog-merge-prev-button")).toBeDisabled();
  });

  it("merge-next button is disabled when hasNext=false", () => {
    render(<ReboxSection hasPrev={true} hasNext={false} />);
    expect(screen.getByTestId("dialog-merge-next-button")).toBeDisabled();
  });

  it("nudge buttons accumulate in the nudge display", () => {
    render(<ReboxSection hasPrev={false} hasNext={false} />);
    const display = screen.getByTestId("dialog-nudge-display");
    expect(display).toHaveTextContent("L:0 R:0 T:0 B:0");

    fireEvent.click(screen.getByTestId("dialog-nudge-left-plus"));
    expect(display).toHaveTextContent("L:5");
  });

  it("onRefine callback is forwarded to WordRefineNudgeRows", async () => {
    const onRefine = vi.fn().mockResolvedValue(undefined);
    render(<ReboxSection hasPrev={false} hasNext={false} onRefine={onRefine} />);
    fireEvent.click(screen.getByTestId("dialog-refine-button"));
    await waitFor(() => expect(onRefine).toHaveBeenCalledOnce());
  });
});
