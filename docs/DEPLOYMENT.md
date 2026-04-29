<!-- generated-by: gsd-doc-writer -->
# DEPLOYMENT.md

This document covers the production deployment story for NewsHub: the local Docker stack, the GitHub Actions CI/CD pipeline, the staging→production flow, required secrets and branch protection, and rollback / monitoring procedures.

NewsHub is a pnpm monorepo (`apps/web` + `packages/types`). All commands below use **pnpm**, not npm or yarn.

## Deployment Targets

NewsHub ships as a containerized application with Docker as the primary target. CI/CD pushes images to GitHub Container Registry; staging and production hosts pull and run them via Docker Compose over SSH.

| Target | Config File | Description |
|--------|-------------|-------------|
| Docker Compose (full stack) | `docker-compose.yml` | App + PostgreSQL 17 + Redis 7.4 + Prometheus + Grafana + Alertmanager. Used locally and on staging/production hosts. |
| Docker image (build) | `Dockerfile` | Multi-stage build, Alpine base, non-root user. Built in CI on every push. |
| GitHub Container Registry | `.github/workflows/ci.yml` (`build` job) | Image published to `ghcr.io/{owner}/{repo}` on master only. Tagged with commit SHA + `latest`. |
| Staging (SSH deploy) | `.github/workflows/ci.yml` (`deploy-staging`) | `appleboy/ssh-action` runs `docker compose pull && docker compose up -d --wait` on `STAGING_HOST`. |
| Production (SSH deploy) | `.github/workflows/ci.yml` (`deploy-production`) | Same flow on `PRODUCTION_HOST`, gated by GitHub `production` environment. |
| k6 Load Test (manual) | `.github/workflows/load-test.yml` | `workflow_dispatch` against `STAGING_URL` only — never targets production. |

## Build Pipeline

The CI/CD pipeline is defined in `.github/workflows/ci.yml`. It triggers on every pull request and on every push to `master`.

Job graph (executed on Ubuntu runners with pnpm 10 + Node 22):

```
                ┌──── lint ────┐
push / PR ──────┼─ typecheck ──┼──┬── bundle-analysis  (PR comparison; continue-on-error)
                └──── test ────┘  └── build ──── e2e
                                                  │
                                          (master only)
                                                  ▼
                                          deploy-staging
                                          ┌───────┴───────┐
                                          ▼               ▼
                                      lighthouse    deploy-production
                                      (master only)  (production env / approval)
```

### Job-by-job

1. **`lint`** — `pnpm install --frozen-lockfile && pnpm lint`. ESLint across all workspace packages.
2. **`typecheck`** — `pnpm typecheck`. TypeScript compile check across all packages.
3. **`test`** — Unit tests with PostgreSQL 17 and Redis 7.4 service containers. Steps:
   - `pnpm --filter @newshub/web exec prisma generate`
   - `pnpm --filter @newshub/web exec prisma db push`
   - `pnpm test:coverage` — Vitest with coverage gate. Per `CLAUDE.md`, the project enforces an **80% coverage threshold**; branch coverage is currently sitting at ~75%, so expect this to be the gate that loosens last as branch tests are added.
   - Env: `DATABASE_URL=postgresql://newshub:test@localhost:5432/newshub`, `REDIS_URL=redis://localhost:6379`, `JWT_SECRET=test-jwt-secret-for-ci`.
4. **`bundle-analysis`** — Runs after `lint`/`typecheck`/`test`. Builds with the Vite visualizer, reports the main chunk size to `$GITHUB_STEP_SUMMARY`, and emits a `::warning::` if it exceeds the **250 KB** target. Uses `preactjs/compressed-size-action@v2` for the PR-vs-base comparison. The whole comparison step is `continue-on-error: true` because base-branch builds can fail when the lockfile is stale, and the bundle budget is a warning, not a gate.
   - Uses a placeholder `DATABASE_URL` (`postgresql://placeholder:placeholder@localhost:5432/placeholder`) purely to satisfy the fail-fast guard in `prisma.config.ts` during `prisma generate`. No real DB is reached.
5. **`build`** — Runs after `lint`/`typecheck`/`test`. Builds the app with Sentry source-map upload (`@sentry/vite-plugin`, release tag `newshub@${{ github.sha }}`), then builds and pushes the Docker image:
   - `docker/setup-buildx-action@v3` + `docker/build-push-action@v6`
   - Login to `ghcr.io` with `GITHUB_TOKEN`
   - Tags: commit SHA prefix, branch ref, and `latest` (only on `refs/heads/master`)
   - Push happens **only** on master pushes; PR builds verify the image builds but don't publish.
   - GHA cache (`type=gha`) for Docker layers.
6. **`e2e`** — Depends on `build`. Spins up Postgres + Redis services again, runs `pnpm seed`, installs Playwright Chromium, runs `pnpm --filter @newshub/web exec playwright test --reporter=html` (30-minute timeout). HTML report uploaded as the `playwright-report` artifact (7-day retention).
7. **`deploy-staging`** — Master only. Depends on `build` and `e2e`. Uses `appleboy/ssh-action@v1`:
   ```bash
   cd /app/newshub
   export SENTRY_RELEASE=newshub@${{ github.sha }}
   export SENTRY_ENVIRONMENT=staging
   docker compose pull
   docker compose up -d --wait
   docker compose ps
   curl -f http://localhost:3001/api/health/db || exit 1
   ```
   GitHub environment: `staging`, URL `https://staging.newshub.example.com` <!-- VERIFY: actual staging URL configured in the GitHub `staging` environment -->.
8. **`lighthouse`** — Master only. Depends on `deploy-staging`. Polls `${STAGING_URL}/api/health` (30 attempts, 10 s apart) until 200, then runs `treosh/lighthouse-ci-action@v12` 3× against staging using `lighthouserc.js`. Gating thresholds (per `CLAUDE.md` and the workflow): **90+ required for performance, accessibility, best-practices, SEO**; Core Web Vitals (LCP / CLS / INP / FCP) are tracked **warn-only**. Reports uploaded as `lighthouse-reports` (30-day retention).
9. **`deploy-production`** — Depends on `deploy-staging`. Same SSH flow against `PRODUCTION_HOST` with `SENTRY_ENVIRONMENT=production`. The GitHub environment is named `production`, which is where you wire **manual approval reviewers** in the repo's *Settings → Environments → production* — this is the human gate between staging health and production rollout.

### Manual Workflows

- **Load test** (`.github/workflows/load-test.yml`) — `workflow_dispatch` only, takes a `scenario` input (`smoke` or `load`). Uses `grafana/setup-k6-action@v1` (k6 v0.53.0) and runs `k6 run k6/load-test.js --out json=summary.json` against `${{ secrets.STAGING_URL }}`. **Never** targets production. Posts a Markdown summary with p95 / p99 / error rate / checks to `$GITHUB_STEP_SUMMARY`. Threshold breaches fail the workflow (final step). Locally: `pnpm load:smoke` or `pnpm load:full`.

### Validating Workflow Changes Locally

```bash
pnpm validate:ci   # action-validator on .github/workflows/ci.yml
```

## Environment Setup

Required environment variables for production deployment are documented in full in `CONFIGURATION.md` (or `.env.example`). Critical production-specific variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | Yes | Set to `production`. Gates dev-only diagnostics like the slow-query / N+1 warner. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. In Docker Compose this is overridden to `postgresql://newshub:newshub_dev@postgres:5432/newshub`. |
| `REDIS_URL` | Yes | Redis connection string. In Docker Compose: `redis://redis:6379`. |
| `JWT_SECRET` | Yes | Minimum 32 characters. Generate with `openssl rand -base64 32`. |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS allow-list. <!-- VERIFY: production domain --> |
| `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Yes (≥ 1) | AI provider for analysis. Fallback chain: OpenRouter → Gemini → Anthropic → keyword. |
| `DEEPL_API_KEY` / `GOOGLE_TRANSLATE_API_KEY` | Recommended | Translation provider chain. |
| `SENTRY_DSN` | Recommended | Error / performance tracking. |
| `SENTRY_RELEASE` | Recommended | Set to `newshub@${{ github.sha }}` per deploy. |
| `SENTRY_ENVIRONMENT` | Recommended | `staging` or `production`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Optional | Email verification, digests, Alertmanager notifications. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Optional | Subscription tier enforcement. Service degrades gracefully if unset. |
| `ALERT_EMAIL` | Optional | Recipient for Prometheus / Alertmanager alerts. |

Production secrets must be injected via the deployment platform's secret store (or `.env` on the deployment host, mode `0600`). Never commit secrets to the repo.

### Required GitHub Secrets

Configure these under *Settings → Secrets and variables → Actions* (and per-environment for `staging` / `production`):

| Secret | Used By | Purpose |
|--------|---------|---------|
| `STAGING_HOST` | `deploy-staging` | SSH target hostname for staging. |
| `STAGING_USER` | `deploy-staging` | SSH username on staging. |
| `STAGING_SSH_KEY` | `deploy-staging` | Private key for SSH auth (no passphrase, restricted to the deploy user). |
| `STAGING_URL` | `lighthouse`, `load-test` | Public URL polled by Lighthouse and targeted by k6. |
| `PRODUCTION_HOST` | `deploy-production` | SSH target hostname for production. |
| `PRODUCTION_USER` | `deploy-production` | SSH username on production. |
| `PRODUCTION_SSH_KEY` | `deploy-production` | SSH key for production deploy user. |
| `LHCI_GITHUB_APP_TOKEN` | `lighthouse` | Lighthouse CI GitHub App token (PR status checks). |
| `SENTRY_AUTH_TOKEN` | `build` | Required by `@sentry/vite-plugin` to upload source maps. |
| `SENTRY_ORG` | `build` | Sentry organization slug. <!-- VERIFY: actual org slug --> |
| `SENTRY_PROJECT` | `build` | Sentry project slug. <!-- VERIFY: actual project slug --> |
| `GITHUB_TOKEN` | `build` (GHCR push) | Auto-provided. Make sure repo settings grant **packages: write** to the workflow (already declared at the top of `ci.yml`). |

### Branch Protection

`master` should require the following status checks before merge (configured under *Settings → Branches → Branch protection rules*):

- `Lint`
- `Type Check`
- `Unit Tests`
- `Build Docker Image`
- `E2E Tests`

Recommended rules:

- Require pull request reviews before merging
- Require branches to be up to date before merging
- Require status checks listed above
- **Include administrators** (admin-enforced) — production deploys flow off `master`, so no one should bypass the gate
- Restrict who can push to matching branches
- The `production` environment should additionally require **manual reviewer approval** so the staging → production hop has a human gate

## Local & Self-Hosted Docker Deployment

### Full Stack (Local Production-Like Run)

```bash
# Build the app image
docker compose build app

# Start everything (app, postgres, redis, prometheus, grafana, alertmanager)
docker compose up -d

# Verify
docker compose ps
docker compose logs -f app

# App health check
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/db
```

Service ports defined in `docker-compose.yml`:

| Service | Image | Host Port |
|---------|-------|-----------|
| `app` | local build (`Dockerfile`) | 3001 |
| `postgres` | `postgres:17` | 5433 → 5432 |
| `redis` | `redis:7.4-alpine` | 6379 |
| `prometheus` | `prom/prometheus:v3.4.0` | 9090 |
| `alertmanager` | `prom/alertmanager:v0.28.1` | 9093 |
| `grafana` | `grafana/grafana-oss:13.0.1` | 3000 |

The `app` service overrides `DATABASE_URL` and `REDIS_URL` to `postgres:5432` / `redis:6379` (container DNS), so any host-based values in `.env` are ignored at runtime inside the container. Compose loads the rest of `.env` via `env_file:`.

### Database Migrations

NewsHub uses Prisma `db push` (not full migrations) for schema sync. Run from inside `apps/web`:

```bash
cd apps/web
npx prisma generate    # Regenerate the client into src/generated/prisma/
npx prisma db push     # Apply schema.prisma to the connected DATABASE_URL
```

On a deploy host, the `app` container runs `prisma generate` during the Docker build. To apply a schema change in production:

```bash
# On the deploy host, from /app/newshub
docker compose exec app sh -c "cd apps/web && npx prisma db push"
```

After first deploy (or when introducing new fixtures):

```bash
docker compose exec app pnpm seed             # Badges + AI personas
docker compose exec app pnpm seed:badges      # Badges only
docker compose exec app pnpm seed:personas    # Personas only
```

### Dockerfile Highlights

- Multi-stage build (deps → build → runtime) keeps the final image lean
- Alpine base for minimal footprint
- Non-root `nodejs` user
- Healthcheck calls the app's HTTP health endpoint (30 s interval, 60 s start period, 3 retries)
- Prisma client generation happens during the build for `linux-musl`

## Staging → Production Flow

The happy path on every push to `master`:

1. PR opened → all jobs run except `deploy-*` and `lighthouse` (those are master-only).
2. PR merged to `master` → CI re-runs.
3. `lint` + `typecheck` + `test` pass.
4. `bundle-analysis` runs in parallel (warn-only, never blocks).
5. `build` publishes `ghcr.io/{owner}/{repo}:{sha}` and `:latest`.
6. `e2e` runs Playwright against an ephemeral Postgres + Redis.
7. `deploy-staging` SSHes in, runs `docker compose pull && docker compose up -d --wait`, and verifies `/api/health/db`.
8. `lighthouse` polls staging until ready, then asserts the 90+ thresholds.
9. `deploy-production` waits for the GitHub `production` environment approval (if reviewers are configured), then performs the same SSH flow against `PRODUCTION_HOST` with `SENTRY_ENVIRONMENT=production`.

Sentry release correlation: every build tags the release `newshub@${{ github.sha }}`, and each deploy job exports `SENTRY_RELEASE` + `SENTRY_ENVIRONMENT` so error events on staging vs production are clearly separated in the Sentry UI.

## Rollback Procedure

CI does not include automated rollback. Two approved approaches:

### A. Re-run a previous successful master CI run (preferred when the bad commit is already on master)

1. *Actions → CI/CD Pipeline*, find the last green run on `master` from before the regression.
2. Click **Re-run all jobs**.
3. The `build` job will rebuild and re-tag the older SHA's image as `:latest`; `deploy-staging` and `deploy-production` will pull and bring it up on each host.
4. Confirm health: `curl https://staging.newshub.example.com/api/health/db` <!-- VERIFY: actual staging health URL --> and the production equivalent.

### B. Revert + push (preferred when you want a clean audit trail on master)

```bash
git revert <bad-commit-sha>
git push origin master
```

CI runs end-to-end on the revert commit, deploys it to staging, and (after approval) to production.

### C. Manual SSH rollback (emergency only)

```bash
# On the deploy host
cd /app/newshub
docker pull ghcr.io/<owner>/<repo>:<previous-sha>
# Edit docker-compose.yml or use an override file to pin the image to that SHA
docker compose down
docker compose up -d --wait
docker compose ps
curl -f http://localhost:3001/api/health/db
```

### Database Rollback

Prisma `db push` is **not reversible**. If a schema change must be undone:

1. Restore `apps/web/prisma/schema.prisma` from git (`git checkout <good-sha> -- apps/web/prisma/schema.prisma`).
2. **Do not** use `npx prisma db push --force-reset` against production — it drops every table.
3. Restore from a database backup. <!-- VERIFY: actual PostgreSQL backup strategy and restore procedure -->

Best practice: drop new schema fields in a follow-up release rather than reverting a column drop, and always rehearse risky migrations on staging first.

## Monitoring

NewsHub ships its monitoring stack in the same `docker-compose.yml`, so staging and production hosts get Prometheus + Grafana + Alertmanager out of the box.

### Error Tracking (Sentry)

- **Frontend**: `@sentry/react`
- **Backend**: `@sentry/node` (with performance tracing)
- **Source maps**: uploaded by `@sentry/vite-plugin` during the CI `build` job
- **Release tag**: `newshub@${{ github.sha }}` (set in `build`, `deploy-staging`, `deploy-production`)
- **Environment**: `staging` or `production` per deploy job
- **Required secrets**: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, plus runtime `SENTRY_DSN` on the host

<!-- VERIFY: Sentry dashboard URL and project slug -->

### Metrics (Prometheus)

- Endpoint scraped: `/api/metrics` (powered by `prom-client`)
- Image: `prom/prometheus:v3.4.0`
- Retention: 15 days (`--storage.tsdb.retention.time=15d`)
- UI: http://localhost:9090
- Config: mounted from `./prometheus/`

### Alert Rules

Defined in `prometheus/alert.rules.yml`:

| Alert | Condition | Severity | Duration |
|-------|-----------|----------|----------|
| HighErrorRate | 5xx > 1 % of total requests | Critical | 5 min |
| HighLatency | p95 latency > 2 s | Warning | 5 min |
| ServiceDown | Service unreachable | Critical | 1 min |
| HighEmailBounceRate | Email bounces > 5 % of sent | Critical | 5 min |
| LowEmailDeliveryRate | Delivery success < 95 % | Warning | 1 h |

### Alert Routing (Alertmanager)

- Image: `prom/alertmanager:v0.28.1`
- UI: http://localhost:9093
- SMTP credentials read from `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
- Recipient: `ALERT_EMAIL`

### Dashboards (Grafana)

- Image: `grafana/grafana-oss:13.0.1`
- UI: http://localhost:3000 (default `admin` / `admin` — **change immediately on production hosts**)
- Provisioning: `./grafana/provisioning/`
- Datasource: Prometheus, auto-wired

<!-- VERIFY: specific dashboard names / IDs and Grafana production URL -->

## Production Checklist

Before promoting a release to production:

- [ ] `pnpm typecheck && pnpm test:run && pnpm build` clean locally
- [ ] Coverage gate at 80 % (currently 75 % on branches — make sure new code raises, not lowers, the bar)
- [ ] `pnpm validate:ci` passes after any workflow edits
- [ ] All required GitHub Secrets set (see "Required GitHub Secrets" table above)
- [ ] Branch protection on `master` requires `Lint`, `Type Check`, `Unit Tests`, `Build Docker Image`, `E2E Tests`
- [ ] `production` GitHub environment has manual approval reviewers configured
- [ ] `JWT_SECRET` ≥ 32 chars, `ALLOWED_ORIGINS` set to the production domain
- [ ] At least one AI provider key set
- [ ] `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT` set on the host
- [ ] SMTP creds + `ALERT_EMAIL` configured if you want Alertmanager to notify
- [ ] Grafana admin password rotated from `admin` / `admin`
- [ ] Postgres + Redis volumes backed up <!-- VERIFY: backup tooling -->
- [ ] Health endpoints reachable: `/api/health`, `/api/health/db`, `/api/metrics`
- [ ] Prometheus is scraping the app target (Status → Targets in the Prometheus UI)
- [ ] Alertmanager test alert delivered end-to-end
- [ ] Lighthouse run on staging hit 90+ across performance / accessibility / best-practices / SEO
