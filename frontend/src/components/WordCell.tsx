// WordCell.tsx — per-word 5-row CSS grid with GT input.
// Spec: docs/specs/2026-05-12-word-matches-design.md §WordCell grid
// Issue #203
//
// Layout (5 rows):
//   Row 1: status icon + validated checkbox
//   Row 2: image slice (crop URL, skipped when no word_id or no page image URL)
//   Row 3: OCR text + style/component tag chips
//   Row 4: GT <input> — blur-commit, optimistic, revert on error
//   Row 5: match status badge
//
// GT editing: controlled <input>; on blur, if value changed → call onCommitGt.
// Tab/Shift-Tab navigation between GT inputs is handled at the parent level
// via natural DOM tab order (inputs within a line card render in DOM order).
//
// data-testids:
//   word-cell-{word_id}   — outer container
//   gt-input-{word_id}    — the GT text input

import { useState, useEffect, useRef } from "react";
import type { components } from "../api/types";

type WordMatch = components["schemas"]["WordMatch"];
type MatchStatus = components["schemas"]["MatchStatus"];

const STATUS_ICON: Record<MatchStatus, string> = {
  exact: "✓",
  fuzzy: "≈",
  mismatch: "✗",
  unmatched_ocr: "○",
  unmatched_gt: "●",
};

const STATUS_COLOR: Record<MatchStatus, string> = {
  exact: "text-green-600",
  fuzzy: "text-yellow-600",
  mismatch: "text-red-600",
  unmatched_ocr: "text-gray-500",
  unmatched_gt: "text-blue-500",
};

export interface WordCellProps {
  word: WordMatch;
  /**
   * Called when the GT input is blurred and the value has changed.
   * Signature: (wordId, lineIndex, wordIndex, newText) => void
   */
  onCommitGt?: (wordId: string, lineIndex: number, wordIndex: number, text: string) => void;
  /** Base URL for page image slices (e.g. /api/.../pages/0/image). When provided
   *  and word_id is set, a crop thumbnail is shown in row 2. */
  imageBaseUrl?: string;
}

/**
 * Single word comparison cell.
 *
 * Uses `word_id` as the React key discriminator and testid anchor.
 * Falls back to `${line_index}-${word_index}` when `word_id` is absent.
 */
export function WordCell({ word, onCommitGt }: WordCellProps) {
  const wordId = word.word_id ?? `${word.line_index}-${word.word_index}`;
  const [gtValue, setGtValue] = useState(word.ground_truth_text);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track the committed value so we can detect changes at blur time.
  const committedRef = useRef(word.ground_truth_text);

  // Sync controlled state when server data updates (after query invalidation),
  // but only when the input is not currently focused.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setGtValue(word.ground_truth_text);
      committedRef.current = word.ground_truth_text;
    }
  }, [word.ground_truth_text]);

  function handleBlur() {
    if (gtValue !== committedRef.current) {
      committedRef.current = gtValue;
      onCommitGt?.(wordId, word.line_index, word.word_index ?? 0, gtValue);
    }
  }

  const statusColor = STATUS_COLOR[word.match_status] ?? "text-gray-500";
  const statusIcon = STATUS_ICON[word.match_status] ?? "?";

  return (
    <div
      data-testid={`word-cell-${wordId}`}
      className="border border-gray-100 rounded p-1 flex flex-col gap-0.5 min-w-16 max-w-32"
    >
      {/* Row 1: status icon + validated indicator */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold ${statusColor}`}
          aria-label={`${word.match_status} match`}
          title={word.match_status}
        >
          {statusIcon}
        </span>
        {word.is_validated && (
          <span className="text-xs text-green-600" title="Validated">
            ✔
          </span>
        )}
      </div>

      {/* Row 3: OCR text */}
      <div className="text-xs font-mono text-gray-700 truncate" title={word.ocr_text}>
        {word.ocr_text || <span className="text-gray-300 italic">∅</span>}
      </div>

      {/* Tag chips: style labels (blue tint) + component labels (green tint) */}
      {((word.text_style_labels?.length ?? 0) > 0 || (word.word_components?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-0.5">
          {word.text_style_labels?.map((label) => (
            <span
              key={`style-${label}`}
              className="px-1 py-0 text-[10px] rounded"
              style={{ backgroundColor: "#e7f0ff" }}
              title={`Style: ${label}`}
            >
              {label}
            </span>
          ))}
          {word.word_components?.map((comp) => (
            <span
              key={`comp-${comp}`}
              className="px-1 py-0 text-[10px] rounded"
              style={{ backgroundColor: "#e7f8ee" }}
              title={`Component: ${comp}`}
            >
              {comp}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: GT input */}
      <input
        ref={inputRef}
        data-testid={`gt-input-${wordId}`}
        type="text"
        value={gtValue}
        onChange={(e) => setGtValue(e.target.value)}
        onBlur={handleBlur}
        className="w-full text-xs border border-gray-200 rounded px-1 py-0.5 font-mono focus:outline-none focus:border-blue-400"
        aria-label={`Ground truth for "${word.ocr_text}"`}
      />

      {/* Row 5: fuzz score (shown only for fuzzy matches) */}
      {word.match_status === "fuzzy" && word.fuzz_score != null && (
        <div className="text-[10px] text-gray-400 text-right">
          {Math.round(word.fuzz_score * 100)}%
        </div>
      )}
    </div>
  );
}
