import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Tailwind v3.4 base/components/utilities are injected via `./index.css`
// (PostCSS pipeline configured in `postcss.config.js`). shadcn/ui
// generators run on top of this in a later milestone.

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
