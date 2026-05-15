// ReboxSection.tsx — Rebox accordion section for the word detail editor.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 17.
//
// Wraps existing WordRefineNudgeRows + WordActionRows inside an
// Accordion.Item with tag="accent" (2px accent-colored left edge stripe).
//
// The consumer is WordDetail — this component does NOT render the
// Accordion.Item itself (the Item wrapper lives in WordDetail so the
// accordion value/open state is managed there).  Instead, this component
// renders the *content* that goes inside the Accordion.Content.
//
// data-testids:
//   rebox-section           — outer wrapper
//
// Re-exported driver-contract testids (from the wrapped components):
//   dialog-refine-button          — Refine
//   dialog-expand-refine-button   — Expand + Refine
//   dialog-nudge-*                — nudge arrows
//   dialog-apply-button           — Apply
//   dialog-apply-refine-button    — Apply + Refine
//   dialog-reset-button           — Reset nudge
//   dialog-merge-prev-button      — Merge with previous
//   dialog-merge-next-button      — Merge with next
//   dialog-split-h-button         — Split horizontal
//   dialog-split-v-button         — Split vertical
//   dialog-delete-word-button     — Delete word
//   dialog-crop-*-button          — Crop actions

import type { RefObject } from "react";
import { WordRefineNudgeRows, type WordRefineNudgeRowsHandle } from "../../WordRefineNudgeRows";
import { WordActionRows, type WordActionCallbacks } from "../../WordActionRows";

export interface ReboxSectionProps {
  /** Whether a previous word is available for merge. */
  hasPrev: boolean;
  /** Whether a next word is available for merge. */
  hasNext: boolean;
  /** x-fraction (0–1) for horizontal split. Default 0.5 */
  splitFraction?: number;
  /** Forwarded ref to the nudge rows for programmatic nudge. */
  nudgeRef?: RefObject<WordRefineNudgeRowsHandle | null>;
  /** Callbacks for refine/nudge. */
  onRefine?: () => Promise<void>;
  onExpandRefine?: () => Promise<void>;
  onApply?: (
    nudge: { left: number; right: number; top: number; bottom: number },
    refineAfter: boolean,
  ) => Promise<void>;
  onReset?: () => void;
  /** Callbacks for word structural actions. */
  wordActionCallbacks?: WordActionCallbacks;
}

export function ReboxSection({
  hasPrev,
  hasNext,
  splitFraction = 0.5,
  nudgeRef,
  onRefine,
  onExpandRefine,
  onApply,
  onReset,
  wordActionCallbacks = {},
}: ReboxSectionProps) {
  return (
    <div data-testid="rebox-section" className="flex flex-col gap-0">
      <WordRefineNudgeRows
        ref={nudgeRef}
        onRefine={onRefine}
        onExpandRefine={onExpandRefine}
        onApply={onApply}
        onReset={onReset}
      />
      <WordActionRows
        hasPrev={hasPrev}
        hasNext={hasNext}
        splitFraction={splitFraction}
        {...wordActionCallbacks}
      />
    </div>
  );
}
