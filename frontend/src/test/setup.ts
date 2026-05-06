// Vitest global setup — loaded once per test file via `setupFiles` in
// vitest.config.ts. Registers @testing-library/jest-dom matchers
// (e.g. `toBeInTheDocument`).
//
// MSW + ResizeObserver stubs from pgdp-prep's setup are deliberately
// omitted here — they're not needed until M1+ when an API client and
// canvas-using components arrive. Add them back when the first test
// that needs them lands.
import "@testing-library/jest-dom/vitest";
