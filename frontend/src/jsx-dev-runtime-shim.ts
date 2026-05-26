// Shim: redirect jsxDEV calls from pdomain-ui's dev-mode build to production jsx.
// pdomain-ui 0.2.1 was built with dev-mode JSX transform. In production,
// react/jsx-dev-runtime exports jsxDEV=undefined which crashes at runtime.
// This shim re-exports jsxDEV as the production jsx function.
// Remove once pdomain-ui is rebuilt with production JSX (tracked: pdomain-ui cross-repo issue 2026-05-26).
export { Fragment, jsx as jsxDEV, jsx, jsxs } from "react/jsx-runtime";
