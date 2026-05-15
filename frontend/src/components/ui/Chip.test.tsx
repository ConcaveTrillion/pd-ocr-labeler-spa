import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Chip } from "./Chip";

describe("Chip — static variant", () => {
  it("renders children", () => {
    render(<Chip variant="static">Exact</Chip>);
    expect(screen.getByText("Exact")).toBeInTheDocument();
  });
});

describe("Chip — tristate variant", () => {
  it("starts at off state", () => {
    render(
      <Chip variant="tristate" value="off" onChange={() => {}}>
        Status
      </Chip>,
    );
    // Just verify it renders
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("cycles from off to on on click", () => {
    const onChange = vi.fn();
    render(
      <Chip variant="tristate" value="off" onChange={onChange}>
        Status
      </Chip>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("on");
  });

  it("cycles from on to mixed", () => {
    const onChange = vi.fn();
    render(
      <Chip variant="tristate" value="on" onChange={onChange}>
        Status
      </Chip>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("mixed");
  });

  it("cycles from mixed to off", () => {
    const onChange = vi.fn();
    render(
      <Chip variant="tristate" value="mixed" onChange={onChange}>
        Status
      </Chip>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("off");
  });
});
