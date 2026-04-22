---
phase: 11
plan: 03
subsystem: e2e-tests
tags: [e2e, playwright, analysis, testing]
dependency_graph:
  requires: []
  provides: [analysis-page-e2e-tests]
  affects: [e2e/analysis.spec.ts]
tech_stack:
  added: []
  patterns: [localStorage-bypass, domcontentloaded-wait]
key_files:
  created:
    - e2e/analysis.spec.ts
  modified: []
decisions:
  - localStorage bypass for onboarding modal in beforeEach
  - domcontentloaded wait strategy instead of networkidle to avoid WebSocket timeout
  - z-50 selector for CompareMode modal to distinguish from mobile sidebar overlay
metrics:
  duration_minutes: 8
  completed_date: "2026-04-22"
  tasks_completed: 1
  files_created: 1
---

# Phase 11 Plan 03: Analysis Page E2E Tests Summary

Analysis page E2E tests with 11 tests covering page load, compare mode modal, cluster summaries, and visualization sections.

## Changes Made

### Task 1: Create analysis.spec.ts with core tests

Created `e2e/analysis.spec.ts` with 11 E2E tests:

1. **should load the Analysis page with header** - Verifies page loads with PERSPEKTIVEN-ANALYSE header
2. **should display gradient-text-cyber styling** - Checks for cyber-styled text class
3. **should have compare articles button** - Verifies "Artikel vergleichen" button visibility
4. **should open compare mode modal** - Tests CompareMode modal opens on button click
5. **should close compare mode modal** - Tests modal closes on close button click
6. **should display cluster summaries section** - Checks for Themen-Cluster content
7. **should display glass panel containers** - Verifies glass-panel CSS class presence
8. **should display sentiment chart section** - Checks for Sentiment section
9. **should display framing comparison section** - Checks for Framing section
10. **should navigate from sidebar** - Tests sidebar navigation to Analysis page
11. **should show loading state while fetching data** - Verifies page reload behavior

### Key Implementation Details

- **Onboarding bypass**: Uses `page.addInitScript()` to set localStorage with `hasCompletedOnboarding: true` before navigation, preventing the FocusOnboarding modal from blocking tests

- **Wait strategy**: Uses `domcontentloaded` instead of `networkidle` to avoid timeout from persistent WebSocket connections

- **Modal selector**: Uses `.fixed.z-50 .bg-\\[\\#0a0e1a\\]` to target CompareMode modal specifically, avoiding false matches with mobile sidebar overlay (z-40)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Onboarding modal blocking test execution**
- **Found during:** Initial test run
- **Issue:** FocusOnboarding modal appears for first-time users, covering entire page and intercepting clicks
- **Fix:** Added localStorage setup in beforeEach to set `hasCompletedOnboarding: true`
- **Files modified:** e2e/analysis.spec.ts
- **Commit:** e184b75

**2. [Rule 3 - Blocking] networkidle timeout from WebSocket connections**
- **Found during:** Test execution with 8 parallel workers
- **Issue:** `waitForLoadState('networkidle')` never completes due to persistent WebSocket connections
- **Fix:** Changed to `domcontentloaded` wait with explicit element wait
- **Files modified:** e2e/analysis.spec.ts
- **Commit:** e184b75

**3. [Rule 1 - Bug] Modal selector matching wrong element**
- **Found during:** Test run for "should open compare mode modal"
- **Issue:** `.fixed.inset-0` selector matched mobile sidebar overlay (z-40) instead of CompareMode modal (z-50)
- **Fix:** Changed to `.fixed.z-50 .bg-\\[\\#0a0e1a\\]` for specific modal targeting
- **Files modified:** e2e/analysis.spec.ts
- **Commit:** e184b75

## Commits

| Hash | Message |
|------|---------|
| e184b75 | test(11-03): add Analysis page E2E tests |

## Verification

- File created: e2e/analysis.spec.ts (145 lines)
- Test count: 11 tests (exceeds 8 minimum)
- Tests pass when run with single worker or with backend availability
- Some flakiness observed with 8 parallel workers due to backend 502 errors under load

## Known Limitations

- Tests may be flaky under high parallelism (8 workers) when backend returns 502 errors
- This is a test infrastructure issue, not a test logic issue
- Page structure verification confirms tests target correct elements

## Self-Check: PASSED

- [x] e2e/analysis.spec.ts exists (145 lines)
- [x] Commit e184b75 exists in git log
- [x] 11 tests covering all required functionality
