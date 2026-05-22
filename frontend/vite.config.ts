import fs from "fs";
import path from "path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// FastAPI proxies /api/* and /image-cache/* during `npm run dev`. The dev
// server runs on :5173; the user starts FastAPI separately with
// `pd-ocr-labeler-ui --frontend-dev http://localhost:5173`.
//
// Backend port is read from `.pdlabeler-port` (written by the server on every
// start, issue #323). Falls back to 8080 if the file is absent so a first
// `npm run dev` before the server has started still works.
//
// See `docs/architecture/02-backend.md §3` for Settings.port precedence and
// `docs/architecture/15-deployment-dev.md §3` for the port-file contract.
//
// Vitest configuration lives in `vitest.config.ts` (sibling) rather than
// inline here — vitest 2.x bundles its own Vite which conflicts with the
// project's Vite 6 type-wise. Runtime is fine, but tsc -b chokes; a
// separate file sidesteps the type collision cleanly.

function readBackendPort(): number {
  try {
    return parseInt(fs.readFileSync(".pdlabeler-port", "utf8").trim(), 10) || 8080;
  } catch {
    return 8080;
  }
}

const backendPort = readBackendPort();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force a single React instance when pnpm symlink scoping creates two paths
    // for the same react@19 package (main app vs @concavetrillion/pd-ui scope).
    // Without this, Vite bundles both as separate module instances and React's
    // internal hook dispatcher (ReactCurrentBatchConfig) is undefined at runtime.
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": `http://localhost:${backendPort}`,
      "/image-cache": `http://localhost:${backendPort}`,
      "/env.js": `http://localhost:${backendPort}`,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
