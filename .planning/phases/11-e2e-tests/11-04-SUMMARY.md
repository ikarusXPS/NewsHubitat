---
phase: 11-e2e-tests
plan: 04
subsystem: e2e-testing
tags: [playwright, community, e2e, tabs, gamification]
dependency_graph:
  requires: [11-01]
  provides: [community-e2e-tests]
  affects: [e2e/community.spec.ts]
tech_stack:
  added: []
  patterns: [localStorage-bypass, lazy-load-wait, tab-interaction]
key_files:
  created:
    - e2e/community.spec.ts
  modified: []
decisions:
  - "Use localStorage bypass for onboarding modal"
  - "Wait for h1 heading as page-ready proxy"
  - "Use load state instead of networkidle for lazy components"
metrics:
  duration_minutes: 8
  completed: "2026-04-22T08:50:00Z"
---

# Phase 11 Plan 04: Community Page E2E Tests Summary

Community page E2E tests with 12 test cases covering tabs, contribution types, badges, and leaderboard interactions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added onboarding modal bypass**
- **Found during:** Task 1
- **Issue:** FocusOnboarding modal blocks all page interactions on first visit
- **Fix:** Added localStorage init script to set `hasCompletedOnboarding: true`
- **Files modified:** e2e/community.spec.ts
- **Commit:** 04063f2

**2. [Rule 1 - Bug] Changed wait strategy for lazy-loaded components**
- **Found during:** Task 1
- **Issue:** `networkidle` times out due to WebSocket connections; `domcontentloaded` fires before React renders lazy components
- **Fix:** Use `load` state + explicit h1 wait with extended timeout
- **Files modified:** e2e/community.spec.ts
- **Commit:** 04063f2

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 04063f2 | test | Add Community page E2E tests |

## Test Coverage

| Test | Description |
|------|-------------|
| should load the Community page | Verify URL and COMMUNITY header |
| should display tab buttons | Check Contribute, Badges, Leaderboard tabs |
| should switch to Badges tab | Tab click and active state |
| should switch to Leaderboard tab | Tab click and content visibility |
| should display contribution type buttons | Submit News, Fact Check, Translate, Verify |
| should show points for contribution types | XP indicators visible |
| should select Submit News contribution type | Click and active border state |
| should display badges in Badges tab | First Steps badge visible |
| should display leaderboard rankings | XP label visible |
| should display streak calendar | Contribution streak section |
| should display glass panel styling | glass-panel class count > 0 |
| should navigate from sidebar | Sidebar link navigation |

## Known Issues

Tests require stable lazy-loading timing. The Community component is loaded via React.lazy() and may have variable load times in E2E context. Tests include extended timeouts (20s) to accommodate this.

## Self-Check: PASSED

- [x] e2e/community.spec.ts exists (155 lines, 12 tests)
- [x] Commit 04063f2 exists in git log
