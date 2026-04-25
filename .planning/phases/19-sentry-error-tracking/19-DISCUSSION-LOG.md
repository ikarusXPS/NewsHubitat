# Phase 19: Sentry Error Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 19-sentry-error-tracking
**Areas discussed:** SDK integration approach, Source map strategy, Performance monitoring scope, Alert configuration

---

## SDK Integration Approach

### Frontend Error Capture

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap existing ErrorBoundary (Recommended) | Add Sentry.captureException to current ErrorBoundary — minimal code change, uses existing pattern | ✓ |
| Sentry's Error Boundary | Replace with @sentry/react ErrorBoundary — more features but changes existing component | |
| Global error handler only | window.onerror + unhandledrejection — catches more but loses React component stack | |

**User's choice:** Wrap existing ErrorBoundary (Recommended)
**Notes:** Preserves existing error UI and component, adds Sentry reporting with minimal changes

### Backend Error Capture

| Option | Description | Selected |
|--------|-------------|----------|
| Express error middleware (Recommended) | Add Sentry.Handlers.errorHandler() middleware at the end of route chain — standard pattern | ✓ |
| Manual capture in each route | Call Sentry.captureException in individual try-catch blocks — more control, more code | |
| Winston transport | Send logger.error() calls to Sentry via transport — catches logged errors only | |

**User's choice:** Express error middleware (Recommended)
**Notes:** Standard Sentry Express pattern, single integration point

---

## Source Map Strategy

### Upload Method

| Option | Description | Selected |
|--------|-------------|----------|
| CI upload with sentry-cli (Recommended) | Upload during GitHub Actions build job — maps tied to release version, not in production bundle | ✓ |
| Vite plugin auto-upload | @sentry/vite-plugin uploads on build — simpler but runs on every build including local | |
| Manual upload script | npm run upload-sourcemaps manually — most control, easy to forget | |

**User's choice:** CI upload with sentry-cli (Recommended)
**Notes:** Source maps uploaded only during CI, not bundled in production

### Release Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Git commit SHA (Recommended) | e.g., newshub@a1b2c3d — precise tracking, matches GitHub, automatic in CI | ✓ |
| Semantic version | e.g., newshub@1.3.0 — human-readable but requires version tagging discipline | |
| Timestamp-based | e.g., newshub@2026-04-23T10-30 — simple but hard to correlate with code | |

**User's choice:** Git commit SHA (Recommended)
**Notes:** Short SHA format for release names, automatic via $GITHUB_SHA

---

## Performance Monitoring Scope

### Transaction Tracing

| Option | Description | Selected |
|--------|-------------|----------|
| Critical paths only (Recommended) | Auth, AI/analysis, news endpoints — low overhead, focused insights | ✓ |
| All API endpoints | Every /api/* call traced — complete picture but higher volume/cost | |
| Sample rate approach | All endpoints at 10-20% sample rate — statistical coverage, lower cost | |

**User's choice:** Critical paths only (Recommended)
**Notes:** Focus on auth, AI/analysis, and news endpoints

### Frontend Performance

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with BrowserTracing (Recommended) | Track page loads, route changes, and web vitals — complete frontend picture | ✓ |
| No, backend only | Skip frontend performance tracing — simpler, focus on API latency | |
| Let Claude decide | Claude picks based on Sentry best practices | |

**User's choice:** Yes, with BrowserTracing (Recommended)
**Notes:** Full frontend performance monitoring enabled

---

## Alert Configuration

### Notification Method

| Option | Description | Selected |
|--------|-------------|----------|
| Email for new issues (Recommended) | Sentry sends email when a new error type is first seen — simple, no extra setup | ✓ |
| Slack integration | Alerts posted to a Slack channel — faster response but requires Slack app setup | |
| Both email and Slack | Email for all issues, Slack for critical only — tiered alerting | |
| Let Claude decide | Claude configures sensible defaults | |

**User's choice:** Email for new issues (Recommended)
**Notes:** Default Sentry email alerting, no additional integrations

### Environments

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, staging + production (Recommended) | Filter errors by environment in Sentry UI — standard practice | ✓ |
| Production only | Skip staging tracking — simpler but miss staging issues | |
| development + staging + production | Track all environments — more data, noisier | |

**User's choice:** Yes, staging + production (Recommended)
**Notes:** Two environments matching CI/CD deployment targets

---

## Claude's Discretion

- Error grouping and fingerprinting rules
- Exact tracesSampleRate values (recommended: 1.0 staging, 0.2 production)
- User context attachment (userId, email when logged in)

## Deferred Ideas

None — discussion stayed within phase scope
