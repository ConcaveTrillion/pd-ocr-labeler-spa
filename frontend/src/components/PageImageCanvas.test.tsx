// PageImageCanvas.test.tsx — viewport canvas tests (#196, #197, #198)
// Spec: docs/specs/2026-05-12-image-viewport-design.md

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PageImageCanvas from "./PageImageCanvas";
import { getStageDimensions } from "../lib/canvas-utils";
import { viewportStore } from "../stores/viewport-store";
import { selectionStore } from "../stores/selection-store";

const encoded = {
  src_width: 1600,
  src_height: 1200,
  display_width: 800,
  display_height: 600,
  scale: 0.5,
};

// Reset stores after each test
afterEach(() => {
  viewportStore.setState({ mode: "select", pendingReboxTarget: null });
  selectionStore.setState({
    selectedParagraphs: [],
    selectedLines: [],
    selectedWords: [],
    dragRect: null,
  });
});

// Helper: simulate a drag (mousedown → mousemove → mouseup)
function simulateDrag(
  viewport: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts: { shiftKey?: boolean; ctrlKey?: boolean } = {},
) {
  fireEvent.mouseDown(viewport, { clientX: from.x, clientY: from.y, ...opts });
  fireEvent.mouseMove(viewport, { clientX: to.x, clientY: to.y, ...opts });
  fireEvent.mouseUp(viewport, { clientX: to.x, clientY: to.y, ...opts });
}

describe("PageImageCanvas — dimensions", () => {
  it("Stage dimensions == encoded.display_width × display_height", () => {
    const testCases = [
      {
        encoded: {
          src_width: 1600,
          src_height: 1200,
          display_width: 800,
          display_height: 600,
          scale: 0.5,
        },
      },
      {
        encoded: {
          src_width: 2400,
          src_height: 3200,
          display_width: 1200,
          display_height: 1600,
          scale: 0.5,
        },
      },
    ];

    for (const { encoded } of testCases) {
      const dims = getStageDimensions(encoded);
      expect(dims.width).toBe(encoded.display_width);
      expect(dims.height).toBe(encoded.display_height);
    }
  });

  it("renders canvas with correct dimensions attributes", () => {
    const { getByTestId } = render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    const canvas = getByTestId("image-viewport");
    expect(canvas.getAttribute("data-width")).toBe("800");
    expect(canvas.getAttribute("data-height")).toBe("600");
  });
});

describe("PageImageCanvas — Select mode (drag box-select, #197)", () => {
  it("shows no drag-rect initially", () => {
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    expect(screen.queryByTestId("ocr-drag-rect")).toBeNull();
  });

  it("drag-rect appears during mouse drag", () => {
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    const viewport = screen.getByTestId("image-viewport");

    fireEvent.mouseDown(viewport, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(viewport, { clientX: 200, clientY: 200 });

    expect(screen.queryByTestId("ocr-drag-rect")).not.toBeNull();
  });

  it("drag-rect disappears after mouseup", () => {
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 100, y: 100 }, { x: 200, y: 200 });
    expect(screen.queryByTestId("ocr-drag-rect")).toBeNull();
  });

  it("calls onBoxSelect with rect and 'replace' modifier on plain drag", () => {
    const onBoxSelect = vi.fn();
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onBoxSelect={onBoxSelect} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 });

    expect(onBoxSelect).toHaveBeenCalledOnce();
    const [rect, modifier] = onBoxSelect.mock.calls[0];
    expect(modifier).toBe("replace");
    expect(rect.width).toBeGreaterThan(2);
  });

  it("calls onBoxSelect with 'remove' modifier when Shift held", () => {
    const onBoxSelect = vi.fn();
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onBoxSelect={onBoxSelect} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 }, { shiftKey: true });

    expect(onBoxSelect.mock.calls[0][1]).toBe("remove");
  });

  it("calls onBoxSelect with 'toggle' modifier when Ctrl held", () => {
    const onBoxSelect = vi.fn();
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onBoxSelect={onBoxSelect} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 }, { ctrlKey: true });

    expect(onBoxSelect.mock.calls[0][1]).toBe("toggle");
  });

  it("does NOT call onBoxSelect for tiny drag (≤2px)", () => {
    const onBoxSelect = vi.fn();
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onBoxSelect={onBoxSelect} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 100, y: 100 }, { x: 101, y: 101 });

    expect(onBoxSelect).not.toHaveBeenCalled();
  });

  it("data-mode attribute is 'select' by default", () => {
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    expect(screen.getByTestId("image-viewport").getAttribute("data-mode")).toBe("select");
  });

  it("Escape key clears drag state", () => {
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    const viewport = screen.getByTestId("image-viewport");

    fireEvent.mouseDown(viewport, { clientX: 50, clientY: 50 });
    fireEvent.mouseMove(viewport, { clientX: 150, clientY: 150 });
    expect(screen.queryByTestId("ocr-drag-rect")).not.toBeNull();

    fireEvent.keyDown(viewport, { key: "Escape" });
    expect(screen.queryByTestId("ocr-drag-rect")).toBeNull();
  });
});

describe("PageImageCanvas — Rebox mode (#198)", () => {
  it("data-mode='rebox' when rebox mode active", () => {
    viewportStore.setState({ mode: "rebox", pendingReboxTarget: { lineIndex: 0, wordIndex: 0 } });
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    expect(screen.getByTestId("image-viewport").getAttribute("data-mode")).toBe("rebox");
  });

  it("calls onRebox with drag rect", () => {
    const onRebox = vi.fn();
    viewportStore.setState({ mode: "rebox", pendingReboxTarget: { lineIndex: 0, wordIndex: 0 } });
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onRebox={onRebox} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 });

    expect(onRebox).toHaveBeenCalledOnce();
    const rect = onRebox.mock.calls[0][0];
    expect(rect.width).toBeGreaterThan(2);
  });

  it("mode resets to select after rebox completes", () => {
    const onRebox = vi.fn();
    viewportStore.setState({ mode: "rebox", pendingReboxTarget: { lineIndex: 0, wordIndex: 0 } });
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onRebox={onRebox} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 });

    expect(viewportStore.getState().mode).toBe("select");
  });

  it("does NOT call onBoxSelect during rebox mode", () => {
    const onBoxSelect = vi.fn();
    viewportStore.setState({ mode: "rebox", pendingReboxTarget: null });
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onBoxSelect={onBoxSelect} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 });

    expect(onBoxSelect).not.toHaveBeenCalled();
  });
});

describe("PageImageCanvas — Add Word mode (#198)", () => {
  it("data-mode='add-word' when add-word mode active", () => {
    viewportStore.setState({ mode: "add-word", pendingReboxTarget: null });
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    expect(screen.getByTestId("image-viewport").getAttribute("data-mode")).toBe("add-word");
  });

  it("calls onAddWord with drag rect", () => {
    const onAddWord = vi.fn();
    viewportStore.setState({ mode: "add-word", pendingReboxTarget: null });
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onAddWord={onAddWord} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 });

    expect(onAddWord).toHaveBeenCalledOnce();
  });

  it("mode stays add-word after add-word completes (multi-add)", () => {
    const onAddWord = vi.fn();
    viewportStore.setState({ mode: "add-word", pendingReboxTarget: null });
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onAddWord={onAddWord} />);
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 });

    // Still in add-word mode for next drag
    expect(viewportStore.getState().mode).toBe("add-word");
  });
});

describe("PageImageCanvas — Erase mode (#198)", () => {
  it("data-mode='erase' when erase mode active", () => {
    viewportStore.setState({ mode: "erase", pendingReboxTarget: null });
    render(<PageImageCanvas imageUrl="/test.jpg" encoded={encoded} />);
    expect(screen.getByTestId("image-viewport").getAttribute("data-mode")).toBe("erase");
  });

  it("calls onErasePixels with drag rect", () => {
    const onErasePixels = vi.fn();
    viewportStore.setState({ mode: "erase", pendingReboxTarget: null });
    render(
      <PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onErasePixels={onErasePixels} />,
    );
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 });

    expect(onErasePixels).toHaveBeenCalledOnce();
  });

  it("mode resets to select after erase completes", () => {
    const onErasePixels = vi.fn();
    viewportStore.setState({ mode: "erase", pendingReboxTarget: null });
    render(
      <PageImageCanvas imageUrl="/test.jpg" encoded={encoded} onErasePixels={onErasePixels} />,
    );
    const viewport = screen.getByTestId("image-viewport");
    simulateDrag(viewport, { x: 50, y: 50 }, { x: 150, y: 120 });

    expect(viewportStore.getState().mode).toBe("select");
  });
});
