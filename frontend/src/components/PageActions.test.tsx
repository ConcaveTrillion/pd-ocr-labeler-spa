// PageActions.test.tsx — unit tests for the PageActions bar.
// Spec: docs/specs/2026-05-12-page-actions-design.md
// Issue #214
//
// Acceptance criteria:
//   - data-testids: reload-ocr-button, save-page-button, save-project-button,
//     export-button, page-source-badge, page-name-label, etc.
//   - Reload OCR Edited disabled when hasEditedImage=false
//   - SaveStatus indicator renders correct badge for each PageSource value

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageActions } from "./PageActions";

describe("PageActions", () => {
  it("renders all required driver-contract testids", () => {
    render(<PageActions />);
    const requiredTestIds = [
      "reload-ocr-button",
      "reload-ocr-edited-button",
      "save-page-button",
      "save-project-button",
      "load-page-button",
      "rematch-gt-button",
      "export-button",
      "page-source-badge",
    ];
    for (const tid of requiredTestIds) {
      expect(screen.getByTestId(tid), `missing testid: ${tid}`).toBeInTheDocument();
    }
  });

  it("renders page-name-label when pageName is provided", () => {
    render(<PageActions pageName="page_001.png" />);
    expect(screen.getByTestId("page-name-label")).toHaveTextContent("page_001.png");
  });

  it("does not render page-name-label when pageName is null", () => {
    render(<PageActions pageName={null} />);
    expect(screen.queryByTestId("page-name-label")).not.toBeInTheDocument();
  });

  describe("hasEditedImage gate", () => {
    it("disables Reload OCR Edited when hasEditedImage is false (default)", () => {
      render(<PageActions />);
      expect(screen.getByTestId("reload-ocr-edited-button")).toBeDisabled();
    });

    it("disables Reload OCR Edited when hasEditedImage is false explicitly", () => {
      render(<PageActions hasEditedImage={false} />);
      expect(screen.getByTestId("reload-ocr-edited-button")).toBeDisabled();
    });

    it("enables Reload OCR Edited when hasEditedImage is true", () => {
      render(<PageActions hasEditedImage={true} />);
      expect(screen.getByTestId("reload-ocr-edited-button")).not.toBeDisabled();
    });
  });

  describe("isBusy gate", () => {
    it("disables all action buttons when isBusy is true", () => {
      render(<PageActions isBusy={true} hasEditedImage={true} />);
      const busyButtons = [
        "reload-ocr-button",
        "reload-ocr-edited-button",
        "save-page-button",
        "save-project-button",
        "load-page-button",
        "rematch-gt-button",
        "export-button",
      ];
      for (const tid of busyButtons) {
        expect(screen.getByTestId(tid), `${tid} should be disabled`).toBeDisabled();
      }
    });

    it("enables all relevant buttons when isBusy is false and hasEditedImage is true", () => {
      render(<PageActions isBusy={false} hasEditedImage={true} />);
      const activeButtons = [
        "reload-ocr-button",
        "reload-ocr-edited-button",
        "save-page-button",
        "save-project-button",
        "load-page-button",
        "rematch-gt-button",
        "export-button",
      ];
      for (const tid of activeButtons) {
        expect(screen.getByTestId(tid), `${tid} should be enabled`).not.toBeDisabled();
      }
    });
  });

  describe("page-source-badge", () => {
    it("shows 'OCR' for ocr source", () => {
      render(<PageActions pageSource="ocr" />);
      expect(screen.getByTestId("page-source-badge")).toHaveTextContent("OCR");
    });

    it("shows 'CACHED' for cached_ocr source", () => {
      render(<PageActions pageSource="cached_ocr" />);
      expect(screen.getByTestId("page-source-badge")).toHaveTextContent("CACHED");
    });

    it("shows 'LABELED' for filesystem source", () => {
      render(<PageActions pageSource="filesystem" />);
      expect(screen.getByTestId("page-source-badge")).toHaveTextContent("LABELED");
    });

    it("shows 'FALLBACK' for fallback source", () => {
      render(<PageActions pageSource="fallback" />);
      expect(screen.getByTestId("page-source-badge")).toHaveTextContent("FALLBACK");
    });

    it("defaults to 'OCR' when pageSource is not provided", () => {
      render(<PageActions />);
      expect(screen.getByTestId("page-source-badge")).toHaveTextContent("OCR");
    });
  });

  describe("callbacks", () => {
    it("calls onReloadOcr when Reload OCR is clicked", () => {
      const onReloadOcr = vi.fn();
      render(<PageActions onReloadOcr={onReloadOcr} />);
      fireEvent.click(screen.getByTestId("reload-ocr-button"));
      expect(onReloadOcr).toHaveBeenCalledOnce();
    });

    it("calls onReloadOcrEdited when Reload OCR (Edited) is clicked and enabled", () => {
      const onReloadOcrEdited = vi.fn();
      render(<PageActions hasEditedImage={true} onReloadOcrEdited={onReloadOcrEdited} />);
      fireEvent.click(screen.getByTestId("reload-ocr-edited-button"));
      expect(onReloadOcrEdited).toHaveBeenCalledOnce();
    });

    it("calls onSavePage when Save Page is clicked", () => {
      const onSavePage = vi.fn();
      render(<PageActions onSavePage={onSavePage} />);
      fireEvent.click(screen.getByTestId("save-page-button"));
      expect(onSavePage).toHaveBeenCalledOnce();
    });

    it("calls onExport when Export is clicked", () => {
      const onExport = vi.fn();
      render(<PageActions onExport={onExport} />);
      fireEvent.click(screen.getByTestId("export-button"));
      expect(onExport).toHaveBeenCalledOnce();
    });

    it("does NOT fire onReloadOcrEdited when button is disabled", () => {
      const onReloadOcrEdited = vi.fn();
      render(<PageActions hasEditedImage={false} onReloadOcrEdited={onReloadOcrEdited} />);
      fireEvent.click(screen.getByTestId("reload-ocr-edited-button"));
      expect(onReloadOcrEdited).not.toHaveBeenCalled();
    });
  });

  describe("rotate buttons (M9.1 — hidden in DOM)", () => {
    it("rotate-ccw-button and rotate-cw-button exist but are hidden", () => {
      render(<PageActions />);
      const ccw = screen.getByTestId("rotate-ccw-button");
      const cw = screen.getByTestId("rotate-cw-button");
      expect(ccw).toBeInTheDocument();
      expect(cw).toBeInTheDocument();
      // Buttons must be hidden via inline style (display:none) per spec
      expect(ccw).toHaveStyle({ display: "none" });
      expect(cw).toHaveStyle({ display: "none" });
    });
  });
});
