---
phase: 37-horizontal-scaling
plan: 02
subsystem: backend/scaling
tags: [horizontal-scaling, run-jobs-gating, prisma-cache, worker-emitter, stateless-replicas]
requires:
  - "@socket.io/redis-emitter (Plan 01)"
  - "CacheService (existing — getOrSet, delPattern)"
  - "Prisma adapter (existing — db/prisma.ts)"
provides:
  - "newsReadService.getArticles / getArticleById / getSources / getSentimentByRegion"
  - "runBootLifecycle({runHttp, runJobs, httpServer, port, onListening})"
  - "RUN_JOBS / RUN_HTTP env-gated boot block in index.ts"
  - "Worker emit hooks in NewsAggregator post-upsert path"
affects:
  - "apps/web/server/routes/news.ts (5 handlers, all async)"
  - "apps/web/server/routes/events.ts (5 handlers, all async)"
  - "apps/web/server/routes/analysis.ts (4 handlers, all async)"
  - "apps/web/server/routes/publicApi.ts (4 handlers, all async)"
  - "apps/web/server/services/newsAggregator.ts (post-upsert emit path)"
  - "apps/web/server/index.ts (boot block, /api/health)"
tech-stack:
  added: []
  patterns:
    - "Stateless function module composing singletons (newsReadService)"
    - "Env-gated boot dispatch (RUN_JOBS / RUN_HTTP)"
    - "Cache-aside via CacheService.getOrSet on every read path"
    - "Worker emits via Socket.IO Emitter through Redis Pub/Sub (no HTTP server)"
key-files:
  created:
    - apps/web/server/services/newsReadService.ts
    - apps/web/server/bootLifecycle.ts
    - apps/web/server/jobs/workerEmitter.ts
    - apps/web/server/__tests__/boot-mode.test.ts
  modified:
    - apps/web/server/routes/news.ts
    - apps/web/server/routes/events.ts
    - apps/web/server/routes/analysis.ts
    - apps/web/server/routes/publicApi.ts
    - apps/web/server/services/newsAggregator.ts
    - apps/web/server/index.ts
decisions:
  - "Default RUN_JOBS=true and RUN_HTTP=true so single-replica dev is unchanged; production web replicas explicitly set RUN_JOBS=false (deviation from plan literal `=== 'true'` which would have broken local dev)"
  - "Extract runBootLifecycle into bootLifecycle.ts (separate module) so the unit tests can drive each branch without importing index.ts (which has 50+ side-effect imports and would open a port)"
  - "Refactor events.ts / analysis.ts / publicApi.ts in addition to the plan-listed news.ts because deleting app.locals.newsAggregator from index.ts would otherwise crash those routes (Pitfall 7 invariant requires zero hits across apps/web/server)"
  - "Stub apps/web/server/jobs/workerEmitter.ts in this worktree so typecheck passes; full implementation is owned by Plan 01 and the orchestrator merge will resolve to Plan 01's version"
  - "Translate handler refactor: read row directly from Prisma (bypass cache before write), call TranslationService.translate, persist translation maps to JSONB, then invalidate news:article:id + news:list:* caches before returning"
  - "Insert detection in newsAggregator: pre-fetch findUnique({where:{url}}) to distinguish insert vs update so emitNewArticle/emitBreakingNews only fire on truly new content"
metrics:
  started: "2026-04-29T02:08:37Z"
  completed: "2026-04-29T02:36:08Z"
  duration: "~27 minutes"
  tasks_completed: "4 / 4"
  files_created: 4
  files_modified: 6
  baseline_tests: 1306
  final_tests: 1312
  net_test_delta: "+6 (boot-mode.test.ts adds 6 cases)"
---

# Phase 37 Plan 02: Stateless Web Replicas + Worker Boot Gating Summary

Web replicas no longer hold in-memory NewsAggregator state — reads route through `newsReadService` (Prisma + CacheService.getOrSet), and the worker process is the single source of truth for write-path broadcasts via Socket.IO Emitter. Closes JOB-01 (RUN_JOBS env-gating), JOB-02 (web replicas drop in-memory Maps), JOB-03 (worker uses Emitter instead of WebSocketService.broadcast in non-HTTP mode), JOB-04 (full refactor in this phase, no follow-up needed).

## What Changed

### New: `apps/web/server/services/newsReadService.ts`
Stateless function module exposing the read API previously sourced from `req.app.locals.newsAggregator`:
- `getArticles({regions, topics, limit, offset, search, sentiment, language})` → `{articles, total}` via `prisma.$transaction([findMany, count])`, cached under `CacheKeys.newsList(JSON.stringify(opts))` with `CACHE_TTL.SHORT` (60s).
- `getArticleById(id)` → `NewsArticle | null`, cached under `CacheKeys.newsArticle(id)` with `CACHE_TTL.MEDIUM` (5min).
- `getSources()` → `NewsSource[]` from `NEWS_SOURCES` config, cached `CACHE_TTL.LONG` (30min).
- `getSentimentByRegion()` → `Record<PerspectiveRegion, {positive, negative, neutral, count}>` via `prisma.newsArticle.groupBy({by: ['perspective','sentiment']})`, cached `CACHE_TTL.SHORT`.

`mapToNewsArticle` helper hydrates the Prisma row into the legacy `NewsArticle` shape (parses double-encoded JSONB strings for `topics`, `entities`, `titleTranslated`, `contentTranslated`).

### Refactored: 5 route files, all handlers async
| File | Handlers | Notes |
|------|---------:|-------|
| `routes/news.ts` | 5 | All async; `POST /:id/translate` reads via Prisma, calls `TranslationService.getInstance().translate`, persists JSONB maps, invalidates `news:article:id` + `news:list:*` caches. All `console.log('[DEBUG] ...)` lines removed. |
| `routes/events.ts` | 5 | `/events/:id` uses `Promise.all` for cached related-article lookups |
| `routes/analysis.ts` | 4 | clusters/summarize/framing/coverage-gaps |
| `routes/publicApi.ts` | 4 | News/events/sentiment endpoints |

`grep "app.locals.newsAggregator" apps/web/server` → 0 hits.

### New: `apps/web/server/bootLifecycle.ts` + boot-mode tests
`runBootLifecycle({runHttp, runJobs, httpServer?, port?, onListening?})` extracted from index.ts so the test file can drive each branch with mocked side-effect modules (NewsAggregator / CleanupService / workerEmitter). Ordering invariant verified by test: `initWorkerEmitter()` runs BEFORE `NewsAggregator.startAggregation()` (Assumption A8).

### Modified: `apps/web/server/index.ts`
- Added `RUN_JOBS` (default true) + `RUN_HTTP` (default true) env constants.
- Removed `const newsAggregator = NewsAggregator.getInstance()` + `app.locals.newsAggregator = newsAggregator` block.
- `/api/health` `articlesCount` now sourced from `prisma.newsArticle.count()` instead of in-memory Map.
- `httpServer.listen` and pool-metrics interval gated on `runHttp` (passed via `runBootLifecycle.onListening`).
- `NewsAggregator.startAggregation`, `CleanupService.start`, `initWorkerEmitter` gated on `runJobs`.
- Stripe webhook ordering at line 113 (BEFORE `express.json()`) preserved — HMAC raw-body invariant intact.

### Modified: `apps/web/server/services/newsAggregator.ts`
Added insert-detection inside the upsert loop: `prisma.newsArticle.findUnique({where:{url}, select:{id:true}})` runs before the upsert; on insert (no existing row) the code calls `emitNewArticle(article)` and (if `sentiment === 'negative' && sentimentScore <= -0.7`) `emitBreakingNews(article)`. JOB-03 cross-replica fanout via Redis Pub/Sub Emitter.

### New stub: `apps/web/server/jobs/workerEmitter.ts`
This worktree creates a no-op stub (initWorkerEmitter / emitNewArticle / emitBreakingNews / emitNewEvent / shutdownWorkerEmitter) so the branch typechecks during parallel execution. The full implementation is owned by Plan 01 (37-01); the orchestrator merge will resolve to Plan 01's version.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add newsReadService (Prisma + CacheService.getOrSet) | `9340d4f` | `apps/web/server/services/newsReadService.ts` |
| 2 | Refactor news/events/analysis/publicApi routes | `ed304cd` | `apps/web/server/routes/{news,events,analysis,publicApi}.ts` |
| 3 | RUN_JOBS / RUN_HTTP env-gated boot + worker emit hooks | `6ae7747` | `apps/web/server/{index.ts, services/newsAggregator.ts, jobs/workerEmitter.ts}` |
| 4 | Boot-mode unit tests + extract runBootLifecycle helper | `c5ea480` | `apps/web/server/{__tests__/boot-mode.test.ts, bootLifecycle.ts, index.ts}` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Refactored events.ts / analysis.ts / publicApi.ts in addition to news.ts**
- **Found during:** Task 2 setup (grep audit before deleting `app.locals.newsAggregator`).
- **Issue:** Plan listed only news.ts under `files_modified`, but `app.locals.newsAggregator` is also read by `routes/events.ts` (5 handlers), `routes/analysis.ts` (4 handlers), and `routes/publicApi.ts` (4 handlers). Deleting the assignment from index.ts (Task 3) would have caused `Cannot read property 'getArticles' of undefined` 500 errors on every request to those routes. The plan's own threat model T-37-05 mitigation says "fully refactor news.ts...and DELETE the `app.locals.newsAggregator = newsAggregator` line" and the plan invariant is `grep -r 'app.locals.newsAggregator' apps/web/server` returning ZERO hits.
- **Fix:** All 13 handlers across events/analysis/publicApi converted to async and rewired to `newsReadService`. `routes/events.ts`'s `/events/:id` uses `Promise.all` for parallel cached related-article lookups.
- **Files modified:** `apps/web/server/routes/{events.ts, analysis.ts, publicApi.ts}` (in addition to plan-listed `news.ts`).
- **Commit:** `ed304cd`

**2. [Rule 1 — Bug] Default `RUN_JOBS = process.env.RUN_JOBS !== 'false'` instead of plan's `=== 'true'`**
- **Found during:** Task 3 design.
- **Issue:** Plan literal `const RUN_JOBS = process.env.RUN_JOBS === 'true'` would default to `false` in local development (where the env var is unset), skipping NewsAggregator.startAggregation(). The plan also says "with RUN_JOBS=true (default for local dev), behavior is unchanged" — those two statements are contradictory. The plan's Task 4 test case C is named "single-replica dev default" implying both flags default true.
- **Fix:** Default to `!== 'false'` for both. Production web replicas explicitly set `RUN_JOBS=false` to opt out.
- **Commit:** `6ae7747`

**3. [Rule 3 — Blocking] Created stub workerEmitter.ts in this worktree**
- **Found during:** Task 3 typecheck.
- **Issue:** Plan instructs `import { emitNewArticle, emitBreakingNews } from '../jobs/workerEmitter'` in newsAggregator.ts and `initWorkerEmitter` import in index.ts. The full module is owned by Plan 01 (running in parallel). Without the file, typecheck fails — violating plan's done criteria `pnpm typecheck exits 0`.
- **Fix:** Created a minimal no-op stub at `apps/web/server/jobs/workerEmitter.ts` matching Plan 01's expected exports. The orchestrator merge will resolve to Plan 01's full implementation (a likely conflict — Plan 01's version wins).
- **Commit:** `6ae7747`

**4. [Rule 1 — Bug] Refactored translate handler to call TranslationService directly**
- **Found during:** Task 2.
- **Issue:** Original handler called `aggregator.translateArticle(id, lang)` which mutates the in-memory Map AND writes back to Postgres. With NewsAggregator no longer constructed on web replicas, this method would be unreachable.
- **Fix:** Web-side handler now: (a) reads the row via `prisma.newsArticle.findUnique`, (b) parses existing JSONB translation maps, (c) calls `TranslationService.getInstance().translate(text, targetLang, sourceLang)` for any missing language, (d) persists merged JSONB maps via `prisma.newsArticle.update`, (e) invalidates `news:article:id` and `news:list:*` caches, (f) returns the freshly cached article.
- **Commit:** `ed304cd`

**5. [Rule 1 — Bug] /api/health articlesCount via Prisma**
- **Found during:** Task 3 (post-deletion of app.locals.newsAggregator).
- **Issue:** `app.get('/api/health', ...)` referenced `newsAggregator.getArticleCount()`. With NewsAggregator removed from the web-replica boot path, this would fail.
- **Fix:** `articlesCount = await prisma.newsArticle.count()` with try/catch fallback to `-1` so health stays a liveness signal even when DB is degraded.
- **Commit:** `6ae7747`

**6. [Process] Initial commits landed on `test-ci-pipeline` branch (main repo) instead of worktree branch**
- **Found during:** Verification after Task 4.
- **Issue:** Bash invocations using `cd D:/NewsHub && ...` ran in the main checkout (which has its own working tree on `test-ci-pipeline`), not in the worktree. Each cd left no persistent state but the file-system writes happened in the wrong tree.
- **Fix:** Cherry-picked the 4 plan-02 commits from `test-ci-pipeline` onto the worktree branch (`worktree-agent-adfbd9dd14d841867`), then reset `test-ci-pipeline` back to `4f8682e` (the Plan 01 commit, which is the rightful HEAD before the misroute). Worktree HEAD is now `c5ea480` with the correct chain. Subsequent commands use relative paths in the worktree's pwd.
- **No content lost:** the cherry-pick is a pure replay — same diffs, new SHAs.

## Threat Mitigations

| Threat ID | Status | Where mitigated |
|-----------|--------|-----------------|
| T-37-04 (Tampering — duplicate writes) | Mitigated | `RUN_JOBS` is the single source of truth for "this replica owns the loop". Plan 04 will pin worker `replicas=1` + `update_config.order=stop-first` (topology contract, complementary). |
| T-37-05 (Information Disclosure — in-memory state) | Mitigated | `app.locals.newsAggregator` removed from index.ts; `grep "app.locals.newsAggregator" apps/web/server` returns zero hits across all of `apps/web/server`. NewsAggregator is no longer constructed on web replicas. |
| T-37-06 (DoS via N+1 queries) | Mitigated | Every newsReadService method wraps Prisma in `CacheService.getOrSet`. List TTL 60s, single-article TTL 5min, sources TTL 30min. Worker invalidation via `cache.delPattern('news:list:*')` and `cache.del(news:article:id)` lives inside Plan 01's full workerEmitter helpers. |

## Verification Evidence

```
$ pnpm typecheck
packages/types typecheck: Done
apps/web typecheck: Done

$ pnpm test:run
Test Files  47 passed (47)
     Tests  1312 passed (1312)
```
(1306 baseline + 6 new boot-mode cases = 1312 total)

Plan invariants (run from worktree root):
- `grep -r "app.locals.newsAggregator" apps/web/server` → 0 hits
- `grep -E "^export (async )?function (getArticles|getArticleById|getSources|getSentimentByRegion)" apps/web/server/services/newsReadService.ts | wc -l` → 4
- `grep -c "console.log" apps/web/server/routes/news.ts` → 0
- `grep -c "newsReadService\." apps/web/server/routes/news.ts` → 5 (≥4)
- `grep -cE "process\.env\.RUN_(JOBS|HTTP)" apps/web/server/index.ts` → 2
- `grep -cE "emitNewArticle|emitBreakingNews|emitNewEvent" apps/web/server/services/newsAggregator.ts` → 5 (≥1)
- Stripe webhook (`/api/webhooks/stripe`) at index.ts line 113, BEFORE `express.json()` at line 116 — invariant preserved.

## Closed Requirements

- INFRA-01 (web replicas stateless / no in-memory aggregator state)
- INFRA-04 (singleton background-jobs worker via env gating)

## TDD Gate Compliance

Plan-level frontmatter has `type: execute`, not `tdd`. Task 4 carries `tdd="true"` and was implemented test-first (the boot-mode.test.ts file was committed in the same commit `c5ea480` as bootLifecycle.ts and the index.ts refactor — the test was written, run, and verified failing against an empty bootLifecycle import; then bootLifecycle.ts was created and the test passed). Task 1 carried `tdd="true"` but the plan's own action block stated "NO unit test in this task — coverage is provided indirectly by the existing routes/news.ts integration tests"; that explicit instruction overrides the attribute.

## Self-Check: PASSED

- [x] `apps/web/server/services/newsReadService.ts` exists with `getArticles`, `getArticleById`, `getSources`, `getSentimentByRegion` (verified via `Grep` count = 4)
- [x] `apps/web/server/bootLifecycle.ts` exists, exports `runBootLifecycle`
- [x] `apps/web/server/jobs/workerEmitter.ts` exists (stub for Plan 01)
- [x] `apps/web/server/__tests__/boot-mode.test.ts` exists, 6 test cases
- [x] All 4 commits exist in worktree: `9340d4f`, `ed304cd`, `6ae7747`, `c5ea480` (verified via `git log`)
- [x] `pnpm typecheck` exits 0 (verified end-of-task and post-cherrypick in worktree)
- [x] `pnpm test:run` 1312 passing (verified end of Task 4 — same code, same node_modules)
- [x] Zero hits for `app.locals.newsAggregator` across `apps/web/server` (verified via `Grep`)
- [x] Zero `console.log` in `apps/web/server/routes/news.ts`
- [x] Stripe webhook ordering preserved (line 113 before line 116)
