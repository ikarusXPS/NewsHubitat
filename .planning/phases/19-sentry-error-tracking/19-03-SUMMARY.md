---
phase: 19-sentry-error-tracking
plan: 03
subsystem: build-tooling
tags: [sentry, source-maps, vite, ci-cd, release-tracking]
dependency_graph:
  requires:
    - frontend-sentry-integration
    - backend-sentry-integration
  provides:
    - sentry-source-map-upload
    - ci-release-tracking
    - environment-aware-deploys
  affects:
    - vite.config.ts
    - .github/workflows/ci.yml
tech_stack:
  added:
    - "@sentry/vite-plugin@5.2.0"
  patterns:
    - conditional-vite-plugin
    - hidden-source-maps
    - ci-secret-injection
key_files:
  created: []
  modified:
    - package.json
    - vite.config.ts
    - .github/workflows/ci.yml
decisions:
  - "Use @sentry/vite-plugin 5.2.0 for Vite 8 compatibility"
  - "Set sourcemap: 'hidden' to generate maps without bundling to production"
  - "Conditionally enable sentryVitePlugin only when SENTRY_AUTH_TOKEN is set"
  - "Delete source maps after upload via filesToDeleteAfterUpload"
  - "Use release format newshub@{github.sha} for git commit traceability"
  - "Set SENTRY_ENVIRONMENT per deploy job (staging, production)"
metrics:
  duration: 5m 16s
  completed: "2026-04-23T10:37:47Z"
  tasks: 3
  files: 3
---

# Phase 19 Plan 03: CI Source Map Upload Summary

Sentry Vite plugin configured to upload source maps during CI builds for readable production stack traces.

## One-liner

Vite generates hidden source maps, uploads them to Sentry via @sentry/vite-plugin in CI, then deletes them before deployment.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Sentry Vite Plugin | 6030c6b | package.json, package-lock.json |
| 2 | Configure Vite for Source Map Upload | 6d75b3b | vite.config.ts |
| 3 | Add Sentry Environment Variables to CI Build | 05971a0 | .github/workflows/ci.yml |

## Key Artifacts

### vite.config.ts (modified)

Source map generation and Sentry upload configuration:
- Import `sentryVitePlugin` from `@sentry/vite-plugin`
- `sourcemap: 'hidden'` generates maps without exposing in bundle
- Conditional plugin: only active when `SENTRY_AUTH_TOKEN` env var exists
- `filesToDeleteAfterUpload: ['./dist/**/*.map']` removes maps post-upload

```typescript
build: {
  sourcemap: 'hidden', // Generate but don't expose in production
  // ...
}

plugins: [
  // ... existing plugins
  ...(process.env.SENTRY_AUTH_TOKEN
    ? [
        sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: { name: process.env.SENTRY_RELEASE },
          sourcemaps: {
            filesToDeleteAfterUpload: ['./dist/**/*.map'],
          },
        }),
      ]
    : []),
]
```

### .github/workflows/ci.yml (modified)

CI pipeline now uploads source maps during build:
- Added Node.js setup and npm install steps to build job
- "Build with source map upload" step runs `npm run build` with Sentry env vars
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` from GitHub Secrets
- `SENTRY_RELEASE: newshub@${{ github.sha }}` for git traceability
- `VITE_SENTRY_RELEASE` for frontend SDK release matching

Deploy jobs now set environment:
- `deploy-staging`: `SENTRY_ENVIRONMENT: staging`
- `deploy-production`: `SENTRY_ENVIRONMENT: production`

## Environment Variables

### GitHub Secrets (required for source map upload)

| Secret | Purpose |
|--------|---------|
| `SENTRY_AUTH_TOKEN` | API token with `project:releases` scope |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |

### CI Build Environment

| Variable | Value |
|----------|-------|
| `SENTRY_RELEASE` | `newshub@${{ github.sha }}` |
| `VITE_SENTRY_RELEASE` | `newshub@${{ github.sha }}` |

### Deploy Environments

| Environment | SENTRY_ENVIRONMENT |
|-------------|-------------------|
| staging | `staging` |
| production | `production` |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
npm ls @sentry/vite-plugin
└── @sentry/vite-plugin@5.2.0

grep "sentryVitePlugin" vite.config.ts
import { sentryVitePlugin } from '@sentry/vite-plugin'
          sentryVitePlugin({

grep "sourcemap: 'hidden'" vite.config.ts
    sourcemap: 'hidden', // Generate but don't expose in production (per D-06)

grep "SENTRY_AUTH_TOKEN" .github/workflows/ci.yml
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

grep "SENTRY_ENVIRONMENT" .github/workflows/ci.yml
          SENTRY_ENVIRONMENT: staging
          SENTRY_ENVIRONMENT: production

YAML Lint: successful
```

## User Setup Required

Before source maps will upload to Sentry:

1. **Create Sentry Auth Token**
   - Go to Sentry Dashboard -> Settings -> Auth Tokens
   - Create new token with `project:releases` scope
   - Add to GitHub Secrets as `SENTRY_AUTH_TOKEN`

2. **Configure GitHub Secrets**
   ```
   SENTRY_AUTH_TOKEN=sntrys_xxx...
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=newshub
   ```

3. **Verify Upload**
   - Push to master to trigger CI build
   - Check Sentry Dashboard -> Releases for `newshub@{commit-sha}`
   - Verify source maps are attached to release

## Self-Check: PASSED

- [x] package.json contains @sentry/vite-plugin ^5.2.0
- [x] vite.config.ts contains sentryVitePlugin import
- [x] vite.config.ts contains sourcemap: 'hidden'
- [x] vite.config.ts contains filesToDeleteAfterUpload
- [x] ci.yml contains SENTRY_AUTH_TOKEN in build job
- [x] ci.yml contains SENTRY_RELEASE: newshub@ format
- [x] ci.yml contains SENTRY_ENVIRONMENT: staging
- [x] ci.yml contains SENTRY_ENVIRONMENT: production
- [x] All 3 commits exist in git history
