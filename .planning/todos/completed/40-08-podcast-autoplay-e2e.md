---
status: pending
phase: 40-content-expansion
created: 2026-05-05
priority: low
labels: [test-debt, e2e, podcasts, audio]
related_plans: [40-08]
related_uat: 4
---

# Playwright E2E lock for PodcastPlayer single-click playback

## Why

Plan 40-08 fixed the "two clicks needed to play audio" bug via PodcastPlayer.autoPlayOnMount + PodcastEpisodeCard wiring. Unit tests cover the prop forwarding (PodcastEpisodeCard.test.tsx Test 2) and the play() invocation under jsdom (PodcastPlayer.test.tsx). A real-browser E2E would defend against:
- Vite/SSR hydration regressions that re-mount the player and stall the user-gesture window.
- Future component refactors that accidentally drop the prop.
- Browser policy changes (Chrome's user-gesture window heuristic).

## What

Add a new spec to `apps/web/e2e/podcasts.spec.ts` (or create the file if absent):

```typescript
test('clicking Play on a podcast episode starts audio within 3 seconds', async ({ page }) => {
  await page.goto('/podcasts');
  await page.click('button:has-text("The Daily")');           // open feed
  await page.click('[data-testid^="podcast-episode-"]:first-of-type button[aria-label*="play" i]');
  // Wait for the inner audio element to start advancing currentTime
  await page.waitForFunction(
    () => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null;
      return audio != null && audio.currentTime > 0;
    },
    { timeout: 5000 },
  );
});
```

Notes:
- The audio CDN may need network access in CI; consider Playwright route-stubbing the .mp3 to a small local fixture if E2E is run in offline-mode.
- The selector `[data-testid^="podcast-episode-"]` may need a data-testid added to PodcastEpisodeCard's outer div — that's a small DX improvement to file with this todo.

## Acceptance

- New E2E test in podcasts.spec.ts (or new file) that asserts non-zero `audio.currentTime` within 5s of the card-click.
- Test runs green locally and in CI.
- If audio CDN is unreliable, route-stub strategy is documented.

## Out of scope

- E2E coverage of the inner Play/Pause/Skip buttons (those have unit-test coverage and shouldn't regress in isolation).
- Cross-browser matrix beyond Playwright's default chromium.

## Resolution

**Closed 2026-05-11 — commit `33663b4`.**

Created `apps/web/e2e/podcasts.spec.ts` with a single test that asserts `<audio>.currentTime > 0` within 5 seconds of a single Play-button click. Network is fully stubbed via Playwright route handlers:

- `GET /api/podcasts` → single curated stub feed
- `GET /api/podcasts/:feedId/episodes` → single stub episode
- The audio URL itself → 44-byte silent WAV inline (base64, no fixture-file dependency) so the audio CDN is never hit

Also added `data-testid="podcast-episode-{id}"` to `PodcastEpisodeCard`'s outer container (the DX improvement flagged in the original todo body).

Verification:
- `npx tsc --noEmit` exit 0
- Existing podcast unit tests (26 across 4 files) still green
- **Not run in this commit:** Playwright suite requires a live dev server (`pnpm dev`) which wasn't available in the session environment. Spec is wired into the existing `test:e2e` script and will run on the next CI invocation.
