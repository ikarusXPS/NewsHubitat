---
status: pending
phase: 40-content-expansion
created: 2026-05-05
priority: medium
labels: [tech-debt, frontend, auth, refactor]
related_plans: [40-07]
related_debug: .planning/debug/analysis-cluster-load-error.md
---

# Shared apiFetch() wrapper for JWT auto-attach

## Why

Plan 40-07 patched three Analysis-page fetchers (ClusterSummary / FramingComparison / PerspectiveCoverageStats) by inlining a `getToken()` helper + Authorization header — same pattern that already lives in 19+ places under `apps/web/src/`. Every time the backend gates a new route with `authMiddleware`, the frontend silently breaks until somebody tracks down the missing header.

The next backend auth-gate change WILL break another surface unless we centralize JWT-attachment.

## What

Create `apps/web/src/lib/api.ts` exporting:
- `apiFetch(input, init)` — Wraps `fetch` with `Authorization: Bearer <token>` auto-attached when token present in `localStorage('newshub-auth-token')`. SSR-safe (typeof window guard). Returns the same Response Promise as fetch.
- Optional: standardized 401-handling — emit a `auth:expired` CustomEvent on `window` so AuthContext can react (logout + redirect).

Refactor scope (sweep, not surgical):
- Replace every `fetch('/api/...')` direct call across `apps/web/src/` with `apiFetch(...)`.
- Audit grep target: `grep -rn "localStorage.getItem('newshub-auth-token')" apps/web/src/` — every hit consolidates into the wrapper.
- Update tests that vi.mock `fetch` to mock the wrapper (or keep fetch mocking and verify the wrapper passes through correctly).

## Acceptance

- `apps/web/src/lib/api.ts` exists with `apiFetch` exported and unit tests.
- Zero direct `localStorage.getItem('newshub-auth-token')` calls outside `lib/api.ts` and the `useAuth` hook (verified via grep).
- `pnpm typecheck && pnpm test:run` green; no behavioral regressions.

## Out of scope

- New auth-context APIs (kept stable).
- Backend changes.
- Refresh-token / silent renewal — separate concern.

## Resolution

**Closed 2026-05-11 — commit `8dc1e9d`.**

`apps/web/src/lib/api.ts` exports `apiFetch(input, init)`, `getAuthToken()`, `authHeader()`. 12 unit tests in `api.test.ts` cover the three functions plus header-merge edge cases (caller-supplied Authorization wins, Headers/tuple/object init.headers shapes, response pass-through).

22 call sites refactored across 16 files — every direct `localStorage.getItem('newshub-auth-token')` consumer migrated. 6 ad-hoc `getToken()` helpers deleted. 4 `useComments` mutation signatures lost their `token` parameter; the two consumers (`CommentCard`, `CommentInput`) updated.

Special case: `DeleteAccountModal` previously did `localStorage.removeItem('newshub-auth-token')` as a logout step — routed through `useAuth().logout()` instead, which also clears Sentry user context.

**Acceptance grep returns only 5 sites:**

```
apps/web/src/contexts/AuthContext.tsx:43  TOKEN_KEY = '...'
apps/web/src/hooks/__tests__/useTranscript.test.tsx:46  (existing test mock)
apps/web/src/lib/api.test.ts:4  TOKEN_KEY = '...'
apps/web/src/lib/api.ts:4  (comment referencing the old pattern)
apps/web/src/lib/api.ts:14  TOKEN_KEY = '...'
```

Verification:
- `npx tsc --noEmit` exit 0
- `npx vitest run` → 1722/1722 tests pass across 94 files (+12 vs baseline — api.test.ts)
- No behavioral regression.

**Optional follow-up not in 40-07 scope:** wire a `auth:expired` CustomEvent emit on 401 inside `apiFetch` so `AuthContext` can centrally react (auto-logout + AuthModal surface). Skipped to keep this change boring — each call site still surfaces its own 401 behavior as today.
