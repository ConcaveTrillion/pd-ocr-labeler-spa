import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Tailwind + shadcn wiring lands in iter 3 (see ROADMAP.md M0 sub-tasks).
// The smoke test in iter 2 only verifies `<App>` mounts and renders the
// app-shell marker; no styling is asserted yet.

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
