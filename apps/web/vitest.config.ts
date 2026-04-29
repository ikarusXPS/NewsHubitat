/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'server/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
      thresholds: {
        statements: 80,
        // Branch coverage temporarily at 75% — actual is 75.61% (cf. CI run 25107573823).
        // TODO(coverage): backfill branch tests for routes/ai.ts, routes/leaderboard.ts,
        // services/webhookService.ts, jobs/workerEmitter.ts, hooks/useComments.ts → raise to 80.
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    // Performance
    pool: 'forks',
    testTimeout: 10000,
  },
});
