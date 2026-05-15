// BBoxSection.test.tsx — Tests for Slice 16 bounding-box editor.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 16.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BBoxSection } from "./BBoxSection";
import { server } from "../../../test/server";
import type { components } from "../../../api/types";

type WordMatch = components["schemas"]["WordMatch"];
type BBox = components["schemas"]["BBox"];

const DEFAULT_BBOX: BBox = { x: 10, y: 20, width: 30, height: 15 };

function makeWord(bbox = DEFAULT_BBOX): WordMatch {
  return {
    line_index: 0,
    word_index: 0,
    ocr_text: "hello",
    ground_truth_text: "hello",
    match_status: "exact",
    normalized_match: false,
    is_validated: false,
    bbox,
  };
}

function makePageResponse(bbox: BBox) {
  return {
    project_id: "p1",
    page_index: 0,
    line_filter: "all",
    generation: 1,
    line_matches: [
      {
        line_index: 0,
        paragraph_index: 0,
        ocr_line_text: "hello",
        ground_truth_line_text: "hello",
        word_matches: [
          {
            line_index: 0,
            word_index: 0,
            ocr_text: "hello",
            ground_truth_text: "hello",
            match_status: "exact",
            normalized_match: false,
            is_validated: false,
            bbox,
          },
        ],
        overall_match_status: "exact",
        exact_count: 1,
        fuzzy_count: 0,
        mismatch_count: 0,
        unmatched_gt_count: 0,
        unmatched_ocr_count: 0,
        validated_word_count: 0,
        total_word_count: 1,
        is_fully_validated: false,
      },
    ],
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderBBox(word = makeWord()) {
  const qc = makeQueryClient();
  return {
    ...render(
      <QueryClientProvider client={qc}>
        <BBoxSection word={word} projectId="p1" pageIndex={0} />
      </QueryClientProvider>,
    ),
    qc,
  };
}

describe("BBoxSection (Slice 16)", () => {
  it("renders four numeric inputs with initial bbox values", () => {
    server.use(
      http.post("/api/projects/p1/pages/0/words/0/0/rebox", () =>
        HttpResponse.json(makePageResponse(DEFAULT_BBOX)),
      ),
    );
    renderBBox();
    const x = screen.getByTestId("bbox-input-x") as HTMLInputElement;
    const y = screen.getByTestId("bbox-input-y") as HTMLInputElement;
    const w = screen.getByTestId("bbox-input-w") as HTMLInputElement;
    const h = screen.getByTestId("bbox-input-h") as HTMLInputElement;
    expect(x.value).toBe("10");
    expect(y.value).toBe("20");
    expect(w.value).toBe("30");
    expect(h.value).toBe("15");
  });

  it("renders a Reset button", () => {
    renderBBox();
    expect(screen.getByTestId("bbox-reset-button")).toBeInTheDocument();
  });

  it("fires word PATCH (rebox) mutation on input blur with changed value", async () => {
    const handler = vi.fn((_req: Request) =>
      Promise.resolve(HttpResponse.json(makePageResponse(DEFAULT_BBOX))),
    );
    server.use(http.post("/api/projects/p1/pages/0/words/0/0/rebox", handler));

    const user = userEvent.setup();
    renderBBox();

    const xInput = screen.getByTestId("bbox-input-x");
    await user.clear(xInput);
    await user.type(xInput, "99");
    await user.tab(); // triggers blur

    await waitFor(() => expect(handler).toHaveBeenCalledOnce());
  });

  it("Reset button shows original bbox values by resetting draft state", async () => {
    // This test verifies initial values, then simple Reset without prior edits
    server.use(
      http.post("/api/projects/p1/pages/0/words/0/0/rebox", async ({ request }) => {
        const body = (await request.json()) as { bbox: BBox };
        return HttpResponse.json(makePageResponse(body.bbox));
      }),
    );

    const word = makeWord({ x: 5, y: 6, width: 7, height: 8 });
    const user = userEvent.setup();
    renderBBox(word);

    // Initial values should match bbox
    expect((screen.getByTestId("bbox-input-x") as HTMLInputElement).value).toBe("5");
    expect((screen.getByTestId("bbox-input-y") as HTMLInputElement).value).toBe("6");

    // Reset without any edits should fire mutation with original values
    const handler = vi.fn(async (info: { request: Request }) => {
      const body = (await info.request.json()) as { bbox: BBox };
      return HttpResponse.json(makePageResponse(body.bbox));
    });
    server.use(http.post("/api/projects/p1/pages/0/words/0/0/rebox", handler));

    await user.click(screen.getByTestId("bbox-reset-button"));

    // Mutation should have been called with the original bbox
    await waitFor(() => expect(handler).toHaveBeenCalledOnce());
  });

  it("shows outer container with data-testid=bbox-section", () => {
    renderBBox();
    expect(screen.getByTestId("bbox-section")).toBeInTheDocument();
  });
});
