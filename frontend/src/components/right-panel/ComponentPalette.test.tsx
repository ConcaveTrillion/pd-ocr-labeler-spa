// ComponentPalette.test.tsx — P2.e tests for the component chip palette.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentPalette, COMPONENT_ITEMS } from "./ComponentPalette";

describe("ComponentPalette (P2.e)", () => {
  it("renders the palette container", () => {
    render(<ComponentPalette activeComponents={[]} onComponentChange={vi.fn()} />);
    expect(screen.getByTestId("component-palette")).toBeInTheDocument();
  });

  it("renders chips for all 6 component types", () => {
    render(<ComponentPalette activeComponents={[]} onComponentChange={vi.fn()} />);
    for (const item of COMPONENT_ITEMS) {
      expect(screen.getByTestId(`component-chip-${item.key}`)).toBeInTheDocument();
    }
  });

  it("shows drop-cap chip as 'on' when drop-cap is active", () => {
    render(<ComponentPalette activeComponents={["drop-cap"]} onComponentChange={vi.fn()} />);
    expect(screen.getByTestId("component-chip-drop-cap")).toHaveAttribute(
      "data-tristate-value",
      "on",
    );
  });

  it("shows footnote-ref chip as 'off' when not active", () => {
    render(<ComponentPalette activeComponents={["drop-cap"]} onComponentChange={vi.fn()} />);
    expect(screen.getByTestId("component-chip-footnote-ref")).toHaveAttribute(
      "data-tristate-value",
      "off",
    );
  });

  it("calls onComponentChange when a chip is clicked", async () => {
    const onChange = vi.fn();
    render(<ComponentPalette activeComponents={[]} onComponentChange={onChange} />);
    await userEvent.click(screen.getByTestId("component-chip-abbreviation"));
    expect(onChange).toHaveBeenCalledWith("abbreviation", "on");
  });

  it("toggling active component calls onComponentChange with 'mixed'", async () => {
    const onChange = vi.fn();
    render(<ComponentPalette activeComponents={["proper-noun"]} onComponentChange={onChange} />);
    await userEvent.click(screen.getByTestId("component-chip-proper-noun"));
    expect(onChange).toHaveBeenCalledWith("proper-noun", "mixed");
  });
});
