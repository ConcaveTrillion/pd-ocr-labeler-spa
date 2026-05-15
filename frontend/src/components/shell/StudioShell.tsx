// StudioShell.tsx — 5-zone CSS grid layout for the Studio shell.
// Spec: docs/specs/2026-05-15-hifi-redesign-plan.md Slice 8.
//
// Grid template:
//   "header header header header"
//   "rail   drawer  canvas right"
//
// Columns: 40px | var(--drawer-w, 260px) | 1fr | 320px
// Rows:    40px | 1fr
//
// The `drawerCollapsed` prop sets --drawer-w to 0px.

import type * as React from "react";

export interface StudioShellProps {
  /** Content for the 40px top header zone. */
  header: React.ReactNode;
  /** Content for the 40px wide left rail. */
  rail: React.ReactNode;
  /** Content for the collapsible drawer panel. */
  drawer: React.ReactNode;
  /** Content for the main canvas area. */
  canvas: React.ReactNode;
  /** Content for the 320px right panel. */
  right: React.ReactNode;
  /** When true, collapses the drawer to 0 width. */
  drawerCollapsed?: boolean;
}

export function StudioShell({
  header,
  rail,
  drawer,
  canvas,
  right,
  drawerCollapsed = false,
}: StudioShellProps) {
  return (
    <div
      data-testid="studio-shell"
      className="h-full w-full bg-bg-page"
      style={{
        display: "grid",
        gridTemplateAreas: '"header header header header" "rail drawer canvas right"',
        gridTemplateColumns: `40px ${drawerCollapsed ? "0px" : "var(--drawer-w, 260px)"} 1fr 320px`,
        gridTemplateRows: "40px 1fr",
      }}
    >
      {/* Header zone */}
      <div
        data-testid="studio-shell-header"
        style={{ gridArea: "header" }}
        className="min-w-0 overflow-hidden"
      >
        {header}
      </div>

      {/* Rail zone */}
      <div
        data-testid="studio-shell-rail"
        style={{ gridArea: "rail" }}
        className="min-w-0 overflow-hidden"
      >
        {rail}
      </div>

      {/* Drawer zone */}
      <div
        data-testid="studio-shell-drawer"
        data-collapsed={drawerCollapsed ? "true" : undefined}
        style={{ gridArea: "drawer" }}
        className="min-w-0 overflow-hidden"
      >
        {drawer}
      </div>

      {/* Canvas zone */}
      <div
        data-testid="studio-shell-canvas"
        style={{ gridArea: "canvas" }}
        className="min-w-0 min-h-0 overflow-hidden"
      >
        {canvas}
      </div>

      {/* Right panel zone */}
      <div
        data-testid="studio-shell-right"
        style={{ gridArea: "right" }}
        className="min-w-0 overflow-hidden"
      >
        {right}
      </div>
    </div>
  );
}
