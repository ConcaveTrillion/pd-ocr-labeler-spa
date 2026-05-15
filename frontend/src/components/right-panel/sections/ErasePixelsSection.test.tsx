// ErasePixelsSection.test.tsx — Tests for Slice 17 ErasePixels section.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 17.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErasePixelsSection } from "./ErasePixelsSection";

describe("ErasePixelsSection (Slice 17)", () => {
  it("renders the erase-pixels-section container", () => {
    render(<ErasePixelsSection />);
    expect(screen.getByTestId("erase-pixels-section")).toBeInTheDocument();
  });

  it("Apply button is disabled by default (backendAvailable=false)", () => {
    render(<ErasePixelsSection />);
    expect(screen.getByTestId("erase-pixels-apply-button")).toBeDisabled();
  });

  it("Apply button has 'Backend not wired' title when backendAvailable=false", () => {
    render(<ErasePixelsSection />);
    expect(screen.getByTestId("erase-pixels-apply-button")).toHaveAttribute(
      "title",
      "Backend not wired",
    );
  });

  it("Apply button is still disabled when markingEnabled but backendAvailable=false", async () => {
    const user = userEvent.setup();
    render(<ErasePixelsSection backendAvailable={false} />);
    await user.click(screen.getByTestId("erase-pixels-toggle"));
    // Still disabled even with toggle on — backend not available
    expect(screen.getByTestId("erase-pixels-apply-button")).toBeDisabled();
  });

  it("Apply button is enabled when backendAvailable=true and toggle is on", async () => {
    const user = userEvent.setup();
    render(<ErasePixelsSection backendAvailable={true} />);
    await user.click(screen.getByTestId("erase-pixels-toggle"));
    expect(screen.getByTestId("erase-pixels-apply-button")).not.toBeDisabled();
  });

  it("Apply button calls onApply when clicked with backendAvailable=true", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ErasePixelsSection backendAvailable={true} onApply={onApply} />);
    await user.click(screen.getByTestId("erase-pixels-toggle"));
    await user.click(screen.getByTestId("erase-pixels-apply-button"));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it("renders 'Mark pixels for erasure' toggle", () => {
    render(<ErasePixelsSection />);
    const toggle = screen.getByTestId("erase-pixels-toggle");
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });
});
