// Tailwind v3.4 configuration. Pinned to v3.x — v4 has a different API
// (CSS-first config, `@import "tailwindcss"` instead of `@tailwind`
// directives) and shadcn/ui generators still target v3 as of M0.
//
// `content` globs are deliberately tight (index.html + src/**) so the
// JIT engine doesn't scan node_modules. Keep these in sync with
// `tests/unit/test_tailwind_config.py`.
//
// ESM (`export default`) to match the rest of `frontend/` (vite.config.ts,
// vitest.config.ts) and `"type": "module"` in package.json.
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
