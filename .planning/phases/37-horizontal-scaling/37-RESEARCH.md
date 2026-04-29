# Phase 37: Horizontal Scaling - Research

**Researched:** 2026-04-29
**Domain:** Container orchestration, connection pooling, distributed WebSocket fanout, zero-downtime deployment
**Confidence:** HIGH (locked decisions in CONTEXT.md eliminate most ambiguity; remaining choices verified against current docs)

## Summary

Phase 37 turns the current single-container NewsHub deployment into a horizontally-scaled topology that handles 30k concurrent users. Four locked decision blocks (WS-01..WS-04, DB-01..DB-04, JOB-01..JOB-04, DEPLOY-01..DEPLOY-05) already pin the architecture: `@socket.io/redis-adapter` for cross-replica WebSocket fanout, Traefik with cookie-sticky load balancing on `nh_sticky`, PgBouncer transaction-mode pooling between Prisma and Postgres, a singleton `app-worker` Swarm service for RSS/cleanup/digests gated by `RUN_JOBS=true`, separate `stack.yml` for Swarm, multi-region as documentation only.

The remaining research surface is the *how*: which library/image versions, the exact connection-string shape, where the Socket.IO Redis Emitter binds in the worker, how SIGTERM drain orders its steps, and the validation recipe for cross-replica fanout. All Claude's Discretion items are resolved below with rationale.

**Primary recommendation:** Use Traefik v3.x Docker Swarm provider with labels at `deploy.labels` (NOT container labels — Swarm-mode requirement); use `edoburu/pgbouncer` for the pool because it auto-builds `userlist.txt` from env vars (smaller cognitive surface than rolling your own); env-gate `RUN_JOBS` inside `apps/web/server/index.ts` (no separate Dockerfile entrypoint — saves a stage and a CI artifact); use `@godaddy/terminus` for graceful shutdown to standardize the readiness flip + cleanup hook orchestration; keep `prometheus-community/pgbouncer_exporter` v0.12.0 (latest, March 2026) for the pool-saturation alert.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HTTP request routing & TLS termination | Edge / Load Balancer (Traefik) | — | Single ingress for cookie sticky + cross-replica health checks |
| HTTP API request handling (stateless) | API / Backend (`app` replicas) | — | Express + Prisma; horizontally replicable because no in-memory state |
| WebSocket connection (long-lived) | API / Backend (`app` replicas) + Edge sticky | Redis adapter | Sticky cookie pins handshake to one replica; adapter fans messages across all replicas |
| RSS aggregation, dedup, AI enrichment | Background Jobs (`app-worker`) | — | Singleton: must run on exactly one node to prevent duplicate writes |
| Cleanup (unverified accounts, analytics, shares) | Background Jobs (`app-worker`) | — | Singleton: idempotent but daily cron pattern wants single owner |
| Email digest scheduling | Background Jobs (`app-worker`) | — | Singleton |
| News read path (list/detail/sentiment) | API / Backend (`app` replicas) | Database + Redis cache | Reads route via Prisma + `CacheService`; in-memory Maps removed from web replicas (JOB-02) |
| Database access | Database (Postgres) | PgBouncer pool | All app+worker connections go through PgBouncer; only `prisma migrate` uses `DIRECT_URL` |
| Redis pub/sub for Socket.IO fanout | Cache / Pub-Sub (Redis) | — | Adapter uses its own `socket.io#` channel namespace; no collision with `newshub:` cache keys |
| Metrics scraping | Monitoring (Prometheus) | All app replicas + pgbouncer-exporter + worker | Multi-target scrape config |

## User Constraints (from CONTEXT.md)

> All Decisions, Discretion, and Deferred items are copied verbatim from `37-CONTEXT.md` so the planner can verify compliance without cross-reading.

### Locked Decisions

**WebSocket fanout**
- WS-01: `@socket.io/redis-adapter` for cross-replica broadcast fanout (`news:new`, `news:breaking`, `event:new`, `comment:new`, `team:bookmark:new`)
- WS-02: Traefik cookie-based sticky sessions, cookie name `nh_sticky` (NOT IP hash)
- WS-03: Reuse existing Redis 7.4-alpine container; adapter uses `socket.io#` channel prefix — no collision with `newshub:` cache namespace
- WS-04: Verification gate = docker-compose-based integration test booting >=2 web replicas behind Traefik, 2 Socket.IO clients, emit on replica A asserts client on replica B receives the event

**Database connection pooling**
- DB-01: PgBouncer transaction pool mode; `DATABASE_URL` includes `?pgbouncer=true`; no `LISTEN/NOTIFY`, advisory locks, or session-scoped state in codebase
- DB-02: `DIRECT_URL` bypasses PgBouncer for `prisma migrate deploy` / `prisma db push`
- DB-03: Topology — 4 web replicas × Prisma `max:20` -> PgBouncer `default_pool_size:25` -> Postgres `max_connections:200`
- DB-04: `prometheus-pgbouncer-exporter` for `cl_active`/`cl_waiting`/`sv_active`/`sv_idle`; Prisma `getPoolStats()` exposed as Prometheus gauges; Alertmanager rule on `pgbouncer_pools_client_waiting > 0` for 1m

**Singleton background jobs**
- JOB-01: `app-worker` Swarm service replicas=1, same image as `app`, env `RUN_JOBS=true`. Web replicas run `RUN_JOBS=false` and skip `NewsAggregator.startAggregation()`, `cleanupService`, email-digest schedulers
- JOB-02: Web replicas no longer hold in-memory aggregator Maps; news reads go through Prisma + `CacheService`. Worker invalidates cache keys on new articles
- JOB-03: Worker emits real-time events using a Socket.IO `Emitter` bound to the Redis adapter — no HTTP server on worker
- JOB-04: Full refactor in Phase 37 (no follow-up phase)

**Swarm deployment artifact**
- DEPLOY-01: Separate `stack.yml`; `docker-compose.yml` stays untouched for local dev
- DEPLOY-02: Validation = 4 web replicas + 1 worker on single-host Swarm. CI-runnable
- DEPLOY-03: Multi-region = `docs/multi-region-patterns.md` only
- DEPLOY-04: `/api/health` (liveness) vs `/api/ready` (readiness; flips false on SIGTERM). Traefik health check uses `/api/ready`
- DEPLOY-05: SIGTERM drain — stop accept, broadcast disconnect to Socket.IO with 30s grace, close Prisma pool, exit

### Claude's Discretion (resolved in this research)

| Item | Resolution | Rationale |
|------|-----------|-----------|
| Traefik service-discovery mechanism | Docker provider with Swarm labels at `deploy.labels` | Native to Swarm; no extra config file. See "Traefik Configuration" §below |
| TLS termination location | Documented as out-of-scope per CONTEXT.md (Traefik handles it if a cert is mounted; no constraint flagged) | Single-host Swarm validation doesn't require TLS |
| PgBouncer image | `edoburu/pgbouncer:1.23.1` | Auto-generates `userlist.txt` from env vars; 15 MB Alpine; battle-tested. See "PgBouncer Configuration" §below |
| Prometheus exporter | `prometheuscommunity/pgbouncer-exporter:v0.12.0` | Latest (March 2026), official Prometheus Community lineage |
| Worker entrypoint approach | **Env-gated branching in `server/index.ts`** (not a separate entrypoint script) | Same image, smaller surface, no second build target. See "Worker Entrypoint" §below |

### Deferred Ideas (OUT OF SCOPE)

- Multi-host Swarm — single-host validation only
- Active-active multi-region (INFRA-F01) — INFRA-05 is documentation only
- Kubernetes migration (INFRA-F02)
- CDN edge caching (INFRA-F03)
- Redis HA (Sentinel / cluster) — single Redis is the SPOF accepted for this phase
- Autoscaling policies — `deploy.replicas` is the success criterion
- Dedicated Redis for Socket.IO pub/sub
- Node-process clustering inside a replica

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | System can horizontally scale to N replicas via Docker Swarm | `stack.yml` topology §Standard Stack; `deploy.replicas` in §Architecture Patterns |
| INFRA-02 | Load balancer (Traefik) distributes traffic across replicas with health checks | Traefik v3 sticky cookie + healthcheck labels §"Traefik Configuration" |
| INFRA-03 | Connection pooling (PgBouncer) handles 100+ concurrent database connections | `edoburu/pgbouncer` transaction-pool sizing math §"PgBouncer Configuration" |
| INFRA-04 | WebSocket connections maintain sticky sessions across replicas | `@socket.io/redis-adapter` + Traefik `nh_sticky` cookie §"Socket.IO Redis Adapter Wiring" |
| INFRA-05 | Architecture supports future multi-region deployment (documented patterns) | `docs/multi-region-patterns.md` outline §"Multi-Region Patterns Doc Structure" |

## Project Constraints (from CLAUDE.md)

The planner must verify compliance with these directives:

- **Tech stack pinning:** Express 5, Prisma 7 with `@prisma/adapter-pg`, Socket.IO 4.8, ioredis 5.10, Redis 7.4-alpine, Postgres 17. New libraries must be compatible.
- **Monorepo paths:** All source code lives under `apps/web/server/...`. Never under root `server/`, `prisma/`, `src/`, or `e2e/` (per `.planning/.continue-here.md` D-11 anti-pattern marker — milestone-36 hardened this).
- **JWT is stateless:** No shared session store needed; multi-replica is already correct.
- **Webhook route MUST be before `express.json()`:** Already correctly mounted in `apps/web/server/index.ts:113`. Any SIGTERM drain refactor must preserve this ordering.
- **Test coverage gate: 80% (Vitest):** New code (worker entrypoint, drain handler, refactored news routes) must keep coverage at or above 80%.
- **Singleton service pattern (`getInstance()`):** Existing pattern; Phase 37 doesn't break it. The pattern's *meaning* changes — `RUN_JOBS=true` means "this replica owns startup", `RUN_JOBS=false` means "this replica only consumes outputs".
- **`pnpm validate:ci`:** Workflow file edits (none expected here) must pass.
- **Sentry uploads:** No source-map changes; CI build flow unaffected.

## Standard Stack

### Core (new packages to install)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@socket.io/redis-adapter` | `^8.4.x` | Cross-replica fanout for `io.emit()` from any web replica | Official Socket.IO adapter; works with `socket.io@4.8` (current) [VERIFIED: socket.io docs] |
| `@socket.io/redis-emitter` | `^5.1.x` | Emit Socket.IO events from a non-HTTP-server process (the worker) | Companion package to redis-adapter; binds to same Redis Pub/Sub channels [VERIFIED: socket.io docs] |
| `@godaddy/terminus` | `^4.12.1` | SIGTERM drain orchestration: readiness flip, cleanup hooks, timeout enforcement | Last release Jun 2023; still the de-facto Express graceful-shutdown library [VERIFIED: github.com/godaddy/terminus] |

**Note on terminus age:** Terminus has been stable since 2019 — no recent releases doesn't mean abandoned, it means the API is mature. The library's surface is tiny (~5 hooks) and the implementation is ~300 lines. Alternative `lightship` is Kubernetes-flavored; `stoppable` only handles HTTP keep-alive draining (one piece of the puzzle). For the multi-step drain CONTEXT.md mandates (readiness flip → broadcast → wait → close pool), terminus has the right shape. [VERIFIED: github.com/godaddy/terminus, README]

### Supporting (already in project)

| Library | Version (in lockfile) | Purpose | When to Use |
|---------|---------|---------|-------------|
| `socket.io` | `^4.8.3` | WebSocket server | Already wired; just add `io.adapter(...)` call |
| `ioredis` | `^5.10.1` | Redis client (used by CacheService and rate limiter) | Reuse for `pubClient`/`subClient` (`.duplicate()` per Socket.IO docs) |
| `prom-client` | `^15.1.3` | Prometheus metrics | Add gauges for `prisma_pool_total`, `prisma_pool_idle`, `prisma_pool_waiting` |
| `@prisma/adapter-pg` | `^7.7.0` | Postgres driver adapter | DB-01: `?pgbouncer=true` flag goes in connection string |
| `dotenv` | `^17.3.1` | env loading | Already loaded first in `server/index.ts:2` |

### Container Images

| Image | Tag | Purpose | Confidence |
|-------|-----|---------|-----------|
| `traefik` | `v3.3` (or latest 3.x at execution time) | Edge LB + service discovery | HIGH [VERIFIED: doc.traefik.io] |
| `edoburu/pgbouncer` | `1.23.1` | Transaction-pool PgBouncer | HIGH [VERIFIED: github.com/edoburu/docker-pgbouncer README; auto-generates userlist.txt from env] |
| `prometheuscommunity/pgbouncer-exporter` | `v0.12.0` | Pool metrics scrape target | HIGH [VERIFIED: github.com/prometheus-community/pgbouncer_exporter releases — latest March 2026] |
| `postgres` | `17` | Database (already used) | HIGH [VERIFIED: docker-compose.yml] |
| `redis` | `7.4-alpine` | Cache + pub/sub (already used) | HIGH [VERIFIED: docker-compose.yml] |
| `prom/prometheus` | `v3.4.0` | Metrics aggregator (already used) | HIGH [VERIFIED: docker-compose.yml] |
| `prom/alertmanager` | `v0.28.1` | Alert routing (already used) | HIGH [VERIFIED: docker-compose.yml] |
| `grafana/grafana-oss` | `13.0.1` | Dashboards (already used) | HIGH [VERIFIED: docker-compose.yml] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `edoburu/pgbouncer` | `bitnami/pgbouncer` | Bitnami images are heavier (~80 MB), better non-root defaults, but require explicit `userlist.txt` mount. Edoburu wins on simplicity for this phase |
| `edoburu/pgbouncer` | Official `pgbouncer/pgbouncer` (none on Docker Hub as of research date) | No official upstream image — community choice is forced |
| `@godaddy/terminus` | Hand-rolled SIGTERM handler | Existing handler in `server/index.ts:499-518` already exists; terminus replaces it with a structured beforeShutdown/onSignal split that maps cleanly to readiness-flip + cleanup |
| `@godaddy/terminus` | `lightship` | Lightship is Kubernetes-native (assumes `/live`/`/ready` paths, exits faster). Terminus is HTTP-server-native and gives finer hook control |
| Traefik v3 | nginx + sticky module | Traefik discovers Swarm services via labels; nginx needs templating + reload. Traefik wins on operational simplicity for Swarm |
| Single-image worker (env-gated) | Separate `Dockerfile.worker` | Two images = two CI build steps + two registry pushes. Env gating costs ~3 lines in `index.ts`. Single image wins. See "Worker Entrypoint" §below |

**Installation:**

```bash
cd apps/web
pnpm add @socket.io/redis-adapter @socket.io/redis-emitter @godaddy/terminus
```

**Version verification note:** `npm view <pkg> version` returned empty in this research session due to a local registry config issue (`.npmrc` warnings about pnpm-only keys). All version numbers above are verified against the package's GitHub releases or official docs page. The planner should re-run `pnpm view <pkg>` at execution time and pin the exact version installed.

## Architecture Patterns

### System Architecture Diagram

```
                           +------------------+
                           |  Traefik (LB)    |
                           |  :80, :443       |  cookie sticky: nh_sticky
                           |  /api/ready hc   |  routing: Host-based
                           +--------+---------+
                                    |
                        +-----------+------------+
                        |   Swarm overlay net    |
                        +---+------+------+--+---+
                            |      |      |  |
                            v      v      v  v
                        +------+------+------+------+
                        | app  | app  | app  | app  |   replicas: 4
                        | r1   | r2   | r3   | r4   |   stateless web
                        |      |      |      |      |   RUN_JOBS=false
                        +--+---+--+---+--+---+--+---+
                           |      |      |      |
            +--------------+------+------+------+--------------+
            |                                                   |
            v                                                   v
      +-----------+                                       +-----------+
      | Redis     |<--------- pub/sub channel ----------->|app-worker |
      | 7.4-alp   |           socket.io#newshub#          |replicas:1 |
      | port 6379 |                                       |RUN_JOBS=  |
      +-----------+                                       |  true     |
            ^                                             +-----+-----+
            | adapter binds                                     |
            | (pubClient/                                       | RSS, AI,
            |  subClient)                                       | cleanup,
            |                                                   | digests
            v                                                   |
      +-----------+        +-----------+         +--------------+
      | PgBouncer |<-------+ all       |         |              |
      | 1.23.1    |        | Prisma    |         |              |
      | port 6432 |        | clients   |<--------+              |
      | tx-pool   |                                             |
      | size 25   |                                             |
      +-----+-----+                                             |
            |                                                   |
            | DIRECT_URL (5432) only used by                    |
            v   prisma migrate (one-shot tasks)                 |
      +-----------+                                             |
      | Postgres  |<--------------------------------------------+
      | 17        |
      | max_conn  |
      |  =200     |
      +-----------+

      Sidecars (separate services, scrape targets):
        prometheus -> { app:3001/metrics × N, pgbouncer-exporter:9127/metrics, app-worker:3002/metrics }
        pgbouncer-exporter -> connects to pgbouncer admin db on 6432
        alertmanager -> webhook to ops channel
        grafana -> reads from prometheus
```

### Recommended Project Structure

```
NewsHub/
├── stack.yml                       # NEW: Swarm production topology
├── docker-compose.yml              # UNCHANGED: local dev
├── pgbouncer/                      # NEW: PgBouncer config dir
│   ├── pgbouncer.ini.template      # mounted, env-substituted at boot
│   └── userlist.txt.template       # auto-generated by edoburu image
├── docs/
│   └── multi-region-patterns.md    # NEW: INFRA-05 deliverable
├── apps/web/server/
│   ├── index.ts                    # MODIFIED: env-gated RUN_JOBS branching, terminus drain
│   ├── jobs/                       # NEW directory for worker-only code
│   │   └── workerEmitter.ts        # NEW: Socket.IO Emitter wiring
│   ├── services/
│   │   ├── newsAggregator.ts       # MODIFIED: remove in-memory Maps from read path
│   │   ├── websocketService.ts     # MODIFIED: io.adapter(...) wired in initialize()
│   │   └── cleanupService.ts       # MODIFIED: gated by RUN_JOBS (no behavior change)
│   ├── routes/
│   │   └── news.ts                 # MODIFIED: Prisma + CacheService instead of req.app.locals.newsAggregator
│   └── db/
│       └── prisma.ts               # MODIFIED: getPoolStats() wired to prom-client gauges
├── e2e-stack/                      # NEW: WS-04 verification harness
│   ├── docker-compose.test.yml     # 2 replicas + traefik + redis + pg
│   └── ws-fanout.test.ts           # vitest spec
└── prometheus/
    └── prometheus.yml              # MODIFIED: add pgbouncer-exporter scrape target
    └── alert.rules.yml             # MODIFIED: add PgBouncerPoolSaturation rule
```

### Pattern 1: Env-Gated Worker Branching in Single Entrypoint

**What:** A single image, single entrypoint, single build artifact. The `RUN_JOBS=true|false` env var decides whether the booting process starts schedulers or just serves HTTP.

**When to use:** When the worker code is a strict subset of the web code (it is here — the worker uses `NewsAggregator`, `CleanupService`, etc., all already in the codebase).

**Example:**

```typescript
// apps/web/server/index.ts (modified)
// Source: pattern derived from CONTEXT.md JOB-01

const RUN_JOBS = process.env.RUN_JOBS === 'true';
const RUN_HTTP = process.env.RUN_HTTP !== 'false'; // default true

if (RUN_HTTP) {
  // existing HTTP server setup, terminus drain, Socket.IO with adapter
  httpServer.listen(PORT, () => { /* ... */ });
}

if (RUN_JOBS) {
  // schedulers
  newsAggregator.startAggregation().catch(err => logger.error(err));
  CleanupService.getInstance().start();
  // email-digest scheduler (currently inline in server/index.ts; extract if needed)

  // Worker emits via Emitter bound to Redis adapter (JOB-03)
  // No HTTP server needed for the worker, but if RUN_HTTP=true is also set
  // (e.g. running locally), the emitter and the in-process io are both available.
  if (!RUN_HTTP) {
    // Pure-worker mode: construct the Emitter directly
    initWorkerEmitter();
  }
}
```

**Worker variant in `stack.yml`** sets `RUN_HTTP=false` and `RUN_JOBS=true`. Web variant sets `RUN_HTTP=true` (default) and `RUN_JOBS=false`. This is the **picked discretion item**: same image, two services, no second Dockerfile.

### Pattern 2: Socket.IO Redis Adapter on the Server

**What:** Wrap `io = new Server(httpServer, ...)` with `io.adapter(createAdapter(pubClient, subClient))` so that an `io.emit('news:new', article)` on replica-A reaches clients connected to replica-B.

**When to use:** Always, when there are >1 web replicas. Mandatory for WS-01.

**Example:**

```typescript
// apps/web/server/services/websocketService.ts (modified initialize())
// Source: socket.io v4 official docs (https://socket.io/docs/v4/redis-adapter/)
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

initialize(httpServer: HttpServer): void {
  this.io = new Server(httpServer, { cors: { /* existing */ }, pingTimeout: 60000, pingInterval: 25000 });

  // WS-01: Redis adapter for cross-replica fanout
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const pubClient = new Redis(redisUrl, { lazyConnect: false });
  const subClient = pubClient.duplicate();
  this.io.adapter(createAdapter(pubClient, subClient));

  this.setupEventHandlers();
  logger.info('✓ WebSocket server initialized with Redis adapter');
}
```

**Critical note:** `pubClient.duplicate()` is required by Socket.IO docs — the subscriber connection must be separate (subscribed connections cannot issue other commands). Do NOT reuse `CacheService.getClient()` directly because that client is shared with rate-limit-redis.

### Pattern 3: Socket.IO Emitter from Worker (No HTTP Server)

**What:** A light-weight Emitter binds to the same Redis Pub/Sub channels as the adapter. From the worker process, `emitter.emit('news:new', article)` reaches every connected web client transparently.

**When to use:** In the `app-worker` process where there's no `Server` instance to call `.emit()` on (no HTTP listener).

**Example:**

```typescript
// apps/web/server/jobs/workerEmitter.ts (NEW)
// Source: socket.io v4 official docs (https://socket.io/docs/v4/redis-adapter/) — Emitter section
import { Emitter } from '@socket.io/redis-emitter';
import { Redis } from 'ioredis';
import type { NewsArticle, GeoEvent } from '../../src/types';

let emitter: Emitter | null = null;

export function initWorkerEmitter(): Emitter {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisClient = new Redis(redisUrl);
  emitter = new Emitter(redisClient);
  return emitter;
}

export function getWorkerEmitter(): Emitter {
  if (!emitter) throw new Error('Worker emitter not initialized');
  return emitter;
}

// Then in NewsAggregator.fetchAllSources, after a successful upsert:
//   getWorkerEmitter().emit('news:new', article);
//   getWorkerEmitter().to(`region:${article.perspective}`).emit('news:new', article);
```

**Channel namespace note:** WS-03 says "adapter uses `socket.io#` channel prefix — no collision with `newshub:` cache namespace". The Emitter must use the *same* default channel prefix (no `key` option override) so it lands in the same broker. ioredis's `keyPrefix` config does NOT apply to pub/sub channel names, so passing the cache-prefixed client wouldn't break anything — but creating a fresh ioredis instance is cleaner. [CITED: socket.io/docs/v4/redis-adapter/]

### Pattern 4: News Read-Path Refactor (Prisma + CacheService)

**What:** Replace `req.app.locals.newsAggregator.getArticles(...)` with a service that queries Prisma directly and caches via Redis.

**When to use:** Required by JOB-02. Web replicas must NOT hold the in-memory Maps; the worker still does (it owns the write path), but reads must be Postgres-sourced.

**Example:**

```typescript
// apps/web/server/services/newsReadService.ts (NEW)
// Source: pattern derived from CONTEXT.md JOB-02; CacheService API at apps/web/server/services/cacheService.ts:259
import { prisma } from '../db/prisma';
import { CacheService, CacheKeys, CACHE_TTL } from './cacheService';
import type { PerspectiveRegion, Sentiment, NewsArticle } from '../../src/types';

interface ListOptions {
  regions?: PerspectiveRegion[];
  topics?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  sentiment?: Sentiment;
}

export async function getArticles(opts: ListOptions = {}): Promise<{ articles: NewsArticle[]; total: number }> {
  const cache = CacheService.getInstance();
  const cacheKey = CacheKeys.newsList(JSON.stringify(opts));  // existing helper

  return cache.getOrSet(cacheKey, async () => {
    const where: Record<string, unknown> = {};
    if (opts.regions?.length) where.perspective = { in: opts.regions };
    if (opts.sentiment) where.sentiment = opts.sentiment;
    if (opts.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { content: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    // topics filter — JSONB, use Prisma `path` query OR fallback to raw query if needed
    // (existing GIN index on topics per schema.prisma:46)

    const [articles, total] = await prisma.$transaction([
      prisma.newsArticle.findMany({
        where,
        take: opts.limit || 20,
        skip: opts.offset || 0,
        orderBy: { publishedAt: 'desc' },
        include: { source: true },
      }),
      prisma.newsArticle.count({ where }),
    ]);
    // map to NewsArticle shape (use existing fromPrismaArticle helper)
    return { articles: articles.map(mapToNewsArticle), total };
  }, CACHE_TTL.SHORT);  // 60s cache; worker invalidates on writes
}
```

**Cache invalidation:** `WebSocketService.broadcastNewArticle` already calls `cache.delPattern('news:list:*')` (`websocketService.ts:309`). Move this hook to the worker's emit path (since the worker now broadcasts), and ensure the worker has a `CacheService` instance available (it does — it's a singleton, just don't auto-connect a Socket.IO server in the worker).

### Pattern 5: Graceful Shutdown via Terminus

**What:** Replace the inline SIGTERM handler in `server/index.ts:499-518` with `createTerminus(httpServer, {...})`. Map `beforeShutdown` to "flip readiness false", `onSignal` to cleanup hooks (Socket.IO drain, Prisma pool close, Redis quit).

**When to use:** Required by DEPLOY-04 and DEPLOY-05.

**Example:**

```typescript
// apps/web/server/index.ts (NEW shutdown block, replaces lines 499-521)
// Source: github.com/godaddy/terminus README + CONTEXT.md DEPLOY-05 ordering
import { createTerminus } from '@godaddy/terminus';

let isShuttingDown = false;

createTerminus(httpServer, {
  signals: ['SIGTERM', 'SIGINT'],
  timeout: 30_000,                           // DEPLOY-05: 30s grace

  // 1. Flip readiness false (so Traefik stops sending new traffic)
  beforeShutdown: async () => {
    isShuttingDown = true;
    logger.info('shutdown:beforeShutdown — readiness now false');
    // Give Traefik one health-check interval to notice (~10s default)
    await new Promise(r => setTimeout(r, 10_000));
  },

  // 2. Cleanup: Socket.IO disconnect, Prisma pool, Redis, services
  onSignal: async () => {
    logger.info('shutdown:onSignal — closing connections');
    await wsService.shutdown();              // notifies clients, closes io
    await cacheService.shutdown();           // ioredis quit
    aiService.shutdown();
    CleanupService.getInstance().stop();
    await prisma.$disconnect();              // close pool
  },

  healthChecks: {
    '/api/ready': async () => {
      if (isShuttingDown) throw new Error('shutting down');
      // existing readiness checks (DB ping + Redis ping)
      await prisma.$queryRaw`SELECT 1`;
      if (!cacheService.isAvailable()) throw new Error('redis not ready');
      return { status: 'ready' };
    },
  },

  logger: (msg, err) => err ? logger.error(msg, err) : logger.info(msg),
});

// /api/health (liveness) stays as the existing simple handler — process is up
```

**Signal flow on Swarm rolling update:**
1. Swarm sends SIGTERM to the container
2. Terminus `beforeShutdown` fires → `isShuttingDown=true` → next `/api/ready` poll returns 503
3. Traefik marks the replica unhealthy → stops routing new requests to it
4. Existing in-flight requests continue (10s grace inside `beforeShutdown`)
5. Terminus `onSignal` fires → Socket.IO emits maintenance notification → ioredis quits → Prisma `$disconnect()`
6. HTTP server is closed; process exits cleanly within 30s

### Anti-Patterns to Avoid

- **Storing `req.app.locals.newsAggregator` reads on the web replica:** This is the explicit JOB-02 violation. Web replicas must read from Prisma + Redis. Compromise: keep the worker's in-memory Maps for write-path performance (deduplication, similarity scoring), but never expose them to web routes.
- **Sharing the ioredis client between cache + rate-limit + Socket.IO subscriber:** ioredis subscribers go into a "subscriber mode" that blocks regular commands. Use `pubClient.duplicate()` per docs.
- **Putting Traefik labels at container level under `services.app.labels`:** In Swarm mode, labels MUST be under `services.app.deploy.labels` to be visible to Traefik's Swarm provider. Standalone Docker reads `services.app.labels` — Swarm reads `deploy.labels`. [VERIFIED: doc.traefik.io reference]
- **Sticky cookie on the wrong domain or with `sameSite: strict`:** If the frontend and API live on the same origin, default `sameSite: lax` works. With `sameSite: strict` the cookie won't be sent on top-level navigations from external links — breaks shared-article links.
- **Forgetting `?pgbouncer=true` on `DATABASE_URL`:** Prisma will issue prepared statements that PgBouncer in transaction mode cannot reuse across transactions; you'll get either errors ("prepared statement already exists") or silent connection failures. Locked in DB-01.
- **Using `prisma migrate` against `DATABASE_URL`:** The Schema Engine opens a single connection and assumes session-scoped state; PgBouncer transaction mode breaks it. Use `DIRECT_URL`. Locked in DB-02.
- **Single Redis ioredis instance shared between adapter pubClient and adapter subClient:** Causes subscriber mode lockout. Use `.duplicate()`.
- **Removing the inline raw-body parser before `/api/webhooks/stripe`:** Stripe HMAC verification reads `req.rawBody`. The current ordering at `server/index.ts:113-123` is load-bearing. Any terminus refactor must NOT touch this block.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-replica WebSocket fanout | A custom Redis pub/sub layer with ad-hoc message envelope | `@socket.io/redis-adapter` | Adapter handles room sync, sticky-binding, reconnects, presence — many edge cases [VERIFIED: socket.io docs] |
| Emit-from-worker (non-HTTP) | A custom HTTP/internal-API call to a web replica | `@socket.io/redis-emitter` | Emitter writes directly to the same pub/sub channels, no HTTP hop |
| Cookie-based sticky session | A custom Express middleware that sets a cookie + reverse-proxy mapping | Traefik `loadBalancer.sticky.cookie` | Edge handles it; replicas don't even know they're sticky |
| PgBouncer pool monitoring | Custom psql admin queries from a cron job exporting to Prometheus textfile | `prometheuscommunity/pgbouncer-exporter` | Maintained by Prometheus Community; exposes 8+ pool metrics in standard naming convention [VERIFIED: github releases] |
| SIGTERM drain ordering | Hand-coded `process.on('SIGTERM', ...)` with arrays of cleanup callbacks | `@godaddy/terminus` | Standardizes the readiness-flip → grace-period → cleanup → exit ordering with a timeout safety [VERIFIED: github.com/godaddy/terminus README] |
| `userlist.txt` generation | A bash script that md5-hashes the password and writes the file at boot | `edoburu/pgbouncer` env-driven generation | The image does it. Mounting a static `userlist.txt` defeats the purpose [VERIFIED: github.com/edoburu/docker-pgbouncer README] |
| Multi-region docs (vendor templates) | Cloudflare/Fly.io/AWS deployment recipes | Architecture-only markdown | DEPLOY-03 explicitly forbids vendor templates |

**Key insight:** Distributed systems are mostly *configuration*, not code. Every line of orchestration code Phase 37 ships is a line that can drift from upstream behavior — the Socket.IO adapter, Traefik sticky, PgBouncer pooling, terminus drain are all battle-tested upstream. The only code Phase 37 *must* write is (a) the env-gating in `index.ts`, (b) the worker emitter init, (c) the news-read refactor, (d) the integration test.

## Runtime State Inventory

> Phase 37 is a refactor: extracting state from in-memory Maps and singleton processes into shared infrastructure (Postgres + Redis). The state inventory matters because the cutover MUST not lose anything that's currently live.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | Postgres tables (Phase 13/34): `NewsArticle`, `NewsSource`, `User`, `Bookmark`, `ReadingHistory`, `StoryCluster`, `Comment`, `Team*`, `ApiKey`, `ProcessedWebhookEvent`, etc. — all already persistent. NewsAggregator's in-memory `articles[]`, `topicIndex`, `entityIndex`, `articleMap` are CACHES of Postgres data, not authoritative. | No data migration. The web-side Maps disappear; Postgres is unchanged. Worker keeps its Maps (for write-path dedup) but they're rebuilt from `loadLatestArticles()` on boot. |
| **Live service config** | `prometheus.yml` (single scrape target `app:3001`); `alert.rules.yml`; `alertmanager.yml`. Grafana dashboards in `grafana/provisioning/`. | Update `prometheus.yml` to scrape `app` (Swarm DNS round-robins to all replicas) + `pgbouncer-exporter:9127` + `app-worker:3002`. Add new alert rule for PgBouncer saturation (DB-04). |
| **OS-registered state** | None — the project runs in Docker; no Windows Task Scheduler, launchd, systemd registrations. | None. |
| **Secrets and env vars** | `.env`: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, AI keys, OAuth keys, Stripe keys, SMTP. Docker Compose passes via `env_file`. | Add `RUN_JOBS`, `RUN_HTTP`, `DIRECT_URL`. `DATABASE_URL` value changes (now points at PgBouncer:6432 with `?pgbouncer=true`); `DIRECT_URL` is the *old* `DATABASE_URL` value (Postgres:5432). Document in `.env.example`. |
| **Build artifacts / installed packages** | `apps/web/dist/`, `apps/web/src/generated/prisma/`, `apps/web/node_modules/`. Dockerfile rebuilds all of these. | New deps (`@socket.io/redis-adapter`, `@socket.io/redis-emitter`, `@godaddy/terminus`) need a fresh `pnpm install` and image rebuild. Worker uses the same image — no new artifact. |

**Nothing found in category "OS-registered state":** Verified by grep on `/etc/systemd`, `Task Scheduler`, `launchctl` — none referenced in repo or CLAUDE.md. The project is container-native.

## Common Pitfalls

### Pitfall 1: Prepared Statement Errors with PgBouncer Transaction Mode

**What goes wrong:** Prisma issues prepared statements with auto-generated names; PgBouncer recycles backend connections per-transaction; the next transaction lands on a different backend connection and "ERROR: prepared statement 'sNN' does not exist".

**Why it happens:** Prepared statements are session-scoped in Postgres; transaction-mode pooling violates session affinity.

**How to avoid:** Set `?pgbouncer=true` in `DATABASE_URL`. Prisma 7 + `@prisma/adapter-pg` recognizes this flag and disables the prepared-statement cache. [VERIFIED: prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer]

**Warning signs:** Sporadic 500s with "prepared statement does not exist" in logs, especially under load (when the pool actually recycles connections).

### Pitfall 2: WebSocket Handshake Fails Behind Load Balancer

**What goes wrong:** Engine.IO's default transport upgrade flow involves an initial HTTP polling request, then a WebSocket upgrade. Without sticky sessions, the upgrade lands on a different replica and the session ID is unknown.

**Why it happens:** Long-poll transport uses sequential HTTP requests; the upgrade request is a separate connection.

**How to avoid:** WS-02 sticky cookie. Verify cookie attribute set: `sameSite=lax` (default), `httpOnly=true`, `secure=true` if HTTPS, `maxAge` >= the session lifetime. Optionally, pin the client to WebSocket transport only (`io({ transports: ['websocket'] })`) — but this breaks fallback for restrictive proxies.

**Warning signs:** "Session ID unknown" errors in client console; sporadic disconnects right after page load.

### Pitfall 3: Worker Emits to Adapter, Web Replicas Don't Receive

**What goes wrong:** The worker initializes the Emitter with a fresh ioredis client; the web replica's Socket.IO server uses the adapter (also against Redis). They share the same Redis but use different channel prefixes. Events are published but never consumed.

**Why it happens:** `Emitter` and `createAdapter` use the same default channel name (`socket.io#`) — but if either is constructed with a custom `key` option, they diverge silently.

**How to avoid:** Use defaults. Don't pass `key` to either constructor. Verify by `redis-cli MONITOR` while emitting from worker — you should see `PUBLISH socket.io#/#` traffic. [VERIFIED: socket.io/docs/v4/redis-adapter/]

**Warning signs:** Worker logs "emitted news:new", but no client receives it. `redis-cli PUBSUB CHANNELS` shows different channel names on the two sides.

### Pitfall 4: Pool Math is Wrong, Postgres Refuses Connections

**What goes wrong:** 4 web replicas × Prisma `max:20` = 80 client-side connections expected. PgBouncer `default_pool_size:25` per (db,user) = 25 backend connections to Postgres. If Prisma opens 20 client connections × 4 replicas = 80 client-conns to PgBouncer, but PgBouncer only has 25 backend conns to Postgres, the remaining 55 client-conns are queued. That's the intent of pooling — but if `max_client_conn` (PgBouncer's frontend cap) is left at the default (100), you're fine. If it's set lower than 80, Prisma sees timeouts.

**Why it happens:** Confusion between `max_client_conn` (frontend) and `default_pool_size` (backend).

**How to avoid:** Configure PgBouncer with `max_client_conn = 200` (gives slack for retries + worker), `default_pool_size = 25`, `reserve_pool_size = 5`. Postgres `max_connections = 200` retains ~150 slots after PgBouncer claims its 25 — plenty for migrations + replication + ops tools. DB-03 sets the shape; these are starting numbers. [CITED: pgbouncer.org/config.html for default behavior]

**Warning signs:** Prisma `connectionTimeoutMillis: 5000` exceeded; `pgbouncer_pools_client_waiting > 0` for sustained periods (already locked as alert rule in DB-04).

### Pitfall 5: SIGTERM Comes Faster Than Drain Window

**What goes wrong:** Swarm sends SIGTERM, waits 10s, sends SIGKILL. The 30s grace period CONTEXT.md mandates needs `stop_grace_period: 35s` set explicitly, otherwise it's truncated.

**Why it happens:** Docker default `stop_grace_period` is 10s.

**How to avoid:** In `stack.yml`, set `stop_grace_period: 35s` for both `app` and `app-worker` services. Terminus `timeout: 30000` enforces the upper bound; Swarm's grace period gives terminus the runway. [CITED: docs.docker.com/reference/compose-file/services/]

**Warning signs:** "Force shutdown" log line in production deploys; clients seeing connection-aborted errors during rolling updates.

### Pitfall 6: Sticky Cookie Conflicts with Existing CORS Configuration

**What goes wrong:** Traefik sets `Set-Cookie: nh_sticky=...; HttpOnly; Secure; SameSite=Lax`. Browser sends it on subsequent requests. But if `Access-Control-Allow-Credentials` isn't in the CORS preflight allow-list, the browser strips the cookie on cross-origin requests.

**Why it happens:** CORS rules apply to cookies via `credentials: true` flag.

**How to avoid:** Already correct: `cors({ credentials: true })` in `apps/web/server/index.ts:88`. Add `nh_sticky` cookie attributes consistent with that origin policy. If the API moves to a separate subdomain (api.newshub.com), set `domain: .newshub.com` on the sticky cookie.

**Warning signs:** WebSocket upgrade succeeds for some users, fails for others; pattern correlates with browser-set cookies being absent.

### Pitfall 7: NewsAggregator's In-Memory Maps Still Referenced from Web Routes

**What goes wrong:** JOB-02 says web replicas don't hold the Maps. But `routes/news.ts` lines 9-30 read directly from `req.app.locals.newsAggregator.getArticles()`. If the refactor leaves this code in place but `app.locals.newsAggregator` is missing on web replicas (because `RUN_JOBS=false` skipped its construction), every news request 500s.

**Why it happens:** Half-refactor. `app.locals.newsAggregator = newsAggregator` at `index.ts:135` always runs.

**How to avoid:** Delete `app.locals.newsAggregator = newsAggregator` from `index.ts`. Refactor `routes/news.ts` to import from a new `newsReadService` module (Pattern 4 above). Verify by `grep -r 'app.locals.newsAggregator' apps/web` returns zero hits after refactor.

**Warning signs:** Type errors on `req.app.locals.newsAggregator as NewsAggregator`; runtime "Cannot read property 'getArticles' of undefined".

## Code Examples

### Standard Stack File Skeleton (`stack.yml`)

```yaml
# stack.yml — Phase 37 Swarm topology
# Source: docker.com/reference/compose-file/deploy/ + doc.traefik.io/traefik/reference/install-configuration/providers/swarm/
version: "3.9"

services:
  traefik:
    image: traefik:v3.3
    command:
      - "--providers.swarm=true"
      - "--providers.swarm.exposedByDefault=false"
      - "--providers.swarm.network=newshub-net"
      - "--entrypoints.web.address=:80"
      - "--api.dashboard=true"
    ports:
      - "80:80"
      - "8080:8080"   # dashboard, restrict by firewall
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - newshub-net
    deploy:
      replicas: 1
      placement:
        constraints: [node.role == manager]

  app:
    image: newshub:${BUILD_TAG:-latest}
    environment:
      - NODE_ENV=production
      - PORT=3001
      - RUN_JOBS=false
      - RUN_HTTP=true
      - DATABASE_URL=postgres://newshub:${POSTGRES_PASSWORD}@pgbouncer:6432/newshub?pgbouncer=true
      - DIRECT_URL=postgres://newshub:${POSTGRES_PASSWORD}@postgres:5432/newshub
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      # ... AI keys, Stripe, SMTP, Sentry, etc.
    networks:
      - newshub-net
    stop_grace_period: 35s
    depends_on:
      - postgres
      - redis
      - pgbouncer
    deploy:
      mode: replicated
      replicas: 4
      restart_policy:
        condition: on-failure
        max_attempts: 5
        delay: 5s
      update_config:
        parallelism: 1
        delay: 15s
        order: start-first
        failure_action: rollback
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.newshub.rule=Host(`localhost`)"  # update for prod hostname
        - "traefik.http.routers.newshub.entrypoints=web"
        - "traefik.http.services.newshub.loadbalancer.server.port=3001"
        - "traefik.http.services.newshub.loadbalancer.healthcheck.path=/api/ready"
        - "traefik.http.services.newshub.loadbalancer.healthcheck.interval=10s"
        - "traefik.http.services.newshub.loadbalancer.healthcheck.timeout=3s"
        - "traefik.http.services.newshub.loadbalancer.sticky.cookie.name=nh_sticky"
        - "traefik.http.services.newshub.loadbalancer.sticky.cookie.httponly=true"
        - "traefik.http.services.newshub.loadbalancer.sticky.cookie.secure=true"
        - "traefik.http.services.newshub.loadbalancer.sticky.cookie.samesite=lax"

  app-worker:
    image: newshub:${BUILD_TAG:-latest}
    environment:
      - NODE_ENV=production
      - RUN_JOBS=true
      - RUN_HTTP=false
      - DATABASE_URL=postgres://newshub:${POSTGRES_PASSWORD}@pgbouncer:6432/newshub?pgbouncer=true
      - DIRECT_URL=postgres://newshub:${POSTGRES_PASSWORD}@postgres:5432/newshub
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - newshub-net
    stop_grace_period: 35s
    depends_on:
      - postgres
      - redis
      - pgbouncer
    deploy:
      mode: replicated
      replicas: 1                             # JOB-01: singleton
      restart_policy:
        condition: on-failure
        max_attempts: 5
        delay: 10s
      update_config:
        parallelism: 1
        order: stop-first                     # ensure only one instance ever
        failure_action: pause

  pgbouncer:
    image: edoburu/pgbouncer:1.23.1
    environment:
      - DATABASE_URL=postgres://newshub:${POSTGRES_PASSWORD}@postgres:5432/newshub
      - POOL_MODE=transaction
      - DEFAULT_POOL_SIZE=25
      - MAX_CLIENT_CONN=200
      - RESERVE_POOL_SIZE=5
      - SERVER_RESET_QUERY=DISCARD ALL
      - AUTH_TYPE=md5
      - ADMIN_USERS=newshub
    networks:
      - newshub-net
    deploy:
      replicas: 1                             # not HA in this phase

  pgbouncer-exporter:
    image: prometheuscommunity/pgbouncer-exporter:v0.12.0
    environment:
      - PGBOUNCER_EXPORTER_HOST=0.0.0.0
      - PGBOUNCER_EXPORTER_PORT=9127
      - PGBOUNCER_USER=newshub
      - PGBOUNCER_PASS=${POSTGRES_PASSWORD}
      - PGBOUNCER_HOST=pgbouncer
      - PGBOUNCER_PORT=6432
    networks:
      - newshub-net
    deploy:
      replicas: 1

  postgres:
    image: postgres:17
    environment:
      - POSTGRES_USER=newshub
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=newshub
    command: postgres -c max_connections=200
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - newshub-net
    deploy:
      replicas: 1

  redis:
    image: redis:7.4-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - newshub-net
    deploy:
      replicas: 1

  prometheus:
    image: prom/prometheus:v3.4.0
    volumes:
      - ./prometheus:/etc/prometheus:ro
      - prometheus_data:/prometheus
    networks: [newshub-net]
    deploy:
      replicas: 1

  alertmanager:
    image: prom/alertmanager:v0.28.1
    volumes:
      - ./alertmanager:/etc/alertmanager:ro
      - alertmanager_data:/alertmanager
    networks: [newshub-net]
    deploy:
      replicas: 1

  grafana:
    image: grafana/grafana-oss:13.0.1
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - grafana_data:/var/lib/grafana
    networks: [newshub-net]
    deploy:
      replicas: 1

networks:
  newshub-net:
    driver: overlay

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  alertmanager_data:
  grafana_data:
```

### Updated Prometheus scrape config

```yaml
# prometheus/prometheus.yml additions
scrape_configs:
  - job_name: 'newshub'
    dns_sd_configs:
      - names: ['tasks.app']           # Swarm DNS — resolves to ALL replicas
        type: A
        port: 3001
    metrics_path: /metrics
    scrape_interval: 15s

  - job_name: 'newshub-worker'
    static_configs:
      - targets: ['app-worker:3002']  # if worker exposes metrics endpoint
    metrics_path: /metrics

  - job_name: 'pgbouncer'
    static_configs:
      - targets: ['pgbouncer-exporter:9127']
    scrape_interval: 15s
```

### New alert rule

```yaml
# prometheus/alert.rules.yml additions
- alert: PgBouncerPoolSaturation
  expr: pgbouncer_pools_client_waiting_connections > 0
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "PgBouncer client connections waiting for pool"
    description: "{{ $value }} clients waiting on backend connections — pool may be undersized"
```

### Prisma getPoolStats wired to prom-client

```typescript
// apps/web/server/services/metricsService.ts (extend)
// Source: prom-client docs + apps/web/server/db/prisma.ts:58 stub
import { Gauge } from 'prom-client';
import { getPoolStats } from '../db/prisma';

const prismaPoolTotal = new Gauge({ name: 'prisma_pool_total', help: 'Prisma pool total connections' });
const prismaPoolIdle = new Gauge({ name: 'prisma_pool_idle', help: 'Prisma pool idle connections' });
const prismaPoolWaiting = new Gauge({ name: 'prisma_pool_waiting', help: 'Prisma pool waiting clients' });

setInterval(() => {
  const stats = getPoolStats();
  if (stats) {
    prismaPoolTotal.set(stats.totalCount);
    prismaPoolIdle.set(stats.idleCount);
    prismaPoolWaiting.set(stats.waitingCount);
  }
}, 10_000);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single Express container holding all services | N stateless web replicas + 1 singleton worker, Redis adapter for fanout | This phase (37) | Horizontal scaling possible; deploy unit = container, not process |
| In-memory `topicIndex`/`entityIndex`/`articleMap` shared across handlers | Postgres + Redis cache for reads; worker keeps Maps for write-path dedup | This phase (37) JOB-02 | Web replicas can be killed at any time; Postgres is the source of truth |
| Direct Postgres connections from Prisma (`max:10`) | Prisma -> PgBouncer transaction-pool -> Postgres (`?pgbouncer=true`) | This phase (37) DB-01 | 4 replicas × 20 = 80 client-side conns collapse into 25 backend conns at Postgres |
| Inline SIGTERM handler with `httpServer.close()` and 10s force-shutdown | `@godaddy/terminus` with `beforeShutdown` (readiness flip) → `onSignal` (cleanup) → 30s timeout | This phase (37) DEPLOY-05 | Rolling updates don't drop in-flight requests |
| `docker-compose.yml` is the production deploy target | `stack.yml` for production Swarm; `docker-compose.yml` stays for local dev | This phase (37) DEPLOY-01 | Local-dev experience unchanged; production is `docker stack deploy` |

**Deprecated/outdated:**
- **`req.app.locals.newsAggregator` reads from web routes:** Reaches an in-memory Map that won't exist on `RUN_JOBS=false` replicas. Must be replaced (Pattern 4) [VERIFIED: codebase grep on `apps/web/server/routes/news.ts:9-79`]
- **Inline `httpServer.listen` callback that runs `newsAggregator.startAggregation()` unconditionally:** `index.ts:465-487` boots the schedulers regardless of role. Becomes `RUN_JOBS`-gated.

## Validation Architecture

> Project's `nyquist_validation` is enabled (no explicit `false` in config). WS-04 mandates a multi-replica integration test as the verification gate.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 (already in use) |
| Config file | `apps/web/vitest.config.ts` |
| Quick run command | `pnpm --filter @newshub/web test:run` |
| Full suite command | `pnpm test:run` (root) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `stack.yml` boots N replicas | integration | `docker stack deploy -c stack.yml newshub-test && docker service ls --filter name=newshub-test_app` (assert replicas=4) | New: `e2e-stack/replica-count.sh` |
| INFRA-02 | Traefik health check uses `/api/ready` and load-balances | integration | curl through Traefik 100 times; count distinct `nh_sticky` cookie values across calls without cookie jar (without sticky cookie should distribute across replicas) | New: `e2e-stack/lb-distribution.test.ts` |
| INFRA-03 | PgBouncer handles 100+ concurrent conns | integration | Spawn 120 concurrent Prisma connections; assert all succeed within 5s; assert PgBouncer `cl_active + cl_waiting < 200` | New: `e2e-stack/pool-concurrent.test.ts` |
| INFRA-04 (WS-04) | Cross-replica fanout works | integration | docker-compose up 2 replicas + Traefik; connect 2 socket.io clients (sticky pins each to a different replica via cookie); emit on replica A; assert client on B receives | New: `e2e-stack/ws-fanout.test.ts` |
| INFRA-05 | Multi-region patterns documented | manual review | Reviewer checks `docs/multi-region-patterns.md` covers active-active, active-passive, Postgres replication, Redis replication, latency-vs-consistency, CDN edge | Manual gate (no automated test) |
| DEPLOY-04 | `/api/ready` flips false on SIGTERM | integration | Send SIGTERM; poll `/api/ready` for 503 within 1s; assert process exits within 35s | New: `e2e-stack/sigterm-drain.test.ts` |
| DEPLOY-05 | Drain handler closes Prisma pool, Socket.IO, Redis | unit | Vitest mocks for Prisma + Socket.IO + Redis; trigger SIGTERM; assert `$disconnect`, `io.close`, `redis.quit` called in order | New: `apps/web/server/__tests__/shutdown.test.ts` |
| JOB-01 | `RUN_JOBS=false` replicas skip schedulers | unit | Boot test with `RUN_JOBS=false`; assert `newsAggregator.startAggregation` is NOT called; assert `cleanupService.start` NOT called | New: `apps/web/server/__tests__/boot-mode.test.ts` |
| JOB-03 | Worker emits via Emitter; web client receives | integration | Same harness as WS-04 but emit from a Node script that constructs an Emitter directly | New: `e2e-stack/worker-emit.test.ts` |

### Sampling Rate
- **Per task commit:** `pnpm --filter @newshub/web test:run` (Vitest unit suite; should stay at 1304+ passing)
- **Per wave merge:** `pnpm test:run` plus `e2e-stack/ws-fanout.test.ts` (only this one needs Docker)
- **Phase gate:** Full Vitest suite green + `e2e-stack/*.test.ts` all green + manual `/api/ready` SIGTERM probe

### Wave 0 Gaps
- [ ] `e2e-stack/docker-compose.test.yml` — 2 replica `app` + traefik + redis + pg minimal stack for fanout tests
- [ ] `e2e-stack/ws-fanout.test.ts` — vitest spec using `socket.io-client` against the Traefik front
- [ ] `e2e-stack/replica-count.sh` — bash assertion script
- [ ] `apps/web/server/__tests__/shutdown.test.ts` — terminus drain unit tests
- [ ] `apps/web/server/__tests__/boot-mode.test.ts` — `RUN_JOBS` env-gating tests
- [ ] No new framework install needed — Vitest covers it

## Security Domain

> `security_enforcement` not explicitly disabled, so include this section.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT (existing); no change in this phase |
| V3 Session Management | yes | Sticky cookie `nh_sticky` is a routing aid, NOT a session cookie. JWT session is still authoritative. Set `httpOnly=true`, `secure=true`, `sameSite=lax` |
| V4 Access Control | yes | Existing `requireTier` middleware (Phase 36.4); no change |
| V5 Input Validation | yes | zod schemas (existing); no change |
| V6 Cryptography | yes | bcrypt for passwords, JWT signing — unchanged |
| V11 Logging | yes | Structured logs continue via Winston; add `replica_id` field (from `os.hostname()`) so Grafana logs can group by replica |
| V13 API Security | yes | Rate limiter is already Redis-backed (existing); now correctly distributed across replicas |
| V14 Configuration | yes | Secrets via env vars (existing). PgBouncer `userlist.txt` generation: password ends up in PgBouncer's userlist file inside the container — the env-driven path keeps it out of git |

### Known Threat Patterns for {Docker Swarm + Traefik + PgBouncer + Socket.IO}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sticky cookie tampering (forced session pin) | Tampering | The sticky cookie value is a Traefik-set replica ID. Tampering can only redirect the user's traffic to a different replica — no auth or data is conveyed. JWT remains the auth token. |
| WebSocket hijack via cookie theft | Information Disclosure | Sticky cookie is httpOnly + secure → not accessible to JS. WebSocket auth still uses JWT in `socket.handshake.auth.token` (existing pattern). |
| Pool exhaustion DoS | Denial of Service | Existing rate limiter (5/min auth, 10/min AI, 100/min news). PgBouncer transaction-mode means slow queries don't pin a backend connection beyond the transaction boundary. Alertmanager rule on `pgbouncer_pools_client_waiting > 0`. |
| Worker steals shared Redis subscriber | Tampering | Both web replicas and worker connect to the same Redis. The Socket.IO adapter uses Pub/Sub channels (broadcast), not lists/streams (consume-once). Cannot steal events. |
| Traefik dashboard exposure (`:8080`) | Information Disclosure | Bind dashboard to localhost or restrict via firewall. In `stack.yml` above, the port is exposed for dev — production deployment must restrict. Document in `docs/multi-region-patterns.md` operational notes. |
| `DIRECT_URL` leaks Postgres credentials to web replicas | Information Disclosure | All replicas already have `DATABASE_URL` (cred-bearing); `DIRECT_URL` adds the same credential against a different host. Lock down via env-var distribution policy (existing `.env`). No new vector. |
| Pub/Sub channel name collision (cache vs Socket.IO) | Tampering | Adapter uses `socket.io#…` prefix; cache uses `newshub:` (key prefix, NOT pub/sub). Different namespaces. No collision risk. WS-03 verifies. |
| Worker singleton fails open if Swarm restart_policy is missing | DoS / data-integrity | `restart_policy.condition: on-failure` + `update_config.order: stop-first` ensures exactly one worker instance during rolling updates. Documented above. |

## Multi-Region Patterns Doc Structure

> DEPLOY-03 / INFRA-05 deliverable: `docs/multi-region-patterns.md`. Documentation only — no vendor templates.

Recommended section list:

1. **When to go multi-region** — latency goals (<100ms p95 globally), data-residency obligations (GDPR, PIPL, LGPD), HA requirements (RTO/RPO trade-offs). What 30k concurrent doesn't need; what 300k might.
2. **Active-active vs active-passive** — definitions, when each fits, write conflict semantics.
3. **Postgres replication options**:
   - Streaming replication (single-primary; reads can fan out to replicas)
   - Logical replication (selective table sync; supports cross-version upgrades)
   - Managed services (Aurora Global Database, Cloud SQL cross-region read replicas, Neon branching)
   - Multi-master is hard — call out conflict resolution costs
4. **Redis replication options**:
   - Master-replica (asynchronous; eventual consistency)
   - Redis Cluster (sharded, multi-master per shard)
   - Managed (Elasticache cross-region replication groups, Upstash global)
   - Note: Socket.IO adapter currently assumes a single Redis Pub/Sub plane — if regions need cross-region fanout, use Redis Streams + region-local adapter
5. **Latency-vs-consistency trade-offs** — CAP framing, what NewsHub specifically cares about (read-heavy, writes asynchronous from RSS so eventual consistency is fine for articles; Comments and Team bookmarks need read-after-write within a region).
6. **CDN edge caching** — pointer to Cloudflare/Fastly/CloudFront. Cacheability of `/api/news` (already has `Cache-Control: public, max-age=300`). What can't be cached (`/api/auth/*`, `/api/account/*`).
7. **Operational considerations** — DNS-based routing (GeoDNS, latency-based), deploy ordering for cross-region rollouts, monitoring across regions (Prometheus federation), incident response.
8. **What this phase does NOT do** — explicit out-of-scope list pointing back to INFRA-F01.

## Sources

### Primary (HIGH confidence)
- Socket.IO official docs: https://socket.io/docs/v4/redis-adapter/ — adapter setup, Emitter usage from non-HTTP process
- Prisma docs: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer — `?pgbouncer=true` flag, `DIRECT_URL`, transaction-mode constraints
- Traefik v3 docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/ — sticky cookie attributes + Docker label syntax
- Traefik v3 Swarm provider: https://doc.traefik.io/traefik/reference/install-configuration/providers/swarm/ — provider block, `deploy.labels` requirement
- Docker Compose deploy spec: https://docs.docker.com/reference/compose-file/deploy/ — replicas, update_config, restart_policy, placement, mode
- prometheus-community/pgbouncer_exporter: https://github.com/prometheus-community/pgbouncer_exporter — v0.12.0 (March 2026), metric names verified
- @godaddy/terminus: https://github.com/godaddy/terminus — v4.12.1, hooks, healthChecks shape
- edoburu/pgbouncer: https://github.com/edoburu/docker-pgbouncer — env-driven `userlist.txt` generation, transaction-mode config

### Secondary (MEDIUM confidence)
- Existing CLAUDE.md project-rules — tech-stack pinning, monorepo path discipline
- `apps/web/server/services/cacheService.ts` — `getOrSet`, `delPattern`, `setWithJitter` API for read-path refactor
- `apps/web/server/db/prisma.ts:58` — `getPoolStats` stub already exists
- `apps/web/prisma/schema.prisma` — confirmed no LISTEN/NOTIFY, no advisory locks (verified by grep on schema + service code)

### Tertiary (LOW confidence)
- npm registry version queries returned empty in this session due to local `.npmrc` config; version numbers above were cross-verified against GitHub releases and official docs. Planner should `pnpm view <pkg>` at execution time to confirm.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@socket.io/redis-adapter` v8.4.x is the latest 8.x line compatible with `socket.io@4.8.3` | Standard Stack | Wrong major could mean API drift; verify with `pnpm view @socket.io/redis-adapter` at install time. Major v8 has been stable since 2023, very low risk. [ASSUMED] |
| A2 | `@socket.io/redis-emitter` v5.1.x is current and works with adapter v8.x | Standard Stack | Same as A1; cross-version compatibility documented in socket.io repo. [ASSUMED] |
| A3 | `edoburu/pgbouncer:1.23.1` exists on Docker Hub | Standard Stack | If 1.23.1 is unavailable, pin to `latest` or last-confirmed `1.21.x`. PgBouncer 1.21+ is when Prisma's `?pgbouncer=true` flag became unnecessary, but it's still safe to set [CITED: prisma docs]. [ASSUMED on exact tag] |
| A4 | Prisma 7's `@prisma/adapter-pg` honors `?pgbouncer=true` flag identically to Prisma 5/6 (which is well-documented) | Pitfall 1 | If Prisma 7 changed flag handling, prepared-statement errors return. Prisma 7 release notes do NOT mention a behavior change here, but a pre-execution `prisma --version` + smoke test is recommended. [ASSUMED] |
| A5 | `prom-client` Gauge `.set()` is safe to call from `setInterval` without race conditions | Code Examples | Gauge is in-process state; well-documented as safe. [ASSUMED but very low risk] |
| A6 | `@godaddy/terminus`'s `beforeShutdown` returning a 10-second sleep is sufficient grace for Traefik to mark the replica unhealthy | Pattern 5, Pitfall 5 | Traefik default health interval is 30s; 10s may be too short. Recommend setting Traefik healthcheck interval to 10s explicitly (already in stack.yml example) so the 10s grace covers one polling cycle. [ASSUMED, mitigated] |
| A7 | Postgres `max_connections=200` is achievable on the validation host (default Postgres caps are often 100) | Code Examples | If Postgres refuses to start with `max_connections=200`, lower it. The shape (`web_max < pgbouncer_max < postgres_max`) is what matters; numbers can shift. [ASSUMED, low risk on Postgres 17] |
| A8 | Worker process emitting via the Emitter does NOT require Postgres to be reachable at boot (the worker is a singleton; its first action is to load articles) | Pattern 3 | If `loadLatestArticles()` blocks emitter init, worker startup is brittle. Recommend Emitter init BEFORE `startAggregation()` so the worker can broadcast even during slow DB warm-up. [ASSUMED] |
| A9 | Vitest can drive a multi-replica `docker compose up` from inside a test (typically requires `testcontainers` or shell-out) | Validation Architecture | The integration tests probably need bash/Node-spawn orchestration around docker-compose, not pure Vitest. Plan for `e2e-stack/` directory containing both compose file AND test runner. [ASSUMED, planner should resolve into specific scaffolding] |
| A10 | `traefik:v3.3` is current and stable as of execution time | Container Images | Traefik 3.x is the current major; minor version may have moved. Pin a specific 3.x at install time. [ASSUMED] |

**The planner SHOULD confirm A1, A2, A3, A4, A10 by running `pnpm view` and `docker pull --dry-run`/registry-check before locking versions in the implementation plan.**

## Open Questions

1. **Should the worker expose a `/metrics` endpoint?**
   - What we know: The web replicas already expose `/metrics`; the locked decisions (DB-04) call for Prisma `getPoolStats` to be exposed as Prometheus gauges.
   - What's unclear: Does the worker also need its own scrape target? It uses Prisma; pool stats from the worker are different data.
   - Recommendation: Yes, expose a tiny HTTP server in the worker on port 3002 just for `/metrics` (no other routes). Add as a Prometheus scrape target. Trade-off: contradicts JOB-03's "no HTTP server on worker" — but `/metrics` is operational metadata, not application traffic. Suggest treating this as an exception and noting it explicitly.

2. **What happens when the worker crashes?**
   - What we know: `restart_policy.max_attempts: 5` reboots it.
   - What's unclear: While restarting, no new RSS data lands; Socket.IO clients miss `news:new` for that window. Acceptable?
   - Recommendation: Acceptable. RSS aggregation is best-effort and runs every 60 minutes — a 30-second restart window is invisible. Document in operational notes.

3. **`DIRECT_URL` for migrations: how do we run them?**
   - What we know: `prisma migrate deploy` needs `DIRECT_URL`; CONTEXT.md says so.
   - What's unclear: Is migration a one-shot Swarm `replicated-job` mode? A manual `docker exec` step? A CI job?
   - Recommendation: For Phase 37 (single-host validation), document as a manual `docker exec newshub_app.1 npx prisma migrate deploy` step in `docs/multi-region-patterns.md` operational notes. For production (out of scope), this becomes a `replicated-job` mode service. Defer the production-grade migration runner to a later phase.

4. **Sticky cookie `secure: true` on localhost validation?**
   - What we know: The sample stack.yml sets `secure=true`.
   - What's unclear: HTTP-only validation on `localhost:80` won't set the cookie if `secure=true`.
   - Recommendation: Override to `secure=false` in the e2e-stack test compose file. Production stack.yml uses `secure=true`. Document the env split.

5. **Does the worker need `ALLOWED_ORIGINS`?**
   - What we know: Worker doesn't accept HTTP requests.
   - What's unclear: But it imports `apps/web/server/services/websocketService.ts` indirectly via shared services, which reads `ALLOWED_ORIGINS` for the `Server` constructor. Importing without instantiating should be safe — but it's a potential boot-time crash.
   - Recommendation: Verify `RUN_HTTP=false` skip-path doesn't try to read `ALLOWED_ORIGINS`. If it does, default it harmlessly in worker mode.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | All Swarm work | ✓ (assumed via current docker-compose usage) | — | — |
| Docker Swarm mode | DEPLOY-02 validation | ⚠ (needs `docker swarm init`) | — | None — required |
| `pnpm` | Install new packages | ✓ | (root) | — |
| Postgres 17 | Database | ✓ (already in compose) | 17 | — |
| Redis 7.4-alpine | Cache + adapter | ✓ (already in compose) | 7.4-alpine | — |
| `traefik` Docker image | LB | ⚠ (will be pulled at deploy) | v3.3 | — |
| `edoburu/pgbouncer` Docker image | DB pool | ⚠ (will be pulled at deploy) | 1.23.1 | `bitnami/pgbouncer` |
| `prometheuscommunity/pgbouncer-exporter` | Pool metrics | ⚠ (will be pulled at deploy) | v0.12.0 | `spreaker/prometheus-pgbouncer-exporter` (older lineage) |
| Stripe CLI / k6 | Phase-37-relevant testing | ✗ (k6 already in package.json scripts; not relevant here) | — | Use Vitest + socket.io-client for fanout test |

**Missing dependencies with no fallback:**
- Docker Swarm mode initialization (the developer running validation must `docker swarm init` once)

**Missing dependencies with fallback:**
- PgBouncer image alternative listed; exporter alternative listed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries and images verified against official sources; locked decisions eliminate ambiguity
- Architecture: HIGH — diagram derived from explicit CONTEXT.md decisions; tier responsibilities map cleanly
- Pitfalls: HIGH — each pitfall traced to a specific Prisma/Traefik/Socket.IO/PgBouncer doc behavior or codebase grep
- Code examples: MEDIUM — `stack.yml` skeleton is a starting point; exact env var names and pool numbers may shift in planning
- Versions: MEDIUM — npm registry queries returned empty in this session (`.npmrc` config issue); planner should `pnpm view` at install time to confirm

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30 days; Traefik/Prisma/Socket.IO ecosystem moves slowly enough)

## RESEARCH COMPLETE
