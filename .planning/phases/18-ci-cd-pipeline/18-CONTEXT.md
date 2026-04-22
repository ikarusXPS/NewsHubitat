# Phase 18: CI/CD Pipeline - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated build, test, and deployment pipeline using GitHub Actions. This phase creates the CI/CD infrastructure that:
1. Runs quality gates (lint, typecheck, tests) on pull requests
2. Builds and pushes Docker images to container registry
3. Auto-deploys to staging on merge to main
4. Deploys to production with manual approval gate

</domain>

<decisions>
## Implementation Decisions

### Workflow Architecture
- **D-01:** Single workflow file (`.github/workflows/ci.yml`) — one file with multiple jobs, simpler to maintain, clear dependency chain
- **D-02:** Triggers: `pull_request` and `push` to main — full pipeline on PRs, same pipeline triggers deployment on merge
- **D-03:** Linear job chain: lint → typecheck → unit tests → build → e2e → push → deploy — fail fast, clear flow
- **D-04:** GitHub hosted runner `ubuntu-latest` — standard 2-core, 7GB RAM, included minutes
- **D-05:** Cache node_modules + npm — use `actions/cache` for `~/.npm` and `node_modules`, significantly speeds subsequent runs
- **D-06:** PostgreSQL + Redis services in CI — full integration test environment matching production

### Container Registry
- **D-07:** GitHub Container Registry (ghcr.io) — native to GitHub, seamless Actions auth via GITHUB_TOKEN, free storage
- **D-08:** Image tags: commit SHA + `:latest` + branch name — e.g., `ghcr.io/owner/newshub:abc1234`, `:latest`, `:main`

### Deployment Strategy
- **D-09:** SSH + docker compose — SSH into server, `docker compose pull && docker compose up -d`, works with existing compose setup
- **D-10:** Separate servers for staging and production — different SSH hosts, each with own .env and database, clean isolation
- **D-11:** GitHub Environments with protection rules for production approval — native UI, audit trail, required reviewers

### Test & Quality Gates
- **D-12:** Full suite required for PR merge: lint + typecheck + unit tests + E2E tests + build
- **D-13:** Coverage threshold enforced at 80% — fail CI if coverage drops below, matches vitest.config.ts
- **D-14:** E2E tests with Playwright in CI — run full 62-test suite on GitHub hosted runner

### Claude's Discretion
- Exact GitHub Actions syntax and job naming conventions
- Cache key patterns and invalidation strategy
- SSH deployment script structure
- Playwright browser installation approach in CI
- Environment variable naming in GitHub Secrets

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Infrastructure (from Phase 17)
- `Dockerfile` — Multi-stage build with node:22-alpine3.19, Chromium, non-root user
- `docker-compose.yml` — App, PostgreSQL, Redis services with health checks

### Build Configuration
- `package.json` — Scripts: `npm run build`, `npm run test:run`, `npm run test:coverage`, `npm run typecheck`, `npm run lint`
- `vite.config.ts` — Frontend build with PWA, compression, chunk splitting
- `vitest.config.ts` — Test configuration with 80% coverage thresholds

### Health Endpoints
- `server/index.ts` lines 131-179 — `/api/health/db` and `/api/health/redis` for health checks

### Test Setup
- `playwright.config.ts` — E2E configuration for Chromium
- `src/test/setup.ts` — Unit test setup with Vitest

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Dockerfile` — Production-ready multi-stage build, no changes needed for CI
- `docker-compose.yml` — Full stack orchestration ready
- Health endpoints — `/api/health/db` for deployment verification

### Established Patterns
- Vitest with `npm run test:coverage` produces coverage report
- Playwright with `npm run test:e2e` runs headless browser tests
- TypeScript checking via `npm run typecheck`
- ESLint via `npm run lint`

### Integration Points
- `.github/workflows/ci.yml` — New file, GitHub Actions workflow
- GitHub Secrets — SSH keys, registry credentials, environment variables
- GitHub Environments — `staging` and `production` with protection rules

</code_context>

<specifics>
## Specific Ideas

- Use `docker/login-action` for GHCR authentication with GITHUB_TOKEN
- Use `docker/build-push-action` for building and pushing images
- PostgreSQL service in CI: `postgres:17` with health check
- Redis service in CI: `redis:7.4-alpine`
- SSH deployment: use `appleboy/ssh-action` or custom deploy script
- Playwright needs `npx playwright install --with-deps chromium` in CI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-ci-cd-pipeline*
*Context gathered: 2026-04-23*
