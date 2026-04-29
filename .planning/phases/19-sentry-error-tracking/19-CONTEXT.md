# Phase 19: Sentry Error Tracking - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive error capture and performance monitoring across frontend and backend using Sentry. This phase implements SNTR-01 through SNTR-04 from v1.3 requirements.

**Delivers:**
- Frontend error capture via React Error Boundary integration
- Backend error capture via Express middleware
- Source map upload for readable production stack traces
- Performance monitoring for critical API paths and frontend navigation

</domain>

<decisions>
## Implementation Decisions

### SDK Integration

- **D-01:** Frontend errors captured by wrapping existing `ErrorBoundary.tsx` with `Sentry.captureException` calls in `componentDidCatch` — preserves current error UI, adds Sentry reporting
- **D-02:** Backend errors captured via `Sentry.Handlers.errorHandler()` middleware added at end of Express route chain — standard Sentry Express pattern
- **D-03:** Both SDKs initialize in respective entry points (`src/main.tsx` for frontend, `server/index.ts` for backend)

### Source Maps

- **D-04:** Source maps uploaded during CI via `sentry-cli` in GitHub Actions build job — maps tied to release, not bundled in production
- **D-05:** Release naming uses git commit SHA format: `newshub@{SHORT_SHA}` — precise tracking, automatic in CI
- **D-06:** Vite build retains source maps for upload but excludes them from production bundle (`build.sourcemap: 'hidden'`)

### Performance Monitoring

- **D-07:** Backend tracing enabled for critical paths only: `/api/auth/*`, `/api/ai/*`, `/api/analysis/*`, `/api/news/*` — low overhead, focused insights
- **D-08:** Frontend tracing enabled with `BrowserTracing` integration — tracks page loads, route changes, web vitals
- **D-09:** Sample rate configurable via environment variable (default 1.0 for staging, 0.2 for production)

### Alerts & Environments

- **D-10:** Email notifications configured for new issue types — Sentry default alerting, no Slack integration
- **D-11:** Two Sentry environments configured: `staging` and `production` — matches deployment environments from CI/CD
- **D-12:** Environment determined by `SENTRY_ENVIRONMENT` env var (set in GitHub Actions secrets per environment)

### Claude's Discretion

- Error grouping and fingerprinting rules — use Sentry defaults, adjust if noisy
- Exact tracesSampleRate values for each environment — recommend 1.0 staging, 0.2 production
- User context attachment (userId, email) — attach if user is logged in, respect privacy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/codebase/CONVENTIONS.md` — Error handling patterns, logging conventions
- `.planning/codebase/STACK.md` — React 19, Express 5, Vite 8, Winston logger

### Existing Code
- `src/components/ErrorBoundary.tsx` — Current error boundary (extend with Sentry)
- `server/index.ts` — Express app setup (add error middleware)
- `server/utils/logger.ts` — Winston logger (optional Sentry transport)

### CI/CD Context
- `.github/workflows/ci.yml` — GitHub Actions workflow (add source map upload step)
- `vite.config.ts` — Build configuration (source map settings)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ErrorBoundary.tsx`: Class component with `componentDidCatch` — add `Sentry.captureException(error, { extra: { componentStack } })`
- Winston logger: Could add Sentry transport for `logger.error()` calls (optional enhancement)
- `vite.config.ts`: Already produces source maps for production builds

### Established Patterns
- Singleton services: `AIService.getInstance()`, `CacheService.getInstance()` — Sentry init should follow similar pattern
- Express middleware chain: CORS → compression → serverTiming → routes — error handler goes after all routes
- Environment variables: `process.env.*` loaded via `dotenv/config` — add `SENTRY_DSN`, `SENTRY_ENVIRONMENT`

### Integration Points
- `src/main.tsx`: Initialize Sentry before `ReactDOM.createRoot()`
- `server/index.ts`: Initialize Sentry before Express routes, add error handler at end
- GitHub Actions: Add sentry-cli step after Docker build but before deploy

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard Sentry integration following official docs.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-sentry-error-tracking*
*Context gathered: 2026-04-23*
