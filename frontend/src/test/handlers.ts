// Default msw handlers shared across the test suite.
//
// Empty by design for the harness bring-up: the msw server is wired here
// with no baseline handlers. Tests that need request interception register
// their own per-test handlers via `server.use(...)`. The global `afterEach`
// in `setup.ts` resets handlers between tests so leaks are impossible.
import type { RequestHandler } from "msw";

export const handlers: RequestHandler[] = [];
