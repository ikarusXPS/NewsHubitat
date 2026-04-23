---
phase: 19-sentry-error-tracking
verified: 2026-04-23T11:05:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Verify Sentry dashboard receives test error"
    expected: "Error appears in Sentry Issues tab with React component stack"
    why_human: "Requires Sentry account and dashboard access to verify alert configuration"
  - test: "Verify error alert notification triggers"
    expected: "Team receives notification (email, Slack, etc.) when new error occurs"
    why_human: "Alert rules require manual Sentry dashboard configuration and external notification setup"
---

# Phase 19: Sentry Error Tracking Verification Report

**Phase Goal:** Comprehensive error capture and performance monitoring across frontend and backend
**Verified:** 2026-04-23T11:05:00Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Frontend runtime errors are captured via React Error Boundary with Sentry SDK integration | VERIFIED | `ErrorBoundary.tsx` line 37 contains `Sentry.captureReactException(error, errorInfo)`; `main.tsx` uses `Sentry.reactErrorHandler()` for all three React 19 error types |
| 2 | Backend Express errors are captured via error handler middleware with Sentry SDK | VERIFIED | `server/index.ts` line 275 contains `Sentry.setupExpressErrorHandler(app)` before existing error handler |
| 3 | Source maps are uploaded to Sentry enabling readable stack traces in production | VERIFIED | `vite.config.ts` has `sentryVitePlugin` with `filesToDeleteAfterUpload`; CI has `SENTRY_AUTH_TOKEN` and `SENTRY_RELEASE` |
| 4 | Transaction traces show API latency and frontend performance metrics | VERIFIED | Frontend: `browserTracingIntegration()` in `instrument.ts`; Backend: auto-instrumented via `--import ./server/instrument.mjs` flag |
| 5 | Error alerts notify team when new issues occur | NEEDS HUMAN | Requires Sentry dashboard configuration - alert rules must be set up manually in Sentry UI |

**Score:** 4/5 truths verified (1 requires human configuration)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/instrument.ts` | Sentry SDK initialization for frontend | VERIFIED | Contains `Sentry.init()` with DSN, browserTracingIntegration, sample rate config |
| `src/main.tsx` | React 19 error handlers | VERIFIED | First import is `'./instrument'`; createRoot uses all 3 Sentry error handlers |
| `src/components/ErrorBoundary.tsx` | Sentry capture in componentDidCatch | VERIFIED | Contains `Sentry.captureReactException(error, errorInfo)` at line 37 |
| `src/contexts/AuthContext.tsx` | User context attachment | VERIFIED | Contains 4 `Sentry.setUser()` calls (login, register, fetchUser, logout) |
| `server/instrument.mjs` | Sentry SDK initialization for backend (ESM) | VERIFIED | Contains `Sentry.init()` with DSN, environment, sample rate; `.mjs` extension for ESM |
| `server/index.ts` | Express error handler integration | VERIFIED | Line 3: import Sentry; Line 275: `Sentry.setupExpressErrorHandler(app)` |
| `package.json` | Start script with --import flag | VERIFIED | `"start": "node --import ./server/instrument.mjs dist/server/index.js"` |
| `vite.config.ts` | Sentry Vite plugin configuration | VERIFIED | Contains `sentryVitePlugin` with `sourcemap: 'hidden'` and `filesToDeleteAfterUpload` |
| `.github/workflows/ci.yml` | Source map upload environment variables | VERIFIED | Build job has `SENTRY_AUTH_TOKEN`, `SENTRY_RELEASE`, `VITE_SENTRY_RELEASE` |
| `.env.example` | Sentry environment variables documented | VERIFIED | Contains VITE_SENTRY_DSN, SENTRY_DSN, sample rate configs |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/main.tsx` | `src/instrument.ts` | first import | VERIFIED | Line 1: `import './instrument'; // MUST be first import` |
| `src/components/ErrorBoundary.tsx` | `@sentry/react` | error capture | VERIFIED | `import * as Sentry from '@sentry/react'` + `Sentry.captureReactException` |
| `src/contexts/AuthContext.tsx` | `@sentry/react` | user context | VERIFIED | `Sentry.setUser()` called on login/register/logout/fetchUser |
| `package.json start script` | `server/instrument.mjs` | node --import flag | VERIFIED | Script uses `--import ./server/instrument.mjs` |
| `server/index.ts` | `@sentry/node` | error handler middleware | VERIFIED | `import * as Sentry` + `Sentry.setupExpressErrorHandler(app)` |
| `vite.config.ts` | `@sentry/vite-plugin` | build plugin | VERIFIED | `sentryVitePlugin` with org, project, authToken, sourcemaps config |
| `.github/workflows/ci.yml` | `vite.config.ts` | env vars for plugin | VERIFIED | Build job sets `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE` |

### Data-Flow Trace (Level 4)

Not applicable for this phase. Sentry integration does not render dynamic data - it captures errors and sends them to an external service.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Sentry packages installed | `npm ls @sentry/react @sentry/node @sentry/vite-plugin` | @sentry/react@10.49.0, @sentry/node@10.49.0, @sentry/vite-plugin@5.2.0 | PASS |
| instrument.ts is first import | `head -1 src/main.tsx` | `import './instrument'; // MUST be first import` | PASS |
| User context calls exist | `grep -c "Sentry.setUser" src/contexts/AuthContext.tsx` | 4 | PASS |
| Start script has --import | `grep '"start":' package.json` | Contains `--import ./server/instrument.mjs` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SNTR-01 | 19-01 | Frontend Errors werden via React Error Boundary + Sentry SDK erfasst | SATISFIED | ErrorBoundary.tsx has captureReactException; main.tsx has reactErrorHandler for all error types |
| SNTR-02 | 19-02 | Backend Errors werden via Express Error Handler + Sentry SDK erfasst | SATISFIED | server/index.ts line 275: setupExpressErrorHandler(app) |
| SNTR-03 | 19-03 | Source Maps sind hochgeladen fur lesbare Stack Traces | SATISFIED | vite.config.ts: sentryVitePlugin with hidden sourcemaps; CI: upload env vars configured |
| SNTR-04 | 19-01, 19-02 | Performance Monitoring zeigt Transaction Traces und API Latency | SATISFIED | Frontend: browserTracingIntegration; Backend: auto-instrumentation via --import flag |

All 4 requirement IDs from REQUIREMENTS.md are covered and satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

No TODO comments, placeholder implementations, or stub patterns detected in the Sentry integration files.

### Human Verification Required

### 1. Verify Sentry Error Capture

**Test:** Trigger a test error in the production/staging environment and check Sentry dashboard
**Expected:** Error appears in Sentry Issues tab with:
  - Full React component stack trace
  - User context (if logged in)
  - Environment and release tags
**Why human:** Requires Sentry account access and actual error capture in a deployed environment

### 2. Verify Error Alert Notification

**Test:** Configure alert rules in Sentry dashboard and trigger a new error
**Expected:** Team receives notification via configured channel (email, Slack, PagerDuty, etc.)
**Why human:** Alert rules must be configured manually in Sentry UI - this is intentionally not automated

### 3. Verify Source Map Upload

**Test:** After CI build, check Sentry Releases for the commit SHA
**Expected:** Release `newshub@{commit-sha}` exists with source maps attached
**Why human:** Requires GitHub Secrets (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) to be configured

### Gaps Summary

No technical gaps found. All code artifacts are present, substantive, and properly wired.

The only outstanding item is **ROADMAP Success Criterion #5: "Error alerts notify team when new issues occur"** - this requires manual configuration in the Sentry dashboard which cannot be automated. The SDK integration is complete; alert rules are a deployment-time configuration task.

**Recommended user actions before marking phase complete:**
1. Create Sentry project(s) for frontend and backend
2. Configure GitHub Secrets: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
3. Set up alert rules in Sentry dashboard for new issues
4. Verify first error capture after deployment

---

_Verified: 2026-04-23T11:05:00Z_
_Verifier: Claude (gsd-verifier)_
