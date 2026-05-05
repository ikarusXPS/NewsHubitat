---
status: resolved-rootcause
slug: analysis-cluster-load-error
created: 2026-05-05
last_activity: 2026-05-05
phase: 40-content-expansion
uat_test: 3
severity: major
specialist: react
---

# Debug: /analysis cluster loading error

> Materialized from gsd-debugger agent return on 2026-05-05 (sandbox blocked direct file write).

## Symptoms

- **Expected:** `/analysis` page renders perspective clusters / framing groupings; for state-dominated regions a "Limited bias diversity" footnote appears (sourced from `biasDiversityNote: 'limited'` on NewsSource).
- **Actual:** Page shows the German error string `"Fehler beim Laden der Cluster"` instead of cluster content.
- **Errors:** Backend dev-server log at startup showed no obvious errors; AI providers initialized cleanly. CLAUDE.md "Troubleshooting" hints at AI quota — turns out to be a stale note.
- **Reproduction:** Browser open `http://localhost:5177/analysis`. Backend at :3001 — `/api/health=200`, `/api/ready=200`.
- **Timeline:** Discovered during /gsd-verify-work 40 UAT (Test 3) on 2026-05-05.

## Root Cause

The three Analysis-page components (`ClusterSummary`, `FramingComparison`, `PerspectiveCoverageStats`) call `fetch('/api/analysis/...')` **without an `Authorization: Bearer <token>` header**.

Since commit `c5553f9` (2026-04-28, _"fix(36-05): restore PREMIUM AI rate-limit bypass"_), `apps/web/server/index.ts:181` mounts `authMiddleware` BEFORE `aiTierLimiter` on `/api/analysis`. Any browser request without the JWT is rejected by `authMiddleware` (`apps/web/server/services/authService.ts:566-569`) with HTTP 401 `{success:false,error:"Authentication required"}`. The components' fetcher (`ClusterSummary.tsx:45-47`) treats any non-2xx as `throw new Error('Failed to fetch clusters')`, which React Query surfaces as `error`, which renders the German string `"Fehler beim Laden der Cluster"` at `ClusterSummary.tsx:275`.

**The fix to "PREMIUM rate-limit bypass" silently broke the Analysis page for ALL tiers** because the frontend was never updated to attach the JWT.

This is **NOT** an AI-quota exhaustion. The CLAUDE.md "AI quota exhausted" hint is stale (predates `c5553f9`'s auth-gate). Tier limiting runs AFTER auth, and a 401 short-circuits before the limiter is reached.

Phase 40 UAT Test 7 ("FREE tier transcript drawer") passed → user IS logged in with a valid JWT in `localStorage['newshub-auth-token']`. The token simply isn't sent on `/api/analysis/*` calls.

## Evidence Summary

- Frontend error string lives at `apps/web/src/components/ClusterSummary.tsx:275`, gated by React Query's `error` truthiness
- The error path: `fetchClusters` at `ClusterSummary.tsx:41-48` calls `fetch('/api/analysis/clusters')` — no headers, no `Authorization`
- Backend route mount: `apps/web/server/index.ts:181` → `app.use('/api/analysis', authMiddleware, aiTierLimiter, analysisRoutes)`
- `authMiddleware` (`authService.ts:566`) returns `401 {success:false,error:"Authentication required"}` whenever the `Authorization: Bearer ...` header is missing
- Working comparison: `useFactCheck` (`apps/web/src/hooks/useFactCheck.ts:31-33,51-58`) explicitly does `localStorage.getItem('newshub-auth-token')` and passes `Authorization: Bearer ${getToken()}`
- No global fetch-interceptor exists (grep for `window.fetch =`, `apiClient`, `authedFetch` → no matches in `apps/web/src/`)
- Git: commit `e99c1df` (2026-04-28) added `aiTierLimiter` to `/api/analysis`; commit `c5553f9` (same day) prepended `authMiddleware`. Frontend never updated.
- Other Analysis-page components have the SAME bug: `FramingComparison.tsx:85-88`, `PerspectiveCoverageStats.tsx:77-81`

## Files Involved

- `apps/web/src/components/ClusterSummary.tsx:41-48,275` — fetch without `Authorization`; renders the German error on 401
- `apps/web/src/components/FramingComparison.tsx:84-91` — same bug; blocks Test 3's bias-diversity-note check
- `apps/web/src/components/PerspectiveCoverageStats.tsx:77-81` — same bug; coverage-gap card silently 401ing
- `apps/web/server/index.ts:181` — auth-gate mount point (intentional, correct)
- `apps/web/server/services/authService.ts:559-603` — `authMiddleware` returning 401

## Suggested Fix Direction

**(1) Local fix (low risk, scoped to Phase 40 UAT unblock):** in each of the three Analysis-page fetchers (`ClusterSummary.tsx`, `FramingComparison.tsx`, `PerspectiveCoverageStats.tsx`), read the token via `localStorage.getItem('newshub-auth-token')` and pass `headers: { Authorization: 'Bearer ${token}' }` (mirror the pattern in `apps/web/src/hooks/useFactCheck.ts:31-58`). Also gate the `/analysis` route with a `<RequireAuth>` wrapper in `apps/web/src/App.tsx:122` so anonymous users redirect to login instead of seeing a 401-derived error.

**(2) Systemic fix (recommended follow-up plan):** introduce a single shared `apps/web/src/lib/api.ts` `apiFetch()` wrapper that auto-attaches the JWT and standardizes 401-handling — and refactor all 19+ files that already DIY `newshub-auth-token` reads to use it. This prevents the next backend auth-gate change from silently breaking another surface.

Given Phase 40 UAT is blocked NOW and this is only one of four open issues, ship (1) immediately, then file (2) as a tech-debt todo.

## Specialist Hint

react

## Sources

- `apps/web/src/components/ClusterSummary.tsx`
- `apps/web/src/components/FramingComparison.tsx`
- `apps/web/src/components/PerspectiveCoverageStats.tsx`
- `apps/web/src/pages/Analysis.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/hooks/useFactCheck.ts` (working-pattern reference)
- `apps/web/server/index.ts`
- `apps/web/server/routes/analysis.ts`
- `apps/web/server/services/authService.ts`
- Git commits `e99c1df` (added `aiTierLimiter`) and `c5553f9` (added `authMiddleware` — regression-introducing commit)
