// PostCSS pipeline for Tailwind v3.4 + autoprefixer. Vite 6 picks this
// up automatically — no `css.postcss` reference in vite.config.ts is
// required. ESM to match `"type": "module"` in package.json.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
