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
        // Branch coverage at 72% — first ratchet step on the recovery path.
        // Current actual: 72.02% (after 40-11 partial backfill 2026-05-11).
        // History:
        //   80 → 75 (CI 25107573823, Phase 37/38)
        //   75 → 74 (PR #4, Phase 38+39+40.1)
        //   74 → 71 (Phase 40 gap closure, CI 25370135629 — see 40-11)
        //   71 → 72 (2026-05-11, +0.91pp from parseVideoUrl + logger.ts + useFactCheck tests)
        // Next ratchet targets toward the 80% goal:
        //   - hooks/useComments.ts (currently 15.38%)
        //   - contexts/AuthContext.tsx (currently 0%)
        //   - server services with low branch coverage (routes/ai.ts,
        //     routes/leaderboard.ts, services/stripeWebhookService.ts,
        //     services/teamService.ts, services/metricsService.ts,
        //     jobs/workerEmitter.ts)
        // See .planning/todos/pending/40-11-coverage-backfill.md for the
        // remaining ratchet plan.
        branches: 72,
        functions: 80,
        lines: 80,
      },
    },
    // Performance
    pool: 'forks',
    testTimeout: 10000,
  },
});
