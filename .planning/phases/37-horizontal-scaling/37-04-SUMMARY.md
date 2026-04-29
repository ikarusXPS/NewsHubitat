---
phase: 37-horizontal-scaling
plan: 04
subsystem: infra
tags: [docker-swarm, traefik, pgbouncer, prometheus, alertmanager, sticky-cookie, dns-sd, horizontal-scaling, deploy]

# Dependency graph
requires:
  - phase: 37-horizontal-scaling
    provides: "37-01 wired Socket.IO Redis adapter (consumed by sticky-cookie LB) + workerEmitter (consumed by app-worker singleton)"
  - phase: 37-horizontal-scaling
    provides: "37-02 RUN_JOBS / RUN_HTTP env-gated boot (consumed by app/app-worker env split)"
  - phase: 37-horizontal-scaling
    provides: "37-03 Prisma pool max:20 + prisma_pool_waiting Gauge (consumed by PrismaPoolSaturation alert + topology DB-03)"
  - phase: 17-docker-deployment
    provides: "Existing docker-compose.yml service definitions (mirrored as Swarm services with deploy.* additions)"
  - phase: 20-monitoring-alerting
    provides: "prometheus/alert.rules.yml newshub group structure + alertmanager wiring (preserved unchanged)"
provides:
  - "stack.yml — production Docker Swarm topology with 10 services (traefik, app×4, app-worker×1, pgbouncer, pgbouncer-exporter, postgres, redis, prometheus, alertmanager, grafana)"
  - "pgbouncer/pgbouncer.ini.template — documentation reference for env-driven runtime config (DB-01..DB-04 traceability)"
  - "prometheus/prometheus.yml updated — dns_sd_configs against tasks.app + static job for pgbouncer-exporter:9127"
  - "prometheus/alert.rules.yml updated — PgBouncerPoolSaturation + PrismaPoolSaturation rules"
affects:
  - 37-05 (graceful shutdown / terminus drain — consumes stop_grace_period: 35s contract)
  - 37-06 (deploy validation tests — boots stack.yml on a single-host Swarm)
  - 37-monitoring-dashboards (Grafana panels read from new dns_sd_configs targets + pgbouncer scrape job)

# Tech tracking
tech-stack:
  added:
    - "traefik:v3.3 (Swarm provider with cookie-sticky labels)"
    - "edoburu/pgbouncer:1.23.1 (env-driven transaction-pool)"
    - "prometheuscommunity/pgbouncer-exporter:v0.12.0 (pool saturation metrics)"
  patterns:
    - "Traefik labels MUST live under deploy.labels in Swarm mode — services.<name>.labels (container labels) are NOT read by the Swarm provider (T-37-12 critical anti-pattern)"
    - "Worker singleton via replicas=1 + update_config.order=stop-first — start-first would briefly run two workers during rolling updates (T-37-10)"
    - "stop_grace_period: 35s = terminus 30s drain + 5s slack — Pitfall 5"
    - "PgBouncer transaction-pool collapse: 4 web replicas × Prisma max:20 = 80 client conns → 25 backend conns at Postgres → max_connections=200 leaves ~150 slots for ops"
    - "Prometheus dns_sd_configs against tasks.app: Swarm-internal DNS resolves to all replica IPs; dynamic discovery without config rewrites"
    - "Sticky cookie nh_sticky: httponly+secure+samesite=lax — pins Engine.IO long-poll → WebSocket upgrade to one replica without breaking shared-article cross-site links (Pitfall 6)"

key-files:
  created:
    - "stack.yml (360 lines, 10 Swarm services)"
    - "pgbouncer/pgbouncer.ini.template (40 lines, documentation reference)"
  modified:
    - "prometheus/prometheus.yml (added dns_sd_configs job for tasks.app + static job for pgbouncer-exporter:9127; commented out newshub-worker scrape with TODO)"
    - "prometheus/alert.rules.yml (appended PgBouncerPoolSaturation + PrismaPoolSaturation rules to newshub group)"

key-decisions:
  - "Cited WS-02 (sticky cookie nh_sticky), WS-03 (Redis 7.4-alpine reuse), DB-01..DB-04 (PgBouncer infra side), JOB-01 (worker singleton), DEPLOY-01 (separate stack.yml — docker-compose.yml untouched), DEPLOY-02 (4+1 single-host validation target)"
  - "newshub-worker scrape commented out — worker has no HTTP listener yet; uncommenting deferred to future plan that adds /metrics on :3002 (RESEARCH §Open Question 1)"
  - "Healthcheck/healthchecks added on postgres and redis services to mirror docker-compose.yml semantics; restart_policy on every service per RESEARCH §Pattern (Compose service definition → port to Swarm)"

patterns-established:
  - "stack.yml is Swarm-only — `docker stack deploy -c stack.yml newshub`, never `docker compose up -f stack.yml` (overlay network requires Swarm mode)"
  - "Two-URL Prisma pattern in stack.yml env: DATABASE_URL via PgBouncer (?pgbouncer=true), DIRECT_URL bypasses for migrations"
  - "Local-dev fallback documented inline in prometheus.yml — operators replace dns_sd_configs with static_configs when running compose instead of stack"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04]

# Metrics
duration: 21min
completed: 2026-04-29
---

# Phase 37 Plan 04: Production Swarm Topology Summary

**Production Docker Swarm `stack.yml` with 4 web replicas behind Traefik sticky-cookie LB, 1 worker singleton, edoburu/pgbouncer transaction-pool fronting Postgres, and Prometheus DNS-SD scraping `tasks.app` plus pool-saturation alerts.**

## Performance

- **Duration:** ~21 min
- **Started:** 2026-04-29T02:38:00Z
- **Completed:** 2026-04-29T02:59:28Z
- **Tasks:** 4
- **Files created:** 2 (stack.yml, pgbouncer/pgbouncer.ini.template)
- **Files modified:** 2 (prometheus/prometheus.yml, prometheus/alert.rules.yml)

## Accomplishments

- **Production Swarm topology** authored at repo root (`stack.yml`) — 10 services declared: traefik, app (replicas=4), app-worker (replicas=1), pgbouncer, pgbouncer-exporter, postgres (max_connections=200), redis (7.4-alpine reused for cache + Socket.IO adapter), prometheus, alertmanager, grafana — all on a single `newshub-net` overlay network.
- **Traefik label placement under `deploy.labels`** (T-37-12 anti-pattern guard satisfied) with sticky cookie `nh_sticky` (httpOnly=true, secure=true, samesite=lax — WS-02 + Pitfall 6) and `/api/ready` healthcheck (DEPLOY-04).
- **Worker singleton enforcement** via `replicas: 1` + `update_config.order: stop-first` + `failure_action: pause` — guarantees exactly-one worker during rolling updates (T-37-10 / JOB-01). `RUN_JOBS=true` / `RUN_HTTP=false` env split makes the worker a different runtime mode of the same image.
- **PgBouncer pool sizing locked** at 25 backend conns, 200 max_client_conn, 5 reserve, transaction-pool mode, `DISCARD ALL` reset query — sized per DB-03 topology (4 × 20 = 80 client conns, ~120 slot headroom in pool, ~150 slot headroom in Postgres).
- **Pool observability wired** end-to-end: pgbouncer-exporter:9127 scraped by Prometheus, `PgBouncerPoolSaturation` alert (`pgbouncer_pools_client_waiting_connections > 0` for 1m), `PrismaPoolSaturation` alert pairs with the `prisma_pool_waiting` gauge introduced in plan 03.
- **Swarm DNS-SD scrape** (`dns_sd_configs` against `tasks.app`) replaces the static `app:3001` target so Prometheus discovers all 4 replicas dynamically. Local-dev fallback documented inline.
- **Anti-pattern guard satisfied:** no files written under root `server/`, `prisma/`, `src/`. Modifications strictly scoped to top-level allow-list (stack.yml at root) + existing top-level config dirs (pgbouncer/, prometheus/).
- **DEPLOY-01 honored:** `docker-compose.yml` untouched — local dev experience unchanged.

## Task Commits

Each task was committed atomically (--no-verify in worktree mode; orchestrator runs hook validation post-merge):

1. **Task 1: Author stack.yml (Swarm topology)** — `36dfd6d` (feat)
2. **Task 2: Create pgbouncer/pgbouncer.ini.template** — `99ee133` (docs)
3. **Task 3: Update prometheus/prometheus.yml with DNS-SD + PgBouncer scrape** — `9495ba5` (feat)
4. **Task 4: Add PgBouncerPoolSaturation + PrismaPoolSaturation alert rules** — `9f5ad1f` (feat)

## Files Created/Modified

- **stack.yml** (NEW) — Phase 37 production Swarm topology. 10 services with `deploy.replicas` / `deploy.update_config` / `deploy.restart_policy` blocks; single `newshub-net` overlay; named volumes for postgres_data, redis_data, prometheus_data, alertmanager_data, grafana_data.
- **pgbouncer/pgbouncer.ini.template** (NEW) — Documentation reference for the env-driven config that edoburu/pgbouncer:1.23.1 generates at boot. Not mounted into the container; exists so future operators can debug live behavior.
- **prometheus/prometheus.yml** (MODIFIED) — Replaced `static_configs: [{ targets: ['app:3001'] }]` for the `newshub` job with `dns_sd_configs: [{ names: ['tasks.app'], type: A, port: 3001 }]`. Added `pgbouncer` scrape job pointing at `pgbouncer-exporter:9127`. Commented `newshub-worker` block with TODO referencing RESEARCH §Open Question 1.
- **prometheus/alert.rules.yml** (MODIFIED) — Appended `PgBouncerPoolSaturation` (expr: `pgbouncer_pools_client_waiting_connections > 0` for 1m) and `PrismaPoolSaturation` (expr: `prisma_pool_waiting > 0` for 2m) to the existing `newshub` group. Pre-existing rules (HighErrorRate, HighLatency, ServiceDown, HighEmailBounceRate, LowEmailDeliveryRate) preserved untouched.

## Decisions Made

- **Worker scrape: commented vs live.** Worker has no HTTP listener (Plan 02 / RESEARCH §Open Question 1). Strategy (a) — comment out the `newshub-worker` scrape block with a TODO — was chosen. Worker metrics are nice-to-have, not Phase 37 scope.
- **Healthchecks preserved on postgres + redis.** docker-compose.yml has `pg_isready` and `redis-cli ping` healthchecks; ported them verbatim into stack.yml. Swarm `deploy.replicas: 1` + container-level healthcheck still works (Swarm uses healthcheck status for placement, not for replica count).
- **Restart policy on every service.** Per RESEARCH §Pattern (Compose service definition → port to Swarm), every service block gets `deploy.restart_policy: { condition: on-failure, max_attempts: 5, delay: 5s }` to replace `restart: unless-stopped`. Worker uses 10s delay (longer crash backoff for the singleton).
- **Sentry env vars added on app + worker.** Plan didn't enumerate Sentry, but CLAUDE.md notes Sentry is the production error tracker. Wired `SENTRY_DSN` into both services so production releases tag to the right environment without further plan churn (Rule 2 — missing critical operational config; minimal addition, no scope creep).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical operational config] Added Sentry env vars to app + app-worker**
- **Found during:** Task 1 (stack.yml authorship)
- **Issue:** Plan instructed "Plus existing AI/Stripe/SMTP/Sentry env vars (mirror docker-compose.yml app service block)" but the existing `docker-compose.yml` reads its `app` env from `.env` via `env_file:` — it does NOT enumerate AI/Stripe/SMTP/Sentry env vars inline. Mirroring "verbatim" would have left the Swarm services with no way to inject these secrets (Swarm services run on remote nodes that don't share the local `.env` file).
- **Fix:** Enumerated the production env vars inline in `stack.yml` for both `app` and `app-worker` services using `${VAR}` placeholders — values come from the operator's deploy environment (`POSTGRES_PASSWORD`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPL_API_KEY`, `GOOGLE_TRANSLATE_API_KEY`, `SMTP_*`, `SENDGRID_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `OAUTH_SESSION_SECRET`, `SENTRY_DSN`, `APP_URL`).
- **Files modified:** `stack.yml`
- **Verification:** Structural validation (yaml parse + env enumeration) confirms both services receive the full env set; no hardcoded secrets — every value is a `${VAR}` substitution.
- **Committed in:** `36dfd6d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical operational config)
**Impact on plan:** Necessary correctness fix — Swarm topology is unusable without enumerated env vars. No scope creep.

## Issues Encountered

- **Worktree base mismatch at startup.** Worktree was created from `test-ci-pipeline` branch HEAD (`75ff45e`, phase 18 work), not from the expected Wave 1 merge base (`2bf5277`, which contains Wave 1 phase 37 commits 37-01..37-03). Resolved via `git reset --hard 2bf5277...` per `<worktree_branch_check>` instructions. After reset, all Wave 1 outputs (apps/web/server/jobs/workerEmitter.ts, apps/web/.env.example, etc.) were available.
- **Sandboxed tooling unavailable.** Bash blocked `command -v`, `python3`, `promtool`, `docker`, and arbitrary system probes. Worked around by:
  - Using the main monorepo's installed `yaml` package (`D:/NewsHub/node_modules/.pnpm/yaml@2.8.3/...`) via a Node one-liner to parse all 3 YAML files structurally.
  - Doing exhaustive structural assertions (replicas, env vars, label paths, port bindings, sticky-cookie attributes, expr/for/severity on alert rules) — every Plan 04 must-have and threat-model mitigation passes.
  - `pnpm typecheck` / `pnpm test:run` were not run (sandboxed); plan 04 changes zero source files, so test-suite impact is structurally zero. Orchestrator's post-merge hooks will run them.

## User Setup Required

None — Plan 04 only authors deployment configuration files. The operator running `docker stack deploy -c stack.yml newshub` must populate the `${VAR}` env values from the production secrets store; the templated names are documented in stack.yml comments and in `.env.example` (already produced by Plan 03).

## Next Phase Readiness

- **Plan 05 (graceful shutdown / terminus drain):** stack.yml's `stop_grace_period: 35s` contract is in place; terminus implementation can rely on the 30s + 5s slack window.
- **Plan 06 (deploy validation tests):** stack.yml is the artifact under test — `docker stack deploy -c stack.yml newshub` should boot 4 web + 1 worker on a single-host Swarm and pass the Wave 3 cross-replica integration test.
- **Future monitoring dashboards:** Prometheus is now scraping all 4 replicas (`tasks.app` DNS-SD) plus PgBouncer pool metrics; Grafana panels can consume `pgbouncer_pools_*` and `prisma_pool_*` series immediately.

## Self-Check: PASSED

**File presence (creates):**
- `stack.yml` — FOUND
- `pgbouncer/pgbouncer.ini.template` — FOUND

**File presence (modifications):**
- `prometheus/prometheus.yml` — FOUND with `dns_sd_configs` + `tasks.app` + `pgbouncer-exporter:9127`
- `prometheus/alert.rules.yml` — FOUND with `PgBouncerPoolSaturation` + `PrismaPoolSaturation`

**Commit presence (`git log` reachable from HEAD):**
- `36dfd6d` (feat: stack.yml) — FOUND
- `99ee133` (docs: pgbouncer template) — FOUND
- `9495ba5` (feat: prometheus.yml) — FOUND
- `9f5ad1f` (feat: alert rules) — FOUND

**Verification block automated checks (Plan §verification):**
- `test -f stack.yml` — PASS
- `grep -E "replicas:\s*[14]"` — PASS (`replicas: 4` for app, `replicas: 1` for app-worker + 7 other services)
- `grep -c "RUN_JOBS="` — PASS (2 occurrences: false on app, true on app-worker)
- `grep -q "edoburu/pgbouncer:1.23.1"` — PASS
- `grep -q "prometheuscommunity/pgbouncer-exporter:v0.12.0"` — PASS
- `grep -q "nh_sticky"` — PASS
- `grep -q "stop_grace_period: 35s"` — PASS (both app and app-worker)
- `grep -q "order: stop-first"` — PASS (worker)
- `grep -q "pgbouncer=true"` — PASS (DATABASE_URL on both app and worker)
- `grep -q "POOL_MODE=transaction"` — PASS
- `grep -q "DEFAULT_POOL_SIZE=25"` — PASS
- `grep -q "MAX_CLIENT_CONN=200"` — PASS
- `grep -q "/api/ready"` — PASS (Traefik healthcheck)
- `grep -q "tasks.app"` — PASS
- `grep -q "pgbouncer-exporter:9127"` — PASS
- `grep -q "PgBouncerPoolSaturation"` — PASS
- `grep -q "PrismaPoolSaturation"` — PASS

**Anti-pattern guard:**
- No files written to root `server/`, `prisma/`, `src/` — PASS
- `docker-compose.yml` UNCHANGED (DEPLOY-01) — PASS
- `.planning/STATE.md` UNCHANGED — PASS
- `.planning/ROADMAP.md` UNCHANGED — PASS
- No file deletions in any plan commit — PASS

**Threat-model mitigation verification (programmatic):**
- T-37-10 (worker singleton): `replicas: 1` + `update_config.order: stop-first` — VERIFIED
- T-37-11 (Traefik dashboard exposure): `127.0.0.1:8080:8080` — VERIFIED
- T-37-12 (Traefik labels under deploy.labels): structural YAML assertion — VERIFIED (no `traefik.*` keys in container `app.labels`; all under `app.deploy.labels`)
- T-37-13 (PgBouncer sizing): POOL_MODE=transaction + DEFAULT_POOL_SIZE=25 + MAX_CLIENT_CONN=200 + RESERVE_POOL_SIZE=5 — VERIFIED
- T-37-14 (sticky cookie attributes): name=nh_sticky + httponly=true + secure=true + samesite=lax — VERIFIED

**Structural YAML validation (via Node `yaml` package):**
- `stack.yml` — parses, 4 top-level keys, 10 services
- `prometheus/prometheus.yml` — parses, 4 top-level keys, 2 scrape jobs (newshub, pgbouncer)
- `prometheus/alert.rules.yml` — parses, 1 top-level key (groups), 7 alert rules in `newshub` group (5 pre-existing + 2 new)

**Tooling unavailable in sandbox (documented for orchestrator post-merge run):**
- `docker stack config -c stack.yml` — sandboxed off
- `promtool check rules prometheus/alert.rules.yml` — sandboxed off
- `pnpm typecheck && pnpm test:run` — sandboxed off; no source-code changes in this plan, so structural impact is zero

---
*Phase: 37-horizontal-scaling*
*Plan: 04*
*Completed: 2026-04-29*
