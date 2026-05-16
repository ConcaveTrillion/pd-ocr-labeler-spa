// LineCard.tsx — collapsible card showing OCR-vs-GT comparison for one line.
//
// Spec: docs/specs/2026-05-12-word-matches-design.md §LineCard header
// Issues #201, #202
//
// Header background by overall_match_status:
//   exact         → bg-green-100
//   fuzzy         → bg-yellow-100
//   mismatch      → bg-red-100
//   unmatched_ocr → bg-gray-100
//   unmatched_gt  → bg-blue-100
//
// Count chips render only for nonzero counts.
// Validate / Unvalidate button flips based on is_fully_validated.
//
// data-testids (driver-contract §2.8):
//   line-card-{n}              — full card (spec canonical)
//   line-card-{n}-header       — header row
//   line-gt-to-ocr-button-{n}  — GT→OCR button (spec canonical)
//   line-ocr-to-gt-button-{n}  — OCR→GT button (spec canonical)
//   line-validate-button-{n}   — Validate/Unvalidate (spec canonical)
//   line-delete-button-{n}     — Delete line (spec canonical)
//   count-chip-exact / count-chip-fuzzy / count-chip-mismatch /
//   count-chip-unmatched_gt / count-chip-unmatched_ocr

import type React from "react";
import type { components } from "../api/types";

type LineMatch = components["schemas"]["LineMatch"];
type MatchStatus = components["schemas"]["MatchStatus"];

const STATUS_BG_STYLE: Record<MatchStatus, React.CSSProperties> = {
  exact: { background: "color-mix(in srgb, var(--status-exact) 12%, var(--bg-surface))" },
  fuzzy: { background: "color-mix(in srgb, var(--status-fuzzy) 12%, var(--bg-surface))" },
  mismatch: { background: "color-mix(in srgb, var(--status-mismatch) 12%, var(--bg-surface))" },
  unmatched_ocr: { background: "var(--bg-raised)" },
  unmatched_gt: { background: "color-mix(in srgb, var(--status-ocr) 8%, var(--bg-surface))" },
};

interface CountChipProps {
  kind: "exact" | "fuzzy" | "mismatch" | "unmatched_gt" | "unmatched_ocr";
  count: number;
  label: string;
  chipStyle: React.CSSProperties;
  textClass: string;
}

function CountChip({ kind, count, label, chipStyle, textClass }: CountChipProps) {
  if (count === 0) return null;
  return (
    <span
      data-testid={`count-chip-${kind}`}
      className={`px-1.5 py-0.5 text-xs font-medium rounded ${textClass}`}
      style={chipStyle}
      title={`${count} ${label}`}
    >
      {count}
    </span>
  );
}

export interface LineCardProps {
  line: LineMatch;
  /** Called when Validate / Unvalidate is clicked. */
  onValidate?: (lineIndex: number, validated: boolean) => void;
  /** Called when GT→OCR copy is clicked. */
  onCopyGtToOcr?: (lineIndex: number) => void;
  /** Called when OCR→GT copy is clicked. */
  onCopyOcrToGt?: (lineIndex: number) => void;
  /** Called when Delete is clicked. */
  onDelete?: (lineIndex: number) => void;
}

/**
 * Single line comparison card.
 *
 * Header background is derived from `overall_match_status`.
 * Count chips are rendered only for nonzero values.
 * Validate/Unvalidate label flips based on `is_fully_validated`.
 */
export function LineCard({
  line,
  onValidate,
  onCopyGtToOcr,
  onCopyOcrToGt,
  onDelete,
}: LineCardProps) {
  const bgStyle = STATUS_BG_STYLE[line.overall_match_status] ?? { background: "var(--bg-raised)" };
  const isExact = line.overall_match_status === "exact";

  return (
    <div
      data-testid={`line-card-${line.line_index}`}
      className="border border-border-1 rounded mb-1 overflow-hidden"
    >
      {/* Header */}
      <div
        data-testid={`line-card-${line.line_index}-header`}
        className="flex items-center gap-1 px-2 py-1"
        style={bgStyle}
      >
        {/* Count chips */}
        <div className="flex items-center gap-0.5 flex-1">
          <CountChip
            kind="exact"
            count={line.exact_count}
            label="exact"
            chipStyle={{
              background: "color-mix(in srgb, var(--status-exact) 20%, var(--bg-surface))",
            }}
            textClass="text-status-exact"
          />
          <CountChip
            kind="fuzzy"
            count={line.fuzzy_count}
            label="fuzzy"
            chipStyle={{
              background: "color-mix(in srgb, var(--status-fuzzy) 20%, var(--bg-surface))",
            }}
            textClass="text-status-fuzzy"
          />
          <CountChip
            kind="mismatch"
            count={line.mismatch_count}
            label="mismatch"
            chipStyle={{
              background: "color-mix(in srgb, var(--status-mismatch) 20%, var(--bg-surface))",
            }}
            textClass="text-status-mismatch"
          />
          <CountChip
            kind="unmatched_gt"
            count={line.unmatched_gt_count}
            label="unmatched GT"
            chipStyle={{
              background: "color-mix(in srgb, var(--status-ocr) 20%, var(--bg-surface))",
            }}
            textClass="text-status-ocr"
          />
          <CountChip
            kind="unmatched_ocr"
            count={line.unmatched_ocr_count}
            label="unmatched OCR"
            chipStyle={{ background: "var(--bg-raised)" }}
            textClass="text-ink-2"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* GT→OCR / OCR→GT: hidden when exact */}
          {!isExact && (
            <>
              <button
                data-testid={`line-gt-to-ocr-button-${line.line_index}`}
                className="px-1.5 py-0.5 text-xs border border-border-2 rounded bg-bg-surface hover:bg-bg-raised"
                onClick={() => onCopyGtToOcr?.(line.line_index)}
                title="Copy GT to OCR"
              >
                GT→OCR
              </button>
              <button
                data-testid={`line-ocr-to-gt-button-${line.line_index}`}
                className="px-1.5 py-0.5 text-xs border border-border-2 rounded bg-bg-surface hover:bg-bg-raised"
                onClick={() => onCopyOcrToGt?.(line.line_index)}
                title="Copy OCR to GT"
              >
                OCR→GT
              </button>
            </>
          )}

          <button
            data-testid={`line-validate-button-${line.line_index}`}
            className="px-1.5 py-0.5 text-xs border border-border-2 rounded bg-bg-surface hover:bg-bg-raised"
            onClick={() => onValidate?.(line.line_index, !line.is_fully_validated)}
          >
            {line.is_fully_validated ? "Unvalidate" : "Validate"}
          </button>

          <button
            data-testid={`line-delete-button-${line.line_index}`}
            className="px-1.5 py-0.5 text-xs border border-status-mismatch/50 text-status-mismatch rounded bg-bg-surface hover:bg-bg-raised"
            onClick={() => onDelete?.(line.line_index)}
            title="Delete line"
          >
            Delete
          </button>
        </div>
      </div>

      {/* OCR text preview */}
      <div className="px-2 py-1 text-xs font-mono text-ink-2 bg-bg-surface truncate">
        {line.ocr_line_text || <span className="text-ink-4 italic">(empty)</span>}
      </div>
    </div>
  );
}
