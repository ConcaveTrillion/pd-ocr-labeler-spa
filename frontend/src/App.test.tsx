import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the app-shell marker", () => {
    render(<App />);
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  });

  it("renders the milestone heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /pd-ocr-labeler-spa/i }),
    ).toBeInTheDocument();
  });
});
