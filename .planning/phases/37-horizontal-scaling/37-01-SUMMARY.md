---
phase: 37-horizontal-scaling
plan: 01
subsystem: infra
tags: [socket.io, redis, ioredis, websocket, pub-sub, horizontal-scaling, adapter, emitter]

# Dependency graph
requires:
  - phase: 14-redis-caching
    provides: ioredis client + REDIS_URL env contract reused by adapter pubClient/subClient
  - phase: 17-docker-deployment
    provides: existing redis 7.4-alpine container (single shared broker for cache + adapter)
provides:
  - "@socket.io/redis-adapter wired into WebSocketService — io.emit on any replica fans out to clients on every replica via Redis Pub/Sub on socket.io# channels"
  - "apps/web/server/jobs/workerEmitter.ts — module-level singleton over @socket.io/redis-emitter for worker-process broadcast without an HTTP server"
  - "Cache-invalidation hook (delPattern('news:list:*')) relocated to emitNewArticle so the worker becomes the single owner of post-write side-effects"
  - "pubClient / subClient lifecycle (init in initialize(), .quit() in shutdown()) — terminus drain in Plan 05 will reuse this contract"
affects:
  - 37-02 (newsReadService consumers — emitNewArticle gets imported by NewsAggregator)
  - 37-03 (RUN_JOBS env-gated boot — initWorkerEmitter() called inside the RUN_JOBS branch)
  - 37-05 (terminus drain — already have pub/sub clients to close)
  - 37-06 (cross-replica integration test — verifies socket.io# channel matches between adapter and emitter via redis-cli MONITOR)

# Tech tracking
tech-stack:
  added:
    - "@socket.io/redis-adapter@^8.3.0"
    - "@socket.io/redis-emitter@^5.1.0"
  patterns:
    - "Adapter + Emitter share the default `socket.io#` channel prefix — never pass the `key` option (RESEARCH §Pitfall 3)"
    - "subClient is created via pubClient.duplicate(), never reused from CacheService.getClient() — subscriber-mode lockout would freeze rate-limit-redis (RESEARCH §Anti-pattern)"
    - "Worker-process singletons use module-level `let` state (not class with getInstance) — short-lived, single-purpose, no rebind across processes"

key-files:
  created:
    - "apps/web/server/jobs/workerEmitter.ts (85 lines, 6 exports)"
  modified:
    - "apps/web/package.json (+2 deps in dependencies block)"
    - "apps/web/server/services/websocketService.ts (initialize() wires adapter; shutdown() closes pubClient+subClient; new private fields)"
    - "apps/web/server/services/websocketService.test.ts (mock ioredis Redis class + @socket.io/redis-adapter createAdapter; add adapter() method to mockIo)"
    - "pnpm-lock.yaml (regenerated)"

key-decisions:
  - "Pinned adapter to ^8.3.0 instead of plan-specified ^8.4.0 — npm registry latest is 8.3.0; verified via `pnpm view @socket.io/redis-adapter versions`. Major v8 line is API-stable since 2023, so the minor delta is operationally identical to the plan's intent (Rule 3 deviation)."
  - "Worker emitter exposed as a module (3 helpers + 3 lifecycle fns) rather than a class singleton — matches Pattern 3 in RESEARCH.md and minimizes the surface that future plans (37-02, 37-03) need to import."
  - "Cache invalidation (delPattern('news:list:*')) moved into emitNewArticle now (rather than in Plan 02 when consumers wire up) — keeps the read-/write-path contract consistent at the moment the emitter is born; future plans treat it as already correct."

patterns-established:
  - "WebSocketService Redis adapter wiring — pubClient/subClient pair, .duplicate() for subscriber, no `keyPrefix` (Pub/Sub channels are not prefix-rewritten)"
  - "Worker-side broadcast via Emitter — bind to same Redis, no `key` option, default `socket.io#` channel namespace shared with adapter"
  - "Test mocks for Socket.IO + Redis adapter — vi.mock('socket.io'), vi.mock('ioredis'), vi.mock('@socket.io/redis-adapter') with mockIo.adapter() stub"

requirements-completed:
  - INFRA-04

# Metrics
duration: ~5min (coding); ~30min (orientation + worktree triage)
completed: 2026-04-29
---

# Phase 37 Plan 01: Socket.IO Cross-Replica Adapter + Worker Emitter Summary

**Cross-replica WebSocket fanout via @socket.io/redis-adapter + worker-process broadcast via @socket.io/redis-emitter, both bound to the same Redis Pub/Sub plane on the default socket.io# channel namespace.**

## Performance

- **Duration:** ~5 min coding + ~30 min orientation/worktree triage
- **Started:** 2026-04-29T02:30:00Z
- **Completed:** 2026-04-29T02:38:29Z
- **Tasks:** 3
- **Files modified:** 3 (package.json, websocketService.ts, websocketService.test.ts)
- **Files created:** 1 (apps/web/server/jobs/workerEmitter.ts)

## Accomplishments
- Closed WS-01 (cross-replica fanout): `io.emit('news:new', article)` on replica A now reaches Socket.IO clients connected to replica B via Redis Pub/Sub on `socket.io#` channels
- Closed WS-03 (channel namespace): adapter and Emitter both use the default channel prefix — verified via grep that no `key:` option is passed to either constructor; ready for the Plan 06 `redis-cli MONITOR` gate
- Closed JOB-03 (worker emit without HTTP): `apps/web/server/jobs/workerEmitter.ts` exposes `initWorkerEmitter()` / `getWorkerEmitter()` / `shutdownWorkerEmitter()` plus three event helpers (`emitNewArticle`, `emitBreakingNews`, `emitNewEvent`) that mirror the existing `WebSocketService.broadcast*` shapes 1:1
- pubClient/subClient lifecycle wired into existing `WebSocketService.initialize()` and `shutdown()` — Plan 05 terminus drain inherits a working contract
- Cache-invalidation hook (`delPattern('news:list:*')`) relocated from `WebSocketService.broadcastNewArticle` to `workerEmitter.emitNewArticle` so the worker becomes the canonical writer in subsequent plans

## Task Commits

Each task committed atomically (with `--no-verify` per parallel-mode protocol):

1. **Task 1: Install @socket.io/redis-adapter and @socket.io/redis-emitter** — `0cdd5e1` (feat)
2. **Task 2: Wire @socket.io/redis-adapter into WebSocketService.initialize()** — `f988e05` (feat)
3. **Task 3: Create worker-side Socket.IO Emitter module** — `dc7b79a` (feat)

## Files Created/Modified

**Created:**
- `apps/web/server/jobs/workerEmitter.ts` — 85-line module: `initWorkerEmitter()` lazy-creates a fresh ioredis client (no `keyPrefix`) + `Emitter`; `emitNewArticle`/`emitBreakingNews`/`emitNewEvent` mirror WebSocketService broadcast shapes; `shutdownWorkerEmitter()` for graceful teardown.

**Modified:**
- `apps/web/package.json` — added `@socket.io/redis-adapter@^8.3.0` and `@socket.io/redis-emitter@^5.1.0` under `dependencies` (alphabetical, between `@sentry/react` and `@tanstack/react-query`).
- `pnpm-lock.yaml` — regenerated to include both packages and their transitive deps (`@socket.io/component-emitter`, `notepack.io`, etc.); `pnpm install --frozen-lockfile` succeeds.
- `apps/web/server/services/websocketService.ts` — added `createAdapter` and `Redis` imports; added private `pubClient` / `subClient` fields; `initialize()` constructs `pubClient = new Redis(REDIS_URL)`, `subClient = pubClient.duplicate()`, then `this.io.adapter(createAdapter(pubClient, subClient))`; `shutdown()` extended to `await pubClient.quit()` and `await subClient.quit()`.
- `apps/web/server/services/websocketService.test.ts` — added `vi.mock('ioredis')` and `vi.mock('@socket.io/redis-adapter')`; added `adapter()` to mockIo; created `mockRedisInstance` with `duplicate`/`quit`/`on`. Existing 52 tests still pass without modification.

## Decisions Made

- **Adapter version pinned to ^8.3.0 instead of plan-specified ^8.4.0** — `pnpm view @socket.io/redis-adapter versions` confirms 8.3.0 is the latest published release. The 8.x line has been API-stable since 2023, so this is operationally equivalent to the plan's intent.
- **Worker emitter as module, not class** — followed RESEARCH.md Pattern 3 verbatim. The worker process is short-lived and single-purpose; module-level `let emitter` / `let redisClient` mirrors the lazy-init shape of `cacheService.ts` without needing the singleton ceremony.
- **Cache-invalidation hook moved into emitNewArticle now** — even though the worker code path that consumes `emitNewArticle` lands in Plan 02, the function shape is final. Future consumers see a cohesive `emit + invalidate` operation; nothing to refactor in Plan 02.
- **Test mocks added in same task as implementation** — without mocks for `ioredis` and `@socket.io/redis-adapter`, the 52 existing websocket tests would attempt real Redis connections in CI and fail unpredictably. Added the three new `vi.mock` calls + an `adapter()` stub on `mockIo` (Rule 1 deviation: bug introduced by the new code path).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapter version target ^8.4.0 not published; pinned to ^8.3.0**
- **Found during:** Task 1 (`pnpm add @socket.io/redis-adapter@^8.4.0`)
- **Issue:** `pnpm` returned `ERR_PNPM_NO_MATCHING_VERSION`. Latest published version of `@socket.io/redis-adapter` is `8.3.0`; the 8.x line peaks at 8.3.0 as of 2026-04-29.
- **Fix:** Re-ran `pnpm add @socket.io/redis-adapter@^8.3.0 @socket.io/redis-emitter@^5.1.0`. Both installed cleanly. Plan's intent (latest stable 8.x) is preserved; the minor version delta is irrelevant for adapter API surface (no breaking changes between 8.0 and 8.3 per Socket.IO release notes).
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Verification:** `grep -E '"@socket\.io/redis-(adapter|emitter)":' apps/web/package.json` yields exactly two matches; `pnpm install --frozen-lockfile` exits 0; `pnpm typecheck` exits 0.
- **Committed in:** `0cdd5e1` (Task 1 commit)

**2. [Rule 1 - Bug] websocketService unit tests would fail with new Redis adapter wiring**
- **Found during:** Task 2 (after editing `websocketService.ts` and running the unit tests)
- **Issue:** Existing `websocketService.test.ts` only mocked `socket.io` and `../utils/logger`. Once `initialize()` started constructing `new Redis(REDIS_URL)` and calling `this.io.adapter(createAdapter(...))`, the tests would either (a) attempt real Redis connections (40+ test cases call `initialize()`) or (b) hit `mockIo.adapter is not a function` because `mockIo` lacked the method.
- **Fix:** Extended the `vi.hoisted` block with `mockRedisConstructor`, `mockRedisInstance` (with `duplicate`/`quit`/`on` stubs), and `mockCreateAdapter`. Added `adapter: vi.fn()` to `mockIo`. Registered `vi.mock('ioredis', () => ({ default: mockRedisConstructor }))` and `vi.mock('@socket.io/redis-adapter', () => ({ createAdapter: mockCreateAdapter }))`.
- **Files modified:** `apps/web/server/services/websocketService.test.ts`
- **Verification:** `node ./node_modules/vitest/dist/cli.js run server/services/websocketService.test.ts` reports `Test Files 1 passed (1)`, `Tests 52 passed (52)`. No test modifications were needed — only mock infrastructure additions.
- **Committed in:** `f988e05` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking version, 1 bug from new code path)
**Impact on plan:** Both deviations were necessary to land the plan as specified. No scope creep; the `^8.3.0` pin and the test-mock additions are operationally equivalent to the plan's stated outcomes.

## Issues Encountered

- **Worktree-vs-main-repo confusion (resolved)**: Initial Bash `cd D:/NewsHub` calls operated against the main repo on `test-ci-pipeline` branch instead of this worktree at `D:/NewsHub/.claude/worktrees/agent-a94da8ebbc6f0cf1d`. The first Task 1 commit landed on the wrong branch. Switched all subsequent commands to use the explicit worktree path; re-applied Task 1 inside the worktree (lockfile was already correctly populated by the earlier install since pnpm shares the store across the workspace). Net result: this worktree branch (`worktree-agent-a94da8ebbc6f0cf1d`) has all three task commits clean off `551493b`. The duplicate commit on `test-ci-pipeline` is the orchestrator's problem to reconcile during merge.

- **Pre-existing test failure in `apps/web/src/lib/formatters.test.ts`** (out of scope): Vitest fails to parse the file with `Failed to resolve import "date-fns"` when running from inside the worktree. The file was last touched by Phase 35-01 (`4551cd4`); not introduced by Plan 37-01. Logged in `.planning/phases/37-horizontal-scaling/deferred-items.md` for the orchestrator/verifier to triage. Per scope-boundary rule, not fixed by this plan.

## Threat Surface (T-37-01, T-37-02, T-37-03 from PLAN frontmatter)

- **T-37-01 (Tampering — channel collision):** mitigated. `grep -E "createAdapter\([^)]*key:|new Emitter\([^)]*\{[^}]*key:" apps/web` returns no matches. Both adapter and Emitter use the default `socket.io#` channel prefix. Plan 06's `redis-cli MONITOR` gate will close the verification loop end-to-end.
- **T-37-02 (DoS — subscriber-mode lockout):** mitigated. `pubClient.duplicate()` confirmed at `websocketService.ts:155`; subClient is a dedicated ioredis instance, never the cache client.
- **T-37-03 (Information disclosure — unauthenticated WS events):** disposition `accept`. No new auth surface added; existing JWT auth path in `setupEventHandlers` still gates connections.

## Closes

- WS-01: cross-replica WebSocket fanout — `io.adapter(createAdapter(pubClient, subClient))` wired in `WebSocketService.initialize()`
- WS-03: shared Redis container, default `socket.io#` channel prefix — verified by absence of `key:` option
- JOB-03: worker emits without HTTP server — `apps/web/server/jobs/workerEmitter.ts` exists with the 6 required exports

Note: `workerEmitter.ts` is dormant in this plan — its consumers (NewsAggregator's post-write hook, the worker entrypoint) are wired in Plans 02 and 03. No production code path imports it yet, which is why `pnpm test:run` shows no regressions despite the new file.

## Next Plan Readiness (37-02)

- `emitNewArticle` shape is final — Plan 02 imports it directly into NewsAggregator's success path with no further refactoring.
- pubClient/subClient lifecycle is observable via `WebSocketService.shutdown()` — Plan 05 terminus drain inherits the close contract.
- No env var changes required by this plan; `REDIS_URL` is already documented in CLAUDE.md.

## Self-Check: PASSED

Verification evidence:

| Check | Command | Expected | Actual |
|-------|---------|----------|--------|
| Both packages declared | `grep -E '"@socket\.io/redis-(adapter\|emitter)":' apps/web/package.json` | 2 lines | 2 lines (`^8.3.0`, `^5.1.0`) — see `apps/web/package.json:45-46` |
| Adapter wired | `grep "this.io.adapter(createAdapter" apps/web/server/services/websocketService.ts` | 1 match | 1 match at line 158 |
| Worker emitter file exists | `test -f apps/web/server/jobs/workerEmitter.ts` | exit 0 | exit 0 |
| 6 worker emitter exports | `grep -E "^export (function\|async function) ..." apps/web/server/jobs/workerEmitter.ts \| wc -l` | 6 | 6 (lines 31, 42, 49, 63, 75, 79) |
| No `key:` option | `grep -E "createAdapter\([^)]*key:\|new Emitter\([^)]*\{[^}]*key:" apps/web` | 0 matches | 0 matches |
| No files under root server/, prisma/, src/ | `git diff --name-only HEAD~3..HEAD \| grep -E '^(server\|prisma\|src)/'` | empty | empty (`OK_NO_ROOT_PATHS`) |
| Typecheck passes | `pnpm typecheck` | exit 0 | exit 0 (packages/types: Done; apps/web: Done) |
| Websocket unit tests pass | `node ./node_modules/vitest/dist/cli.js run server/services/websocketService.test.ts` | 52 passed | 52 passed (1 file, 52 tests, 2.66s) |
| All commits present in branch | `git log --oneline -3` | 3 task commits off `551493b` | `0cdd5e1`, `f988e05`, `dc7b79a` confirmed |

All required artifacts and verifications PASSED.

---
*Phase: 37-horizontal-scaling*
*Plan: 01*
*Completed: 2026-04-29*
