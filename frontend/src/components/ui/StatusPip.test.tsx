// StatusPip.test.tsx — Vitest unit tests for StatusPip.
// P5.i Gap 57: added "ocr" and "gt" variant tests.
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusPip } from "./StatusPip";

describe("StatusPip — existing variants", () => {
  it("renders without label (dot only)", () => {
    const { container } = render(<StatusPip status="exact" />);
    expect(container.querySelector(".bg-status-exact\\/10")).toBeTruthy();
  });

  it("renders with label", () => {
    render(<StatusPip status="fuzzy" label="Fuzzy" />);
    expect(screen.getByText("Fuzzy")).toBeInTheDocument();
  });

  it("mismatch applies mismatch classes", () => {
    const { container } = render(<StatusPip status="mismatch" />);
    expect(container.firstChild).toHaveClass("bg-status-mismatch/10");
  });

  it("exact status dot renders", () => {
    const { container } = render(<StatusPip status="exact" />);
    const pip = container.querySelector(".bg-status-exact");
    expect(pip).toBeTruthy();
  });

  it("fuzzy status with label", () => {
    const { container } = render(<StatusPip status="fuzzy" label="Match" />);
    expect(container.firstChild).toHaveClass("bg-status-fuzzy/10");
    expect(screen.getByText("Match")).toBeInTheDocument();
  });
});

describe("StatusPip — Gap 57: ocr/gt variants", () => {
  it("renders ocr variant with testid status-pip-ocr", () => {
    render(<StatusPip status="ocr" label="OCR" />);
    expect(screen.getByTestId("status-pip-ocr")).toBeInTheDocument();
  });

  it("renders gt variant with testid status-pip-gt", () => {
    render(<StatusPip status="gt" label="GT" />);
    expect(screen.getByTestId("status-pip-gt")).toBeInTheDocument();
  });

  it("ocr variant uses amber/fuzzy tone", () => {
    const { container } = render(<StatusPip status="ocr" />);
    expect(container.firstChild).toHaveClass("bg-status-fuzzy/10");
  });

  it("gt variant uses accent tone", () => {
    const { container } = render(<StatusPip status="gt" />);
    expect(container.firstChild).toHaveClass("bg-accent/10");
  });

  it("ocr renders label text", () => {
    render(<StatusPip status="ocr" label="0.92" />);
    expect(screen.getByText("0.92")).toBeInTheDocument();
  });

  it("gt renders label text", () => {
    render(<StatusPip status="gt" label="Confirmed" />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("exact status uses testid status-pip-exact", () => {
    render(<StatusPip status="exact" />);
    expect(screen.getByTestId("status-pip-exact")).toBeInTheDocument();
  });
});
