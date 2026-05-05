---
phase: 40-content-expansion
plan: "08"
subsystem: podcasts/audio
tags: [gap-closure, react, podcasts, audio, phase-40-uat, uat-4]
dependency_graph:
  requires: []
  provides: [podcast-single-click-playback, autoPlayOnMount-prop]
  affects: [PodcastEpisodeCard, PodcastPlayer]
tech_stack:
  added: []
  patterns: [autoPlayOnMount-prop-driven-imperative-play, useRef-single-fire-guard, loadedmetadata-hook]
key_files:
  created:
    - .planning/todos/pending/40-08-podcast-autoplay-e2e.md
  modified:
    - apps/web/src/components/podcasts/PodcastPlayer.tsx
    - apps/web/src/components/podcasts/PodcastEpisodeCard.tsx
    - apps/web/src/components/podcasts/__tests__/PodcastEpisodeCard.test.tsx
    - apps/web/src/components/podcasts/__tests__/PodcastPlayer.test.tsx
decisions:
  - "autoPlayOnMount as prop (not HTML autoPlay attribute) keeps Chrome autoplay-policy control explicit and avoids re-fires on src change"
  - "Hook into existing onLoaded handler rather than add parallel useEffect to avoid double event attachment"
  - "useRef guard (hasAttemptedAutoPlay) ensures single-fire even if loadedmetadata re-fires on src change"
  - "mockClear() in describe-scoped beforeEach resets call counts without stacking a second vi.spyOn (anti-pattern flagged by plan-checker)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-05T09:14:32Z"
  tasks_completed: 5
  files_changed: 4
---

# Phase 40 Plan 08: PodcastPlayer autoPlayOnMount (UAT 4 Gap Closure) Summary

Single click on the card-level Play button now starts audio playback by adding `autoPlayOnMount?: boolean` to PodcastPlayer and passing it from PodcastEpisodeCard's mount path.

## What Was Built

### Problem
UAT Test 4 revealed that clicking the Play button on a podcast episode card mounted the PodcastPlayer UI but did not start audio. Users needed a second click on the inner Play button inside the player. This was masquerading as design intent in the test suite — the old Test 2 only asserted that the player was mounted, not that audio played.

### Solution
1. **PodcastPlayer** (`49ae551`) — Added `autoPlayOnMount?: boolean` prop. When true, `audio.play()` is called once inside the existing `onLoaded` (loadedmetadata) handler. A `useRef<boolean>(false)` guard prevents double-firing. Defensive `readyState >= 1` check covers already-cached metadata. Rejection from autoplay-policy is swallowed with `.catch(() => {})`.

2. **PodcastEpisodeCard** (`88de4a7`) — Added `autoPlayOnMount` to the `<PodcastPlayer>` mount in the `!onPlay && isPlaying` branch. The mount only happens on a user click, so the user-gesture window (~5s) is preserved across the loadedmetadata microtask.

3. **PodcastEpisodeCard.test.tsx** (`7f80e4f`) — Rewrote Test 2 to assert the new contract: stub now exposes `data-auto-play` attribute, test asserts `data-auto-play="true"` after click. The broken assertion (that only checked the player mounted) is gone.

4. **PodcastPlayer.test.tsx** (`ea8f3a2`) — Appended new `describe('PodcastPlayer autoPlayOnMount', ...)` block with 5 tests covering: no-op when prop omitted, single fire on loadedmetadata, single-fire guard on multiple events, rejection swallowed, no-op when audio already playing. Added `mockClear()` in describe-scoped `beforeEach` to reset call counts without stacking a second spy.

5. **Follow-up todo** (`2cf8da2`) — Created `.planning/todos/pending/40-08-podcast-autoplay-e2e.md` to track Playwright E2E lock for single-click audio playback.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `49ae551` | feat(40-08): add autoPlayOnMount prop to PodcastPlayer |
| Task 2 | `88de4a7` | feat(40-08): pass autoPlayOnMount from PodcastEpisodeCard mount path |
| Task 3 | `7f80e4f` | test(40-08): rewrite Test 2 to assert autoPlayOnMount prop forwarding |
| Task 4 | `ea8f3a2` | test(40-08): add 5 focused unit tests for PodcastPlayer autoPlayOnMount |
| Task 5 | `2cf8da2` | chore(40-08): file follow-up todo for Playwright E2E podcast autoplay lock |

## Test Results

| File | Tests Before | Tests After | Result |
|------|-------------|-------------|--------|
| PodcastEpisodeCard.test.tsx | 5 | 5 (Test 2 rewritten) | All pass |
| PodcastPlayer.test.tsx | 5 | 10 (+5 new autoPlayOnMount describe) | All pass |

**Total in scope: 15 tests, all passing.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mockClear() added to prevent cumulative call counts in PodcastPlayer tests**

- **Found during:** Task 4 test execution
- **Issue:** The 5 new autoPlayOnMount tests accumulated `play()` call counts across tests because `vi.spyOn` in the file-scoped `beforeEach` does not clear the mock's call history. Test 1 showed 1 unexpected call (from Test 3 of the first describe), Test 2 showed 2 total, etc.
- **Fix:** Added `describe`-scoped `beforeEach` with `vi.mocked(window.HTMLMediaElement.prototype.play).mockClear()`. This resets counts without adding a second spy (the double-spy BLOCKER the plan-checker flagged).
- **Files modified:** `apps/web/src/components/podcasts/__tests__/PodcastPlayer.test.tsx`
- **Commit:** `ea8f3a2`

## Known Stubs

None. No placeholder data — `audioUrl` is live CDN data from RSS parsing.

## Threat Flags

None. This plan makes no changes to network endpoints, auth paths, file access, or schema. It only modifies client-side React components and their unit tests.

## Self-Check: PASSED

- `apps/web/src/components/podcasts/PodcastPlayer.tsx` — FOUND (contains `autoPlayOnMount`)
- `apps/web/src/components/podcasts/PodcastEpisodeCard.tsx` — FOUND (contains `autoPlayOnMount`)
- `apps/web/src/components/podcasts/__tests__/PodcastEpisodeCard.test.tsx` — FOUND (contains `data-auto-play`)
- `apps/web/src/components/podcasts/__tests__/PodcastPlayer.test.tsx` — FOUND (contains `PodcastPlayer autoPlayOnMount` describe)
- `.planning/todos/pending/40-08-podcast-autoplay-e2e.md` — FOUND
- Commits `49ae551`, `88de4a7`, `7f80e4f`, `ea8f3a2`, `2cf8da2` — all present in git log
