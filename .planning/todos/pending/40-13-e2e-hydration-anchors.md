---
status: pending
phase: 40-content-expansion
created: 2026-05-11
priority: medium
labels: [test-infra, e2e, flake, ci]
related_ci: [25680567876, 25681056228, 25681903432]
---

# Harden brittle E2E tests with hydration-anchored selectors

## Why

Three CI runs in a row (2026-05-11) flaked on the same anti-pattern: tests that
do `await page.waitForTimeout(N)` followed by a soft `isVisible()` check against
a selector that isn't hydration-anchored. Under 4-worker parallel CI load, the
fixed `N`ms isn't enough for the lazy-loaded route to render its assertion
target, the soft check returns false, and the assertion fails.

The flake-roulette manifest so far:

- `be2ebf0` → `analysis.spec.ts:68 should display cluster summaries section` hard-failed
- `02dbc72` → `bookmarks.spec.ts:29 should show empty state or articles grid` hard-failed
- `02a32af` → bookmarks + `teams.spec.ts should mark to a team via dropdown` both flaked (passed on retry)

Pattern is identical: the test "succeeds" only when the worker happens to land
in a low-CI-load slot. Currently masked by Playwright retries; `02a32af` was
green by luck, not by fix.

## What to fix

### 1. `apps/web/e2e/bookmarks.spec.ts:29` — "should show empty state or articles grid"

Current:
```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/bookmarks');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);  // ← optimistic hydration budget
});

test('should show empty state or articles grid', async ({ page }) => {
  await page.waitForTimeout(1000);  // ← another optimistic budget
  const emptyText = page.getByText('Keine gespeicherten Artikel');
  const articleGrid = page.locator('.grid.gap-4');
  const hasEmpty = await emptyText.isVisible().catch(() => false);  // ← soft check
  const hasArticles = await articleGrid.isVisible().catch(() => false);
  expect(hasEmpty || hasArticles).toBeTruthy();
});
```

Fix: add `data-testid` anchors to `BookmarksPage.tsx` (one on the empty-state
container, one on the articles grid). Replace both `waitForTimeout` calls and
both `isVisible().catch(() => false)` calls with a hard wait on either of the
two anchors:

```ts
await Promise.race([
  page.locator('[data-testid="bookmarks-empty-state"]').waitFor({ state: 'visible', timeout: 10000 }),
  page.locator('[data-testid="bookmarks-articles-grid"]').waitFor({ state: 'visible', timeout: 10000 }),
]);
const hasEmpty = await page.locator('[data-testid="bookmarks-empty-state"]').isVisible();
const hasArticles = await page.locator('[data-testid="bookmarks-articles-grid"]').isVisible();
expect(hasEmpty || hasArticles).toBeTruthy();
```

### 2. `apps/web/e2e/analysis.spec.ts` — 3 skipped tests

Three tests skipped in CLAUDE.md "Currently-skipped E2E tests" table:
- compare modal open (`:39`)
- compare modal close (`:47`)
- cluster summaries section (`:68`)

All three blow the `beforeEach:10` 15s budget for
`h1:has-text("PERSPEKTIVEN-ANALYSE")` under RequireAuth + useClusters race.

Fix: instead of waiting for the framer-motion-animated header, anchor the
beforeEach on a stable post-hydration marker. Add `data-testid="analysis-ready"`
to the AnalysisPage root once `useClusters` resolves (success OR error — the
test just needs the page mounted). Wait on that in beforeEach with a 20s budget.
Then re-enable the 3 skipped tests.

### 3. `apps/web/e2e/teams.spec.ts` — "should mark to a team via dropdown"

Flaked in `02a32af` for the first time. Same anti-pattern likely. Diagnose by
running the test under `--repeat-each=20` locally and watching the failure
timeline.

### 4. Sweep for the anti-pattern repo-wide

```bash
grep -rn "waitForTimeout" apps/web/e2e/ | wc -l
```

Every match is a candidate. Audit each: if the next line is `isVisible().catch`
or an `if (await ... .isVisible())` soft check, it's a flake-in-waiting.

## Why not now

- Master is currently green (`02a32af` PASS); the dep bumps + Phase 41 scaffold
  are merged. No immediate user pain.
- The fix is a real implementation touch in `BookmarksPage.tsx`, `AnalysisPage.tsx`,
  and probably 2-3 more components — needs its own plan with verification.
- Skipping the worst offender + documenting (commits `02a32af`) bought stable
  CI without masking real regressions.

## When to act

- Before Phase 41 execution begins (Phase 41 lands consent banner + cookie
  policy UI surfaces; those will need E2E coverage that won't survive the same
  anti-pattern).
- OR if the flake count rises above 2 per run (currently 2/run on `02a32af`).

## Estimated effort

~2 hours: add 6-8 `data-testid` attributes across 3-4 page components, refactor
4-5 E2E tests to wait on them, run `--repeat-each=10` locally to verify
stability, un-skip the 3 analysis tests + the cluster-summaries skip filed in
commit `02a32af`.

## Reference

- Existing pattern done right: `e2e/auth.setup.ts` polls `/api/health` (IPv4)
  for backend readiness — a real signal, not a fixed sleep.
- Anti-pattern call sites:
  - `e2e/analysis.spec.ts:10` (15s h1 wait)
  - `e2e/bookmarks.spec.ts:12` (500ms hydration) + `:31` (1000ms before soft check)
  - `e2e/teams.spec.ts` — TBD which line, diagnose with --repeat-each
