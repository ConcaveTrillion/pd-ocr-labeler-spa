// InlineBanners.tsx — sticky inline error banners for persistent page-level issues.
//
// Spec: docs/specs/2026-05-12-notifications-design.md §inline banners
// Issue #233
//
// Three distinct banners:
//   - OcrFailedBanner: shown when pageRecord.ocr_failed === true
//   - ProjectNotFoundBanner: shown when routing to a missing project_id
//   - ImageDriftBanner: shown after a 409 image_drift save response
//
// These are NOT toasts — they are rendered inline in the page content area.
// They use a simple alert-style layout (shadcn Alert-compatible) without
// depending on the shadcn library (keeping the dep footprint minimal for now).

import React from "react";

const variantStyles: Record<string, React.CSSProperties> = {
  error: {
    color: "var(--status-mismatch)",
    background: "color-mix(in srgb, var(--status-mismatch) 8%, var(--bg-surface))",
    borderColor: "color-mix(in srgb, var(--status-mismatch) 33%, transparent)",
  },
  warning: {
    color: "var(--status-fuzzy)",
    background: "color-mix(in srgb, var(--status-fuzzy) 8%, var(--bg-surface))",
    borderColor: "color-mix(in srgb, var(--status-fuzzy) 33%, transparent)",
  },
  info: {
    color: "var(--status-ocr)",
    background: "color-mix(in srgb, var(--status-ocr) 8%, var(--bg-surface))",
    borderColor: "color-mix(in srgb, var(--status-ocr) 33%, transparent)",
  },
};

/** Icon — triangle warning. */
function WarningIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface AlertBannerProps {
  testId: string;
  variant?: "error" | "warning" | "info";
  children: React.ReactNode;
}

function AlertBanner({ testId, variant = "error", children }: AlertBannerProps) {
  return (
    <div
      data-testid={testId}
      role="alert"
      className="flex items-start gap-2 rounded-md border px-4 py-3 text-sm"
      style={variantStyles[variant] ?? variantStyles["error"]}
    >
      <WarningIcon />
      <span>{children}</span>
    </div>
  );
}

// --- Public banner components ---

interface OcrFailedBannerProps {
  /** True when the current page's OCR run failed. */
  ocrFailed?: boolean;
}

/**
 * Inline banner shown when `pageRecord.ocr_failed === true`.
 * Spec: "OCR failed for this page" sticky error.
 */
export function OcrFailedBanner({ ocrFailed }: OcrFailedBannerProps) {
  if (!ocrFailed) return null;
  return (
    <AlertBanner testId="banner-ocr-failed" variant="error">
      OCR failed for this page. Try reloading OCR from the toolbar.
    </AlertBanner>
  );
}

interface ProjectNotFoundBannerProps {
  /** The project ID that was not found. */
  projectId?: string;
  /** True when the project could not be resolved. */
  notFound?: boolean;
}

/**
 * Inline banner shown when routing to a project_id that doesn't resolve.
 * Spec: "Project not found" sticky error.
 */
export function ProjectNotFoundBanner({ projectId, notFound }: ProjectNotFoundBannerProps) {
  if (!notFound) return null;
  return (
    <AlertBanner testId="banner-project-not-found" variant="error">
      Project not found{projectId ? `: "${projectId}"` : ""}. Go back to the project list to select
      a valid project.
    </AlertBanner>
  );
}

interface ImageDriftBannerProps {
  /** True after a 409 image_drift save response. */
  imageDrift?: boolean;
}

/**
 * Inline banner shown after a 409 `image_drift` save response.
 * Spec: "Image on disk has changed. Reload page to continue."
 */
export function ImageDriftBanner({ imageDrift }: ImageDriftBannerProps) {
  if (!imageDrift) return null;
  return (
    <AlertBanner testId="banner-image-drift" variant="warning">
      Image on disk has changed. Reload the page to continue editing.
    </AlertBanner>
  );
}
