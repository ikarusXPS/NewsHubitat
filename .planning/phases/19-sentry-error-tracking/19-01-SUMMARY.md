---
phase: 19-sentry-error-tracking
plan: 01
subsystem: frontend-error-tracking
tags: [sentry, error-tracking, react, performance-monitoring]
dependency_graph:
  requires: []
  provides:
    - frontend-sentry-integration
    - react-error-handlers
    - user-context-tracking
  affects:
    - error-visibility
    - performance-monitoring
tech_stack:
  added:
    - "@sentry/react@10.49.0"
  patterns:
    - react-19-error-handlers
    - sentry-browser-tracing
    - user-context-attachment
key_files:
  created:
    - src/instrument.ts
  modified:
    - package.json
    - src/main.tsx
    - src/components/ErrorBoundary.tsx
    - src/contexts/AuthContext.tsx
    - .env.example
decisions:
  - "Use @sentry/react 10.49.0 for React 19 compatibility"
  - "Initialize Sentry in separate instrument.ts for early loading"
  - "Enable Sentry only in production (import.meta.env.PROD)"
  - "Set default traces sample rate to 0.2 (20%)"
  - "Attach user id, email, username to Sentry context"
metrics:
  duration: 5m 33s
  completed: "2026-04-23T10:20:26Z"
---

# Phase 19 Plan 01: Frontend Sentry Integration Summary

Frontend error tracking and performance monitoring via Sentry React SDK with React 19 error handlers.

## One-liner

Sentry React SDK integrated with browserTracingIntegration, React 19 error handlers in createRoot, and user context attached on auth events.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Sentry React SDK | a5f4a78 | package.json, package-lock.json |
| 2 | Create Frontend Sentry Initialization | e6d363c | src/instrument.ts, .env.example |
| 3 | Integrate Sentry with React 19 Entry Point | a882f1b | src/main.tsx |
| 4 | Add Sentry Capture to ErrorBoundary | a360dc5 | src/components/ErrorBoundary.tsx |
| 5 | Add User Context to Auth Flow | 387c3f7 | src/contexts/AuthContext.tsx |

## Key Artifacts

### src/instrument.ts (created)
Sentry initialization module imported first in main.tsx:
- `Sentry.init()` with DSN, environment, release from env vars
- `browserTracingIntegration()` for page load and route performance
- `tracesSampleRate` configurable (default 0.2)
- Only enabled in production (`import.meta.env.PROD`)

### src/main.tsx (modified)
React 19 createRoot with Sentry error handlers:
- `import './instrument'` as first import
- `onUncaughtError: Sentry.reactErrorHandler()`
- `onCaughtError: Sentry.reactErrorHandler()`
- `onRecoverableError: Sentry.reactErrorHandler()`

### src/components/ErrorBoundary.tsx (modified)
ErrorBoundary captures to Sentry while preserving existing UI:
- `Sentry.captureReactException(error, errorInfo)` in componentDidCatch
- React component stack included in error reports

### src/contexts/AuthContext.tsx (modified)
User context attached/cleared on auth events:
- `Sentry.setUser({id, email, username})` on login
- `Sentry.setUser({id, email, username})` on register
- `Sentry.setUser({id, email, username})` on page load (fetchUser)
- `Sentry.setUser(null)` on logout

### .env.example (modified)
New environment variables documented:
- `VITE_SENTRY_DSN` - Sentry DSN from project settings
- `VITE_SENTRY_ENVIRONMENT` - development/staging/production
- `VITE_SENTRY_RELEASE` - Release version for tracking
- `VITE_SENTRY_TRACES_SAMPLE_RATE` - Performance sample rate (default 0.2)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
npm ls @sentry/react
newshub@0.0.0 D:\NewsHub
 -- @sentry/react@10.49.0

npm run typecheck
> tsc --noEmit
(no errors)
```

## User Setup Required

Before Sentry will capture errors in production:

1. **Create Sentry Project**
   - Go to Sentry Dashboard -> Projects -> Create Project
   - Select "React" as platform
   - Note the DSN from Client Keys

2. **Configure Environment Variables**
   ```bash
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   VITE_SENTRY_ENVIRONMENT=production
   VITE_SENTRY_RELEASE=1.3.0
   VITE_SENTRY_TRACES_SAMPLE_RATE=0.2
   ```

## Self-Check: PASSED

- [x] src/instrument.ts exists and contains Sentry.init
- [x] src/main.tsx imports instrument first
- [x] src/components/ErrorBoundary.tsx contains captureReactException
- [x] src/contexts/AuthContext.tsx contains 4 Sentry.setUser calls
- [x] .env.example contains VITE_SENTRY_DSN
- [x] npm run typecheck passes
- [x] All 5 commits exist in git history
