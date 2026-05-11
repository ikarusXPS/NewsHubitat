---
status: partially-resolved
phase: 40-content-expansion
created: 2026-05-05
updated: 2026-05-11
priority: medium
labels: [testing, coverage, tech-debt]
related_plans: [40-07, 40-08, 40-10]
related_ci: 25370135629
---

# Backfill branch tests to raise coverage threshold from 71% → 80%

## Progress 2026-05-11 (partial)

**First ratchet step landed — commit `cb9c3a7`.**

Branch coverage moved 71.11% → 72.02% (+0.91pp). Vitest gate bumped 71 → 72, locking in the gain (regression below 72% now fails CI).

Three new test files, +46 tests:

| File | Tests | Branch coverage of target file |
|---|---|---|
| `src/components/videos/parseVideoUrl.test.ts` | 14 | 81.25% → ~100% |
| `src/lib/logger.test.ts` | 12 | 40% → ~100% |
| `src/hooks/useFactCheck.test.tsx` | 10 | (all 6 error encodings + Bearer auto-attach covered) |

Total suite: 1710 → 1758 tests across 94 → 97 files. Statements 81.27% → 81.38%; functions 81.31% → 81.46%; lines 82.5% → 82.61%.

## Remaining work to reach 80%

Highest-leverage uncovered surfaces (from coverage report — order by leverage):

1. **`contexts/AuthContext.tsx`** — currently 0% branches. Test the `verifyToken` effect (404 → clearToken; OK → setUser), `login`/`register`/`logout`/`loginWithOAuth` flows. Largest single-file lever.
2. **`hooks/useComments.ts`** — currently 15.38%. Already has a test file but doesn't exercise the 4 mutation paths (`postComment`, `useEditComment`, `useDeleteComment`, `useFlagComment`) which after the 40-07 apiFetch refactor are token-free.
3. **`server/services/stripeWebhookService.ts`**, **`server/services/teamService.ts`**, **`server/services/metricsService.ts`**, **`server/jobs/workerEmitter.ts`** — server-side branches called out in the original todo body (still applies).
4. **`pages/PodcastsPage.tsx`** — the `isTranscriptSearchActive` gate and `filteredEpisodes` `useMemo` branches (Phase 40 additions).
5. **`components/videos/EmbeddedVideo.tsx`** — currently 50% branches; provider switching logic.

Continue the ratchet in chunks: 72 → 74 → 78 → 80, bumping the threshold each PR as the actual reaches the next floor.

## Why

Phase 40 gap-closure plans (40-07 / 40-08 / 40-10) added new branching code that
shipped without enough branch test coverage. CI run `25370135629` reported
`Coverage for branches (71.11%) does not meet global threshold (74%)`, and we
lowered the gate from 74 → 71 to unblock the staging deploy. This is the third
waiver step (80 → 75 → 74 → 71), and the trend needs to reverse before further
phases erode the gate further.

The gate is enforced in `apps/web/vitest.config.ts:30`. The waiver comment
already lists the historical hot spots; this todo extends that list with the
Phase 40 additions.

## What

Add Vitest branch tests for these surfaces. Aim for the 80% gate; lift the
threshold incrementally as each batch lands (e.g., 71 → 74 → 78 → 80) so a
regression in any single PR is caught immediately, not amortized over a
quarter.

### Phase 40 newly-added branches (highest leverage)

- `apps/web/src/pages/PodcastsPage.tsx`
  - The `isTranscriptSearchActive` gate (line ~95): combinations of
    `isPremium × transcriptSearchOn × searchQ.trim()` (8 branches).
  - The `displayedTranscriptHits` / `displayedTranscriptError` mask branches
    when the gate flips off mid-fetch.
  - The `filteredEpisodes` `useMemo` early-return when `transcriptSearchOn`
    is on (skip client filter) vs off (apply client filter) vs no query.
- `apps/web/src/components/videos/parseVideoUrl.ts`
  - YouTube vs Vimeo vs unknown provider; with vs without timestamp param;
    malformed URL early-returns.
- `apps/web/server/services/videoIndexService.ts`
  - The catch block at line 192 that resets `rows = []` (now reachable since
    the dead initializer was removed).
- `apps/web/src/components/podcasts/PodcastEpisodeCard.tsx` (40-08)
  - `autoPlayOnMount` + `hasAttemptedAutoPlay` gating; `audioUrl` change
    branches when the user navigates between episodes.

### Pre-existing hot spots (carried from prior waivers)

- `apps/web/server/routes/ai.ts`
- `apps/web/server/routes/leaderboard.ts`
- `apps/web/server/services/webhookService.ts`
- `apps/web/server/services/teamService.ts`
- `apps/web/server/services/metricsService.ts`
- `apps/web/server/jobs/workerEmitter.ts`
- `apps/web/src/hooks/useComments.ts`

## Acceptance

- [ ] `pnpm test:coverage` reports branches ≥ 74% locally → bump threshold to 74.
- [ ] Same check at 78 → bump.
- [ ] Same at 80 → bump and remove the waiver block from
      `apps/web/vitest.config.ts`.
- [ ] CLAUDE.md `Tech Stack` row updated each time the gate moves.
- [ ] No `// TODO(coverage)` comments remaining in `vitest.config.ts`.

## Out of scope

- Statement / function / line coverage — already at 80.
- E2E test coverage (Playwright is separate).
- Mutation testing.
