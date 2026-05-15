// StructureSection.tsx — Structure accordion section for word detail editor.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 18.
//
// Shows prev/next-word neighbor preview chips (WordCell, read-only) and
// Merge/Split buttons wired to useWordMutations.
// Destructive merge actions confirm via ConfirmDialog.
//
// data-testids:
//   structure-section                 — outer wrapper
//   structure-prev-word               — prev neighbor preview (or "none" label)
//   structure-next-word               — next neighbor preview (or "none" label)
//   structure-merge-prev-button       — Merge with previous
//   structure-merge-next-button       — Merge with next
//   structure-split-button            — Split at cursor

import { useState } from "react";
import { Button } from "../../ui/button";
import { WordCell } from "../../WordCell";
import { ConfirmDialog } from "../../ConfirmDialog";
import { useMergeWord, useSplitWord } from "../../../hooks/useWordMutations";
import type { components } from "../../../api/types";

type WordMatch = components["schemas"]["WordMatch"];
type PagePayload = components["schemas"]["PagePayload"];

// ─── helpers ─────────────────────────────────────────────────────────────

function getNeighborWords(
  page: PagePayload,
  lineIndex: number,
  wordIndex: number,
): { prev: WordMatch | null; next: WordMatch | null } {
  const line = page.line_matches?.find((l) => l.line_index === lineIndex);
  if (!line) return { prev: null, next: null };
  const words = line.word_matches;
  const prev = wordIndex > 0 ? (words[wordIndex - 1] ?? null) : null;
  const next = wordIndex < words.length - 1 ? (words[wordIndex + 1] ?? null) : null;
  return { prev, next };
}

// ─── MergeConfirmState ───────────────────────────────────────────────────

type MergeDirection = "left" | "right";

interface MergeConfirmState {
  open: boolean;
  direction: MergeDirection | null;
}

// ─── Component ───────────────────────────────────────────────────────────

export interface StructureSectionProps {
  word: WordMatch;
  page: PagePayload;
  projectId: string;
  pageIndex: number;
}

export function StructureSection({ word, page, projectId, pageIndex }: StructureSectionProps) {
  const mergeWord = useMergeWord(projectId, pageIndex);
  const splitWord = useSplitWord(projectId, pageIndex);

  const [confirm, setConfirm] = useState<MergeConfirmState>({ open: false, direction: null });

  const lineIndex = word.line_index;
  const wordIndex = word.word_index ?? 0;

  const { prev, next } = getNeighborWords(page, lineIndex, wordIndex);
  const hasPrev = prev !== null;
  const hasNext = next !== null;

  const busy = mergeWord.isPending || splitWord.isPending;

  // ── Merge ───────────────────────────────────────────────────────────────

  function requestMerge(direction: MergeDirection) {
    setConfirm({ open: true, direction });
  }

  function confirmMerge() {
    if (!confirm.direction) return;
    mergeWord.mutate({ lineIndex, wordIndex, direction: confirm.direction });
    setConfirm({ open: false, direction: null });
  }

  function cancelMerge() {
    setConfirm({ open: false, direction: null });
  }

  // ── Split ───────────────────────────────────────────────────────────────

  function handleSplit() {
    splitWord.mutate({ lineIndex, wordIndex, xFraction: 0.5, direction: "horizontal" });
  }

  return (
    <div data-testid="structure-section" className="flex flex-col gap-2 py-1">
      {/* Neighbor previews */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-ink-3 uppercase tracking-wide">Neighbors</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Prev neighbor */}
          <div data-testid="structure-prev-word" className="flex flex-col gap-0.5">
            <span className="text-[10px] text-ink-3">← Prev</span>
            {prev ? (
              <div className="opacity-80 pointer-events-none">
                <WordCell word={prev} />
              </div>
            ) : (
              <span className="text-[11px] text-ink-4 italic">none</span>
            )}
          </div>

          {/* Next neighbor */}
          <div data-testid="structure-next-word" className="flex flex-col gap-0.5">
            <span className="text-[10px] text-ink-3">Next →</span>
            {next ? (
              <div className="opacity-80 pointer-events-none">
                <WordCell word={next} />
              </div>
            ) : (
              <span className="text-[11px] text-ink-4 italic">none</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] text-ink-3 uppercase tracking-wide">Actions</p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            data-testid="structure-merge-prev-button"
            variant="secondary"
            size="sm"
            disabled={!hasPrev || busy}
            onClick={() => requestMerge("left")}
          >
            ← Merge prev
          </Button>
          <Button
            data-testid="structure-merge-next-button"
            variant="secondary"
            size="sm"
            disabled={!hasNext || busy}
            onClick={() => requestMerge("right")}
          >
            Merge next →
          </Button>
          <Button
            data-testid="structure-split-button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={handleSplit}
          >
            Split at cursor
          </Button>
        </div>
      </div>

      {/* Confirm dialog for destructive merges */}
      <ConfirmDialog
        open={confirm.open}
        title="Merge words"
        message={
          confirm.direction === "left"
            ? "Merge this word with the previous word? This cannot be undone."
            : "Merge this word with the next word? This cannot be undone."
        }
        confirmLabel="Merge"
        onConfirm={confirmMerge}
        onCancel={cancelMerge}
      />
    </div>
  );
}
