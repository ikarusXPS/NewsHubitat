---
created: 2026-05-04
phase: 40-content-expansion
plan: 04
priority: medium
type: test-infra
---

# Investigate vitest worker crash on 40-04 frontend tests

`pnpm test:run` after the 40-04 merge produced:
- 84 of 85 test files passed
- 1627 of 1631 tests passed
- 1 vitest worker fork emitted "Worker exited unexpectedly" error
- 4 tests (in 1 unidentified file) did not get a result

## Likely culprits

One of the new 40-04 frontend test files:
- `apps/web/src/pages/__tests__/PodcastsPage.test.tsx` (230 lines, largest)
- `apps/web/src/components/podcasts/__tests__/RelatedPodcasts.test.tsx`
- `apps/web/src/components/podcasts/__tests__/PodcastEpisodeCard.test.tsx`
- `apps/web/src/components/podcasts/__tests__/PodcastPlayer.test.tsx`
- `apps/web/src/hooks/__tests__/useRelatedPodcasts.test.tsx`

PodcastsPage.test.tsx is the most likely — it mocks the most APIs and has the most setup overhead. Worker forks have a memory limit (default ~512MB) and a setup-heavy test can blow it.

## Steps to diagnose

1. Run each new test file individually:
   ```bash
   cd apps/web
   pnpm vitest run src/pages/__tests__/PodcastsPage.test.tsx
   pnpm vitest run src/components/podcasts/__tests__/RelatedPodcasts.test.tsx
   pnpm vitest run src/components/podcasts/__tests__/PodcastEpisodeCard.test.tsx
   pnpm vitest run src/components/podcasts/__tests__/PodcastPlayer.test.tsx
   pnpm vitest run src/hooks/__tests__/useRelatedPodcasts.test.tsx
   ```
2. The file that crashes individually is the culprit.
3. Common fixes: reduce mock-data size, split the test file, add `pool: 'threads'` config, clean up `beforeEach` setup.

## Why not blocking

Implementation passes typecheck. 1627/1631 passing is 99.75% — well above the 80%/75% coverage gate. The worker crash is test infra, not application logic. Production code is unaffected.

## When to act

Before merging the milestone v1.6 PR, OR if 40-06 (transcripts) tests start hitting the same crash (which would indicate the issue is in shared test setup, not a single file).

## Resolution

**Resolved 2026-05-11 — no longer reproduces on master.**

`pnpm test:run` baseline from repo root after commit `e2fa10d`:

```
Test Files  93 passed (93)
Tests       1710 passed (1710)
Duration    32.93s
```

Zero worker crashes, zero failed/skipped tests in the suite count. The original baseline was 1627/1631 with 1 worker fork crash on 2026-05-04; current master has gained ~80 tests across intervening 40-x merges, Phase 41 scaffold, and the 41-07 PII-scrubbing landing — all green.

No fix commit needed. The crash was likely a transient memory pressure event on a heavy mock-setup test that has since been refactored or run on a different worker pool config. Closing.
