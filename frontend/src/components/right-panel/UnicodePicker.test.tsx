// UnicodePicker.test.tsx — Tests for P4.c unicode picker redesign (Gap 40).
// Spec: docs/plans/hifi-gaps-plan.md P4.c

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnicodePicker } from "./UnicodePicker";

describe("UnicodePicker (P4.c — Gap 40)", () => {
  // ---------------------------------------------------------------------------
  // Container + testid invariants
  // ---------------------------------------------------------------------------
  it("renders the picker container with data-testid=unicode-picker", () => {
    render(<UnicodePicker onInsert={() => {}} />);
    expect(screen.getByTestId("unicode-picker")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sets row
  // ---------------------------------------------------------------------------
  it("renders all 7 set pills with correct data-testids", () => {
    render(<UnicodePicker onInsert={() => {}} />);
    for (const id of ["latin", "greek", "punctuation", "symbols", "math", "currency", "other"]) {
      expect(screen.getByTestId(`unicode-set-${id}`)).toBeInTheDocument();
    }
  });

  it("highlights the active set pill (punctuation is default)", () => {
    render(<UnicodePicker onInsert={() => {}} />);
    const punct = screen.getByTestId("unicode-set-punctuation");
    // Active pill has accent classes; inactive does not
    expect(punct.className).toMatch(/border-accent/);
    const latin = screen.getByTestId("unicode-set-latin");
    expect(latin.className).not.toMatch(/border-accent/);
  });

  it("clicking a set pill switches the active set", async () => {
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={() => {}} />);

    await user.click(screen.getByTestId("unicode-set-greek"));
    // α is in Greek — its card should now appear
    expect(screen.getByTestId("unicode-char-U+03B1")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Code-point card grid
  // ---------------------------------------------------------------------------
  it("renders em-dash card (U+2014) in the Punctuation set", () => {
    render(<UnicodePicker onInsert={() => {}} />);
    // Default set is punctuation — em dash should be visible
    expect(screen.getByTestId("unicode-char-U+2014")).toBeInTheDocument();
  });

  it("clicking a code-point card invokes onInsert with the character", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={onInsert} />);

    // Punctuation is default — em-dash card is present
    await user.click(screen.getByTestId("unicode-char-U+2014"));
    expect(onInsert).toHaveBeenCalledWith("—");
  });

  it("switching to Latin set shows extended Latin chars, not Greek", async () => {
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={() => {}} />);

    await user.click(screen.getByTestId("unicode-set-latin"));
    // À (U+00C0) should be present
    expect(screen.getByTestId("unicode-char-U+00C0")).toBeInTheDocument();
    // α (U+03B1) should NOT be present (Greek)
    expect(screen.queryByTestId("unicode-char-U+03B1")).not.toBeInTheDocument();
  });

  it("switching to Math set shows math chars", async () => {
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={() => {}} />);

    await user.click(screen.getByTestId("unicode-set-math"));
    // ∞ (U+221E)
    expect(screen.getByTestId("unicode-char-U+221E")).toBeInTheDocument();
  });

  it("switching to Currency set shows currency chars", async () => {
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={() => {}} />);

    await user.click(screen.getByTestId("unicode-set-currency"));
    // € (U+20AC)
    expect(screen.getByTestId("unicode-char-U+20AC")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Slash-command input
  // ---------------------------------------------------------------------------
  it("renders the slash-command input with data-testid=unicode-slash-input", () => {
    render(<UnicodePicker onInsert={() => {}} />);
    expect(screen.getByTestId("unicode-slash-input")).toBeInTheDocument();
  });

  it("slash input has correct placeholder text", () => {
    render(<UnicodePicker onInsert={() => {}} />);
    const input = screen.getByTestId("unicode-slash-input");
    expect(input).toHaveAttribute("placeholder", "\\emdash, \\alpha, U+2019…");
  });

  it("typing \\emdash and pressing Enter inserts em-dash", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={onInsert} />);

    const input = screen.getByTestId("unicode-slash-input");
    await user.click(input);
    await user.type(input, "\\emdash{Enter}");
    expect(onInsert).toHaveBeenCalledWith("—");
  });

  it("typing \\alpha and pressing Enter inserts α", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={onInsert} />);

    const input = screen.getByTestId("unicode-slash-input");
    await user.click(input);
    await user.type(input, "\\alpha{Enter}");
    expect(onInsert).toHaveBeenCalledWith("α");
  });

  it("typing U+2019 and pressing Enter inserts the right single quote", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={onInsert} />);

    const input = screen.getByTestId("unicode-slash-input");
    await user.click(input);
    await user.type(input, "U+2019{Enter}");
    // U+2019 RIGHT SINGLE QUOTATION MARK — use codepoint to avoid file-encoding ambiguity
    expect(onInsert).toHaveBeenCalledWith(String.fromCodePoint(0x2019));
  });

  it("clears the slash input after successful insertion", async () => {
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={() => {}} />);

    const input = screen.getByTestId("unicode-slash-input");
    await user.click(input);
    await user.type(input, "\\emdash{Enter}");
    expect(input).toHaveValue("");
  });

  it("does not call onInsert for an unknown slash command", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={onInsert} />);

    const input = screen.getByTestId("unicode-slash-input");
    await user.click(input);
    await user.type(input, "\\zzunknown{Enter}");
    expect(onInsert).not.toHaveBeenCalled();
  });

  it("supports name without leading backslash (emdash without \\)", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={onInsert} />);

    const input = screen.getByTestId("unicode-slash-input");
    await user.click(input);
    await user.type(input, "emdash{Enter}");
    expect(onInsert).toHaveBeenCalledWith("—");
  });

  // ---------------------------------------------------------------------------
  // P2.c wiring — onInsert prop still works (regression guard)
  // ---------------------------------------------------------------------------
  it("onInsert prop is called from card click (P2.c regression guard)", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<UnicodePicker onInsert={onInsert} />);

    // Punctuation default — en-dash U+2013
    await user.click(screen.getByTestId("unicode-char-U+2013"));
    expect(onInsert).toHaveBeenCalledWith("–");
  });
});
