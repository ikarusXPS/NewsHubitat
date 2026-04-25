---
phase: 19-sentry-error-tracking
plan: 02
subsystem: backend
tags: [sentry, error-tracking, monitoring, express, esm]
dependency_graph:
  requires: []
  provides: [backend-error-capture, api-transaction-tracing, express-sentry-integration]
  affects: [server/index.ts, package.json]
tech_stack:
  added: ["@sentry/node@10.49.0"]
  patterns: [esm-instrumentation, express-error-handler, production-only-enablement]
key_files:
  created:
    - server/instrument.mjs
  modified:
    - package.json
    - server/index.ts
    - .env.example
decisions:
  - "Use .mjs extension for ESM compatibility with node --import flag"
  - "Enable Sentry only in production (NODE_ENV === 'production')"
  - "20% default traces sample rate via SENTRY_TRACES_SAMPLE_RATE"
  - "Sentry error handler placed before existing handler to capture then forward"
metrics:
  duration: "5 minutes"
  completed: "2026-04-23T10:29:14Z"
  tasks: 4
  files: 4
---

# Phase 19 Plan 02: Backend Sentry Integration Summary

Express backend Sentry SDK with ESM auto-instrumentation via --import flag for production error capture.

## What Was Built

1. **Sentry Node SDK** - Installed @sentry/node@10.49.0 for backend error tracking
2. **ESM Instrumentation** - Created `server/instrument.mjs` loaded via `--import` flag before app
3. **Express Error Handler** - Added `Sentry.setupExpressErrorHandler(app)` for automatic error capture
4. **Production Start Script** - Updated to `node --import ./server/instrument.mjs dist/server/index.js`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Sentry Node SDK | 04c1712 | package.json, package-lock.json |
| 2 | Create Backend Sentry Initialization (ESM) | 237aa04 | server/instrument.mjs, .env.example |
| 3 | Add Sentry Error Handler to Express | 2bab9b0 | server/index.ts |
| 4 | Update Start Script for ESM Instrumentation | 3be874a | package.json |

## Key Implementation Details

### ESM Instrumentation Pattern
```javascript
// server/instrument.mjs - loaded via --import flag BEFORE app
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  enabled: process.env.NODE_ENV === 'production',
});
```

### Express Error Handler Chain
```typescript
// Sentry captures first, then forwards to existing handler
Sentry.setupExpressErrorHandler(app);

// Existing handler formats response (preserves behavior)
app.use((err: Error, _req, res, _next) => {
  res.status(500).json({ success: false, error: 'Internal server error' });
});
```

### Start Script
```json
"start": "node --import ./server/instrument.mjs dist/server/index.js"
```

## Environment Variables

Added to `.env.example`:
```
# Sentry Error Tracking (Backend)
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=0.2
```

## Verification Results

- [x] `@sentry/node` 10.49.0 installed and in package.json
- [x] `server/instrument.mjs` exists (not .ts) with Sentry.init()
- [x] `server/index.ts` imports Sentry and calls setupExpressErrorHandler
- [x] `package.json` start script uses `--import ./server/instrument.mjs`
- [x] `.env.example` documents SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE
- [x] `npm run typecheck` passes with no errors

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] server/instrument.mjs exists
- [x] Commits 04c1712, 237aa04, 2bab9b0, 3be874a exist in git history
- [x] All files created/modified exist on disk
