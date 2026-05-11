---
filed: 2026-05-11
source: 40-13-e2e-hydration-anchors.md (Fix 5 audit)
priority: medium
labels: [test-infra, e2e, flake, ci]
blocks: phase-41-execution (per 40-13's "When to act" guidance)
---

# Fix 15 E2E flake-risk sites surfaced by 40-13 audit

## Context

`/40-13-e2e-hydration-anchors.md` Fix 5 audit (2026-05-11) catalogued 15 `waitForTimeout` + soft `isVisible()` pairs across 5 test files. Same anti-pattern that flaked the 4 specs already fixed in `62b2c65` (analysis × 3 + navigation + bookmarks).

None of these 15 sites are currently failing on master — they're flake-in-waiting under CI parallel load.

## Sites to fix

### `analysis.spec.ts`
- Line 74 → 78 — `if (await clusterSection.isVisible())`. Same anchor as already added (`data-testid="analysis-ready"` on `AnalysisPage`); refactor this site to wait on it explicitly.

### `bookmarks.spec.ts` (3 sites)
- Lines 53/74/90 followed by soft `isVisible()` on `emptyText` / `articleGrid`. Anchors `bookmarks-empty-state` + `bookmarks-articles-grid` already exist (added in 62b2c65); refactor these 3 sites to wait on either anchor like the existing `:29` test does.

### `history.spec.ts` (3 sites)
- Lines 63/74/226 followed by soft `isVisible()`. Need new anchors on `HistoryPage`:
  - `data-testid="history-empty-state"` on the empty-state container
  - `data-testid="history-timeline-group"` on the timeline group root
  - For line 226 (`todayOption` inside a date filter dropdown) — add anchor to the dropdown's open state.

### `teams.spec.ts` (6 sites)
- Lines 16/147/180/193/215/244 — most are inside `for` loops or conditional branches that test team membership UI. Two patterns:
  - **Sign-in fallback** (line 16-18): replace with a hard wait on either the sign-in modal OR the teams page header anchor.
  - **Team item visibility** (147/180/193): add `data-testid="team-card"` to `TeamCard` component; refactor `if (await teamItem.isVisible())` to a `count() > 0` check.
  - **Error / section visibility** (215/244): add anchors to the respective error toast + teams section containers.

## Suggested approach

1. Land each file as a separate atomic commit (4 commits total).
2. Each commit pairs a source-code change (add `data-testid` to the React component) with the spec refactor.
3. Run `--repeat-each=10` locally on the touched specs to verify stability before commit.
4. After all four land, watch the next 5 CI runs for flake recurrence; if clean, file a planning entry that closes the "When to act" trigger from 40-13.

## Acceptance

- All 15 listed sites refactored to use hard waits on hydration anchors.
- `--repeat-each=10` runs for each touched spec pass 100%.
- No new `waitForTimeout` + soft `isVisible()` pairs introduced (lint check).
- 5 consecutive CI runs after merge show zero flakes in the touched specs.

## Out of scope

- The 8 intentional `waitForTimeout` calls in `screenshots.spec.ts` — those are visual-capture animation settles, not flake risk.
- ESLint rule banning `waitForTimeout` repo-wide (Pre-Phase-41 hardening).
