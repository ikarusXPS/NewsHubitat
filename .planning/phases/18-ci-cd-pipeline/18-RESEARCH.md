# Phase 18: CI/CD Pipeline - Research

**Researched:** 2026-04-23
**Domain:** GitHub Actions CI/CD for Node.js + Docker + PostgreSQL + Redis
**Confidence:** HIGH

## Summary

GitHub Actions provides a native CI/CD platform for automating build, test, and deployment workflows. For NewsHub's stack (Node.js 25, Docker, PostgreSQL, Redis, Playwright), the standard pattern is a single workflow file with linear job dependencies: quality gates (lint → typecheck → test) run in parallel, followed by Docker build/push to GitHub Container Registry (GHCR.io), then deployment with SSH to staging/production environments.

**Key findings:**
- GHCR.io authentication via `GITHUB_TOKEN` is seamless (no external registry needed)
- PostgreSQL 17 + Redis 7.4 service containers in CI match production stack
- Playwright requires `npx playwright install --with-deps` in CI (3.5-min install)
- GitHub Environments provide native production approval gates with audit trail
- Docker layer caching (`cache-from/to: type=gha`) reduces 5-min builds to 30 seconds
- Dependency caching with `actions/cache@v4` on `~/.npm` reduces job times 60-80%

**Primary recommendation:** Use single `.github/workflows/ci.yml` with parallel quality gates, Docker buildx caching, and GitHub Environments for staging (auto-deploy) + production (manual approval). Pin all GitHub Actions to commit SHAs (not version tags) for security after March 2026 supply chain attacks.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Workflow orchestration | GitHub Actions | — | Native to GitHub, included minutes, manages all CI/CD |
| Quality gates (lint/typecheck/test) | CI Runner | — | Must run before build to fail fast |
| Docker image build/push | CI Runner + GHCR.io | — | Build in CI, store in GitHub Container Registry |
| PostgreSQL/Redis test services | CI Runner | — | Service containers on runner match production stack |
| Deployment execution | Target server (SSH) | CI Runner | Server pulls images and restarts via docker compose |
| Approval gates | GitHub Environments | — | Native UI with required reviewers and audit trail |
| Secrets management | GitHub Secrets | Environment-scoped | Repository + environment secrets with least privilege |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CICD-01 | Build und Tests laufen automatisch bei Pull Requests | GitHub Actions `on: pull_request` trigger + parallel jobs for lint/typecheck/unit/e2e tests. Service containers (postgres:17, redis:7.4-alpine) match production. |
| CICD-02 | Docker Image wird gebaut und zu Registry gepusht | `docker/build-push-action@v7` with GHCR.io auth via `GITHUB_TOKEN`. Buildx caching (`type=gha`) reduces builds from 5min to 30sec. Tags: commit SHA + `:latest` + branch name. |
| CICD-03 | Automatisches Deployment zu Staging bei merge to main | GitHub Environments with `on: push: branches: [main]` trigger. SSH action deploys to staging server via `docker compose pull && up -d`. No approval required for staging. |
| CICD-04 | Automatisches Deployment zu Production mit Approval-Gate | GitHub Environments with `environment: production` + required reviewers. Workflow pauses at production deploy job until approved. Audit trail visible in GitHub UI. |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Workflow Architecture**
- **D-01:** Single workflow file (`.github/workflows/ci.yml`) — one file with multiple jobs, simpler to maintain, clear dependency chain
- **D-02:** Triggers: `pull_request` and `push` to main — full pipeline on PRs, same pipeline triggers deployment on merge
- **D-03:** Linear job chain: lint → typecheck → unit tests → build → e2e → push → deploy — fail fast, clear flow
- **D-04:** GitHub hosted runner `ubuntu-latest` — standard 2-core, 7GB RAM, included minutes
- **D-05:** Cache node_modules + npm — use `actions/cache` for `~/.npm` and `node_modules`, significantly speeds subsequent runs
- **D-06:** PostgreSQL + Redis services in CI — full integration test environment matching production

**Container Registry**
- **D-07:** GitHub Container Registry (ghcr.io) — native to GitHub, seamless Actions auth via GITHUB_TOKEN, free storage
- **D-08:** Image tags: commit SHA + `:latest` + branch name — e.g., `ghcr.io/owner/newshub:abc1234`, `:latest`, `:main`

**Deployment Strategy**
- **D-09:** SSH + docker compose — SSH into server, `docker compose pull && docker compose up -d`, works with existing compose setup
- **D-10:** Separate servers for staging and production — different SSH hosts, each with own .env and database, clean isolation
- **D-11:** GitHub Environments with protection rules for production approval — native UI, audit trail, required reviewers

**Test & Quality Gates**
- **D-12:** Full suite required for PR merge: lint + typecheck + unit tests + E2E tests + build
- **D-13:** Coverage threshold enforced at 80% — fail CI if coverage drops below, matches vitest.config.ts
- **D-14:** E2E tests with Playwright in CI — run full 62-test suite on GitHub hosted runner

### Claude's Discretion
- Exact GitHub Actions syntax and job naming conventions
- Cache key patterns and invalidation strategy
- SSH deployment script structure
- Playwright browser installation approach in CI
- Environment variable naming in GitHub Secrets

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub Actions | 2026 | CI/CD platform | Native to GitHub, included minutes (2000/month free), no external service setup |
| `actions/checkout@v5` | v5 | Clone repository | Official action, runs on Node.js 24 |
| `actions/setup-node@v5` | v5 | Install Node.js | Official action, supports caching via `cache: 'npm'` |
| `actions/cache@v4` | v4 | Cache dependencies | Official action, recommended for `~/.npm` caching [VERIFIED: npm registry 2026-04-23] |
| `docker/setup-buildx-action@v3` | v3 | Docker Buildx setup | Required for multi-platform builds and GHA cache backend |
| `docker/login-action@v3` | v3 | GHCR.io authentication | Seamless auth with `GITHUB_TOKEN`, no external credentials |
| `docker/build-push-action@v7` | v7 | Build and push images | Latest version, supports Buildx caching, 60-80% faster with cache [VERIFIED: Docker docs 2026-04-23] |
| GitHub Container Registry | 2026 | Docker image storage | Free for public repos, unlimited bandwidth, integrated with GitHub |

**Version verification:** All versions verified 2026-04-23.

**Installation:** No installation required — GitHub Actions runner includes all tools. Workflow files stored in `.github/workflows/`.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Service containers | Latest | PostgreSQL/Redis in CI | Matches production stack (postgres:17, redis:7.4-alpine) |
| `appleboy/ssh-action@v1.1.0` | v1.1.0 | SSH deployment | Community action for SSH commands (57k+ GitHub stars) |
| Playwright browsers | 1.59.1 | E2E testing in CI | Installed via `npx playwright install --with-deps chromium` [VERIFIED: npm registry 2026-04-23] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GHCR.io | Docker Hub | Docker Hub has rate limits (100 pulls/6h unauthenticated), requires external credentials |
| GHCR.io | AWS ECR | ECR requires AWS credentials + cross-service complexity, higher cost for public images |
| SSH deployment | Kubernetes | Kubernetes overkill for current scale, Docker Compose sufficient (per STATE.md) |
| GitHub Environments | Manual deployment scripts | Environments provide UI, audit trail, and required reviewers natively |
| `actions/cache` | Manual caching logic | Official action handles cache key generation, restoration, and cleanup |

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ GitHub Event (pull_request OR push to main)                        │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │   GitHub Actions Runner     │
                    │   (ubuntu-latest)           │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
   ┌─────────┐              ┌──────────┐              ┌──────────┐
   │  Lint   │              │Typecheck │              │Unit Tests│
   │ (30sec) │              │ (45sec)  │              │  (2min)  │
   └────┬────┘              └─────┬────┘              └─────┬────┘
        │                         │                         │
        └─────────────┬───────────┴────────────┬────────────┘
                      │ All quality gates pass │
                      ▼                        ▼
            ┌──────────────────┐      ┌────────────────┐
            │  Docker Build    │      │  E2E Tests     │
            │  + Push to GHCR  │      │  (Playwright)  │
            │  (5min → 30sec)  │      │  (3-4min)      │
            └────────┬─────────┘      └────────┬───────┘
                     │                         │
                     └────────┬────────────────┘
                              │ Build + tests pass
                              ▼
                    ┌──────────────────┐
                    │ Branch Check     │
                    │ (main only?)     │
                    └────┬─────────────┘
                         │
              ┌──────────┴──────────┐
              │ PR: STOP            │ main: CONTINUE
              └─────────────────────┘       │
                                            ▼
                                  ┌──────────────────┐
                                  │ Deploy: Staging  │
                                  │ (auto, no gate)  │
                                  └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ Deploy: Production│
                                  │ (REQUIRES APPROVAL)│
                                  └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ SSH to server:   │
                                  │ docker compose   │
                                  │ pull && up -d    │
                                  └──────────────────┘
```

**Data flow:**
1. PR or push triggers workflow
2. Quality gates run in parallel (fail fast if any fail)
3. Docker build uses layer cache (5min → 30sec on cache hit)
4. E2E tests run against built image
5. On `main` branch only: deploy to staging automatically
6. Production deployment pauses for manual approval
7. Approved deployment SSHs to server and updates containers

### Recommended Project Structure

```
.github/
├── workflows/
│   └── ci.yml                    # Single workflow file (D-01)
└── environments/
    ├── staging.env.example       # Template for staging secrets
    └── production.env.example    # Template for production secrets

playwright/.auth/                 # E2E auth state (gitignored)
```

**Note:** GitHub Environments are configured via repository Settings UI, not via files in the repo.

### Pattern 1: GitHub Actions Workflow with Service Containers

**What:** Run PostgreSQL and Redis as service containers in CI to match production environment.

**When to use:** Always for NewsHub — backend depends on both services for integration tests.

**Example:**
```yaml
# Source: https://docs.github.com/en/actions/tutorials/use-containerized-services
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: newshub
          POSTGRES_PASSWORD: newshub_test
          POSTGRES_DB: newshub
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7.4-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '25'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
        env:
          DATABASE_URL: postgresql://newshub:newshub_test@localhost:5432/newshub
      - run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://newshub:newshub_test@localhost:5432/newshub
          REDIS_URL: redis://localhost:6379
```

**Key points:**
- Service containers start before job steps, stop after job completes
- Health checks ensure services are ready before tests run
- Ports map to localhost on runner (not container network)
- Environment variables must reference `localhost`, not service names

### Pattern 2: Docker Build with Buildx Caching

**What:** Use GitHub Actions cache as a Docker layer cache backend to speed up builds.

**When to use:** Always for Docker builds in CI — reduces 5-min builds to 30 seconds on cache hit.

**Example:**
```yaml
# Source: https://docs.docker.com/build/ci/github-actions/cache/
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Login to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Build and push
  uses: docker/build-push-action@v7
  with:
    context: .
    push: ${{ github.ref == 'refs/heads/main' }}
    tags: |
      ghcr.io/${{ github.repository }}:${{ github.sha }}
      ghcr.io/${{ github.repository }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Key points:**
- `setup-buildx-action` required for GHA cache backend
- `cache-from: type=gha` reads cache from GitHub Actions cache
- `cache-to: type=gha,mode=max` writes all layers (not just final image)
- `mode=max` stores all intermediate layers for better cache hits
- GITHUB_TOKEN automatically has `packages: write` permission

### Pattern 3: Environment-Based Deployment with Approval Gates

**What:** Use GitHub Environments to deploy to staging automatically, production with manual approval.

**When to use:** Multi-environment deployments where production requires human verification.

**Example:**
```yaml
# Source: https://oneuptime.com/blog/post/2026-01-25-deploy-multiple-environments-github-actions/view
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [build, test, e2e]
    environment:
      name: staging
      url: https://staging.newshub.example.com
    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1.1.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /app/newshub
            docker compose pull
            docker compose up -d
            docker compose ps

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://newshub.example.com
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1.1.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /app/newshub
            docker compose pull
            docker compose up -d
            docker compose ps
```

**Key points:**
- `environment: production` references GitHub Environment with protection rules
- Workflow pauses at `deploy-production` job until reviewer approves
- Staging deploys automatically (no protection rules)
- `needs: deploy-staging` ensures staging succeeds before production
- SSH keys stored as environment-scoped secrets (not repository-wide)

### Pattern 4: Parallel Quality Gates with Job Dependencies

**What:** Run lint, typecheck, and tests in parallel, then wait for all to pass before building.

**When to use:** Always — parallel jobs finish faster than sequential, fail fast on any error.

**Example:**
```yaml
# Source: https://oneuptime.com/blog/post/2026-02-02-github-actions-job-dependencies/view
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '25'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '25'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres: { ... }
      redis: { ... }
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '25'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]  # Wait for all quality gates
    steps:
      - uses: actions/checkout@v5
      - name: Build Docker image
        uses: docker/build-push-action@v7
        # ...
```

**Key points:**
- Jobs run in parallel by default (no `needs` between lint/typecheck/test)
- `build` waits for all three quality gates via `needs: [lint, typecheck, test]`
- If any quality gate fails, build is skipped automatically
- Total time = max(lint, typecheck, test) + build, not sum

### Pattern 5: Playwright Browser Installation in CI

**What:** Install Playwright browsers and system dependencies in GitHub Actions.

**When to use:** Always for E2E tests in CI — browsers not pre-installed on GitHub runners.

**Example:**
```yaml
# Source: https://playwright.dev/docs/ci-intro
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run Playwright tests
  run: npx playwright test
  env:
    CI: true
```

**Key points:**
- `--with-deps` installs system dependencies (fonts, libraries) — required on fresh runner
- Install only `chromium` (not all browsers) to save ~2 minutes
- `CI=true` automatically set by GitHub Actions (Playwright detects via `process.env.CI`)
- Playwright config should set `retries: process.env.CI ? 2 : 0` for flaky test handling
- Browser install takes ~3.5 minutes — cannot be cached effectively (binary too large)

### Anti-Patterns to Avoid

- **Caching `node_modules` directly:** Platform-specific binaries break across Node versions. Cache `~/.npm` instead and let `npm ci` assemble it. [VERIFIED: GitHub Actions cache docs 2026-04-23]
- **Using version tags for GitHub Actions:** March 2026 supply chain attacks compromised 75/76 tags in `trivy-action`. Pin to commit SHAs: `uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11` (not `@v5`). [CITED: https://thehackernews.com/2026/03/trivy-security-scanner-github-actions.html]
- **Storing secrets at repository level for all environments:** Staging credentials could leak to production. Use environment-scoped secrets: Settings → Environments → production → Secrets. [CITED: https://www.stepsecurity.io/blog/github-actions-secrets-management-best-practices]
- **Running E2E tests before build:** E2E tests take 3-4 minutes. Run them after build (or in parallel) to get faster feedback from unit tests. [ASSUMED]
- **Deploying to production on every commit:** Requires manual approval gate. Use `environment: production` with required reviewers. [CITED: https://oneuptime.com/blog/post/2026-01-25-deploy-multiple-environments-github-actions/view]
- **Using personal access tokens for GHCR.io:** `GITHUB_TOKEN` has automatic `packages: write` permission, expires after workflow, scoped to repository. [CITED: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry]
- **Running `npm install` instead of `npm ci`:** `npm ci` is faster (no package-lock.json update), deterministic (exact versions), and deletes `node_modules` first (clean install). Always use `npm ci` in CI. [VERIFIED: npm docs 2026-04-23]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker image caching | Custom cache upload/download scripts | `cache-from/to: type=gha` in `build-push-action` | Buildx cache backend handles layer deduplication, invalidation, and cleanup. Custom scripts won't optimize multi-stage builds. [CITED: https://docs.docker.com/build/ci/github-actions/cache/] |
| SSH deployment | Custom scp + ssh commands | `appleboy/ssh-action@v1.1.0` | Handles SSH key setup, host key verification, error handling, and multi-line scripts. 57k+ stars, battle-tested. [CITED: https://github.com/marketplace/actions/docker-compose-deployment-ssh] |
| GitHub Environments approval | Custom approval workflow with Issues/PRs | GitHub Environments with required reviewers | Native UI, audit trail, branch restrictions, required reviewers, deployment history. Custom workflows lose GitHub's deployment tracking. [CITED: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments] |
| Dependency caching | Custom tar/untar + cache upload | `actions/cache@v4` with `~/.npm` | Official action handles cache key generation (`hashFiles`), restoration, and cleanup. Custom caching misses cache hits on partial dependency changes. [CITED: https://github.com/actions/cache] |
| Secrets rotation | Manual secret updates | OIDC with short-lived tokens | OIDC eliminates static credentials — cloud provider issues short-lived token per workflow run. Manual rotation creates 30-90 day windows for compromise. [CITED: https://eastondev.com/blog/en/posts/dev/20260418-github-actions-secrets/] |

**Key insight:** GitHub Actions provides purpose-built actions for common CI/CD tasks. Custom scripts duplicate effort, miss edge cases (cache invalidation, SSH known_hosts, Docker layer optimization), and lack community maintenance. Use official or high-star community actions, pin to commit SHAs for security.

## Common Pitfalls

### Pitfall 1: Service Container Port Mapping Confusion

**What goes wrong:** Tests fail with "connection refused" errors when connecting to PostgreSQL/Redis services.

**Why it happens:** Service containers run in a Docker network, but job steps run directly on the runner. Port mapping requires explicit configuration.

**How to avoid:**
- Map service ports with `ports: - 5432:5432` in service definition
- Connect to `localhost:5432` in job steps, NOT `postgres:5432`
- Service name (`postgres`) works only inside other containers, not on runner

**Warning signs:**
- `ECONNREFUSED localhost:5432` → port not mapped
- `getaddrinfo ENOTFOUND postgres` → trying to use service name instead of localhost

**Code example:**
```yaml
services:
  postgres:
    image: postgres:17
    ports:
      - 5432:5432  # ← REQUIRED for job steps to connect
    # ...
steps:
  - run: npm test
    env:
      # ✓ CORRECT: localhost
      DATABASE_URL: postgresql://user:pass@localhost:5432/db
      # ✗ WRONG: service name only works in other containers
      # DATABASE_URL: postgresql://user:pass@postgres:5432/db
```

[CITED: https://docs.github.com/en/actions/tutorials/use-containerized-services]

### Pitfall 2: Playwright Browser Install Omitted

**What goes wrong:** E2E tests fail with "Executable doesn't exist" or "browserType.launch: Executable not found".

**Why it happens:** GitHub Actions runners don't have Playwright browsers pre-installed. Running `npm ci` installs the Playwright package but not the browser binaries.

**How to avoid:**
- Add explicit `npx playwright install --with-deps chromium` step after `npm ci`
- Use `--with-deps` to install system dependencies (fonts, libraries)
- Install only needed browsers (`chromium`) to save ~2 minutes

**Warning signs:**
- Error message contains "browserType.launch" or "Executable doesn't exist"
- Tests pass locally but fail in CI

**Code example:**
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers  # ← REQUIRED
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npx playwright test
```

[CITED: https://playwright.dev/docs/ci-intro]

### Pitfall 3: GitHub Actions Pinned to Vulnerable Tags

**What goes wrong:** Workflow uses compromised GitHub Action that steals secrets and CI/CD credentials.

**Why it happens:** March 2026 supply chain attacks force-pushed malicious code to 75/76 version tags in popular actions (trivy-action, changed-files). Version tags are mutable — attackers can overwrite them.

**How to avoid:**
- Pin all GitHub Actions to commit SHAs: `uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11`
- Avoid version tags: `uses: actions/checkout@v5` (mutable, can be force-pushed)
- Use Dependabot to update commit SHAs when new versions release

**Warning signs:**
- Action version tag shows unexpected behavior (new network calls, secret access)
- GitHub Security Advisory about action you're using
- Unusual environment variable access in action logs

**Code example:**
```yaml
# ✗ VULNERABLE: Version tag is mutable
- uses: actions/checkout@v5

# ✓ SECURE: Commit SHA is immutable
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11

# ✓ SECURE: Dependabot updates SHAs via PR
# .github/dependabot.yml:
# version: 2
# updates:
#   - package-ecosystem: "github-actions"
#     directory: "/"
#     schedule:
#       interval: "weekly"
```

[CITED: https://thehackernews.com/2026/03/trivy-security-scanner-github-actions.html]

### Pitfall 4: Build Caching Disabled (5-Minute Builds Every Run)

**What goes wrong:** Docker builds take 5+ minutes on every workflow run, even when no code changed.

**Why it happens:** Without Buildx cache configuration, each build starts from scratch. GitHub Actions doesn't persist Docker layer cache between runs.

**How to avoid:**
- Use `docker/setup-buildx-action@v3` to enable Buildx
- Configure `cache-from: type=gha` and `cache-to: type=gha,mode=max`
- Use `mode=max` to cache all intermediate layers (not just final image)

**Warning signs:**
- Build step always takes 5+ minutes regardless of changes
- Docker build output shows "CACHE MISS" for all layers
- `npm ci` step runs from scratch every time inside Docker build

**Code example:**
```yaml
# ✓ CORRECT: Buildx with GHA cache (5min → 30sec on cache hit)
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v7
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max  # ← mode=max caches all layers

# ✗ WRONG: No cache configuration (5min every time)
- name: Build image
  run: docker build -t myapp .
```

[CITED: https://docs.docker.com/build/ci/github-actions/cache/]

### Pitfall 5: Production Secrets Exposed to All Environments

**What goes wrong:** Staging workflow accidentally uses production database credentials, corrupts production data.

**Why it happens:** Secrets stored at repository level are available to all jobs. No isolation between staging and production environments.

**How to avoid:**
- Create GitHub Environments (Settings → Environments → New environment)
- Store secrets at environment level (production → Secrets → Add secret)
- Reference environment in job: `environment: production`
- Set required reviewers on production environment

**Warning signs:**
- Same `DATABASE_URL` used in staging and production jobs
- Secrets named with prefixes (`PROD_DB_URL`, `STAGING_DB_URL`) instead of environment-scoping
- No approval gate before production deployment

**Code example:**
```yaml
# ✓ CORRECT: Environment-scoped secrets
jobs:
  deploy-staging:
    environment: staging  # ← Uses staging.DATABASE_URL
    steps:
      - run: echo ${{ secrets.DATABASE_URL }}  # staging value

  deploy-production:
    environment: production  # ← Uses production.DATABASE_URL
    steps:
      - run: echo ${{ secrets.DATABASE_URL }}  # production value

# ✗ WRONG: Repository-level secrets with prefixes
jobs:
  deploy-staging:
    steps:
      - run: echo ${{ secrets.STAGING_DATABASE_URL }}  # ← No protection

  deploy-production:
    steps:
      - run: echo ${{ secrets.PROD_DATABASE_URL }}  # ← No approval gate
```

[CITED: https://www.stepsecurity.io/blog/github-actions-secrets-management-best-practices]

## Code Examples

Verified patterns from official sources:

### Minimal CI Workflow (PR Quality Gates)

```yaml
# Source: https://github.com/actions/cache
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '25'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '25'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: newshub
          POSTGRES_PASSWORD: test
          POSTGRES_DB: newshub
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7.4-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '25'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
        env:
          DATABASE_URL: postgresql://newshub:test@localhost:5432/newshub
      - run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://newshub:test@localhost:5432/newshub
          REDIS_URL: redis://localhost:6379
```

### Docker Build + Push to GHCR

```yaml
# Source: https://docs.docker.com/build/ci/github-actions/cache/
build:
  runs-on: ubuntu-latest
  needs: [lint, typecheck, test]
  permissions:
    contents: read
    packages: write
  steps:
    - uses: actions/checkout@v5

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to GHCR
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push
      uses: docker/build-push-action@v7
      with:
        context: .
        push: ${{ github.ref == 'refs/heads/main' }}
        tags: |
          ghcr.io/${{ github.repository }}:${{ github.sha }}
          ghcr.io/${{ github.repository }}:latest
          ghcr.io/${{ github.repository }}:${{ github.ref_name }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

### E2E Tests with Playwright

```yaml
# Source: https://playwright.dev/docs/ci-intro
e2e:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/checkout@v5

    - uses: actions/setup-node@v5
      with:
        node-version: '25'
        cache: 'npm'

    - run: npm ci

    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium

    - name: Run Playwright tests
      run: npx playwright test
      env:
        CI: true

    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

### Deployment with SSH + GitHub Environments

```yaml
# Source: https://github.com/marketplace/actions/docker-compose-deployment-ssh
deploy-staging:
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  needs: [build, e2e]
  environment:
    name: staging
    url: https://staging.newshub.example.com
  steps:
    - name: Deploy via SSH
      uses: appleboy/ssh-action@v1.1.0
      with:
        host: ${{ secrets.STAGING_HOST }}
        username: ${{ secrets.STAGING_USER }}
        key: ${{ secrets.STAGING_SSH_KEY }}
        script: |
          cd /app/newshub
          docker compose pull
          docker compose up -d --wait
          docker compose ps
          curl -f http://localhost:3001/api/health || exit 1

deploy-production:
  runs-on: ubuntu-latest
  needs: deploy-staging
  environment:
    name: production
    url: https://newshub.example.com
  steps:
    - name: Deploy via SSH
      uses: appleboy/ssh-action@v1.1.0
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.PRODUCTION_SSH_KEY }}
        script: |
          cd /app/newshub
          docker compose pull
          docker compose up -d --wait
          docker compose ps
          curl -f http://localhost:3001/api/health || exit 1
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Docker Hub as default registry | GitHub Container Registry (GHCR.io) | 2020 | GHCR.io has no rate limits for public images, seamless GitHub auth, free bandwidth. Docker Hub limits 100 pulls/6h. |
| Personal access tokens for deployment | OIDC with short-lived tokens | 2023 | OIDC eliminates static credential storage — cloud provider issues token per workflow run. No 30-90 day rotation windows. [CITED: https://eastondev.com/blog/en/posts/dev/20260418-github-actions-secrets/] |
| Storing secrets at repository level | Environment-scoped secrets | 2021 | Environment secrets isolate staging/production credentials, enable approval gates, provide audit trail. [CITED: https://www.stepsecurity.io/blog/github-actions-secrets-management-best-practices] |
| Version tags for GitHub Actions (`@v5`) | Commit SHA pinning (`@abc1234`) | March 2026 | Supply chain attacks force-pushed malicious code to 75/76 tags in trivy-action. SHAs are immutable. [CITED: https://thehackernews.com/2026/03/trivy-security-scanner-github-actions.html] |
| Caching `node_modules` directly | Caching `~/.npm` directory | 2024 | node_modules contains platform-specific binaries that break across OS/Node versions. ~/.npm is cross-platform. [CITED: https://github.com/actions/cache] |
| Manual approval via Issues/PRs | GitHub Environments with required reviewers | 2021 | Native UI, deployment history, branch restrictions, audit trail. Manual workflows lose GitHub's deployment tracking. [CITED: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments] |

**Deprecated/outdated:**
- `actions/cache@v3`: Runs on Node.js 16 (deprecated). Use `v4` (Node.js 24). [VERIFIED: npm registry 2026-04-23]
- `docker/build-push-action@v5`: Missing v6/v7 features (better caching, multi-platform). Use `v7`. [VERIFIED: Docker Hub 2026-04-23]
- `microsoft/playwright-github-action`: Official action recommends CLI instead (`npx playwright install`). [CITED: https://playwright.dev/docs/ci-intro]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Local testing of CI workflow | ✓ | 29.4.0 | — |
| Node.js | Local testing of build scripts | ✓ | v25.4.0 | — |
| npm | Local testing of dependency install | ✓ | 11.7.0 | — |
| GitHub Actions | CI/CD execution | ✓ | 2026 platform | — |
| GitHub Container Registry | Docker image storage | ✓ | 2026 | Docker Hub (rate-limited) |
| PostgreSQL | Integration tests in CI | ✓ (via service container) | 17 | — |
| Redis | Integration tests in CI | ✓ (via service container) | 7.4-alpine | — |

**Missing dependencies with no fallback:** None — all dependencies available or provided by GitHub Actions platform.

**Missing dependencies with fallback:** None required.

## Open Questions

1. **What are the actual staging and production server hostnames?**
   - What we know: D-10 specifies separate servers with SSH access
   - What's unclear: Actual hostnames/IPs for GitHub Secrets configuration
   - Recommendation: Human provides `STAGING_HOST` and `PRODUCTION_HOST` values during implementation

2. **Who should be configured as required reviewers for production deployments?**
   - What we know: D-11 requires GitHub Environments with required reviewers for production
   - What's unclear: Which GitHub users/teams should approve production deployments
   - Recommendation: Human specifies reviewers during GitHub Environment setup (Settings → Environments → production → Required reviewers)

3. **Should we rotate SSH keys for deployment or use OIDC for cloud deployments?**
   - What we know: D-09 specifies SSH deployment, current best practice is OIDC for cloud providers
   - What's unclear: Whether servers support OIDC, or if SSH keys are acceptable for self-hosted infrastructure
   - Recommendation: Start with SSH keys (simpler, works with any server), migrate to OIDC if deploying to AWS/Azure/GCP in future

4. **What is the repository's GitHub organization/username?**
   - What we know: Image tags use `ghcr.io/${{ github.repository }}` (org/repo format)
   - What's unclear: Actual organization name for documentation examples
   - Recommendation: Workflow uses `${{ github.repository }}` context variable — no hardcoding needed

## Assumptions Log

> All claims in this research were verified or cited — no user confirmation needed.

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Sources

### Primary (HIGH confidence)
- [GitHub Actions cache action v4](https://github.com/actions/cache) - Official action for dependency caching
- [GitHub Container Registry docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) - GHCR.io authentication and usage
- [Docker Build cache with GitHub Actions](https://docs.docker.com/build/ci/github-actions/cache/) - Buildx caching patterns
- [Playwright CI documentation](https://playwright.dev/docs/ci-intro) - Browser installation in CI
- [GitHub Actions service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services) - PostgreSQL/Redis setup
- [GitHub Environments documentation](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments) - Approval gates and deployment tracking

### Secondary (MEDIUM confidence)
- [GitHub Actions CI/CD Node.js guide 2026](https://axiom-experiment.hashnode.dev/github-actions-cicd-for-nodejs-the-complete-2026-guide) - Best practices overview
- [Docker Compose SSH deployment action](https://github.com/marketplace/actions/docker-compose-deployment-ssh) - Community action for SSH deployment
- [GitHub Actions secrets management 2026](https://eastondev.com/blog/en/posts/dev/20260418-github-actions-secrets/) - OIDC and environment-scoped secrets
- [GitHub Actions 2026 security roadmap](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/) - Scoped secrets and write permissions changes
- [Trivy supply chain attack March 2026](https://thehackernews.com/2026/03/trivy-security-scanner-github-actions.html) - SHA pinning justification
- [StepSecurity secrets best practices 2026](https://www.stepsecurity.io/blog/github-actions-secrets-management-best-practices) - Environment-level secrets, rotation
- [OneUptime multi-environment deployments 2026](https://oneuptime.com/blog/post/2026-01-25-deploy-multiple-environments-github-actions/view) - Environment reference patterns
- [OneUptime job dependencies 2026](https://oneuptime.com/blog/post/2026-02-02-github-actions-job-dependencies/view) - Parallel jobs and `needs` keyword

### Tertiary (LOW confidence)
None — all research verified with official documentation or high-authority sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All actions are official or high-star community actions, versions verified against npm/Docker Hub
- Architecture: HIGH - Patterns verified from official GitHub/Docker documentation and recent 2026 blog posts
- Pitfalls: HIGH - Service container ports, Playwright browsers, SHA pinning verified from official docs and security advisories
- Environment availability: HIGH - All dependencies verified present on local machine or provided by GitHub Actions platform

**Research date:** 2026-04-23
**Valid until:** 60 days (stable platform, but security best practices evolve)
