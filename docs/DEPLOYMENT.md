<!-- generated-by: gsd-doc-writer -->
# DEPLOYMENT.md

This document covers the production deployment story for NewsHub: the local Docker Compose stack, the Phase 37 production Docker Swarm topology (`stack.yml`), the GitHub Actions CI/CD pipeline, the current single-environment deployment model, required secrets and branch protection, and rollback / monitoring procedures.

NewsHub is a pnpm monorepo (`apps/web` + `apps/mobile` + `packages/types`). All commands below use **pnpm**, not npm or yarn.

## Single-Environment Deployment (Current Status)

> **Decision 2026-05-05:** NewsHub is pre-launch with no paying users. A two-tier staging + production setup adds operational overhead without proportional value at this stage. The active deployment model is **single environment, deployed directly to production**.

### What this means today

The `deploy-staging` job in `.github/workflows/ci.yml` is permanently gated with `if: false` and acts as a scaffold placeholder. As a result:

- `lighthouse` (which `needs: deploy-staging`) cascade-skips on every master push.
- `deploy-production` (which `needs: deploy-staging`) also cascade-skips — **production deployment is not yet wired**.

The CI pipeline currently runs `lint → typecheck → test → build → e2e` and stops there. No deployment happens automatically.

### How to wire production deployment

Provisioning is tracked in `.planning/todos/pending/40-12-production-deploy-setup.md`. Three options are listed:

| Option | Platform | Mechanism |
|--------|----------|-----------|
| **A (recommended)** | Hetzner VPS + Coolify | SSH deploy via `appleboy/ssh-action` (matches existing job scaffold) |
| B | Render or Railway | Platform deploy webhook replaces SSH step |
| C | Fly.io | `flyctl deploy --remote-only` via `FLY_API_TOKEN` |

For **Option A**, the required workflow change is:
1. Populate `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`, `STAGING_URL` (point at prod URL) in GitHub Secrets.
2. Change `deploy-production` from `needs: deploy-staging` to `needs: [build, e2e]` and add `if: github.ref == 'refs/heads/master'`.
3. Change `lighthouse` from `needs: [deploy-staging]` to `needs: [deploy-production]`.
4. Either remove `deploy-staging` or leave it `if: false` as a future staging placeholder.

When to add a real staging tier: when there are 10+ paying Premium users, a backend infra change not reproducible locally, or a compliance audit requirement for separated environments.

## Deployment Targets

NewsHub ships as a containerized application with Docker as the primary target. CI/CD pushes images to GitHub Container Registry; the production host pulls and runs them.

Local development and the SSH-deploy CI flow use single-replica `docker compose`. Phase 37's horizontal-scaling production topology runs the same image under Docker Swarm via a separate `stack.yml` (4 web replicas + 1 worker singleton, fronted by Traefik with sticky sessions, with PgBouncer in front of Postgres).

| Target | Config File | Description |
|--------|-------------|-------------|
| Docker Compose (local / single-host) | `docker-compose.yml` | App + PostgreSQL 17 + Redis 7.4 + Prometheus + Grafana + Alertmanager. Single replica, used locally and on the SSH-deploy host wired into CI. |
| Docker Swarm (production scaling) | `stack.yml` | Phase 37 topology: 4× web replicas + 1× `app-worker` singleton + Traefik (sticky cookie `nh_sticky`) + PgBouncer (transaction pool) + Postgres + Redis + Prometheus + Alertmanager + Grafana + `pgbouncer-exporter`. Deployed via `docker stack deploy -c stack.yml newshub`. |
| Docker image (build) | `Dockerfile` | Multi-stage build (`deps` → `builder` → `runner`) on `node:22-alpine3.19`. Non-root `nodejs` user. Healthcheck on `/api/health/db`. |
| GitHub Container Registry | `.github/workflows/ci.yml` (`build` job) | Image published to `ghcr.io/${{ github.repository }}` on master only. Tagged with commit SHA + `latest` + branch ref. |
| Staging (SSH deploy) | `.github/workflows/ci.yml` (`deploy-staging`) | **Currently disabled (`if: false`).** When enabled: `appleboy/ssh-action@v1` runs `docker compose pull && docker compose up -d --wait` on `STAGING_HOST`. |
| Production (SSH deploy) | `.github/workflows/ci.yml` (`deploy-production`) | **Currently cascade-skipped** (depends on disabled `deploy-staging`). Same SSH flow on `PRODUCTION_HOST`, gated by GitHub `production` environment with reviewer approval. Not yet wired — see todo `40-12-production-deploy-setup.md`. |
| Cross-replica WS verification | `e2e-stack/docker-compose.test.yml` | 2× app behind Traefik + Postgres + Redis. Boots via `pnpm test:fanout` to assert Socket.IO events fan out across replicas (Phase 37 WS-04 gate). NOT a deploy target — verification only. |
| k6 Load Test (manual) | `.github/workflows/load-test.yml` | `workflow_dispatch` against `STAGING_URL` only — never targets production. |

## Build Pipeline

The CI/CD pipeline is defined in `.github/workflows/ci.yml`. It triggers on every pull request and on every push to `master`.

Job graph (executed on Ubuntu runners with pnpm 10 + Node 22):

```
                ┌──── lint ─────────┐
push / PR ──────┼─ typecheck ───────┼──┬── bundle-analysis  (PR comparison; continue-on-error)
                ├─ check-source-bias┤  └── build ──── e2e
                └──── test ─────────┘
                                             (master only, once provisioned)
                                                       ▼
                                               deploy-staging  ← if: false (disabled)
                                               ┌───────┴───────┐
                                               ▼               ▼
                                           lighthouse    deploy-production
                                           (cascade-skip) (cascade-skip / needs approval)
```

> Today (pre-provisioning), the pipeline stops at `e2e` on master pushes. `deploy-staging`, `lighthouse`, and `deploy-production` all skip.

### Job-by-job

1. **`lint`** — `pnpm install --frozen-lockfile && pnpm lint`. ESLint across all workspace packages.
2. **`typecheck`** — `pnpm typecheck`. TypeScript compile check across all packages.
3. **`check-source-bias`** — `pnpm --filter @newshub/web check:source-bias`. Verifies that every news source declared in `apps/web/server/config/sources.ts` carries the bias metadata required by D-A3.
4. **`test`** — Unit tests with PostgreSQL 17 and Redis 7.4 service containers. Steps:
   - `pnpm --filter @newshub/web exec prisma generate`
   - `bash apps/web/scripts/ci-setup-db.sh` — strips `@default(dbgenerated(...))` from tsvector columns before `db push`, then re-adds them via raw FTS migrations as `GENERATED ALWAYS AS ... STORED`
   - `pnpm test:coverage` — Vitest with coverage gate: **80% lines/functions/statements; branches at 71%** per the TODO waiver in `vitest.config.ts`
   - Env: `DATABASE_URL=postgresql://newshub:test@localhost:5432/newshub`, `REDIS_URL=redis://localhost:6379`, `JWT_SECRET=test-jwt-secret-for-ci`
5. **`bundle-analysis`** — Runs after `lint`/`typecheck`/`test`. Builds with the Vite visualizer, reports the main chunk size to `$GITHUB_STEP_SUMMARY`, and emits a `::warning::` if it exceeds the **250 KB** target. Uses `preactjs/compressed-size-action@v2` for the PR-vs-base comparison (`continue-on-error: true` — bundle budget is a warning, not a gate).
   - Uses a placeholder `DATABASE_URL` solely to satisfy the fail-fast guard in `prisma.config.ts` during `prisma generate`. No real DB is reached.
6. **`build`** — Runs after `lint`/`typecheck`/`test`. Builds the app with Sentry source-map upload (`@sentry/vite-plugin`, release tag `newshub@${{ github.sha }}`), then builds and pushes the Docker image:
   - `docker/setup-buildx-action@v3` + `docker/build-push-action@v6`
   - Login to `ghcr.io` with `GITHUB_TOKEN`
   - Tags: commit SHA prefix, branch ref, and `latest` (only on `refs/heads/master`)
   - Push happens **only** on master pushes; PR builds verify the image builds but don't publish.
   - GHA cache (`type=gha`) for Docker layers.
7. **`e2e`** — Depends on `build`. Spins up Postgres + Redis services again, runs `pnpm seed`, installs Playwright Chromium, runs `pnpm --filter @newshub/web exec playwright test --reporter=html` (30-minute timeout). HTML report uploaded as the `playwright-report` artifact (7-day retention).
8. **`deploy-staging`** — **Disabled (`if: false`).** Master-only placeholder. When re-enabled, depends on `build` and `e2e`. Uses `appleboy/ssh-action@v1` to run `docker compose pull && docker compose up -d --wait` on `STAGING_HOST` and verifies `/api/health/db`. GitHub environment: `staging`. <!-- VERIFY: actual staging URL when provisioned -->
9. **`lighthouse`** — Master only. **Currently cascade-skips** (depends on disabled `deploy-staging`). When active: polls `${STAGING_URL}/api/health` (30 attempts, 10 s apart), then runs `treosh/lighthouse-ci-action@v12` 3× using `lighthouserc.js`. Gating thresholds: **90+ required for performance, accessibility, best-practices, SEO**; Core Web Vitals (LCP / CLS / INP / FCP) are tracked **warn-only**. Reports uploaded as `lighthouse-reports` (30-day retention).
10. **`deploy-production`** — **Currently cascade-skips** (depends on disabled `deploy-staging`). Same SSH flow against `PRODUCTION_HOST` with `SENTRY_ENVIRONMENT=production`. The GitHub environment is named `production` and requires reviewer approval from `ikarusXPS` and restricts deploys to protected branches. <!-- VERIFY: production URL configured in `production` environment -->

### Manual Workflows

- **Load test** (`.github/workflows/load-test.yml`) — `workflow_dispatch` only, takes a `scenario` input (`smoke` or `load`). Uses `grafana/setup-k6-action@v1` (k6 v0.53.0) and runs `k6 run k6/load-test.js --out json=summary.json` against `${{ secrets.STAGING_URL }}`. **Never** targets production. Posts a Markdown summary with p95 / p99 / error rate / checks to `$GITHUB_STEP_SUMMARY`. Threshold breaches fail the workflow (final step). Locally: `pnpm load:smoke` or `pnpm load:full`.
- **Cross-replica WS verification** — `pnpm test:fanout` (Phase 37 WS-04 gate). Boots `e2e-stack/docker-compose.test.yml` (postgres + redis + traefik + 2× app), emits a Socket.IO event on replica A, asserts a client on replica B receives it. The mocked-adapter unit tests do **not** satisfy this gate — only the full stack does.

### Validating Workflow Changes Locally

```bash
pnpm validate:ci   # action-validator on .github/workflows/ci.yml
```

## Environment Setup

Required environment variables for production deployment are documented in full in `CONFIGURATION.md` (or `.env.example`). Critical production-specific variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | Yes | Set to `production`. Gates dev-only diagnostics like the slow-query / N+1 warner. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. In `docker-compose.yml` this is overridden to `postgresql://newshub:newshub_dev@postgres:5432/newshub`. In `stack.yml` it routes through PgBouncer: `postgres://newshub:${POSTGRES_PASSWORD}@pgbouncer:6432/newshub?pgbouncer=true`. |
| `DIRECT_URL` | Yes (Swarm) | PgBouncer-bypass URL for `prisma migrate deploy` / `prisma db push`. In `stack.yml`: `postgres://newshub:${POSTGRES_PASSWORD}@postgres:5432/newshub`. |
| `REDIS_URL` | Yes | Redis connection string. Container DNS: `redis://redis:6379`. Shared by cache + Socket.IO Redis adapter. |
| `JWT_SECRET` | Yes | Minimum 32 characters. Generate with `openssl rand -base64 32`. |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS allow-list. <!-- VERIFY: production domain --> |
| `RUN_HTTP` | Yes (Swarm) | `true` on web replicas, `false` on `app-worker`. Gates HTTP listener boot. |
| `RUN_JOBS` | Yes (Swarm) | `false` on web replicas, `true` on `app-worker`. Gates singleton schedulers (aggregator, cleanup, digest). |
| `POSTGRES_PASSWORD` | Yes (Swarm) | Substituted into PgBouncer / Postgres / app `DATABASE_URL` and `DIRECT_URL`. |
| `BUILD_TAG` | Optional (Swarm) | Image tag for `newshub:${BUILD_TAG:-latest}` in `stack.yml`. |
| `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Yes (≥ 1) | AI provider for analysis. Fallback chain: OpenRouter → Gemini → Anthropic → keyword. |
| `DEEPL_API_KEY` / `GOOGLE_TRANSLATE_API_KEY` | Recommended | Translation provider chain. |
| `SENTRY_DSN` | Recommended | Error / performance tracking. |
| `SENTRY_RELEASE` | Recommended | Set to `newshub@${{ github.sha }}` per deploy. |
| `SENTRY_ENVIRONMENT` | Recommended | `staging` or `production`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` / `SENDGRID_API_KEY` | Optional | Email verification, digests, Alertmanager notifications. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Optional | Subscription tier enforcement. Service degrades gracefully if unset. |
| `OAUTH_SESSION_SECRET` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional | OAuth providers. |
| `APP_URL` | Optional | Public app URL used in emails / OAuth callbacks. <!-- VERIFY: production APP_URL value --> |
| `ALERT_EMAIL` | Optional | Recipient for Prometheus / Alertmanager alerts. |

Production secrets must be injected via the deployment platform's secret store (or `.env` on the deployment host, mode `0600`). Never commit secrets to the repo. <!-- VERIFY: secret store actually used in production (Docker Swarm secrets, host .env file, or external KMS) -->

### Required GitHub Secrets

Configure these under *Settings → Secrets and variables → Actions* (and per-environment for `staging` / `production`):

| Secret | Used By | Purpose |
|--------|---------|---------|
| `STAGING_HOST` | `deploy-staging` | SSH target hostname for staging (placeholder until provisioned). |
| `STAGING_USER` | `deploy-staging` | SSH username on staging. |
| `STAGING_SSH_KEY` | `deploy-staging` | Private key for SSH auth (no passphrase, restricted to the deploy user). |
| `STAGING_URL` | `lighthouse`, `load-test` | Public URL polled by Lighthouse and targeted by k6. Until a real staging tier exists, point this at the production URL per Option A in `40-12-production-deploy-setup.md`. |
| `PRODUCTION_HOST` | `deploy-production` | SSH target hostname for production. <!-- VERIFY: populate when server is provisioned --> |
| `PRODUCTION_USER` | `deploy-production` | SSH username on production. |
| `PRODUCTION_SSH_KEY` | `deploy-production` | SSH key for production deploy user. |
| `LHCI_GITHUB_APP_TOKEN` | `lighthouse` | Lighthouse CI GitHub App token (PR status checks). |
| `SENTRY_AUTH_TOKEN` | `build` | Required by `@sentry/vite-plugin` to upload source maps. |
| `SENTRY_ORG` | `build` | Sentry organization slug. <!-- VERIFY: actual org slug --> |
| `SENTRY_PROJECT` | `build` | Sentry project slug. <!-- VERIFY: actual project slug --> |
| `GITHUB_TOKEN` | `build` (GHCR push) | Auto-provided. The workflow declares `permissions: packages: write` at the top of `ci.yml`. |

### Branch Protection

`master` requires the following status checks before merge (configured under *Settings → Branches → Branch protection rules*). Per `CLAUDE.md`, these are the **display names** of the jobs, not the job IDs:

- `Lint`
- `Type Check`
- `Unit Tests`
- `Build Docker Image`
- `E2E Tests`

Configured rules:

- `strict: true` — branches must be up to date before merging
- Admin-enforced (no bypass)
- The `production` environment additionally requires manual reviewer approval from `ikarusXPS` and restricts deploys to protected branches

## Master Push Flow (Current Pre-Provisioning State)

The actual flow on every push to `master` today:

1. PR opened → all jobs run except `deploy-*` and `lighthouse` (those are master-only or disabled).
2. PR merged to `master` → CI re-runs.
3. `lint` + `typecheck` + `check-source-bias` + `test` pass.
4. `bundle-analysis` runs in parallel (warn-only, never blocks).
5. `build` publishes `ghcr.io/${{ github.repository }}:${{ github.sha }}` and `:latest`.
6. `e2e` runs Playwright against an ephemeral Postgres + Redis.
7. **`deploy-staging` skips (`if: false`)** — no deployment happens.
8. **`lighthouse` cascade-skips** (depends on `deploy-staging`).
9. **`deploy-production` cascade-skips** (depends on `deploy-staging`).

Once a server is provisioned and the workflow is re-wired per `40-12-production-deploy-setup.md` Option A, the happy path becomes:

1–6. Same as above.
7. `deploy-production` SSHes in, runs `docker compose pull && docker compose up -d --wait`, and verifies `/api/health/db`.
8. `lighthouse` polls production until ready, then asserts the 90+ thresholds.

Sentry release correlation: every build tags the release `newshub@${{ github.sha }}`, and each deploy job exports `SENTRY_RELEASE` + `SENTRY_ENVIRONMENT` so error events are clearly identified in the Sentry UI.

## Phase 37 Production Topology (Docker Swarm)

`stack.yml` defines the horizontally-scaled production stack. Deploy with:

```bash
docker stack deploy -c stack.yml newshub
```

> `docker-compose.yml` stays single-replica for development; `stack.yml` is **Swarm-only** — never run it via `docker compose up`.

### Services

| Service | Image | Replicas | Role |
|---------|-------|----------|------|
| `traefik` | `traefik:v3.3` | 1 (manager-pinned) | Sticky-cookie load balancer in front of `app`. Reads service definitions via the Swarm provider. |
| `app` | `newshub:${BUILD_TAG:-latest}` | 4 | Stateless web replicas. `RUN_HTTP=true`, `RUN_JOBS=false`. |
| `app-worker` | `newshub:${BUILD_TAG:-latest}` | 1 | Singleton background-jobs runner. `RUN_HTTP=false`, `RUN_JOBS=true`. |
| `pgbouncer` | `edoburu/pgbouncer:1.23.1` | 1 | Transaction-pool collapse from 4×20 = 80 client conns → 25 backend conns. |
| `pgbouncer-exporter` | `prometheuscommunity/pgbouncer-exporter:v0.12.0` | 1 | Prometheus exporter for PgBouncer pool metrics on `:9127`. |
| `postgres` | `postgres:17` | 1 | `max_connections=200` leaves ~150 slots for ops after PgBouncer's 25. |
| `redis` | `redis:7.4-alpine` | 1 | Shared broker for cache + Socket.IO Redis adapter. |
| `prometheus` | `prom/prometheus:v3.4.0` | 1 | Scrape config in `./prometheus/prometheus.yml`. |
| `alertmanager` | `prom/alertmanager:v0.28.1` | 1 | Routes `PgBouncerPoolSaturation` / `PrismaPoolSaturation` and other alerts. |
| `grafana` | `grafana/grafana-oss:13.0.1` | 1 | Dashboards consume Prometheus metrics. |

All services share the `newshub-net` overlay network.

### Sticky Sessions (Traefik)

Socket.IO requires session affinity for the long-poll → WebSocket upgrade handshake. Traefik labels (under `deploy.labels` — Swarm requires this; container `services.<name>.labels` are NOT read by Traefik's Swarm provider) wire a sticky cookie:

| Cookie attr | Value | Reason |
|-------------|-------|--------|
| name | `nh_sticky` | Pins the client to a single web replica per session. |
| httponly | `true` | Prevents XSS scraping. |
| secure | `true` | HTTPS only. |
| samesite | `lax` | Allows shared-article cross-site links to work. |

Traefik health probes hit `/api/ready` (which flips to 503 during graceful drain) on `loadbalancer.healthcheck.path`, with `interval=10s` and `timeout=3s`.

### Connection Pooling (PgBouncer)

PgBouncer runs in **transaction mode** (`POOL_MODE=transaction`). The codebase has no `LISTEN/NOTIFY`, advisory locks, or session-scoped state, so transaction mode is safe.

Sizing (per `pgbouncer/pgbouncer.ini.template` and `stack.yml`):

| Setting | Value | Reason |
|---------|-------|--------|
| `DEFAULT_POOL_SIZE` | 25 | Backend conns per database. |
| `MAX_CLIENT_CONN` | 200 | Frontend conns from the 4 web replicas (Prisma max:20 each = 80 typical). |
| `RESERVE_POOL_SIZE` | 5 | Burst capacity. |
| `SERVER_RESET_QUERY` | `DISCARD ALL` | Clears per-conn state on return to pool. |
| `AUTH_TYPE` | `md5` | userlist.txt auto-generated by edoburu image. |

Prisma compatibility:

- **Runtime queries** route through PgBouncer with `?pgbouncer=true` to disable prepared-statement caching.
- **Migrations** (`prisma db push` / `prisma migrate deploy`) bypass PgBouncer and connect to Postgres directly via `DIRECT_URL`.

Postgres runs with `postgres -c max_connections=200`, leaving ~150 slots for migrations and ad-hoc operations after PgBouncer claims 25.

> The live PgBouncer config is generated at boot from `stack.yml` env vars by the `edoburu/pgbouncer` image. `pgbouncer/pgbouncer.ini.template` is a documentation reference only — it is **not** mounted into the container. To change live config, edit `stack.yml`, not the template.

### Singleton Background Jobs (`app-worker`)

The `app-worker` service runs scheduled jobs (news aggregator, cleanup, email digests) on **exactly one replica**. Web replicas have `RUN_JOBS=false` and skip these schedulers entirely.

Worker characteristics:

- `replicas: 1`
- `update_config.order: stop-first` — old container stops before new one starts (prevents two workers running concurrently during rolling updates). Web replicas use `start-first` for zero-downtime updates.
- `update_config.failure_action: pause` — if an update fails, hold the stack rather than rolling forward.
- Same image as web replicas; differs only in env: `RUN_HTTP=false`, `RUN_JOBS=true`.
- The worker emits real-time events through the Socket.IO Emitter (Redis-backed). Clients connected to any web replica receive them via the shared `@socket.io/redis-adapter`.

### Cross-Replica Socket.IO

Web replicas no longer hold in-memory state for `NewsAggregator` — they read via Prisma + `CacheService`. The Socket.IO Redis adapter fans events across all replicas through Redis pub/sub.

The `pnpm test:fanout` harness (`e2e-stack/docker-compose.test.yml`) verifies this end-to-end by booting 2× app behind Traefik, emitting on one replica, and asserting receipt on a client connected to the other. Mocked-adapter unit tests **do not** satisfy this gate.

### Graceful Shutdown

Both `app` and `app-worker` declare `stop_grace_period: 35s`. On `SIGTERM`:

1. The app flips `/api/ready` to 503 (Traefik stops routing new traffic).
2. Socket.IO connections drain over 30 seconds.
3. The Prisma pool closes.
4. Process exits.

The 35 s `stop_grace_period` gives Swarm 5 s of slack on top of the 30 s drain so it does not `SIGKILL` mid-drain.

> `Dockerfile` `HEALTHCHECK` deliberately points at `/api/health/db`, **not** `/api/ready` — `/api/ready` returns 503 during drain, which would cause Docker/Swarm to kill the container mid-drain. Docker liveness uses `/api/health/db`; Traefik load-balancer readiness uses `/api/ready`.

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

On a deploy host running `docker-compose.yml`:

```bash
# From /app/newshub
docker compose exec app sh -c "cd apps/web && npx prisma db push"
```

On a Swarm host running `stack.yml`, migrations must use `DIRECT_URL` (PgBouncer transaction mode breaks `prisma db push`). Run a one-shot container as root (Prisma 7 lazy-loads engine binaries; pnpm 10 skips the postinstall script for security, so engines aren't pre-staged in the non-root image):

```bash
docker run --rm --network newshub_newshub-net \
  -e DATABASE_URL="postgres://newshub:${POSTGRES_PASSWORD}@postgres:5432/newshub" \
  -e DIRECT_URL="postgres://newshub:${POSTGRES_PASSWORD}@postgres:5432/newshub" \
  --user 0:0 \
  newshub:${BUILD_TAG:-latest} \
  sh -c "cd /app/apps/web && ./node_modules/.bin/prisma db push"
```

After first deploy (or when introducing new fixtures):

```bash
docker compose exec app pnpm seed             # Badges + AI personas
docker compose exec app pnpm seed:badges      # Badges only
docker compose exec app pnpm seed:personas    # Personas only
```

### Dockerfile Highlights

- Multi-stage build (`deps` → `builder` → `runner`) on `node:22-alpine3.19`
- `corepack@latest` upgrade in every stage to fix the Node 22 keyid mismatch with pnpm 10.x signatures
- Workspace install scoped to `@newshub/web` and its transitive workspace deps (`@newshub/types`)
- Build-time stub `DATABASE_URL` for `prisma generate` (the runtime value is injected via env vars)
- Non-root `nodejs` user
- Chromium + Puppeteer system deps installed (`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`)
- Healthcheck on `/api/health/db` (NOT `/api/ready`)
- Sentry instrument preloaded via `node --import ./apps/web/server/instrument.mjs`

## Rollback Procedure

CI does not include automated rollback. Three approved approaches:

### A. Re-run a previous successful master CI run (preferred when the bad commit is already on master)

1. *Actions → CI/CD Pipeline*, find the last green run on `master` from before the regression.
2. Click **Re-run all jobs**.
3. The `build` job will rebuild and re-tag the older SHA's image as `:latest`; once `deploy-production` is wired, it will pull and deploy on the host automatically.
4. Confirm health: <!-- VERIFY: actual production health URL once provisioned -->

### B. Revert + push (preferred when you want a clean audit trail on master)

```bash
git revert <bad-commit-sha>
git push origin master
```

CI runs end-to-end on the revert commit and (once wired) deploys it to production.

### C. Manual SSH rollback (emergency only)

For `docker compose` hosts:

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

For `docker stack` hosts:

```bash
# On the Swarm manager
export BUILD_TAG=<previous-sha>
docker stack deploy -c stack.yml newshub
# Confirm rollout
docker service ls
docker service ps newshub_app
```

`stack.yml` web replicas have `update_config.failure_action: rollback` configured, so a failed image swap auto-reverts to the previous image. `app-worker` uses `failure_action: pause` instead so a failed worker update halts rather than rolling forward.

### Database Rollback

Prisma `db push` is **not reversible**. If a schema change must be undone:

1. Restore `apps/web/prisma/schema.prisma` from git (`git checkout <good-sha> -- apps/web/prisma/schema.prisma`).
2. **Do not** use `npx prisma db push --force-reset` against production — it drops every table.
3. Restore from a database backup. <!-- VERIFY: actual PostgreSQL backup strategy and restore procedure -->

Best practice: drop new schema fields in a follow-up release rather than reverting a column drop, and always rehearse risky migrations locally or with `pnpm test:fanout` first.

## Monitoring

NewsHub ships its monitoring stack in both `docker-compose.yml` (single-replica) and `stack.yml` (Swarm), so any deploy host gets Prometheus + Grafana + Alertmanager out of the box.

### Error Tracking (Sentry)

- **Frontend**: `@sentry/react`
- **Backend**: `@sentry/node` (preloaded via `--import ./apps/web/server/instrument.mjs`, with performance tracing)
- **Source maps**: uploaded by `@sentry/vite-plugin` during the CI `build` job
- **Release tag**: `newshub@${{ github.sha }}` (set in `build`, and in each deploy job once active)
- **Environment**: `staging` or `production` per deploy job
- **Required secrets**: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, plus runtime `SENTRY_DSN` on the host

<!-- VERIFY: Sentry dashboard URL and project slug -->

### Metrics (Prometheus)

- Endpoint scraped: `/metrics` (powered by `prom-client`)
- Image: `prom/prometheus:v3.4.0`
- Retention: 15 days (`--storage.tsdb.retention.time=15d`)
- UI: http://localhost:9090
- Config: mounted from `./prometheus/`
- Phase 37: also scrapes `pgbouncer-exporter` on `:9127` for pool saturation alerts.

### Alert Rules

Defined in `prometheus/alert.rules.yml`:

| Alert | Condition | Severity | Duration |
|-------|-----------|----------|----------|
| HighErrorRate | 5xx > 1 % of total requests | Critical | 5 min |
| HighLatency | p95 latency > 2 s | Warning | 5 min |
| ServiceDown | Service unreachable | Critical | 1 min |
| HighEmailBounceRate | Email bounces > 5 % of sent | Critical | 5 min |
| LowEmailDeliveryRate | Delivery success < 95 % | Warning | 1 h |
| PgBouncerPoolSaturation | PgBouncer waiting clients > threshold | Warning | per `prometheus/alert.rules.yml` <!-- VERIFY: exact threshold + duration --> |
| PrismaPoolSaturation | Prisma client pool waiters > threshold | Warning | per `prometheus/alert.rules.yml` <!-- VERIFY: exact threshold + duration --> |

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
- [ ] Coverage gate at 80 % (branches at 71 % per the TODO waiver in `vitest.config.ts` — make sure new code raises, not lowers, the bar)
- [ ] `pnpm validate:ci` passes after any workflow edits
- [ ] `pnpm test:fanout` passes (Phase 37 cross-replica WebSocket gate) if the production stack is Swarm
- [ ] All required GitHub Secrets set (see "Required GitHub Secrets" table above)
- [ ] Branch protection on `master` requires `Lint`, `Type Check`, `Unit Tests`, `Build Docker Image`, `E2E Tests` (display names, `strict: true`, admin-enforced)
- [ ] `production` GitHub environment requires reviewer approval (`ikarusXPS`) and restricts to protected branches
- [ ] `JWT_SECRET` ≥ 32 chars, `ALLOWED_ORIGINS` set to the production domain
- [ ] Swarm deploys: `POSTGRES_PASSWORD`, `DATABASE_URL` (with `?pgbouncer=true`), `DIRECT_URL`, `RUN_HTTP`, `RUN_JOBS` set per service
- [ ] At least one AI provider key set (OpenRouter / Gemini / Anthropic)
- [ ] `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT` set on the host
- [ ] SMTP creds + `ALERT_EMAIL` configured if you want Alertmanager to notify
- [ ] Grafana admin password rotated from `admin` / `admin`
- [ ] Postgres + Redis volumes backed up <!-- VERIFY: backup tooling -->
- [ ] Health endpoints reachable: `/api/health`, `/api/health/db`, `/api/ready`, `/metrics`
- [ ] Prometheus is scraping the app target and `pgbouncer-exporter` (Status → Targets in the Prometheus UI)
- [ ] Alertmanager test alert delivered end-to-end
- [ ] Lighthouse run against production hits 90+ across performance / accessibility / best-practices / SEO
- [ ] `deploy-staging` is `if: false` — confirm `deploy-production` is wired to `needs: [build, e2e]` before first live deploy (see `40-12-production-deploy-setup.md`)
