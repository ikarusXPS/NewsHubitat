/// <reference types="vitest" />
// Minimal vitest config for the WS-04 cross-replica fanout integration test.
//
// We need a separate config from apps/web/vitest.config.ts because that one:
//   - sets environment: 'jsdom' (we need node — socket.io-client needs net)
//   - loads setup files that mock the DB (we want a real test stack)
//   - testTimeout: 10s (ws connection + 5s wait can take longer cold)
//
// We export a plain object instead of using `defineConfig` from 'vitest/config'
// because this directory has no node_modules — Node would resolve 'vitest/config'
// relative to the config file's location and fail. Vitest accepts a plain object
// just as well.

export default {
  test: {
    environment: 'node' as const,
    globals: false,
    include: ['ws-fanout.test.ts'],
    exclude: ['node_modules'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks' as const,
    // No setupFiles — the stack itself is the fixture.
  },
};
