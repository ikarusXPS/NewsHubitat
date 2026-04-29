---
phase: 30-frontend-code-splitting
plan: 01
subsystem: frontend/infrastructure
tags: [lazy-loading, error-handling, i18n, code-splitting]
dependency_graph:
  requires: []
  provides: [lazyWithRetry, ChunkErrorBoundary, criticalStrings]
  affects: [src/App.tsx, src/routes.ts]
tech_stack:
  added: []
  patterns: [lazy-with-retry, chunk-error-boundary, critical-i18n]
key_files:
  created:
    - src/utils/lazyWithRetry.ts
    - src/i18n/criticalStrings.ts
    - src/components/ChunkErrorBoundary.tsx
  modified: []
decisions:
  - "Exponential backoff 1s, 2s, 4s for retry timing (Claude discretion)"
  - "Clear cached promise on retry to bypass browser import caching"
  - "French translations added alongside en/de for critical strings"
metrics:
  duration: 7m 36s
  completed: 2026-04-25T17:22:44Z
  tasks: 3/3
  files_created: 3
  files_modified: 0
  tests_added: 0
  test_status: 1206 passed (no regressions)
---

# Phase 30 Plan 01: Core Lazy Loading Infrastructure Summary

Custom React.lazy wrapper with retry logic, critical i18n strings for loading states, and ChunkErrorBoundary for graceful chunk failure handling.

## What Was Built

### 1. lazyWithRetry Utility (`src/utils/lazyWithRetry.ts`)

Custom wrapper around React.lazy that adds:

- **Retry logic**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Promise caching**: Prevents duplicate import requests
- **Preload API**: Exposes `.preload()` method for hover prefetching

```typescript
import { lazyWithRetry } from './utils/lazyWithRetry';

const Analysis = lazyWithRetry(() => import('./pages/Analysis'));

// Hover prefetch
Analysis.preload();
```

### 2. Critical i18n Strings (`src/i18n/criticalStrings.ts`)

Synchronously loaded translations (~1KB) for loading states:

- **Languages**: en, de, fr
- **Keys**: loading, retrying, failed, connectionIssue
- **Helper**: `getCriticalString(lang, key)` with English fallback
- **No external imports**: Loads immediately without async i18n

### 3. ChunkErrorBoundary (`src/components/ChunkErrorBoundary.tsx`)

Error boundary specifically for chunk load failures:

- **Detection**: Checks for ChunkLoadError, "Loading chunk", and dynamic import failures
- **Toast notification**: Shows localized "Connection issue. Retrying..." via sonner
- **Retry UI**: Wifi icon + localized failure message + Retry button
- **Page reload**: Retry button triggers full page reload to clear browser cache

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `fa04fff` | lazyWithRetry utility with retry and preload |
| 2 | `175d77d` | Critical i18n strings for loading states |
| 3 | `60200bf` | ChunkErrorBoundary component |

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies for Next Plans

Plan 02 will use these utilities to:

1. Replace all `lazy()` calls in App.tsx with `lazyWithRetry()`
2. Wrap route Suspense boundaries with `ChunkErrorBoundary`
3. Add hover prefetch to Sidebar and BottomNav using `.preload()` API

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| 1s initial delay | Balance between fast retry and avoiding server overload |
| Clear promise cache on retry | Browser caches failed imports; must reset to allow fresh attempt |
| French translations included | Project supports DE/EN/FR per i18n foundation |
| No Sentry in ChunkErrorBoundary | Network failures are expected; avoid noise in error tracking |
| Page reload on retry | Most reliable way to clear browser's module cache |

## Self-Check: PASSED

- [x] src/utils/lazyWithRetry.ts exists
- [x] src/i18n/criticalStrings.ts exists
- [x] src/components/ChunkErrorBoundary.tsx exists
- [x] Commit fa04fff found in git log
- [x] Commit 175d77d found in git log
- [x] Commit 60200bf found in git log
- [x] TypeScript compiles without errors
- [x] 1206 tests pass (no regressions)
