import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

describe("tokens.css", () => {
  const css = readFileSync(resolve(__dirname, "./tokens.css"), "utf-8");

  it("imports pdomain-ui canonical token set", () => {
    expect(css).toContain('@import "@pdomain/pdomain-ui/theme/tokens.css"');
  });

  it("has all 5 status alias tokens pointing to pdomain-ui canonical names", () => {
    // These are labeler-specific aliases → pdomain-ui canonical unprefixed names.
    // Hex values are owned by pdomain-ui/theme/tokens.css, not this file.
    expect(css).toContain("--status-exact: var(--exact)");
    expect(css).toContain("--status-fuzzy: var(--fuzzy)");
    expect(css).toContain("--status-mismatch: var(--mismatch)");
    expect(css).toContain("--status-ocr: var(--ocr)");
    expect(css).toContain("--status-gt: var(--gt)");
  });

  it("has all 4 layer alias tokens pointing to pdomain-ui canonical names", () => {
    // These are labeler-specific aliases → pdomain-ui canonical unprefixed names.
    expect(css).toContain("--layer-block: var(--block)");
    expect(css).toContain("--layer-para: var(--para)");
    expect(css).toContain("--layer-line: var(--line)");
    expect(css).toContain("--layer-word: var(--word)");
  });

  it("does not define raw hex values for bg/accent/ink (owned by pdomain-ui)", () => {
    // Surfaces, borders, text and accent are wholly owned by pdomain-ui now.
    // If any hex literal for these appears here it is an accidental override.
    expect(css).not.toContain("--bg-page: #");
    expect(css).not.toContain("--accent: #");
    expect(css).not.toContain("--ink-1: #");
  });
});
