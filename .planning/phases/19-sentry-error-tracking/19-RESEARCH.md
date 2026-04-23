# Phase 19: Sentry Error Tracking - Research

**Researched:** 2026-04-23
**Domain:** Error tracking and performance monitoring (Sentry)
**Confidence:** HIGH

## Summary

Sentry integration for NewsHub involves adding the `@sentry/react` SDK to the frontend and `@sentry/node` SDK to the backend, with source map uploads via the `@sentry/vite-plugin` during CI builds. The React 19 environment requires using `Sentry.captureReactException()` in the existing `ErrorBoundary.tsx` component, plus hooking into the `createRoot` error handlers. The Express 5 backend requires an ESM-compatible initialization approach using `--import` flag for proper auto-instrumentation.

The project already has a class-based `ErrorBoundary.tsx` with `componentDidCatch` — this integrates naturally with Sentry by adding a `Sentry.captureReactException(error, info)` call. The backend uses ES modules (tsup builds to `dist/server/`), which requires careful initialization ordering: Sentry must initialize before any other imports via the Node `--import` flag.

**Primary recommendation:** Use Sentry SDK v10.x unified packages, Vite plugin for source map uploads in CI, and ESM-compatible initialization pattern for the Express backend.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Frontend errors captured by wrapping existing `ErrorBoundary.tsx` with `Sentry.captureException` calls in `componentDidCatch` — preserves current error UI, adds Sentry reporting
- **D-02:** Backend errors captured via `Sentry.Handlers.errorHandler()` middleware added at end of Express route chain — standard Sentry Express pattern
- **D-03:** Both SDKs initialize in respective entry points (`src/main.tsx` for frontend, `server/index.ts` for backend)
- **D-04:** Source maps uploaded during CI via `sentry-cli` in GitHub Actions build job — maps tied to release, not bundled in production
- **D-05:** Release naming uses git commit SHA format: `newshub@{SHORT_SHA}` — precise tracking, automatic in CI
- **D-06:** Vite build retains source maps for upload but excludes them from production bundle (`build.sourcemap: 'hidden'`)
- **D-07:** Backend tracing enabled for critical paths only: `/api/auth/*`, `/api/ai/*`, `/api/analysis/*`, `/api/news/*` — low overhead, focused insights
- **D-08:** Frontend tracing enabled with `BrowserTracing` integration — tracks page loads, route changes, web vitals
- **D-09:** Sample rate configurable via environment variable (default 1.0 for staging, 0.2 for production)
- **D-10:** Email notifications configured for new issue types — Sentry default alerting, no Slack integration
- **D-11:** Two Sentry environments configured: `staging` and `production` — matches deployment environments from CI/CD
- **D-12:** Environment determined by `SENTRY_ENVIRONMENT` env var (set in GitHub Actions secrets per environment)

### Claude's Discretion
- Error grouping and fingerprinting rules — use Sentry defaults, adjust if noisy
- Exact tracesSampleRate values for each environment — recommend 1.0 staging, 0.2 production
- User context attachment (userId, email) — attach if user is logged in, respect privacy

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SNTR-01 | Frontend Errors werden via React Error Boundary + Sentry SDK erfasst | `@sentry/react` with `captureReactException()` in existing `ErrorBoundary.tsx`, plus `reactErrorHandler()` in `createRoot` |
| SNTR-02 | Backend Errors werden via Express Error Handler + Sentry SDK erfasst | `@sentry/node` with `Sentry.setupExpressErrorHandler(app)` after all routes |
| SNTR-03 | Source Maps sind hochgeladen fur lesbare Stack Traces | `@sentry/vite-plugin` with `sourcemap: 'hidden'`, upload in GitHub Actions build job |
| SNTR-04 | Performance Monitoring zeigt Transaction Traces und API Latency | `browserTracingIntegration()` for frontend, automatic HTTP tracing for Express with `tracesSampleRate` |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Frontend error capture | Browser / Client | — | React Error Boundary catches render errors in browser |
| Backend error capture | API / Backend | — | Express error middleware handles server-side errors |
| Source map upload | CDN / Static | — | Build artifact upload during CI, not runtime |
| Performance tracing (frontend) | Browser / Client | — | BrowserTracing captures client-side metrics |
| Performance tracing (backend) | API / Backend | — | HTTP instrumentation captures API latency |
| Alert configuration | External Service | — | Sentry SaaS handles alerting, not our infrastructure |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sentry/react` | 10.49.0 | Frontend SDK with React integrations | [VERIFIED: npm registry] Official React SDK, unified v10 package |
| `@sentry/node` | 10.49.0 | Backend SDK for Node.js/Express | [VERIFIED: npm registry] Official Node SDK, includes Express support |
| `@sentry/vite-plugin` | 5.2.0 | Source map upload during build | [VERIFIED: npm registry] Official Vite integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@sentry/cli` | 3.4.0 | CLI for release management | Alternative to vite-plugin if manual upload needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@sentry/vite-plugin` | `getsentry/action-release@v3` GitHub Action | Action handles more release workflows but plugin integrates better with Vite builds |
| `@sentry/react` v10 | `@sentry/browser` + manual React setup | Browser SDK works but requires more manual integration for React features |

**Installation:**
```bash
npm install @sentry/react @sentry/node
npm install -D @sentry/vite-plugin
```

**Version verification:** [VERIFIED: npm registry 2026-04-23]
- @sentry/react: 10.49.0
- @sentry/node: 10.49.0
- @sentry/vite-plugin: 5.2.0

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (Client)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────────────┐    ┌─────────────────────┐      │
│  │ main.tsx    │───>│ Sentry.init()       │    │ ErrorBoundary.tsx   │      │
│  │ (entry)     │    │ + BrowserTracing    │    │ componentDidCatch() │      │
│  └─────────────┘    └─────────────────────┘    │ captureReactException│     │
│                              │                  └─────────────────────┘      │
│                              ▼                             │                 │
│                     ┌─────────────────┐                    │                 │
│                     │ createRoot()    │<───────────────────┘                 │
│                     │ onUncaughtError │                                      │
│                     │ onCaughtError   │                                      │
│                     └────────┬────────┘                                      │
│                              │                                               │
│                              ▼                                               │
│                     ┌─────────────────┐                                      │
│                     │ Web Vitals +    │                                      │
│                     │ Page Navigation │                                      │
│                     │ (BrowserTracing)│                                      │
└─────────────────────────────┬────────────────────────────────────────────────┘
                              │ HTTP Request with
                              │ sentry-trace header
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS SERVER (Backend)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐                                                          │
│  │ instrument.mjs │  <-- Loaded via node --import BEFORE app                │
│  │ Sentry.init()  │                                                          │
│  └────────┬───────┘                                                          │
│           │                                                                  │
│           ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      Middleware Chain                               │     │
│  │  CORS → compression → serverTiming → [routes] → sentryErrorHandler │     │
│  └───────────────────────────────────┬────────────────────────────────┘     │
│                                      │                                       │
│                              ┌───────┴───────┐                              │
│                              │ setupExpress  │                              │
│                              │ ErrorHandler  │                              │
│                              │ (after routes)│                              │
│                              └───────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SENTRY SaaS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐              │
│  │ Error Events   │   │ Transactions   │   │ Source Maps    │              │
│  │ (Issues)       │   │ (Performance)  │   │ (Releases)     │              │
│  └────────────────┘   └────────────────┘   └────────────────┘              │
│           │                   │                    ▲                        │
│           │                   │                    │ Upload during CI       │
│           ▼                   ▼                    │                        │
│  ┌────────────────────────────────────┐   ┌───────┴────────┐               │
│  │ Alerts (Email)                     │   │ GitHub Actions │               │
│  │ - New Issue Types                  │   │ Build Job      │               │
│  └────────────────────────────────────┘   └────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── instrument.ts        # Frontend Sentry init (import first in main.tsx)
├── main.tsx             # Entry point (imports instrument.ts first)
├── components/
│   └── ErrorBoundary.tsx  # Modified to call captureReactException

server/
├── instrument.mjs       # Backend Sentry init (--import flag loads this)
├── index.ts             # Express app (add setupExpressErrorHandler)

vite.config.ts           # Add sentryVitePlugin for source maps
```

### Pattern 1: Frontend Initialization (React 19)
**What:** Initialize Sentry before React renders, integrate with React 19 error hooks
**When to use:** Always in production frontend builds
**Example:**
```typescript
// src/instrument.ts
// Source: https://docs.sentry.io/platforms/javascript/guides/react/
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  release: import.meta.env.VITE_SENTRY_RELEASE,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  tracePropagationTargets: [/^\/api\//],
  // Only send errors in production
  enabled: import.meta.env.PROD,
});
```

```typescript
// src/main.tsx
// Source: https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/
import './instrument'; // MUST be first import
import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### Pattern 2: ErrorBoundary Integration
**What:** Add Sentry capture to existing class-based ErrorBoundary
**When to use:** Augment existing error UI with Sentry reporting
**Example:**
```typescript
// src/components/ErrorBoundary.tsx modification
// Source: https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/
import * as Sentry from '@sentry/react';

// In componentDidCatch method:
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  console.error('[ErrorBoundary] Caught error:', error, errorInfo);

  // Capture to Sentry with React component stack
  Sentry.captureReactException(error, errorInfo);

  this.setState({
    error,
    errorInfo: errorInfo.componentStack || error.stack || null,
  });
}
```

### Pattern 3: Backend ESM Initialization
**What:** Initialize Sentry before Express app loads using --import flag
**When to use:** Node.js ESM applications for full auto-instrumentation
**Example:**
```typescript
// server/instrument.mjs
// Source: https://docs.sentry.io/platforms/javascript/guides/express/install/esm/
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
```

```typescript
// server/index.ts modification
// Source: https://docs.sentry.io/platforms/javascript/guides/express/
import * as Sentry from '@sentry/node';
// ... existing imports and routes ...

// Add AFTER all routes, BEFORE existing error handler
Sentry.setupExpressErrorHandler(app);

// Keep existing error handler for response formatting
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});
```

### Pattern 4: Vite Source Map Upload
**What:** Upload source maps to Sentry during build, exclude from bundle
**When to use:** Production builds in CI
**Example:**
```typescript
// vite.config.ts modification
// Source: https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  build: {
    sourcemap: 'hidden', // Generate but don't expose
    // ... existing config
  },
  plugins: [
    // ... existing plugins
    // Sentry plugin LAST
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: process.env.SENTRY_RELEASE,
      },
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
    }),
  ],
});
```

### Pattern 5: User Context Attachment
**What:** Attach logged-in user info to Sentry events
**When to use:** When user is authenticated (frontend and backend)
**Example:**
```typescript
// Frontend: In AuthContext or after login
// Source: https://docs.sentry.io/platforms/javascript/guides/react/enriching-events/identify-user/
import * as Sentry from '@sentry/react';

function setUserContext(user: { id: string; email: string; name?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
}
```

### Anti-Patterns to Avoid
- **Initializing Sentry after other imports (backend):** ESM requires `--import` flag for proper auto-instrumentation. Importing in index.ts misses instrumentation.
- **Setting tracesSampleRate: 0 to disable tracing:** This still runs tracing code. Omit the option entirely to disable.
- **Bundling source maps in production:** Exposes source code. Use `sourcemap: 'hidden'` and upload to Sentry only.
- **Using Sentry.Handlers.errorHandler() (deprecated):** Use `Sentry.setupExpressErrorHandler(app)` in SDK v8+.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error grouping | Custom fingerprinting logic | Sentry default grouping | Sentry's ML-based grouping handles edge cases automatically |
| Stack trace parsing | Manual source map resolution | Sentry source map upload | Complex, version-sensitive, Sentry handles automatically |
| Performance metrics | Custom timing code | BrowserTracing + auto-instrumentation | Web Vitals + transaction traces built-in |
| Alert rules | Custom notification logic | Sentry alerts | Built-in thresholds, rate limiting, deduplication |

**Key insight:** Sentry is a mature platform — use its defaults before customizing. Custom fingerprinting and alert rules should be rare refinements, not starting points.

## Common Pitfalls

### Pitfall 1: ESM Initialization Order (Backend)
**What goes wrong:** Sentry doesn't capture errors from database queries, HTTP clients, or other auto-instrumented packages.
**Why it happens:** In ESM, modules are evaluated in import order. If Sentry initializes after other packages, it misses them.
**How to avoid:** Use `node --import ./server/instrument.mjs` in start script.
**Warning signs:** Transactions show but no database spans, or errors lack context from libraries like Prisma/ioredis.

### Pitfall 2: Duplicate Error Events (Development)
**What goes wrong:** Same error appears twice in Sentry dashboard.
**Why it happens:** In React development mode, errors caught by ErrorBoundary are re-thrown to global handler.
**How to avoid:** Set `enabled: import.meta.env.PROD` in Sentry.init() to disable in development. Test error capture with production build.
**Warning signs:** Error count doubles compared to actual errors.

### Pitfall 3: Source Maps Not Applied
**What goes wrong:** Stack traces show minified code in Sentry.
**Why it happens:** Release name mismatch between SDK init and source map upload, or maps uploaded after events.
**How to avoid:** Use identical `release` value in SDK init and Vite plugin. Upload maps in CI before deployment.
**Warning signs:** Stack frames show single-letter variable names, no file paths.

### Pitfall 4: Missing User Context
**What goes wrong:** Errors show anonymous users, can't track issues per user.
**Why it happens:** `Sentry.setUser()` never called, or called with wrong data.
**How to avoid:** Call `setUser()` in auth success callback and `setUser(null)` on logout.
**Warning signs:** All issues show as "Anonymous" in Sentry.

### Pitfall 5: tracesSampleRate Too High in Production
**What goes wrong:** Sentry bills skyrocket, quota exceeded quickly.
**Why it happens:** 1.0 sample rate sends every transaction, fine for staging but expensive at scale.
**How to avoid:** Use 1.0 for staging, 0.1-0.2 for production. Monitor quota in Sentry dashboard.
**Warning signs:** "Quota exceeded" warnings, missing transactions toward month-end.

## Code Examples

### Complete Frontend Setup
```typescript
// src/instrument.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  release: import.meta.env.VITE_SENTRY_RELEASE,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: parseFloat(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.2'
  ),
  tracePropagationTargets: [/^\/api\//],
  enabled: import.meta.env.PROD,
});

export { Sentry };
```

### Complete Backend Setup
```typescript
// server/instrument.mjs
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  enabled: process.env.NODE_ENV === 'production',
});
```

### GitHub Actions Source Map Upload
```yaml
# In .github/workflows/ci.yml build job
- name: Build with source maps
  run: npm run build
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
    SENTRY_RELEASE: newshub@${{ github.sha }}
    VITE_SENTRY_RELEASE: newshub@${{ github.sha }}
```

### package.json Start Script Modification
```json
{
  "scripts": {
    "start": "node --import ./server/instrument.mjs dist/server/index.js"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Sentry.Handlers.requestHandler()` + `errorHandler()` | `Sentry.setupExpressErrorHandler(app)` | SDK v8 (2024) | Simpler setup, single function |
| `@sentry/browser` + `@sentry/tracing` | `@sentry/react` (unified) | SDK v8 | Tracing built into main package |
| Manual ErrorBoundary wrapper | `captureReactException()` | SDK v9.8.0 | Preserves React component stack |
| CommonJS `require('./instrument')` | ESM `--import` flag | SDK v8 / Node 18.19 | Required for full auto-instrumentation |

**Deprecated/outdated:**
- `Sentry.Handlers.*` functions — replaced by `setupExpressErrorHandler()` [CITED: docs.sentry.io/platforms/javascript/guides/express/migration/v7-to-v8/]
- Separate `@sentry/tracing` package — merged into main SDKs
- `captureException(error, { extra: { componentStack } })` — use `captureReactException()` for React errors

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Node 22 fully supports `--import` flag for ESM | Architecture Patterns | Medium — may need different initialization pattern |
| A2 | tsup output works with `--import` flag | Architecture Patterns | Low — standard ESM output |
| A3 | Sentry v10 SDK compatible with React 19.2 | Standard Stack | Low — both are current versions |

**Note:** All version claims were verified against npm registry. Initialization patterns verified against official Sentry documentation.

## Open Questions

1. **Winston transport integration**
   - What we know: Winston logger exists at `server/utils/logger.ts`, could add Sentry transport
   - What's unclear: Whether `logger.error()` calls should also go to Sentry or just Express errors
   - Recommendation: Start without Winston transport, add if error visibility is insufficient

2. **Service worker errors**
   - What we know: PWA service worker exists (`vite-plugin-pwa`)
   - What's unclear: Whether SW errors need separate Sentry capture
   - Recommendation: Test with production build, add SW error handling if needed

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Sentry account | All requirements | TBD | — | Must create Sentry project |
| SENTRY_DSN | SDK init | TBD | — | Errors logged but not sent |
| SENTRY_AUTH_TOKEN | Source map upload | TBD | — | Stack traces show minified code |
| Node 18.19+ | ESM --import | Available | 22 | None — required for proper init |

**Missing dependencies with no fallback:**
- Sentry account and DSN — must be configured before deployment

**Missing dependencies with fallback:**
- SENTRY_AUTH_TOKEN — source maps won't upload but errors still captured

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | No | — |
| V6 Cryptography | No | — |

**Note:** Sentry integration is observability infrastructure, not a security surface. Key security considerations:

### Data Privacy Considerations

| Concern | Mitigation |
|---------|------------|
| PII in error context | Don't enable `sendDefaultPii`, manually control user context via `setUser()` |
| Source code exposure | Use `sourcemap: 'hidden'`, delete maps after upload |
| Token security | Store `SENTRY_AUTH_TOKEN` in GitHub Secrets, never in code |

## Sources

### Primary (HIGH confidence)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/) — SDK init, error boundary, React 19 hooks
- [Sentry Express Documentation](https://docs.sentry.io/platforms/javascript/guides/express/) — Express middleware, ESM setup
- [Sentry Vite Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/) — Vite plugin configuration
- [npm registry](https://www.npmjs.com/package/@sentry/react) — Version verification

### Secondary (MEDIUM confidence)
- [Sentry GitHub Actions](https://docs.sentry.io/product/releases/setup/release-automation/github-actions/) — CI/CD integration patterns
- [Sentry ESM Setup](https://docs.sentry.io/platforms/javascript/guides/express/install/esm/) — Node ESM initialization

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against npm registry, official docs
- Architecture: HIGH — patterns from official Sentry documentation
- Pitfalls: HIGH — documented in official migration guides and community issues

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days — Sentry SDK is stable, updates are non-breaking)
