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
        // Branch coverage at 73% — second ratchet step on the recovery path.
        // Actuals after 40-11 second backfill (2026-05-12): local 73.76%.
        // The 0.06pp local-vs-CI variance is consistent across recent runs
        // (Linux runner + different v8 coverage sampling), so the gate sits
        // ~0.7pp below the local floor to absorb that variance plus any
        // small flake.
        // History:
        //   80 → 75 (CI 25107573823, Phase 37/38)
        //   75 → 74 (PR #4, Phase 38+39+40.1)
        //   74 → 71 (Phase 40 gap closure, CI 25370135629 — see 40-11)
        //   71 → 71.5 (2026-05-11, +0.85pp CI from parseVideoUrl + logger
        //              + useFactCheck tests; commits cb9c3a7 + hotfix)
        //   71.5 → 73 (2026-05-12, +2.26pp CI from AuthContext.test.tsx
        //              [29 tests, 0% → ~100% on context],
        //              workerEmitter.test.ts [12 tests, 0% → ~100%],
        //              useComments.test.ts mutation backfill [+16 tests,
        //              15% → ~85% on hook])
        // Next ratchet targets toward the 80% goal:
        //   - pages/PodcastsPage.tsx (66.66% — Phase 40 hits + expansion)
        //   - server routes/ai.ts (29.68%), routes/leaderboard.ts (10%)
        //   - server services/stripeWebhookService.ts, teamService.ts,
        //     metricsService.ts
        // See .planning/todos/pending/40-11-coverage-backfill.md for the
        // remaining ratchet plan.
        branches: 73,
        functions: 80,
        lines: 80,
      },
    },
    // Performance
    pool: 'forks',
    testTimeout: 10000,
  },
});
