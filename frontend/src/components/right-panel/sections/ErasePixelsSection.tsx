// ErasePixelsSection.tsx — Erase pixels accordion section (mismatch-tagged).
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 17.
//
// "Mark pixels for erasure" toggle + "Apply" button.
// The Apply button is disabled with tooltip "Backend not wired" until the
// erase-pixels endpoint is fully integrated.
//
// data-testids:
//   erase-pixels-section        — outer wrapper
//   erase-pixels-toggle         — "Mark pixels for erasure" toggle
//   erase-pixels-apply-button   — Apply button (disabled)

import { useState } from "react";
import { Button } from "../../ui/button";

export interface ErasePixelsSectionProps {
  /** Whether the backend erase endpoint is available. When false (default),
   * the Apply button is disabled with a tooltip. */
  backendAvailable?: boolean;
  /** Called when Apply is clicked and backend is available. */
  onApply?: () => Promise<void>;
}

export function ErasePixelsSection({ backendAvailable = false, onApply }: ErasePixelsSectionProps) {
  const [markingEnabled, setMarkingEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleApply() {
    if (!backendAvailable || !onApply) return;
    setBusy(true);
    try {
      await onApply();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="erase-pixels-section" className="flex flex-col gap-2 py-1">
      {/* Toggle row */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          data-testid="erase-pixels-toggle"
          type="checkbox"
          checked={markingEnabled}
          onChange={(e) => setMarkingEnabled(e.target.checked)}
          className="rounded border-border-2 bg-sunk accent-accent"
        />
        <span className="text-[11px] text-ink-2">Mark pixels for erasure</span>
      </label>

      {/* Apply button — disabled until backend is wired */}
      <div className="flex">
        <Button
          data-testid="erase-pixels-apply-button"
          variant="secondary"
          size="sm"
          onClick={() => void handleApply()}
          disabled={!backendAvailable || !markingEnabled || busy}
          title={!backendAvailable ? "Backend not wired" : undefined}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
