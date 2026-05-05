---
status: pending
phase: 40-content-expansion
created: 2026-05-05
priority: high
labels: [auth, frontend, routing, security]
related_plans: [40-07]
related_debug: .planning/debug/analysis-cluster-load-error.md
---

# Add RequireAuth / ProtectedRoute wrapper component

## Why

Plan 40-07 Task 2 attempted to gate the `/analysis` route with an auth-guard wrapper
so anonymous users are redirected to `/login` instead of hitting a 401-derived error UI.
No `RequireAuth` or `ProtectedRoute` component exists in the codebase (confirmed by
`grep -rn "RequireAuth\|ProtectedRoute\|function RequireAuth\|export.*RequireAuth" apps/web/src/`
returning empty).

The backend has gated `/api/analysis` with `authMiddleware` since commit c5553f9 (2026-04-28).
Plan 40-07 fixed the Bearer header on the three fetchers (Task 1), but the anonymous-user
UX path remains broken: anonymous visitors see a 401-derived error UI instead of being
redirected to login.

Routes that need an auth guard once this component exists:
- `/analysis` (primary, from plan 40-07)
- Audit other routes that hit authenticated endpoints — candidates include `/bookmarks`,
  `/profile`, `/settings`, `/team`, `/leaderboard`

## What

Create `apps/web/src/components/RequireAuth.tsx` (or `ProtectedRoute.tsx`) with:

```typescript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null; // or a spinner — wait for auth to initialize

  if (!user) {
    // Redirect to login, preserving intended destination via state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

Then in `apps/web/src/App.tsx`:
```typescript
import { RequireAuth } from './components/RequireAuth';

// Replace the TODO comment + unwrapped route with:
<Route path="/analysis" element={<RequireAuth><Analysis /></RequireAuth>} />
```

After login, the `LoginPage` (or `AuthModal`) should read `location.state?.from` and
redirect back to the intended page.

## Acceptance

- `RequireAuth` component exists and is exported.
- `/analysis` route is wrapped with `<RequireAuth>`.
- Anonymous navigation to `/analysis` redirects to `/login` (verified by Playwright E2E
  or manual test in incognito).
- After login, user is redirected back to `/analysis` (not dumped on `/`).
- `pnpm typecheck && pnpm test:run` green; no behavioral regressions.

## Out of scope

- Changing backend auth middleware.
- Any changes to the existing auth flow (login, register, OAuth).
