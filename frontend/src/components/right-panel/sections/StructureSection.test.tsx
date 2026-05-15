// StructureSection.test.tsx — Tests for Slice 18 Structure section.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 18.

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StructureSection } from "./StructureSection";
import { server } from "../../../test/server";
import type { components } from "../../../api/types";

type WordMatch = components["schemas"]["WordMatch"];
type PagePayload = components["schemas"]["PagePayload"];

// ─── Fixtures ────────────────────────────────────────────────────────────

function makeWord(lineIndex: number, wordIndex: number, text = "hello"): WordMatch {
  return {
    line_index: lineIndex,
    word_index: wordIndex,
    ocr_text: text,
    ground_truth_text: text,
    match_status: "exact",
    normalized_match: false,
    is_validated: false,
    bbox: { x: 0, y: 0, width: 10, height: 10 },
  };
}

function makePage(wordCount = 3): PagePayload {
  const words = Array.from({ length: wordCount }, (_, i) =>
    makeWord(0, i, ["hello", "world", "foo"][i] ?? `w${i}`),
  );
  return {
    project_id: "p1",
    page_index: 0,
    line_filter: "all",
    generation: 0,
    line_matches: [
      {
        line_index: 0,
        paragraph_index: 0,
        ocr_line_text: "hello world foo",
        ground_truth_line_text: "hello world foo",
        word_matches: words,
        overall_match_status: "exact",
        exact_count: wordCount,
        fuzzy_count: 0,
        mismatch_count: 0,
        unmatched_gt_count: 0,
        unmatched_ocr_count: 0,
        validated_word_count: 0,
        total_word_count: wordCount,
        is_fully_validated: false,
      },
    ],
  };
}

const PAGE_RESPONSE = makePage();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderSection(word: WordMatch, page: PagePayload = PAGE_RESPONSE) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <StructureSection word={word} page={page} projectId="p1" pageIndex={0} />
    </QueryClientProvider>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("StructureSection (Slice 18)", () => {
  beforeEach(() => {
    server.use(
      http.post("/api/projects/p1/pages/0/words/:li/:wi/merge", () =>
        HttpResponse.json(PAGE_RESPONSE),
      ),
      http.post("/api/projects/p1/pages/0/words/:li/:wi/split", () =>
        HttpResponse.json(PAGE_RESPONSE),
      ),
    );
  });

  it("renders the structure-section container", () => {
    renderSection(makeWord(0, 1));
    expect(screen.getByTestId("structure-section")).toBeInTheDocument();
  });

  it("shows prev neighbor when word is not first", () => {
    renderSection(makeWord(0, 1));
    const prevSlot = screen.getByTestId("structure-prev-word");
    // Should show WordCell for prev word (word index 0 = "hello")
    expect(prevSlot).not.toHaveTextContent("none");
  });

  it("shows 'none' for prev when word is first", () => {
    renderSection(makeWord(0, 0));
    expect(screen.getByTestId("structure-prev-word")).toHaveTextContent("none");
  });

  it("shows next neighbor when word is not last", () => {
    renderSection(makeWord(0, 1));
    const nextSlot = screen.getByTestId("structure-next-word");
    expect(nextSlot).not.toHaveTextContent("none");
  });

  it("shows 'none' for next when word is last", () => {
    renderSection(makeWord(0, 2)); // last word in 3-word line
    expect(screen.getByTestId("structure-next-word")).toHaveTextContent("none");
  });

  it("merge-prev button is disabled when no prev word", () => {
    renderSection(makeWord(0, 0));
    expect(screen.getByTestId("structure-merge-prev-button")).toBeDisabled();
  });

  it("merge-next button is disabled when no next word", () => {
    renderSection(makeWord(0, 2));
    expect(screen.getByTestId("structure-merge-next-button")).toBeDisabled();
  });

  it("merge-prev button is enabled when prev word exists", () => {
    renderSection(makeWord(0, 1));
    expect(screen.getByTestId("structure-merge-prev-button")).not.toBeDisabled();
  });

  it("clicking Merge prev opens a ConfirmDialog", async () => {
    const user = userEvent.setup();
    renderSection(makeWord(0, 1));
    await user.click(screen.getByTestId("structure-merge-prev-button"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("confirming Merge prev fires the merge mutation", async () => {
    const mergeHandler = vi.fn(() => HttpResponse.json(PAGE_RESPONSE));
    server.use(http.post("/api/projects/p1/pages/0/words/0/1/merge", mergeHandler));

    const user = userEvent.setup();
    renderSection(makeWord(0, 1));
    await user.click(screen.getByTestId("structure-merge-prev-button"));
    await user.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(mergeHandler).toHaveBeenCalledOnce());
  });

  it("cancelling Merge prev closes dialog without mutation", async () => {
    const mergeHandler = vi.fn(() => HttpResponse.json(PAGE_RESPONSE));
    server.use(http.post("/api/projects/p1/pages/0/words/0/1/merge", mergeHandler));

    const user = userEvent.setup();
    renderSection(makeWord(0, 1));
    await user.click(screen.getByTestId("structure-merge-prev-button"));
    await user.click(screen.getByTestId("confirm-dialog-cancel"));

    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
    expect(mergeHandler).not.toHaveBeenCalled();
  });

  it("Split at cursor button fires split mutation without confirm", async () => {
    const splitHandler = vi.fn(() => HttpResponse.json(PAGE_RESPONSE));
    server.use(http.post("/api/projects/p1/pages/0/words/0/1/split", splitHandler));

    const user = userEvent.setup();
    renderSection(makeWord(0, 1));
    await user.click(screen.getByTestId("structure-split-button"));

    await waitFor(() => expect(splitHandler).toHaveBeenCalledOnce());
    // No confirm dialog for split
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });
});
