---
phase: 35-infrastructure-foundation
plan: 04
subsystem: developer-portal
tags: [scalar, api-keys, developer-experience, openapi, self-service]
dependency_graph:
  requires:
    - 35-01 (monorepo workspace setup)
    - 35-02 (API key generation service)
    - 35-03 (public API endpoints with OpenAPI)
  provides:
    - Developer portal UI at /developers
    - Self-service API key management endpoints
    - Interactive Scalar API documentation
  affects:
    - server/index.ts (apiKeyRoutes mount)
    - src/App.tsx (DevelopersPage route)
    - src/routes.ts (lazy-loaded export)
tech_stack:
  added:
    - "@scalar/api-reference-react": "^0.9.27"
  patterns:
    - Self-service API key management (create, list, revoke)
    - Interactive OpenAPI documentation via Scalar
    - Plaintext key shown once pattern (T-35-14)
key_files:
  created:
    - apps/web/server/routes/apiKeys.ts
    - apps/web/src/pages/DevelopersPage.tsx
  modified:
    - apps/web/server/index.ts (mount /api/keys routes)
    - apps/web/src/App.tsx (add /developers route)
    - apps/web/src/routes.ts (add DevelopersPage export)
    - apps/web/package.json (@scalar/api-reference-react)
decisions:
  - "API key routes at /api/keys (separate from /api/v1/public/*)"
  - "DevelopersPage uses existing toast pattern from Profile.tsx"
  - "Scalar 0.9.27 used (plan specified unavailable 1.52.6)"
  - "Max 3 keys enforced in both UI and backend"
metrics:
  duration: "11 minutes"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 4
  completed: "2026-04-26T09:29:00Z"
---

# Phase 35 Plan 04: Developer Portal UI Summary

Developer portal with interactive Scalar API documentation and self-service API key management at /developers.

## What Was Built

### API Key Management Routes

Created CRUD endpoints for self-service API key management:

**apps/web/server/routes/apiKeys.ts:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/keys` | GET | List user's API keys (metadata only, no hashes) |
| `/api/keys` | POST | Create new API key (max 3 enforced) |
| `/api/keys/:keyId` | DELETE | Revoke API key (owner authorization check) |

All routes protected by `authMiddleware`. POST returns plaintext key once with warning message.

### DevelopersPage Component

Created comprehensive developer portal UI:

**apps/web/src/pages/DevelopersPage.tsx:**

- **API Key Dashboard** (D-11): Lists keys with name, tier, creation date, last used, request count
- **Create Key Form**: Input for key name, enforces 3-key limit in UI
- **Plaintext Key Display** (T-35-14): Shows key once with copy button and warning
- **Revoke Button**: Confirmation dialog before DELETE call
- **Interactive Docs** (D-07): Scalar API reference with try-it-out functionality

### Route Configuration

- Added `DevelopersPage` lazy-loaded export in `src/routes.ts`
- Added `/developers` route in `src/App.tsx`
- Added route preloader for hover prefetching

### Scalar Integration

Installed `@scalar/api-reference-react` with dark theme configuration:

```typescript
<ApiReferenceReact
  configuration={{
    url: '/api/openapi.json',
    theme: 'dark',
    layout: 'modern',
    authentication: {
      preferredSecurityScheme: 'ApiKeyAuth',
      apiKey: { token: plaintextKey || '' },
    },
    customCss: `
      .scalar-app {
        --scalar-color-accent: #00f0ff;
        --scalar-background-1: #0a0e14;
        --scalar-background-2: #131920;
      }
    `,
  }}
/>
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a83b730 | Create API key management routes |
| 2 | 8968149 | Create DevelopersPage with Scalar docs and key management |
| 3 | 17a1add | Add /developers route to React Router |

## Deviations from Plan

### [Rule 3 - Blocking] Scalar version adjustment

- **Found during:** Task 2
- **Issue:** Plan specified `@scalar/api-reference-react@1.52.6` but npm reports latest is `0.9.27`
- **Fix:** Installed latest available version `^0.9.27`
- **Files modified:** apps/web/package.json, pnpm-lock.yaml

## Verification Results

- [x] API key routes created at /api/keys with GET, POST, DELETE
- [x] Routes protected by authMiddleware
- [x] POST returns plaintext key once with warning message
- [x] DevelopersPage component created with Scalar docs
- [x] Key management UI shows create form with 3-key limit
- [x] Plaintext key displayed after creation with copy button
- [x] Keys list shows name, tier, createdAt, lastUsedAt, requestCount
- [x] Revoke button calls DELETE endpoint with confirmation
- [x] /developers route added to App.tsx
- [x] @scalar/api-reference-react installed and configured
- [x] TypeScript type check passes

## Self-Check: PASSED

All files verified to exist:
- apps/web/server/routes/apiKeys.ts: FOUND
- apps/web/src/pages/DevelopersPage.tsx: FOUND
- apps/web/src/App.tsx (with DevelopersPage): FOUND
- apps/web/src/routes.ts (with DevelopersPage export): FOUND

All commits verified:
- a83b730: FOUND
- 8968149: FOUND
- 17a1add: FOUND
