---
phase: 40-content-expansion
plan: "07"
subsystem: frontend-analysis
tags: [gap-closure, auth, react, analysis, phase-40-uat, bearer-jwt]
dependency_graph:
  requires: []
  provides: [authenticated-analysis-page-fetchers]
  affects: [ClusterSummary, FramingComparison, PerspectiveCoverageStats, analysis-route]
tech_stack:
  added: []
  patterns: [bearer-jwt-fetch-pattern, localStorage-SSR-safe-token]
key_files:
  created:
    - .planning/todos/pending/40-07-shared-api-fetch.md
    - .planning/todos/pending/40-07-add-requireauth-wrapper.md
  modified:
    - apps/web/src/components/ClusterSummary.tsx
    - apps/web/src/components/FramingComparison.tsx
    - apps/web/src/components/PerspectiveCoverageStats.tsx
    - apps/web/src/App.tsx
decisions:
  - "Inline getToken() helper (3 copies) rather than shared apiFetch() wrapper — deferred to 40-07-shared-api-fetch.md todo"
  - "Route guard deferred (path 3): no RequireAuth component exists; documented in 40-07-add-requireauth-wrapper.md pending-todo"
metrics:
  duration_minutes: 12
  completed: "2026-05-05"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
  files_created: 2
---

# Phase 40 Plan 07: Analysis Page Auth Fix Summary

Bearer JWT attached to all three `/api/analysis/*` fetchers; UAT Test 3 root cause closed for authenticated users.

## What Was Done

### Task 1 — Attach Bearer JWT to Analysis-page fetchers (commit `04d1811`)

Added a `getToken()` helper and `Authorization: Bearer` header to three components:

- `apps/web/src/components/ClusterSummary.tsx` — `fetchClusters()` now passes Bearer token
- `apps/web/src/components/FramingComparison.tsx` — inline `queryFn` now passes Bearer token
- `apps/web/src/components/PerspectiveCoverageStats.tsx` — `fetchCoverageGaps()` now passes Bearer token

Pattern mirrors `useFactCheck.ts` exactly. Each component carries a `// TODO(api-fetch-wrapper): see todos/pending/40-07-shared-api-fetch.md` comment.

### Task 2 — Gate /analysis route with RequireAuth (commit `5df729b`)

No `RequireAuth` or `ProtectedRoute` component exists in the codebase (grep returned empty). Plan path 3 taken:

- Added TODO comment above `/analysis` route in `apps/web/src/App.tsx`
- Created `.planning/todos/pending/40-07-add-requireauth-wrapper.md` with implementation sketch, affected routes, and acceptance criteria

### Task 3 — File tech-debt todo for shared apiFetch() wrapper (commit `0b8ed04`)

Created `.planning/todos/pending/40-07-shared-api-fetch.md` capturing the systemic refactor: centralize all 19+ `getToken()` copies into a single `apiFetch()` wrapper in `apps/web/src/lib/api.ts`.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `04d1811` | fix(40-07): attach Bearer JWT to analysis-page fetchers |
| 2 | `5df729b` | docs(40-07): gate /analysis TODO + RequireAuth pending-todo |
| 3 | `0b8ed04` | docs(40-07): file tech-debt todo for shared apiFetch() wrapper |

## Verification

- `pnpm typecheck` passes (confirmed via main repo `tsc --noEmit` exit 0)
- Three components now attach `Authorization: Bearer ${localStorage('newshub-auth-token')}` to every `/api/analysis/*` fetch — root cause of "Fehler beim Laden der Cluster" (401 → empty/error state) is closed for authenticated users
- UAT Test 3 unblocked: authenticated /analysis will render cluster groupings instead of German error string

## Deviations from Plan

None — plan executed exactly as written.

Task 1: All three components patched with identical `getToken()` helper (3 deliberate copies per plan spec).

Task 2: Path 3 taken (no RequireAuth exists) — TODO comment + pending-todo file created as directed.

Task 3: Pending-todo file created verbatim per plan template.

## Known Stubs

None. The fix attaches real JWT tokens — no hardcoded values or placeholder data.

## Pending Todos Filed

| File | Priority | Description |
|------|----------|-------------|
| `.planning/todos/pending/40-07-add-requireauth-wrapper.md` | high | Create RequireAuth component and gate /analysis + other auth-required routes |
| `.planning/todos/pending/40-07-shared-api-fetch.md` | medium | Centralize getToken()/fetch into shared apiFetch() wrapper in lib/api.ts |

## Cross-references

- Debug session: `.planning/debug/analysis-cluster-load-error.md` — root cause of UAT Test 3 failure
- Backend mount: `apps/web/server/index.ts:181` — `authMiddleware` on `/api/analysis` since commit `c5553f9`
- Pattern source: `apps/web/src/hooks/useFactCheck.ts` — Bearer token pattern mirrored

## Self-Check: PASSED

- `04d1811` exists in git log: CONFIRMED
- `5df729b` exists in git log: CONFIRMED
- `0b8ed04` exists in git log: CONFIRMED
- `apps/web/src/components/ClusterSummary.tsx` contains `Authorization: Bearer`: CONFIRMED
- `apps/web/src/components/FramingComparison.tsx` contains `Authorization: Bearer`: CONFIRMED
- `apps/web/src/components/PerspectiveCoverageStats.tsx` contains `Authorization: Bearer`: CONFIRMED
- `.planning/todos/pending/40-07-shared-api-fetch.md` exists with `status: pending`: CONFIRMED
- `.planning/todos/pending/40-07-add-requireauth-wrapper.md` exists: CONFIRMED
