// msw mock server — Node-side (jsdom test environment) request interception.
// Tests call `server.use(...)` to register per-test handlers; the global
// `afterEach` in `setup.ts` resets them between tests to prevent leaks.
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
