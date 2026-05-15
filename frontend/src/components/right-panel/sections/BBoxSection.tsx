// BBoxSection.tsx — Bounding box editor for a selected word.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 16.
//
// Renders four numeric Input size="sm" fields for x/y/width/height.
// Saves via useReboxWord mutation on blur (or Enter) when a field changes.
// "Reset" button restores to the original bbox (as loaded from the word prop).
//
// data-testids:
//   bbox-section          — outer container
//   bbox-input-x          — x field
//   bbox-input-y          — y field
//   bbox-input-w          — width field
//   bbox-input-h          — height field
//   bbox-reset-button     — Reset button

import { useState } from "react";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/button";
import { useReboxWord } from "../../../hooks/useWordMutations";
import type { components } from "../../../api/types";

type BBox = components["schemas"]["BBox"];
type WordMatch = components["schemas"]["WordMatch"];

export interface BBoxSectionProps {
  word: WordMatch;
  projectId: string;
  pageIndex: number;
}

type BBoxField = "x" | "y" | "width" | "height";

export function BBoxSection({ word, projectId, pageIndex }: BBoxSectionProps) {
  const reboxMutation = useReboxWord(projectId, pageIndex);

  // Local draft state — mirrors word.bbox, reset on word identity change.
  const [draft, setDraft] = useState<BBox>(() => ({ ...word.bbox }));

  // When the word prop changes (server update), sync draft unless user is editing.
  // We use a simple approach: track the last word_id+bbox we saw.
  const wordKey = `${word.line_index}-${word.word_index ?? 0}`;

  // Keep a ref to the original bbox for Reset.
  const originalBbox = word.bbox;

  function handleChange(field: BBoxField, value: string) {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    setDraft((prev) => ({ ...prev, [field]: num }));
  }

  function commitBbox(bbox: BBox) {
    reboxMutation.mutate({
      lineIndex: word.line_index,
      wordIndex: word.word_index ?? 0,
      bbox,
    });
  }

  function handleBlur(field: BBoxField, value: string) {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    const updated: BBox = { ...draft, [field]: num };
    setDraft(updated);
    commitBbox(updated);
  }

  function handleReset() {
    setDraft({ ...originalBbox });
    commitBbox({ ...originalBbox });
  }

  return (
    <div data-testid="bbox-section" data-word-key={wordKey} className="flex flex-col gap-2 py-1">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-ink-3 uppercase tracking-wide">X</span>
          <Input
            data-testid="bbox-input-x"
            type="number"
            size="sm"
            value={draft.x}
            onChange={(e) => handleChange("x", e.target.value)}
            onBlur={(e) => handleBlur("x", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-ink-3 uppercase tracking-wide">Y</span>
          <Input
            data-testid="bbox-input-y"
            type="number"
            size="sm"
            value={draft.y}
            onChange={(e) => handleChange("y", e.target.value)}
            onBlur={(e) => handleBlur("y", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-ink-3 uppercase tracking-wide">W</span>
          <Input
            data-testid="bbox-input-w"
            type="number"
            size="sm"
            value={draft.width}
            onChange={(e) => handleChange("width", e.target.value)}
            onBlur={(e) => handleBlur("width", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-ink-3 uppercase tracking-wide">H</span>
          <Input
            data-testid="bbox-input-h"
            type="number"
            size="sm"
            value={draft.height}
            onChange={(e) => handleChange("height", e.target.value)}
            onBlur={(e) => handleBlur("height", e.target.value)}
          />
        </label>
      </div>
      <div className="flex justify-end">
        <Button
          data-testid="bbox-reset-button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={reboxMutation.isPending}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
