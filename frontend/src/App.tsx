// Minimal app shell for the M0 frontend scaffold.
//
// At this stage there are no routes, no API client, no stores — those land
// in M1+ per `specs/03-frontend.md`. The marker `data-testid="app-shell"`
// exists so the iter-2 Vitest smoke test has something stable to assert
// against; do NOT use this id as a load-bearing driver invariant
// (the driver contract in `specs/13-driver-contract.md` is the source of
// truth for testids that must stay stable).

export default function App() {
  return (
    <div data-testid="app-shell">
      <h1>pd-ocr-labeler-spa</h1>
      <p>SPA scaffold — milestone M0.</p>
    </div>
  );
}
