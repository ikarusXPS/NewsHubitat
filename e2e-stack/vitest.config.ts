/// <reference types="vitest" />
// Minimal vitest config for the WS-04 cross-replica fanout integration test.
//
// We need a separate config from apps/web/vitest.config.ts because that one:
//   - sets environment: 'jsdom' (we need node — socket.io-client needs net)
//   - loads setup files that mock the DB (we want a real test stack)
//   - testTimeout: 10s (ws connection + 5s wait can take longer cold)
//
// Invoked via `node apps/web/node_modules/vitest/dist/cli.js --config e2e-stack/vitest.config.ts`
// from a working directory inside apps/web/, so that imports like
// `vitest/config` resolve via apps/web's node_modules.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['ws-fanout.test.ts'],
    exclude: ['node_modules'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    // No setupFiles — the stack itself is the fixture.
  },
});
