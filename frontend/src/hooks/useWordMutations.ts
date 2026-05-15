// useWordMutations.ts — TanStack Query mutations for word-level actions.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 16 (BBoxSection).
//
// Endpoints:
//   POST /api/projects/{pid}/pages/{idx}/words/{li}/{wi}/rebox → PagePayload
//   POST /api/projects/{pid}/pages/{idx}/words/{li}/{wi}/merge → PagePayload
//   POST /api/projects/{pid}/pages/{idx}/words/{li}/{wi}/split → PagePayload

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { components } from "../api/types";

type PagePayload = components["schemas"]["PagePayload"];
type BBox = components["schemas"]["BBox"];
type ReboxWordRequest = components["schemas"]["ReboxWordRequest"];
type MergeWordsRequest = components["schemas"]["MergeWordsRequest"];
type SplitWordRequest = components["schemas"]["SplitWordRequest"];

// ─── internal helpers ──────────────────────────────────────────────────────

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (text) message = text;
    }
    throw Object.assign(new Error(message), { status: res.status });
  }
  return res.json() as Promise<T>;
}

function wordBase(
  projectId: string,
  pageIndex: number,
  lineIndex: number,
  wordIndex: number,
): string {
  return `/api/projects/${projectId}/pages/${pageIndex}/words/${lineIndex}/${wordIndex}`;
}

// ─── useReboxWord ──────────────────────────────────────────────────────────

/**
 * Replace the bounding box of a single word.
 *
 * Invalidates the page query on success so the canvas and word cells
 * re-render with the updated bbox.
 */
export function useReboxWord(projectId: string, pageIndex: number) {
  const qc = useQueryClient();
  return useMutation<PagePayload, Error, { lineIndex: number; wordIndex: number; bbox: BBox }>({
    mutationFn: ({ lineIndex, wordIndex, bbox }) => {
      const body: ReboxWordRequest = { bbox };
      return apiPost<PagePayload>(
        `${wordBase(projectId, pageIndex, lineIndex, wordIndex)}/rebox`,
        body,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["page", projectId, pageIndex] });
    },
  });
}

// ─── useMergeWord ──────────────────────────────────────────────────────────

/**
 * Merge a word with its left ("prev") or right ("next") neighbour.
 *
 * The API takes `direction: "left" | "right"`:
 *   "left"  ↔ merge with previous word
 *   "right" ↔ merge with next word
 */
export function useMergeWord(projectId: string, pageIndex: number) {
  const qc = useQueryClient();
  return useMutation<
    PagePayload,
    Error,
    { lineIndex: number; wordIndex: number; direction: MergeWordsRequest["direction"] }
  >({
    mutationFn: ({ lineIndex, wordIndex, direction }) => {
      const body: MergeWordsRequest = { direction };
      return apiPost<PagePayload>(
        `${wordBase(projectId, pageIndex, lineIndex, wordIndex)}/merge`,
        body,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["page", projectId, pageIndex] });
    },
  });
}

// ─── useSplitWord ──────────────────────────────────────────────────────────

/**
 * Split a word at a horizontal fraction.
 *
 * `direction` is always "horizontal" for now (vertical returns 400 from
 * the server per the API comment).
 */
export function useSplitWord(projectId: string, pageIndex: number) {
  const qc = useQueryClient();
  return useMutation<
    PagePayload,
    Error,
    {
      lineIndex: number;
      wordIndex: number;
      xFraction: number;
      direction?: SplitWordRequest["direction"];
    }
  >({
    mutationFn: ({ lineIndex, wordIndex, xFraction, direction = "horizontal" }) => {
      const body: SplitWordRequest = { x_fraction: xFraction, direction };
      return apiPost<PagePayload>(
        `${wordBase(projectId, pageIndex, lineIndex, wordIndex)}/split`,
        body,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["page", projectId, pageIndex] });
    },
  });
}
