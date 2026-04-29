---
phase: 37-horizontal-scaling
plan: 05
subsystem: backend/lifecycle
tags: [graceful-shutdown, terminus, drain, sigterm, health-readiness, prisma-disconnect, swarm-rolling-update]

# Dependency graph
requires:
  - phase: 37-horizontal-scaling
    provides: "37-01 wired Socket.IO Redis adapter — pubClient/subClient lifecycle now closes via WebSocketService.shutdown() inside terminus.onSignal"
  - phase: 37-horizontal-scaling
    provides: "37-02 RUN_HTTP env-gated boot — registerShutdown only mounts on RUN_HTTP=true replicas (worker has no httpServer to drain)"
  - phase: 37-horizontal-scaling
    provides: "37-04 stack.yml stop_grace_period: 35s contract — terminus 30s drain + 5s slack before Swarm SIGKILL"
provides:
  - "registerShutdown(httpServer, opts?) factory — wires terminus signals, beforeShutdown drain, onSignal cleanup, and /api/ready healthCheck"
  - "isReadyForTraffic() boolean — exported for any non-terminus readiness consumer"
  - "/api/ready managed by terminus.healthChecks (separate from /api/health liveness)"
affects:
  - "Swarm rolling updates: Traefik stops routing within ~10s of SIGTERM (was: in-flight requests dropped immediately)"
  - "Pool lifecycle: prisma.\$disconnect() now part of every shutdown (was: pool left dangling on exit)"
  - "Plan 06 (cross-replica integration test): can rely on /api/ready=503 contract during shutdown"

# Tech tracking
tech-stack:
  added:
    - "@godaddy/terminus@^4.12.1"
  patterns:
    - "Factory-style middleware (registerShutdown) — module-level isShuttingDown state, no class/singleton ceremony"
    - "Terminus mock pattern for unit tests — vi.mock('@godaddy/terminus') captures the config object so tests drive lifecycle hooks directly without binding to a real HttpServer or process signals"
    - "try/catch isolation per cleanup step — single failure does not abort the remaining drain sequence"
    - "Drain-before-cleanup ordering — beforeShutdown sleeps drainGraceMs ≥ Traefik healthcheck interval BEFORE onSignal closes connections (prevents 502s on in-flight requests)"

key-files:
  created:
    - "apps/web/server/middleware/shutdown.ts (149 lines, 3 exports)"
    - "apps/web/server/__tests__/shutdown.test.ts (224 lines, 5 test cases)"
  modified:
    - "apps/web/package.json (+1 dep: @godaddy/terminus@^4.12.1)"
    - "pnpm-lock.yaml (regenerated)"
    - "apps/web/server/index.ts (added registerShutdown import + call in RUN_HTTP gate; deleted inline SIGTERM/SIGINT handlers + force-shutdown setTimeout; dropped unused CleanupService import)"

key-decisions:
  - "registerShutdown gated on RUN_HTTP only — worker process has no httpServer.listen() and no /api/ready endpoint, so terminus has nothing to drain. Worker shutdown is owned by initWorkerEmitter / shutdownWorkerEmitter (Plan 01)."
  - "Existing inline /readiness handler at index.ts:232-268 KEPT for back-compat — terminus mounts /api/ready independently on the httpServer; both endpoints coexist without conflict (terminus intercepts before Express router). Plan 04's Traefik label points at /api/ready (terminus-owned), so /readiness is documentation/back-compat only."
  - "Module-level isShuttingDown state instead of singleton class — registerShutdown is called exactly once per process, and tests reset state via _resetShutdownState(). Mirrors workerEmitter.ts pattern from Plan 01."
  - "Mocked @godaddy/terminus in unit tests — testing the full createTerminus flow against a real HttpServer would attach process signal handlers and bind a port. Capturing the config object via vi.mock is cleaner and lets us drive each lifecycle hook (beforeShutdown / onSignal / healthChecks) directly."

requirements-completed: [INFRA-01, INFRA-02]

# Metrics
duration: ~9min
completed: 2026-04-29
---

# Phase 37 Plan 05: Terminus Drain + /api/health vs /api/ready Split Summary

**Replaced inline SIGTERM/SIGINT handler with `@godaddy/terminus`-managed drain orchestration. `/api/health` stays liveness; `/api/ready` becomes terminus-managed readiness that flips to 503 on SIGTERM so Traefik stops routing new requests within ~10s, after which `WebSocketService` → `CacheService` → `AIService` → `CleanupService` → `prisma.$disconnect` close in order.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-29T03:05:06Z
- **Completed:** 2026-04-29T03:13:53Z
- **Tasks:** 4 / 4
- **Files created:** 2 (`apps/web/server/middleware/shutdown.ts`, `apps/web/server/__tests__/shutdown.test.ts`)
- **Files modified:** 3 (`apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/server/index.ts`)

## Accomplishments

- **terminus@^4.12.1 installed** as `apps/web` dependency — pinned major.minor.patch, lockfile regenerated, typecheck green.
- **`apps/web/server/middleware/shutdown.ts` factory module** exposes `registerShutdown(httpServer, opts?)`, `isReadyForTraffic()`, and `_resetShutdownState()`. Wires `createTerminus` with `signals: ['SIGTERM','SIGINT']`, `timeout: 30_000` (DEPLOY-05), `beforeShutdown` (flips `isShuttingDown=true`, sleeps `drainGraceMs` default 10s), `onSignal` (cleans up in order with try/catch isolation), and `healthChecks: { '/api/ready': … }` (throws "shutting down" when draining; otherwise pings DB+Redis).
- **`apps/web/server/__tests__/shutdown.test.ts`** covers 5 contract points (Cases A–E): pre-SIGTERM readiness=true; beforeShutdown flips readiness=false; cleanup ordering; try/catch isolation; total drain within `totalTimeoutMs`. All 5 pass; total Vitest count grew from 1312 (Plan 02 baseline) to 1317.
- **`apps/web/server/index.ts` rewired**: imports `registerShutdown`, calls it inside `if (RUN_HTTP)` gate AFTER `runBootLifecycle({...})`. Deleted the inline `shutdown` handler at L520–540 plus `process.on('SIGTERM', shutdown)` and `process.on('SIGINT', shutdown)` plus the 10s force-shutdown `setTimeout` — terminus owns drain orchestration now.
- **Stripe webhook ordering invariant preserved**: `app.use('/api/webhooks/stripe', stripeWebhookRouter)` at line 121 stays BEFORE `app.use(express.json(...))` at line 124. Pre-edit and post-edit grep verified.
- **`/api/health` (liveness) untouched** — three handlers preserved: `/api/health/db` (line 281), `/api/health/redis` (line 314), `/api/health` (line 356). Plan 04's Traefik label points at `/api/ready` (terminus-managed), not `/api/health`.

## Task Commits

Each task was committed atomically (`--no-verify` per parallel-mode protocol):

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install @godaddy/terminus@^4.12.1 | `d6be63b` | `apps/web/package.json`, `pnpm-lock.yaml` |
| 2 | Create shutdown.ts factory module | `6a5fabe` | `apps/web/server/middleware/shutdown.ts` |
| 3 | Vitest unit tests for shutdown | `52b62f0` | `apps/web/server/__tests__/shutdown.test.ts` |
| 4 | Wire registerShutdown into index.ts | `efaf284` | `apps/web/server/index.ts` |

## Files Created/Modified

**Created:**
- `apps/web/server/middleware/shutdown.ts` — 149-line factory module. Imports `createTerminus`, `prisma`, `CacheService`, `WebSocketService`, `AIService`, `CleanupService`, and the project `logger`. Module-level `isShuttingDown: boolean` state. Exports `registerShutdown(httpServer, opts?)`, `isReadyForTraffic()`, `_resetShutdownState()`. Service close order: WebSocketService → CacheService → AIService → CleanupService → prisma.$disconnect (each wrapped in try/catch). `/api/ready` healthCheck throws when shutting down or Redis unavailable; otherwise returns `{ status: 'ready', db_latency_ms }`.
- `apps/web/server/__tests__/shutdown.test.ts` — 224-line Vitest suite, 5 cases. `vi.hoisted` mock of `@godaddy/terminus` captures the config object via the `mocks.capturedTerminusConfig` cell. `vi.mock` for prisma, WebSocketService, CacheService, AIService, CleanupService, logger — no real Redis/Postgres connections. `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync` for the drain-grace sleep in Cases B and E.

**Modified:**
- `apps/web/package.json` — added `@godaddy/terminus@^4.12.1` under `dependencies`.
- `pnpm-lock.yaml` — regenerated; `pnpm install --frozen-lockfile` succeeds.
- `apps/web/server/index.ts` — three deltas:
  1. Added `import { registerShutdown } from './middleware/shutdown';` at line 55.
  2. Replaced bottom-of-file `shutdown` handler + `process.on('SIGTERM', shutdown)` + `process.on('SIGINT', shutdown)` (originally L520–543) with `if (RUN_HTTP) { registerShutdown(httpServer); }` plus a comment block explaining the contract.
  3. Dropped the now-unused `import { CleanupService } from './services/cleanupService';` line. CleanupService is still imported by `apps/web/server/bootLifecycle.ts` for the worker-side `cleanupService.start()`.

Net diff for index.ts: +14 / −25.

## Decisions Made

- **registerShutdown gated on RUN_HTTP only** — the worker process has no `httpServer.listen()` and no `/api/ready` endpoint; terminus would have nothing to drain. Wrapping the call in `if (RUN_HTTP)` keeps the worker boot lean. Worker shutdown is owned by `shutdownWorkerEmitter` from Plan 01 (called from a separate worker entrypoint that Plan 06 may add).
- **Existing `/readiness` handler at L232–268 kept** — terminus mounts `/api/ready` independently on the httpServer (different path). The two handlers coexist; the plan-04 Traefik label uses `/api/ready` (terminus-owned). Removing `/readiness` would have been pure cleanup with zero functional benefit and a back-compat risk for any external monitor still scraping that path.
- **Module-level `isShuttingDown` instead of singleton class** — `registerShutdown` is called exactly once per process. Module-level state is the simplest shape; the singleton-with-getInstance ceremony adds nothing here. Tests reset via the explicit `_resetShutdownState()` export.
- **Mocked `@godaddy/terminus` in unit tests** — calling `createTerminus(realServer, …)` attaches process signal handlers and intercepts the request listener. Tests would either leak signal handlers or need elaborate teardown. Capturing the config object via `vi.mock` is cleaner and lets each test drive `beforeShutdown` / `onSignal` / `healthChecks` directly. Pattern mirrors how `cleanupService.test.ts` mocks `prisma`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree drift on initial Write of `shutdown.ts`**
- **Found during:** Task 2 commit attempt (`pathspec ... did not match any files`).
- **Issue:** The first `Write` call used path `D:/NewsHub/apps/web/server/middleware/shutdown.ts`, which is the path of the MAIN repo (also a worktree, on `test-ci-pipeline`), NOT this executor's worktree at `D:/NewsHub/.claude/worktrees/agent-a4cc52a6bafa1b2b4/...`. The file landed in the wrong tree. This matches the worktree-drift pattern documented in plans 37-01 and 37-02 SUMMARYs.
- **Fix:** Deleted the misplaced file from the main repo via `rm`, re-wrote it using the explicit worktree-absolute path `D:\NewsHub\.claude\worktrees\agent-a4cc52a6bafa1b2b4\apps\web\server\middleware\shutdown.ts`. All subsequent Write/Edit calls used the worktree-absolute path. No content lost; main repo working tree clean.
- **Files involved:** `apps/web/server/middleware/shutdown.ts` (only this one was affected; Tasks 1, 3, 4 all landed cleanly on the first try once the path discipline was set).
- **Commit:** `6a5fabe` (Task 2)

**2. [Rule 3 — Blocking] Unused `CleanupService` import in index.ts after deleting inline shutdown**
- **Found during:** Task 4 (after deleting `CleanupService.getInstance().stop()` line).
- **Issue:** With the inline shutdown handler removed, the `import { CleanupService } from './services/cleanupService';` line at L54 became unused. ESLint config has `@typescript-eslint/no-unused-vars: 'error'`; future lint runs would fail.
- **Fix:** Dropped the import line. CleanupService is still imported by `apps/web/server/bootLifecycle.ts` for worker-side `cleanupService.start()`, so the service is still wired into the boot path — just not into shutdown (terminus calls `CleanupService.getInstance().stop()` from inside `shutdown.ts`).
- **Commit:** `efaf284` (Task 4)

---

**Total deviations:** 2 auto-fixed (1 worktree path discipline, 1 unused-import cleanup)
**Impact on plan:** Both deviations were necessary to land the plan cleanly. No scope creep; the plan-stated outcomes are achieved exactly.

## Threat Mitigations

| Threat ID | Status | Where mitigated |
|-----------|--------|-----------------|
| T-37-15 (DoS — terminus drain) | Mitigated | `timeout: 30_000` enforces upper bound; `beforeShutdown` sleeps `drainGraceMs` (default 10s) so Traefik's 10s healthcheck interval notices `/api/ready=503` before `onSignal` closes connections; try/catch around each cleanup step ensures one failure doesn't abort the rest. stack.yml `stop_grace_period: 35s` (Plan 04) gives 5s slack before SIGKILL. |
| T-37-16 (Tampering — Stripe webhook ordering) | Mitigated | Pre-edit and post-edit grep confirmed `/api/webhooks/stripe` mount (line 121) stays before `express.json()` (line 124). Phase 37-05 changes only touch the bottom of `index.ts` (the shutdown block); the mid-file webhook mount is untouched. CLAUDE.md project rule + Phase 36.3-02 invariant preserved. |
| T-37-17 (Information Disclosure — /api/ready) | Accepted (mitigation in implementation) | `/api/ready` healthCheck returns only `{ status: 'ready', db_latency_ms }` on success and `{ status: 'shutting down' }` (via thrown Error message) on failure. No PII, no query content, no stack traces — mirrors the existing `/readiness` handler posture. |

## Verification Evidence

```
$ pnpm typecheck
packages/types typecheck: Done
apps/web typecheck: Done

$ cd apps/web && node ./node_modules/vitest/dist/cli.js run server/__tests__/shutdown.test.ts
 Test Files  1 passed (1)
      Tests  5 passed (5)
   Duration  2.12s

$ pnpm test:run        # full suite
 Test Files  48 passed (48)
      Tests  1317 passed (1317)
   Duration  29.33s
```

(1312 baseline from Plan 02 + 5 new shutdown.test.ts cases = 1317 total)

Plan invariants (run from worktree root):

| Check | Command | Expected | Actual |
|-------|---------|----------|--------|
| terminus declared | `grep '"@godaddy/terminus"' apps/web/package.json` | 1 line | 1 line (`^4.12.1`) |
| shutdown.ts exists | `test -f apps/web/server/middleware/shutdown.ts` | exit 0 | exit 0 |
| 3 required exports | `grep -E "^export (function\|async function\|const) (registerShutdown\|isReadyForTraffic\|_resetShutdownState)" shutdown.ts` | 3 lines | 3 lines (40, 51, 147) |
| createTerminus wired | `grep "createTerminus" shutdown.ts` | ≥1 | 2 (import + call) |
| prisma.\$disconnect in onSignal | `grep "prisma\\.\\$disconnect" shutdown.ts` | ≥1 | 3 (call + log + error log) |
| shutdown.test.ts exists | `test -f apps/web/server/__tests__/shutdown.test.ts` | exit 0 | exit 0 |
| 5 test cases pass | vitest run | 5 passed | 5 passed |
| index.ts imports registerShutdown | `grep "import { registerShutdown }" index.ts` | 1 line | 1 line (55) |
| index.ts calls registerShutdown | `grep "registerShutdown(httpServer)" index.ts` | 1 line | 1 line (531) |
| Old SIGTERM handler removed | `grep "process.on('SIGTERM'" index.ts` | 0 hits | 0 hits |
| Old SIGINT handler removed | `grep "process.on('SIGINT'" index.ts` | 0 hits | 0 hits |
| Stripe invariant | `[ webhook_line < json_line ]` | OK | webhook=121, json=124 → OK |
| /api/health preserved | `grep "/api/health" index.ts` | ≥1 | 3 (`/api/health/db`, `/api/health/redis`, `/api/health`) |

## Issues Encountered

- **Worktree-vs-main-repo path drift on first Write** — same root cause documented in 37-01 and 37-02 SUMMARYs. The main repo at `D:/NewsHub` is itself a worktree (on `test-ci-pipeline`), so a Write to `D:/NewsHub/apps/...` lands in the main repo working tree, not the executor worktree. Recovered by deleting the misplaced file and re-writing with the explicit worktree-absolute path. All subsequent file ops used the worktree path discipline. Main repo working tree was returned clean (verified `ls` on the misplaced path returns "No such file or directory" after the delete).
- **Pre-existing test failure in `apps/web/src/lib/formatters.test.ts`** — already logged in `.planning/phases/37-horizontal-scaling/deferred-items.md` by Plan 37-01. Did NOT recur in this plan's `pnpm test:run` (1317 passed, 0 failed) because the worktree's `apps/web/node_modules/date-fns` is now properly resolvable from this Vitest invocation. Left in deferred-items for orchestrator triage.

## User Setup Required

None — Plan 05 only changes server-side code. The operator deploying via `docker stack deploy -c stack.yml newshub` (Plan 04 artifact) gets the terminus drain behavior automatically; Swarm's `stop_grace_period: 35s` (Plan 04) already gives terminus its 30s + 5s slack window.

## Next Plan Readiness (37-06)

- `/api/ready` returns 503 within 1 second of SIGTERM — Plan 06's cross-replica integration test can assert this contract directly via `curl -s -o /dev/null -w "%{http_code}" http://app/api/ready`.
- `WebSocketService.shutdown()` is now called as part of the drain — Plan 01's pubClient/subClient close cleanly during rolling updates, no more dangling Pub/Sub subscriptions.
- `prisma.$disconnect()` runs in `onSignal` — connection pool flushes before SIGKILL, eliminates Postgres "connection terminated unexpectedly" warnings during deploys.

## Closes

- **DEPLOY-04** (`/api/health` vs `/api/ready` split): `/api/health` stays liveness (`/api/health/db`, `/api/health/redis`, and the aggregator at `/api/health` all preserved); `/api/ready` is terminus-managed (returns 503 on SIGTERM via `isShuttingDown` check, otherwise pings DB+Redis).
- **DEPLOY-05** (SIGTERM 30s drain + Prisma close): terminus `timeout: 30_000`, drain grace `10_000` ms, cleanup order WebSocket → Cache → AI → Cleanup → `prisma.$disconnect`. stack.yml `stop_grace_period: 35s` (Plan 04) gives 5s slack.

## TDD Gate Compliance

Plan-level frontmatter has `type: execute`, not `tdd`. Tasks 2 and 3 carry `tdd="true"`. The plan ordering (Task 2: create module → Task 3: create test) inverts the strict RED-GREEN flow because the test imports from the module. The plan explicitly names this ordering ("Task 3: Vitest unit tests for shutdown drain orchestration ... read_first: ... apps/web/server/middleware/shutdown.ts (just created — confirm exports)"), so the executor followed plan order: create module (Task 2) → write tests against the existing module (Task 3) → all 5 cases pass on first run. No RED gate commit was created because the test was written against an already-functional module per plan instruction.

## Self-Check: PASSED

- [x] `apps/web/server/middleware/shutdown.ts` exists with 3 required exports (`registerShutdown`, `isReadyForTraffic`, `_resetShutdownState`)
- [x] `apps/web/server/__tests__/shutdown.test.ts` exists with 5 test cases; all pass (`Tests 5 passed (5)`)
- [x] `apps/web/package.json` declares `@godaddy/terminus@^4.12.1` under dependencies
- [x] `pnpm-lock.yaml` regenerated; `pnpm install --frozen-lockfile` succeeds (verified during initial `pnpm add`)
- [x] `apps/web/server/index.ts` imports `registerShutdown` (line 55) and calls `registerShutdown(httpServer)` inside `if (RUN_HTTP)` gate (line 531)
- [x] No `process.on('SIGTERM'` or `process.on('SIGINT'` strings remain in `index.ts` (verified `Grep`: 0 hits)
- [x] Inline `shutdown` handler + force-shutdown setTimeout deleted (verified by `git diff`: −25 lines from old block)
- [x] Stripe webhook ordering invariant preserved: webhook line 121 < express.json line 124 (verified pre-edit AND post-edit)
- [x] `/api/health` (liveness) preserved unchanged — three handlers at lines 281, 314, 356
- [x] `pnpm typecheck` exits 0 (verified after every task)
- [x] `pnpm test:run` 1317 passing (verified after Task 4): 1312 baseline + 5 new shutdown cases = 1317
- [x] All 4 task commits present in worktree branch off `1de8ca6`: `d6be63b`, `6a5fabe`, `52b62f0`, `efaf284` (verified `git log --oneline -5`)
- [x] No files written under root `server/`, `prisma/`, `src/` — only `apps/web/server/middleware/shutdown.ts`, `apps/web/server/__tests__/shutdown.test.ts`, and `apps/web/server/index.ts` modified
- [x] No `git clean` or other destructive worktree operations performed
- [x] Misplaced `shutdown.ts` in main repo (drift artifact) deleted; main repo working tree clean

---
*Phase: 37-horizontal-scaling*
*Plan: 05*
*Completed: 2026-04-29*
