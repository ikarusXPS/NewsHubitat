---
phase: 37-horizontal-scaling
plan: 03
subsystem: database
tags: [prisma, pgbouncer, prometheus, postgres, connection-pool]

# Dependency graph
requires:
  - phase: 34-performance-optimization
    provides: getPoolStats stub at apps/web/server/db/prisma.ts:58 + updatePoolMetrics call site at apps/web/server/index.ts (10s interval)
  - phase: 20-monitoring-alerting
    provides: prom-client registry and /metrics scrape endpoint
provides:
  - Prisma adapter pool sized for 4-replica × 20 = 80 client conns into PgBouncer (DB-03)
  - prisma_pool_total / prisma_pool_idle / prisma_pool_waiting Prometheus gauges (DB-04 client side)
  - Documented DATABASE_URL (?pgbouncer=true) + DIRECT_URL dual-URL pattern in .env.example files (DB-01, DB-02)
affects: [37-04-stack-yml, 37-05-pgbouncer-deploy, 37-06-deploy-validation, 37-monitoring-dashboards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma 7 + @prisma/adapter-pg recognizes ?pgbouncer=true in connectionString without explicit code branch"
    - "Dual-URL pattern: DATABASE_URL routes runtime queries through PgBouncer transaction-pool; DIRECT_URL bypasses PgBouncer for migrations"
    - "Additive Prometheus gauges: legacy db_pool_* kept for backward compat; canonical prisma_pool_* introduced for Phase 37 dashboards"

key-files:
  created:
    - apps/web/.env.example
  modified:
    - apps/web/server/db/prisma.ts
    - apps/web/server/services/metricsService.ts
    - .env.example

key-decisions:
  - "Pool max bumped 10 → 20 per DB-03 topology (4 web replicas × 20 = 80 client conns; PgBouncer MAX_CLIENT_CONN=200 leaves ~120 slot headroom for migrations and operational tools)"
  - "Added prisma_pool_* gauges alongside (not replacing) legacy db_pool_* gauges so existing Phase 34 Grafana panels keep functioning while Plan 04 wires new Phase 37 dashboards"
  - "Created apps/web/.env.example as a new workspace-local template — Prisma CLI commands run with cwd=apps/web load env via dotenv/config in apps/web/prisma.config.ts, so the template lives next to its consumer"

patterns-established:
  - "PgBouncer transaction-pool compatibility: add `?pgbouncer=true` to DATABASE_URL; @prisma/adapter-pg disables prepared-statement caching automatically — no application-side branching"
  - "Schema migrations route through DIRECT_URL (port 5432) to bypass transaction-pool — Prisma's documented pattern"

requirements-completed: [INFRA-03]

# Metrics
duration: 25min
completed: 2026-04-29
---

# Phase 37 Plan 03: Prisma Pool Sizing & PgBouncer Compatibility Summary

**Prisma adapter pool resized for PgBouncer transaction-pool (max 10 → 20), prisma_pool_* Prometheus gauges registered, and dual DATABASE_URL/DIRECT_URL pattern documented in .env.example.**

## Performance

- **Duration:** ~25 minutes (excluding initial 9.5-min `pnpm install` to populate node_modules in fresh worktree)
- **Started:** 2026-04-29T04:06Z
- **Completed:** 2026-04-29T04:30Z
- **Tasks:** 3
- **Files modified:** 3 (1 created)

## Accomplishments

- **DB-01 closed:** `?pgbouncer=true` documented in .env.example. Prisma 7 + @prisma/adapter-pg recognizes the flag and disables prepared-statement caching automatically — no application code branching required.
- **DB-02 closed:** `DIRECT_URL` documented as the migration path that bypasses PgBouncer (port 5432, session-scoped connections required by Prisma Schema Engine).
- **DB-03 closed:** Pool max bumped from 10 to 20. Topology math: 4 web replicas × 20 client conns = 80 into PgBouncer (MAX_CLIENT_CONN=200 in Plan 04 stack.yml leaves ~120 spare slots).
- **DB-04 (Prisma side) closed:** Three canonical gauges registered: `prisma_pool_total`, `prisma_pool_idle`, `prisma_pool_waiting`. `updatePoolMetrics` writes to both these and the legacy Phase 34 `db_pool_*` gauges (additive, non-breaking). Index.ts setInterval (already wired by Phase 34) picks up the new gauges automatically.
- DB-04 PgBouncer-exporter side (backend pool stats: `pgbouncer_pools_*`) closes in Plan 04 along with the stack.yml/pgbouncer/exporter wiring.

## Task Commits

Each task committed atomically (--no-verify per parallel-execution policy):

1. **Task 1: Bump Prisma pool max:10 → max:20 per DB-03 topology** — `8e1a960` (feat)
2. **Task 2: Register Prometheus Gauges for Prisma pool stats** — `ffde805` (feat)
3. **Task 3: Document DATABASE_URL + DIRECT_URL pattern in .env.example files** — `2305edf` (docs)

## Files Created/Modified

- `apps/web/server/db/prisma.ts` — PrismaPg adapter `max: 10 → 20`; added 3-line comment documenting Prisma 7 + adapter-pg `?pgbouncer=true` recognition. No change to `connectionTimeoutMillis` (5s) or `idleTimeoutMillis` (5min); existing `getPoolStats()` stub at L58 unchanged (already attempts pool access via adapter internals).
- `apps/web/server/services/metricsService.ts` — Added 3 new Gauge fields (`prismaPoolTotal`, `prismaPoolIdle`, `prismaPoolWaiting`) and constructor registrations against the same Registry as existing metrics. Updated `updatePoolMetrics(stats)` to write to all 6 gauges (3 legacy + 3 canonical) so Phase 34 dashboards keep working while Plan 04 dashboards adopt the new names.
- `apps/web/.env.example` — Created new file. Prisma CLI commands run from `apps/web/` load env via `dotenv/config` in `apps/web/prisma.config.ts`, so the template now lives next to its consumer. Documents the dual-URL pattern with safe local-dev defaults.
- `.env.example` (root) — Updated existing DATABASE section. Replaced single-URL block with dual-URL block documenting Phase 37 production pattern. Local-dev default still works (no PgBouncer required); `DIRECT_URL=` left empty in dev.

## Decisions Made

- **Additive gauge naming.** Plan called for `prisma_pool_*` names. The Phase 34 codebase already had `db_pool_*` gauges in `metricsService.ts` (lines 24-26, 91-108). Rather than rename (which would break existing Grafana panels and Alertmanager rules), the new gauges were added alongside the legacy ones, and `updatePoolMetrics` now writes to both sets. This is a non-breaking, additive change — Plan 04 dashboards adopt `prisma_pool_*`, Phase 34 dashboards keep `db_pool_*`.
- **Two-file `.env.example` placement.** Plan listed both `apps/web/.env.example` and `.env.example` as files to modify. The repo only had `.env.example` at root (8.6KB, comprehensive). Created `apps/web/.env.example` as a new workspace-local file (focused on DB env vars consumed by `apps/web/prisma.config.ts`). This matches the existing pattern: `apps/web/.env` already exists in the live working tree, so a corresponding template at the same path is symmetric.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created `apps/web/.env.example` from scratch (plan assumed it existed)**
- **Found during:** Task 3 (env.example documentation)
- **Issue:** Plan instructed "Find the existing DATABASE_URL= line and replace its block with…" but `apps/web/.env.example` did not exist in the worktree. Plan's verify command was `grep -q "DIRECT_URL" apps/web/.env.example`, which would have failed with no file present.
- **Fix:** Created a focused workspace-local `.env.example` containing the dual-URL block (DATABASE_URL + DIRECT_URL with full Phase 37 documentation). Defaults remain safe for local dev (single-URL pattern works without PgBouncer). The root `.env.example` was updated as a pure replacement of its existing DB section, per plan.
- **Files modified:** `apps/web/.env.example` (created), `.env.example` (updated)
- **Verification:** `grep -q "DIRECT_URL" apps/web/.env.example && grep -q "pgbouncer=true" apps/web/.env.example && grep -q "Phase 37" apps/web/.env.example` — all pass.
- **Committed in:** `2305edf` (Task 3 commit)

**2. [Rule 3 - Blocking] Reapplied Task 1 edit after `pnpm install` reset working tree**
- **Found during:** Task 1 (between Edit and verify)
- **Issue:** Worktree had no `node_modules`. `pnpm install` was required for typecheck/test to run. The install ran post-install hooks (notably `prisma generate`) which appears to have triggered a working-tree refresh that reverted my Edit. Additionally, the Edit/Read tool initially resolved `D:/NewsHub/apps/web/...` paths to the **main repo checkout** (not the worktree at `D:/NewsHub/.claude/worktrees/agent-a2e2898ed829ecb56/...`), so the first edit landed in the wrong tree.
- **Fix:** (a) Reverted the spurious change in the main checkout via `git checkout --` to keep the parent repo clean; (b) re-issued the Edit using the explicit worktree-prefixed absolute path `D:/NewsHub/.claude/worktrees/agent-a2e2898ed829ecb56/apps/web/server/db/prisma.ts`; (c) all subsequent edits in this plan used worktree-prefixed paths to avoid the same trap.
- **Files modified:** `apps/web/server/db/prisma.ts` (worktree path)
- **Verification:** `git diff` in worktree now shows the change; main checkout is clean (`git status` empty for that file).
- **Committed in:** `8e1a960` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking)
**Impact on plan:** No scope creep. Deviation 1 was a path-existence assumption; deviation 2 was a worktree path-resolution issue. Both were resolved without modifying plan intent.

## Issues Encountered

- **Worktree path resolution.** The Edit/Read tool's absolute-path handling resolved `D:/NewsHub/...` to the main checkout, not the worktree, on the first invocation. After diagnosing this with `diff` between the two paths, all subsequent file operations used the explicit `D:/NewsHub/.claude/worktrees/agent-a2e2898ed829ecb56/...` prefix. Recorded as a worktree gotcha for future parallel-executor agents.

## User Setup Required

None — no external service configuration required. The dual-URL `.env.example` documentation is sufficient; production deploys consume it via Plan 04's `stack.yml` env wiring.

## Next Phase Readiness

- **Plan 04 (stack.yml + PgBouncer service):** Ready to consume. Can wire `DATABASE_URL=postgres://...@pgbouncer:6432/newshub?pgbouncer=true` and `DIRECT_URL=postgres://...@postgres:5432/newshub` into the `app` and `app-worker` service env blocks. The application code is already PgBouncer-safe.
- **Plan 06 (deploy validation):** The `prisma_pool_*` gauges will be visible at `/metrics` once a query has run through the pool. Plan 06's smoke test should `curl /metrics | grep prisma_pool_` to confirm the 3 gauges populate non-zero values under load.
- **No blockers carried forward.**

## Threat Flags

None — no new security-relevant surface introduced. The prisma_pool_* gauges expose only aggregate counts (no PII, no query content) on the existing internal-scrape `/metrics` endpoint (Phase 20 trust posture).

## Self-Check: PASSED

**Files verified to exist:**
- `apps/web/server/db/prisma.ts` — FOUND (`max: 20` on line 12, "Phase 37" comment present)
- `apps/web/server/services/metricsService.ts` — FOUND (3 prisma_pool_* gauges registered, updatePoolMetrics writes to all 6 gauges)
- `apps/web/.env.example` — FOUND (created in this plan, contains DIRECT_URL, pgbouncer=true, Phase 37 markers)
- `.env.example` — FOUND (existed, dual-URL block now present)

**Commits verified to exist (in worktree branch `worktree-agent-a2e2898ed829ecb56`):**
- `8e1a960` — feat(37-03): bump Prisma pool max:10 to max:20 for PgBouncer topology — FOUND
- `ffde805` — feat(37-03): register prisma_pool_* Prometheus gauges — FOUND
- `2305edf` — docs(37-03): document DATABASE_URL + DIRECT_URL dual-URL pattern — FOUND

**Verification suite (per plan `<verification>` section):**
- Pool size bumped: `grep -E "^\s+max:\s*20," apps/web/server/db/prisma.ts` — match found ✓
- Three Prometheus gauges: `grep -E "prisma_pool_(total|idle|waiting)" apps/web/server/services/metricsService.ts | wc -l` — 3 ✓
- .env.example documents both URLs: DIRECT_URL + pgbouncer=true + Phase 37 markers in both files ✓
- `pnpm typecheck` — exits 0 (packages/types Done, apps/web Done) ✓
- `pnpm test:run` — 46 test files, 1306/1306 tests pass ✓

---

*Phase: 37-horizontal-scaling*
*Plan: 03*
*Completed: 2026-04-29*
