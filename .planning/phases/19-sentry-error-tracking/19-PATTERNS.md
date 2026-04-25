# Phase 19: Sentry Error Tracking - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 8 (2 new, 6 modified)
**Analogs found:** 6 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/instrument.ts` (NEW) | config | initialization | `server/utils/logger.ts` | role-match |
| `server/instrument.mjs` (NEW) | config | initialization | `server/utils/logger.ts` | role-match |
| `src/main.tsx` | entry-point | initialization | (self - modify existing) | exact |
| `src/components/ErrorBoundary.tsx` | component | error-handling | (self - modify existing) | exact |
| `server/index.ts` | entry-point | middleware-chain | (self - modify existing) | exact |
| `vite.config.ts` | config | build-config | (self - modify existing) | exact |
| `.github/workflows/ci.yml` | ci-config | pipeline | (self - modify existing) | exact |
| `package.json` | config | scripts | (self - modify existing) | exact |

## Pattern Assignments

### `src/instrument.ts` (NEW) (config, initialization)

**Analog:** `server/utils/logger.ts`

**Why this analog:** Both are module-level initialization files that configure a service before app startup. Logger uses singleton export pattern; Sentry init uses similar module-scoped initialization.

**Imports pattern** (lines 1-3):
```typescript
import winston from 'winston';
import path from 'path';
```

**Initialization pattern** (lines 6-26):
```typescript
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'newshub-server' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    }),
  ],
});
```

**Environment-conditional behavior** (lines 29-36):
```typescript
// If we're not in production then log to the console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}
```

**Export pattern** (line 38):
```typescript
export default logger;
```

**Apply to `src/instrument.ts`:** Use similar conditional initialization (`enabled: import.meta.env.PROD`) and default export pattern.

---

### `server/instrument.mjs` (NEW) (config, initialization)

**Analog:** `server/utils/logger.ts` + `server/services/cacheService.ts`

**Why these analogs:** Logger shows module-level config initialization. CacheService shows environment variable reading pattern.

**Environment variable pattern** (cacheService.ts lines 18-24):
```typescript
const DEFAULT_CONFIG: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: 'newshub:',
};
```

**Apply to `server/instrument.mjs`:** Use `process.env.SENTRY_DSN`, `process.env.SENTRY_ENVIRONMENT || 'development'`, `parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2')`. File extension must be `.mjs` for ESM `--import` compatibility.

---

### `src/main.tsx` (MODIFY) (entry-point, initialization)

**Current file:** `src/main.tsx`

**Current imports pattern** (lines 1-4):
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
```

**Current createRoot pattern** (lines 23-27):
```typescript
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Modification points:**
1. Add `import './instrument';` as FIRST import (before all others)
2. Add `import * as Sentry from '@sentry/react';`
3. Modify `createRoot()` to include React 19 error handlers:
   ```typescript
   createRoot(document.getElementById('root')!, {
     onUncaughtError: Sentry.reactErrorHandler(),
     onCaughtError: Sentry.reactErrorHandler(),
     onRecoverableError: Sentry.reactErrorHandler(),
   })
   ```

---

### `src/components/ErrorBoundary.tsx` (MODIFY) (component, error-handling)

**Current file:** `src/components/ErrorBoundary.tsx`

**Current imports pattern** (lines 1-2):
```typescript
import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
```

**Current componentDidCatch pattern** (lines 32-38):
```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  this.setState({
    error,
    errorInfo: errorInfo.componentStack || error.stack || null,
  });
}
```

**Modification points:**
1. Add `import * as Sentry from '@sentry/react';` to imports
2. Add `Sentry.captureReactException(error, errorInfo);` in componentDidCatch BEFORE setState:
   ```typescript
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

---

### `server/index.ts` (MODIFY) (entry-point, middleware-chain)

**Current file:** `server/index.ts`

**Current imports pattern** (lines 1-38):
```typescript
// Load environment variables FIRST before any other imports
import 'dotenv/config';

import express from 'express';
import path from 'path';
// ... more imports
```

**Current middleware chain** (lines 55-85):
```typescript
app.use(cors({ /* ... */ }));
app.use(compression({ threshold: 1024 }));
app.use(serverTimingMiddleware);
app.use(express.json());
// ... routes follow
```

**Current error handler** (lines 274-280):
```typescript
// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});
```

**Modification points:**
1. Add `import * as Sentry from '@sentry/node';` after dotenv import
2. Add `Sentry.setupExpressErrorHandler(app);` BEFORE the existing error handler (line ~273):
   ```typescript
   // Sentry error handler - captures errors and forwards to next handler
   Sentry.setupExpressErrorHandler(app);

   // Existing error handler - formats response
   app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
     console.error('Server error:', err);
     res.status(500).json({
       success: false,
       error: 'Internal server error',
     });
   });
   ```

---

### `vite.config.ts` (MODIFY) (config, build-config)

**Current file:** `vite.config.ts`

**Current imports pattern** (lines 1-5):
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'
```

**Current plugins array** (lines 8-101):
```typescript
plugins: [
  react(),
  tailwindcss(),
  viteCompression({ /* ... */ }),
  viteCompression({ /* ... */ }),
  VitePWA({ /* ... */ }),
],
```

**Current build config** (lines 116-150):
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks(id: string) { /* ... */ },
    },
  },
  chunkSizeWarningLimit: 500,
},
```

**Modification points:**
1. Add `import { sentryVitePlugin } from '@sentry/vite-plugin';` to imports
2. Add `sourcemap: 'hidden'` to build config:
   ```typescript
   build: {
     sourcemap: 'hidden',  // Generate but don't expose in production
     rollupOptions: { /* existing */ },
     chunkSizeWarningLimit: 500,
   },
   ```
3. Add sentryVitePlugin LAST in plugins array (conditionally for CI):
   ```typescript
   // Sentry plugin (only in CI with auth token)
   process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
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
   ```

---

### `.github/workflows/ci.yml` (MODIFY) (ci-config, pipeline)

**Current file:** `.github/workflows/ci.yml`

**Current build job** (lines 106-142):
```yaml
build:
  name: Build Docker Image
  runs-on: ubuntu-latest
  needs: [lint, typecheck, test]
  steps:
    - name: Checkout
      uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
    # ... docker build steps
```

**Modification points:**
Add Sentry environment variables to the build job, before Docker build. The Vite plugin will upload source maps during `npm run build`:

```yaml
build:
  name: Build Docker Image
  runs-on: ubuntu-latest
  needs: [lint, typecheck, test]
  steps:
    - name: Checkout
      uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11

    - name: Setup Node.js
      uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8
      with:
        node-version: 22
        cache: 'npm'

    - name: Install dependencies
      run: npm ci --legacy-peer-deps

    - name: Build with source map upload
      run: npm run build
      env:
        SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
        SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        SENTRY_RELEASE: newshub@${{ github.sha }}
        VITE_SENTRY_RELEASE: newshub@${{ github.sha }}

    # ... existing Docker steps
```

Also add `SENTRY_RELEASE` and `SENTRY_ENVIRONMENT` to deploy jobs:
```yaml
deploy-staging:
  # ... existing config
  env:
    SENTRY_RELEASE: newshub@${{ github.sha }}
    SENTRY_ENVIRONMENT: staging

deploy-production:
  # ... existing config
  env:
    SENTRY_RELEASE: newshub@${{ github.sha }}
    SENTRY_ENVIRONMENT: production
```

---

### `package.json` (MODIFY) (config, scripts)

**Current file:** `package.json`

**Current start script** (line 19):
```json
"start": "node dist/server/index.js",
```

**Modification points:**
Update start script to use `--import` flag for ESM Sentry initialization:
```json
"start": "node --import ./server/instrument.mjs dist/server/index.js",
```

---

## Shared Patterns

### Environment Variable Naming Convention
**Source:** `server/services/cacheService.ts`, `server/config/aiProviders.ts`
**Apply to:** All Sentry configuration

Pattern: Use `SCREAMING_SNAKE_CASE` for env vars with descriptive prefixes:
```typescript
// Frontend (Vite requires VITE_ prefix for client exposure)
VITE_SENTRY_DSN
VITE_SENTRY_ENVIRONMENT
VITE_SENTRY_RELEASE
VITE_SENTRY_TRACES_SAMPLE_RATE

// Backend
SENTRY_DSN
SENTRY_ENVIRONMENT
SENTRY_RELEASE
SENTRY_TRACES_SAMPLE_RATE

// CI-only (not exposed to runtime)
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

### User Context Pattern
**Source:** `src/contexts/AuthContext.tsx` (lines 81-97)
**Apply to:** Frontend Sentry user context after login

```typescript
// After successful login, set Sentry user context
const login = useCallback(async (email: string, password: string) => {
  // ... existing login logic
  setUser(data.data.user);

  // Set Sentry user context
  Sentry.setUser({
    id: data.data.user.id,
    email: data.data.user.email,
    username: data.data.user.name,
  });
}, []);

// On logout, clear Sentry user context
const logout = useCallback(() => {
  // ... existing logout logic
  Sentry.setUser(null);
}, []);
```

### Graceful Degradation Pattern
**Source:** `server/services/cacheService.ts` (lines 62-68)
**Apply to:** Sentry initialization

```typescript
// CacheService graceful degradation pattern
retryStrategy: (times) => {
  if (times > 3) {
    logger.warn('Redis connection failed after 3 retries, running without cache');
    return null;  // Stop retrying, continue without feature
  }
  return Math.min(times * 200, 2000);
},
```

Apply to Sentry: Use `enabled: import.meta.env.PROD` for frontend and `enabled: process.env.NODE_ENV === 'production'` for backend to prevent development noise.

---

## No Analog Found

Files with no close match in the codebase (use RESEARCH.md patterns):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/instrument.ts` | config | initialization | New SDK initialization file type - use RESEARCH.md Pattern 1 |
| `server/instrument.mjs` | config | initialization | New ESM pre-import file - use RESEARCH.md Pattern 3 |

**Note:** While `server/utils/logger.ts` provides a structural analog for module-level initialization, the Sentry SDK initialization pattern is fundamentally different (SDK.init() vs createLogger()). Planner should follow RESEARCH.md code examples directly for these files.

---

## Metadata

**Analog search scope:** `src/`, `server/`, `.github/workflows/`
**Files scanned:** 15
**Pattern extraction date:** 2026-04-23
