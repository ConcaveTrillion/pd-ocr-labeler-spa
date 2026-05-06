import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// FastAPI proxies /api/* and /image-cache/* during `npm run dev`. The dev
// server runs on :5173; the user starts FastAPI separately with
// `pd-ocr-labeler-ui --frontend-dev http://localhost:5173`.
//
// Vitest configuration lives in `vitest.config.ts` (sibling) rather than
// inline here — vitest 2.x bundles its own Vite which conflicts with the
// project's Vite 6 type-wise. Runtime is fine, but tsc -b chokes; a
// separate file sidesteps the type collision cleanly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8765",
      "/image-cache": "http://localhost:8765",
      "/env.js": "http://localhost:8765",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
