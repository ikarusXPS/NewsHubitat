---
plan: 17-01
phase: 17-docker-deployment
status: complete
started: 2026-04-23T22:20:00Z
completed: 2026-04-23T22:25:00Z
---

# Summary: Docker Build Infrastructure

## What Was Built

Created Docker build infrastructure for NewsHub containerization with multi-stage builds, system Chromium for Puppeteer, and TypeScript server compilation.

## Key Files

### Created
- `Dockerfile` - Multi-stage build with node:22-alpine3.19, Chromium, non-root user
- `.dockerignore` - Build context exclusions (~200MB savings)
- `tsup.config.ts` - ESM server bundling with external native deps

### Modified
- `package.json` - Added tsup@8.5.1 as devDependency

## Implementation Details

### Dockerfile (3-stage build)
1. **deps** - Install all dependencies with `npm ci --frozen-lockfile`
2. **builder** - Generate Prisma client, build frontend (Vite) and backend (tsup)
3. **runner** - Production runtime with system Chromium, non-root user

### tsup.config.ts
- Entry: `server/index.ts`
- Format: ESM (`format: ['esm']`)
- Target: Node 22 (`target: 'node22'`)
- External packages: puppeteer, @prisma/client, pg, ioredis (native deps)

### .dockerignore
Excludes: node_modules, dist, coverage, playwright-report, test files, .planning, .git, *.md

## Decisions

- D-01: node:22-alpine3.19 (not latest, avoids Chromium timeout issues)
- D-02: 3-stage build for size optimization
- D-03: System Chromium via `apk add` + `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- D-05: Non-root `nodejs` user for security
- D-16: Simple `node dist/server/index.js` execution

## Commits

- `b59b0bd` - feat(17-01): add Docker build infrastructure

## Self-Check

- [x] Dockerfile exists with multi-stage build pattern
- [x] Dockerfile contains `FROM node:22-alpine3.19 AS deps`
- [x] Dockerfile contains Chromium installation
- [x] Dockerfile contains non-root user setup
- [x] Dockerfile contains HEALTHCHECK
- [x] tsup.config.ts exists with ESM server bundling
- [x] tsup.config.ts contains `entry: ['server/index.ts']`
- [x] .dockerignore exists excluding development files
- [x] tsup installed in devDependencies

## Self-Check: PASSED
