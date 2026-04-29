# Phase 37: Horizontal Scaling - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 14 (9 new, 5 modified)
**Analogs found:** 13 / 14 (one config doc has no in-repo analog — multi-region-patterns.md is greenfield prose)

## File Classification

### New files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `stack.yml` | config (orchestration) | infra-declarative | `D:\NewsHub\docker-compose.yml` | exact (same compose schema, different `deploy:` keys) |
| `apps/web/server/jobs/workerEmitter.ts` | service (worker entrypoint helper) | event-driven (Redis pub/sub producer) | `apps/web/server/services/cacheService.ts` (singleton-init around an ioredis client) + Pattern 3 in RESEARCH.md | role-match |
| `apps/web/server/services/newsReadService.ts` | service | CRUD-read (Prisma + Redis cache) | `apps/web/server/services/cacheService.ts` `getOrSet` API + `apps/web/server/services/newsAggregator.ts:562-611` (`getArticles` signature being replicated) | role-match |
| `apps/web/server/middleware/shutdown.ts` | middleware (drain orchestrator) | request-response (gates `/api/ready`) | inline shutdown at `apps/web/server/index.ts:498-521` + readiness handler at `apps/web/server/index.ts:222-260` | role-match |
| `docs/multi-region-patterns.md` | docs | n/a | none (greenfield prose) | no analog |
| `e2e-stack/docker-compose.test.yml` | config (test orchestration) | infra-declarative | `D:\NewsHub\docker-compose.yml` (subset; trimmed for 2-replica fanout test) | role-match |
| `e2e-stack/ws-fanout.test.ts` | test (integration) | event-driven (socket.io-client pub/sub) | `apps/web/server/services/websocketService.test.ts:1-80` (mock pattern is wrong fit; better analog is `apps/web/playwright.config.ts` for multi-process orchestration — but a bash-driven Vitest spec is the actual shape) | partial match |
| `apps/web/server/__tests__/shutdown.test.ts` | test (unit) | event-driven (mock SIGTERM) | `apps/web/server/services/cleanupService.test.ts:1-142` (singleton lifecycle + mocked dependencies) | role-match |
| `pgbouncer/pgbouncer.ini.template` | config | infra-declarative | none in repo (edoburu image generates this from env) | no analog (image-driven) |
| `prometheus/alert.rules.yml` (additions) | config | infra-declarative | `prometheus/alert.rules.yml:1-58` existing rules | exact |
| `prometheus/prometheus.yml` (additions) | config | infra-declarative | `prometheus/prometheus.yml:16-22` existing scrape job | exact |

### Modified files

| Modified File | Role | Data Flow | Closest Analog (in-file pattern to extend) |
|---------------|------|-----------|---------------------------------------------|
| `apps/web/server/index.ts` | bootstrap | request-response | self — extending L65, L131-135, L465-487, L498-521 |
| `apps/web/server/db/prisma.ts` | data-access config | CRUD | self — extending `getPoolStats()` at L58-81 |
| `apps/web/server/services/websocketService.ts` | service | event-driven (pub/sub broker) | self — extending `initialize()` at L133-146 |
| `apps/web/server/routes/news.ts` | controller | request-response | self — replacing `app.locals.newsAggregator` reads at L7-30, L51-62, L77-97, L100-133 |
| `apps/web/server/services/cleanupService.ts` | service (singleton scheduler) | batch | no change needed — `start()` at L39-60 is gated externally via `RUN_JOBS` in `index.ts` |

---

## Pattern Assignments

### `apps/web/server/jobs/workerEmitter.ts` (NEW — service, event-driven producer)

**Analog:** `apps/web/server/services/cacheService.ts` (singleton wrapper around ioredis) + Research Pattern 3.

**Imports pattern** (mirror `cacheService.ts:1-9`):
```typescript
/**
 * Worker Socket.IO Emitter
 * Binds to the same Redis Pub/Sub channels as the @socket.io/redis-adapter
 * so the worker process can broadcast events to clients connected on web replicas.
 */

import { Emitter } from '@socket.io/redis-emitter';
import Redis from 'ioredis';
import logger from '../utils/logger';
import type {
  NewsArticle,
  GeoEvent,
} from '../../src/types';
```

**Singleton + lazy-init pattern** (mirror `cacheService.ts:36-52`):
```typescript
let emitter: Emitter | null = null;
let redisClient: Redis | null = null;

export function initWorkerEmitter(): Emitter {
  if (emitter) return emitter;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  // CRITICAL: do NOT pass keyPrefix — adapter channel names are global
  // (Pub/Sub channels are not prefix-rewritten by ioredis). RESEARCH §Pitfall 3.
  redisClient = new Redis(redisUrl);
  emitter = new Emitter(redisClient);
  logger.info('✓ Worker Socket.IO Emitter initialized');
  return emitter;
}

export function getWorkerEmitter(): Emitter {
  if (!emitter) throw new Error('Worker emitter not initialized — call initWorkerEmitter() first');
  return emitter;
}

export async function shutdownWorkerEmitter(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    emitter = null;
    logger.info('Worker Socket.IO Emitter shut down');
  }
}
```

**Event helper signatures** (mirror `websocketService.ts:293-310, 329-352, 460-464`):
```typescript
// Match WebSocketService broadcast methods 1:1 so worker code
// reads symmetrically with the web-replica path.
export function emitNewArticle(article: NewsArticle): void {
  const e = getWorkerEmitter();
  e.emit('news:new', article);
  e.to(`region:${article.perspective}`).emit('news:new', article);
  for (const topic of article.topics) {
    e.to(`topic:${topic}`).emit('news:new', article);
  }
}

export function emitBreakingNews(article: NewsArticle): void {
  getWorkerEmitter().emit('news:breaking', article);
}

export function emitNewEvent(event: GeoEvent): void {
  const e = getWorkerEmitter();
  e.emit('event:new', event);
  if (event.location?.region) {
    e.to(`region:${event.location.region}`).emit('event:new', event);
  }
}
```

**Cache-invalidation hook** (move from `websocketService.ts:307-310`):
```typescript
// Worker now owns broadcast → worker also owns cache invalidation
// (web replicas no longer hold the writer-side broadcaster).
import { CacheService, CacheKeys } from '../services/cacheService';

export function emitNewArticleWithCacheInvalidation(article: NewsArticle): void {
  emitNewArticle(article);
  const cache = CacheService.getInstance();
  void cache.delPattern('news:list:*');
}
```

---

### `apps/web/server/services/newsReadService.ts` (NEW — service, CRUD-read)

**Analog:** `apps/web/server/services/cacheService.ts:259-272` (`getOrSet`) + signature contract from `apps/web/server/services/newsAggregator.ts:562-611` (the existing `getArticles` shape that callers expect).

**Imports pattern** (mirror `apps/web/server/services/cleanupService.ts:9-12`):
```typescript
import { prisma } from '../db/prisma';
import { CacheService, CacheKeys, CACHE_TTL } from './cacheService';
import logger from '../utils/logger';
import type {
  NewsArticle,
  PerspectiveRegion,
  Sentiment,
} from '../../src/types';
```

**Public API contract** — preserve `NewsAggregator.getArticles` shape exactly so `routes/news.ts` becomes a one-line swap (the route currently destructures `{ articles, total }` at `routes/news.ts:23-30`):
```typescript
interface ListOptions {
  regions?: PerspectiveRegion[];
  topics?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  sentiment?: Sentiment;
  language?: string;
}

export async function getArticles(opts: ListOptions = {}): Promise<{
  articles: NewsArticle[];
  total: number;
}> {
  const cache = CacheService.getInstance();
  const cacheKey = CacheKeys.newsList(JSON.stringify(opts));

  return cache.getOrSet(cacheKey, async () => {
    // ... Prisma query (RESEARCH §Pattern 4)
  }, CACHE_TTL.SHORT);  // 60s; worker invalidates via delPattern('news:list:*')
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  const cache = CacheService.getInstance();
  return cache.getOrSet(CacheKeys.newsArticle(id), async () => {
    const row = await prisma.newsArticle.findUnique({
      where: { id },
      include: { source: true },
    });
    return row ? mapToNewsArticle(row) : null;
  }, CACHE_TTL.MEDIUM);
}

export async function getSources(): Promise<NewsSource[]> { /* ... */ }
export async function getSentimentByRegion(): Promise<Record<PerspectiveRegion, ...>> { /* ... */ }
```

**Article mapping helper** — copy `NewsAggregator.fromPrismaArticle` pattern at `newsAggregator.ts:83-92`:
```typescript
function mapToNewsArticle(row: Record<string, unknown> & { source: NewsSource }): NewsArticle {
  return {
    ...row,
    titleTranslated: row.titleTranslated ? JSON.parse(row.titleTranslated as string) : undefined,
    contentTranslated: row.contentTranslated ? JSON.parse(row.contentTranslated as string) : undefined,
    topics: JSON.parse(row.topics as string),
    entities: JSON.parse(row.entities as string),
    source: row.source,
  } as NewsArticle;
}
```

**Critical:** `routes/news.ts` is currently SYNC (no `await`). The refactor flips every handler to `async`. Verify all four handlers at `news.ts:7, 51, 64, 77` change to `async (req, res) => { ... await ... }`.

---

### `apps/web/server/middleware/shutdown.ts` (NEW — middleware, drain orchestrator)

**Analog:** Inline shutdown at `apps/web/server/index.ts:498-521` (the existing pattern to replace) + readiness probe at `apps/web/server/index.ts:222-260` (the dependency-check shape to extend).

**Imports pattern** (mirror `index.ts:10-57`):
```typescript
import type { Server as HttpServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import logger from '../utils/logger';
import { prisma } from '../db/prisma';
import { CacheService } from '../services/cacheService';
import { WebSocketService } from '../services/websocketService';
import { AIService } from '../services/aiService';
import { CleanupService } from '../services/cleanupService';
```

**State + factory pattern** (no singleton — pure factory called once from `index.ts`):
```typescript
let isShuttingDown = false;

export function isReadyForTraffic(): boolean {
  return !isShuttingDown;
}

export interface ShutdownOptions {
  /** ms to sleep in beforeShutdown so LB notices /api/ready=503 */
  drainGraceMs?: number;
  /** total terminus timeout */
  totalTimeoutMs?: number;
}

export function registerShutdown(httpServer: HttpServer, opts: ShutdownOptions = {}): void {
  const drainGrace = opts.drainGraceMs ?? 10_000;
  const totalTimeout = opts.totalTimeoutMs ?? 30_000;

  createTerminus(httpServer, {
    signals: ['SIGTERM', 'SIGINT'],
    timeout: totalTimeout,

    beforeShutdown: async () => {
      isShuttingDown = true;
      logger.info('shutdown:beforeShutdown — readiness now false');
      await new Promise(r => setTimeout(r, drainGrace));
    },

    onSignal: async () => {
      logger.info('shutdown:onSignal — closing connections');
      const wsService = WebSocketService.getInstance();
      const cacheService = CacheService.getInstance();
      const aiService = AIService.getInstance();

      await wsService.shutdown();              // mirrors index.ts:503
      await cacheService.shutdown();           // mirrors index.ts:504
      aiService.shutdown();                    // mirrors index.ts:505
      CleanupService.getInstance().stop();     // mirrors index.ts:506
      await prisma.$disconnect();              // NEW — close pool
    },

    healthChecks: {
      '/api/ready': async () => {
        if (isShuttingDown) throw new Error('shutting down');
        // Mirror existing readiness probe at index.ts:227-244
        await prisma.$queryRaw`SELECT 1`;
        const cache = CacheService.getInstance();
        if (!cache.isAvailable()) throw new Error('redis not ready');
        return { status: 'ready' };
      },
    },

    logger: (msg, err) => err ? logger.error(msg, err) : logger.info(msg),
  });
}
```

**Critical ordering note:** `registerShutdown(httpServer)` MUST be called AFTER `httpServer.listen()` and AFTER all services are constructed (so `WebSocketService.getInstance()` etc. return live instances). Place at the end of the bootstrap, replacing `index.ts:498-521`.

---

### `apps/web/server/index.ts` (MODIFIED — bootstrap)

**Analog (self):** Existing patterns at L64-68 (singleton init), L131-135 (`app.locals.newsAggregator` — to be deleted), L465-487 (job scheduler boot — to be gated), L498-521 (shutdown — to be replaced).

**Env-gated boot pattern** (NEW, replaces `index.ts:465-487`):
```typescript
const RUN_JOBS = process.env.RUN_JOBS === 'true';
const RUN_HTTP = process.env.RUN_HTTP !== 'false';   // default true

if (RUN_HTTP) {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('WebSocket server ready');

    // Pool metrics interval (preserve existing L478-486)
    setInterval(() => {
      metricsService.setWebSocketConnections(wsService.getClientCount());
      const poolStats = getPoolStats();
      if (poolStats) metricsService.updatePoolMetrics(poolStats);
    }, 10_000);
  });

  // RESEARCH §Pattern 5 — replaces inline SIGTERM at L498-521
  registerShutdown(httpServer);
}

if (RUN_JOBS) {
  console.log('Starting news aggregation (RUN_JOBS=true)...');
  const newsAggregator = NewsAggregator.getInstance();
  newsAggregator.startAggregation().catch(err => console.error('Aggregation error:', err));

  CleanupService.getInstance().start();          // mirrors L474-475

  // Worker emitter for cross-replica broadcast (RESEARCH §Pattern 3)
  // Init BEFORE startAggregation so first emit has the channel ready (Assumption A8).
  initWorkerEmitter();
}
```

**Delete this** (`index.ts:131-135`):
```typescript
const newsAggregator = NewsAggregator.getInstance();
app.locals.newsAggregator = newsAggregator;
```
Web replicas (`RUN_JOBS=false`) do not construct `NewsAggregator` at all. Worker constructs it inside the `RUN_JOBS` block above. Verify with `grep -r 'app.locals.newsAggregator' apps/web` returning ZERO hits.

**Health-endpoint split** — keep liveness, add readiness:
- `/health` (L211-219) and `/api/health` (L348-376) STAY as liveness probes (process-up checks).
- `/api/ready` is now provided by terminus's `healthChecks` block in `shutdown.ts`. Existing inline `/readiness` (L224-260) can either stay for back-compat or be deleted (defer to planner; both paths work since terminus mounts on the server, not via Express).

**Webhook-ordering preservation** (CRITICAL): `index.ts:113` (`app.use('/api/webhooks/stripe', stripeWebhookRouter)`) MUST stay before `express.json()` at L116. The shutdown refactor does NOT touch this line.

---

### `apps/web/server/services/websocketService.ts` (MODIFIED — Redis adapter)

**Analog (self):** `initialize()` at L133-146.

**New imports** (add to L1-10):
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
```

**Modified `initialize()`** (replaces L133-146):
```typescript
initialize(httpServer: HttpServer): void {
  this.io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // WS-01: Redis adapter for cross-replica fanout
  // CRITICAL: pubClient and subClient MUST be separate (subscriber goes into "subscribed" mode)
  // Do NOT reuse CacheService.getClient() — that client is shared with rate-limit-redis
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const pubClient = new Redis(redisUrl);
  const subClient = pubClient.duplicate();
  this.io.adapter(createAdapter(pubClient, subClient));

  this.setupEventHandlers();
  logger.info('✓ WebSocket server initialized with Redis adapter');
}
```

**Cache-invalidation move** (`broadcastNewArticle` at L293-310): When `RUN_JOBS=false` (web replica), the worker now does the broadcast via Emitter. The web-side `broadcastNewArticle` becomes a no-op safety path OR is left in place for any non-aggregator broadcast paths. Planner decides; the simplest path is to leave it as-is and rely on `RUN_HTTP=false` in the worker meaning the `WebSocketService` instance there is never `initialize()`d (its `this.io` stays null, all broadcast methods early-return at L294, etc.).

**Shutdown method** (existing L487-502) — already correct, no changes; called by terminus.

---

### `apps/web/server/db/prisma.ts` (MODIFIED — Prometheus gauges)

**Analog (self):** `getPoolStats()` stub at L58-81 + `metricsService.ts:188-192` `updatePoolMetrics`.

**Pattern is already wired** — `index.ts:482-485` already calls `metricsService.updatePoolMetrics(poolStats)`. The Phase 37 change is:

1. Verify `getPoolStats()` actually returns non-null after the move to PgBouncer. The stub at L58-77 reaches into adapter internals (`adapterAny.pool || adapterAny._pool || adapterAny.client?.pool`); confirm with smoke test.
2. Bump `max: 10` at L12 to `max: 20` per DB-03 (4 web replicas × 20 = 80 client conns into PgBouncer's `max_client_conn=200`).
3. Add `?pgbouncer=true` recognition — Prisma 7's `@prisma/adapter-pg` honors this in the connection string itself, no code change needed (RESEARCH §Pitfall 1, Assumption A4).

**Diff** at L10-15:
```typescript
const adapter = new PrismaPg({
  connectionString,                  // includes ?pgbouncer=true in production env
  max: 20,                           // DB-03 (was 10)
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 300_000,
});
```

---

### `apps/web/server/routes/news.ts` (MODIFIED — drop in-memory Map reads)

**Analog (self):** L7-30, L51-62, L64-75, L77-97, L100-133.

**Imports change** — drop the `NewsAggregator` type import, add `newsReadService`:
```typescript
// DELETE: import type { NewsAggregator } from '../services/newsAggregator';
import * as newsReadService from '../services/newsReadService';
```

**Handler refactor pattern** — every handler becomes `async`, every `req.app.locals.newsAggregator.X(...)` becomes `await newsReadService.X(...)`. Example for the GET / handler (replaces L7-49):
```typescript
newsRoutes.get('/', async (req: Request, res: Response) => {
  const regions = req.query.regions
    ? (req.query.regions as string).split(',') as PerspectiveRegion[]
    : undefined;
  const topics = req.query.topics ? (req.query.topics as string).split(',') : undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const search = req.query.search as string | undefined;
  const sentiment = req.query.sentiment as Sentiment | undefined;

  const { articles, total } = await newsReadService.getArticles({
    regions, topics, limit, offset, search, sentiment,
  });

  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Encoding');
  res.json({
    success: true,
    data: articles,
    meta: { total, page: Math.floor(offset / limit) + 1, limit, hasMore: offset + limit < total },
  });
});
```

**Console.log debug noise** at L8, L22, L32, L48 should be dropped during the refactor (they violate the project coding-style "No console.log" rule and were left from a previous bug-hunt).

**Translation handler at L100-133** — `aggregator.translateArticle()` is a write operation that lives in the worker (it mutates the in-memory Map and writes the translation back to Postgres). Two options:
- (a) Move the translation logic into `newsReadService.translateArticle()` calling `TranslationService.getInstance().translate()` directly + Prisma update — clean separation.
- (b) Leave POST `/api/news/:id/translate` as a thin endpoint that calls a shared helper independently. Planner picks.

---

### `apps/web/server/__tests__/shutdown.test.ts` (NEW — unit test)

**Analog:** `apps/web/server/services/cleanupService.test.ts:1-142` (singleton lifecycle + `vi.mock` of dependencies + `vi.useFakeTimers`).

**Mock setup pattern** (mirror `cleanupService.test.ts:9-47`):
```typescript
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

vi.mock('../db/prisma', () => ({
  prisma: {
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

const mockWsService = { shutdown: vi.fn().mockResolvedValue(undefined) };
const mockCacheService = {
  shutdown: vi.fn().mockResolvedValue(undefined),
  isAvailable: vi.fn().mockReturnValue(true),
};
const mockAiService = { shutdown: vi.fn() };
const mockCleanupService = { stop: vi.fn() };

vi.mock('../services/websocketService', () => ({
  WebSocketService: { getInstance: () => mockWsService },
}));
vi.mock('../services/cacheService', () => ({
  CacheService: { getInstance: () => mockCacheService },
}));
vi.mock('../services/aiService', () => ({
  AIService: { getInstance: () => mockAiService },
}));
vi.mock('../services/cleanupService', () => ({
  CleanupService: { getInstance: () => mockCleanupService },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
```

**Test cases to cover** (mirror `cleanupService.test.ts:79-142` lifecycle blocks):
- `isReadyForTraffic()` returns true before SIGTERM
- `beforeShutdown` flips `isReadyForTraffic()` to false within drain grace
- `onSignal` calls `wsService.shutdown`, `cacheService.shutdown`, `aiService.shutdown`, `cleanupService.stop`, `prisma.$disconnect` IN ORDER
- `/api/ready` health check throws while shutting down → terminus returns 503
- `/api/ready` health check passes when DB+Redis healthy
- Total drain time < `totalTimeoutMs` (use `vi.useFakeTimers` + `vi.advanceTimersByTimeAsync`)

---

### `e2e-stack/docker-compose.test.yml` (NEW — integration test harness)

**Analog:** `D:\NewsHub\docker-compose.yml` (subset).

**Pattern:** Trim the production compose to the minimum needed for cross-replica fanout — Traefik + 2× app + Redis + Postgres. Override `secure: true` to `secure: false` on the sticky cookie (RESEARCH §Open Question 4).

**Excerpt** (extends `docker-compose.yml:1-65` shape):
```yaml
services:
  postgres:
    image: postgres:17
    environment: { POSTGRES_USER: newshub, POSTGRES_PASSWORD: test, POSTGRES_DB: newshub }
    healthcheck: # mirror docker-compose.yml:13-18
      test: ["CMD-SHELL", "pg_isready -U newshub -d newshub"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7.4-alpine
    healthcheck: # mirror docker-compose.yml:35-40
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  traefik:
    image: traefik:v3.3
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports: ["8000:80"]
    volumes: ["/var/run/docker.sock:/var/run/docker.sock:ro"]

  app-1: &app
    build: ..
    environment:
      - NODE_ENV=test
      - RUN_JOBS=false
      - RUN_HTTP=true
      - DATABASE_URL=postgresql://newshub:test@postgres:5432/newshub
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=test-secret-min-32-characters-long-xx
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.test.rule=PathPrefix(`/`)"
      - "traefik.http.services.test.loadbalancer.server.port=3001"
      - "traefik.http.services.test.loadbalancer.sticky.cookie.name=nh_sticky"
      - "traefik.http.services.test.loadbalancer.sticky.cookie.secure=false"   # localhost test only

  app-2: *app
```

---

### `stack.yml` (NEW — production Swarm topology)

**Analog:** `D:\NewsHub\docker-compose.yml` (full topology, ports 3001/9090/9093/3000) + RESEARCH §"Standard Stack File Skeleton" lines 590-780.

**Mapping table** — every service in `docker-compose.yml` ports over with one schema change (`deploy:` block + Swarm-specific keys):

| Existing in docker-compose.yml | New in stack.yml | Key delta |
|--------------------------------|------------------|-----------|
| `app:` (L43-65) | `app:` (replicas=4) + `app-worker:` (replicas=1) | split into web+worker; `RUN_JOBS` env split; add `deploy.labels` for Traefik (NOT container labels per RESEARCH §Anti-pattern); `stop_grace_period: 35s` |
| `postgres:` (L2-19) | `postgres:` | add `command: postgres -c max_connections=200` (DB-03); same `healthcheck`, same volume |
| `redis:` (L21-41) | `redis:` | unchanged |
| `prometheus:` (L67-88) | `prometheus:` | scrape config gains `dns_sd_configs` block targeting `tasks.app` (Swarm DNS) — RESEARCH L786-803 |
| `alertmanager:` (L90-110) | `alertmanager:` | unchanged |
| `grafana:` (L112-131) | `grafana:` | unchanged |
| (none) | `traefik:` (NEW) | Swarm provider; cookie-sticky labels — see RESEARCH L598-614 |
| (none) | `pgbouncer:` (NEW) | `edoburu/pgbouncer:1.23.1` env-driven config — see RESEARCH L689-704 |
| (none) | `pgbouncer-exporter:` (NEW) | `prometheuscommunity/pgbouncer-exporter:v0.12.0` — see RESEARCH L705-717 |

Full `stack.yml` skeleton already provided in RESEARCH.md L590-780; the planner copies that and adjusts `BUILD_TAG`, `Host(...)` rule, and prod hostnames.

---

### `prometheus/prometheus.yml` (MODIFIED — additions)

**Analog (self):** L16-22 existing scrape job.

**Additions** (append to L16):
```yaml
  - job_name: 'newshub'
    dns_sd_configs:
      - names: ['tasks.app']     # Swarm DNS resolves to all replicas
        type: A
        port: 3001
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'newshub-worker'
    static_configs:
      - targets: ['app-worker:3002']    # if worker exposes /metrics (RESEARCH §Open Q1)
    metrics_path: '/metrics'

  - job_name: 'pgbouncer'
    static_configs:
      - targets: ['pgbouncer-exporter:9127']
    scrape_interval: 15s
```

The existing `static_configs: [{ targets: ['app:3001'] }]` block (L18-22) is REPLACED by the `dns_sd_configs` block when running under Swarm.

---

### `prometheus/alert.rules.yml` (MODIFIED — additions)

**Analog (self):** L7-21 existing alert rule pattern (PromQL + `for:` + `severity:` labels + `summary`/`description` annotations).

**New rule** (append to the `newshub` group at L5):
```yaml
      # PgBouncer pool saturation alert (DB-04)
      - alert: PgBouncerPoolSaturation
        expr: pgbouncer_pools_client_waiting_connections > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "PgBouncer client connections waiting for pool"
          description: "{{ $value }} clients waiting on backend connections — pool may be undersized"

      # Prisma client pool waiting (Phase 34 + Phase 37)
      - alert: PrismaPoolSaturation
        expr: db_pool_waiting_requests > 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Prisma client pool has waiting requests"
          description: "{{ $value }} requests queued waiting for a Prisma connection"
```

---

## Shared Patterns

### Singleton service pattern
**Source:** `apps/web/server/services/cacheService.ts:36-52`, mirrored in `websocketService.ts:117-128`, `cleanupService.ts:21-34`, `metricsService.ts:9-154`, `newsAggregator.ts:22-99`.
**Apply to:** Any new long-lived service. Note: `newsReadService.ts` is a stateless module (functions, not class) because it has NO instance state — Prisma + CacheService are the singletons it composes.
```typescript
private static instance: SomeService;
private constructor() { /* connect/init */ }
static getInstance(): SomeService {
  if (!SomeService.instance) {
    SomeService.instance = new SomeService();
  }
  return SomeService.instance;
}
async shutdown(): Promise<void> { /* quit/close */ }
```

### Redis client construction
**Source:** `apps/web/server/services/cacheService.ts:54-106` and `apps/web/server/middleware/rateLimiter.ts:51-65`.
**Apply to:** `workerEmitter.ts`, the new `pubClient`/`subClient` in `websocketService.ts`.
- Prefer `process.env.REDIS_URL` over individual host/port config.
- Set `retryStrategy` to give up after 3 retries and log a warning (graceful degradation).
- For Socket.IO adapter/emitter: do NOT pass `keyPrefix` (Pub/Sub channels are not prefix-rewritten; collision avoidance happens via the `socket.io#` channel name itself).
- For Socket.IO adapter: subscriber MUST be `pubClient.duplicate()` (RESEARCH §Anti-pattern + Pitfall 3).

### Express middleware ordering (CRITICAL)
**Source:** `apps/web/server/index.ts:75-129`.
**Order to preserve in any refactor:**
1. CORS (L75)
2. Compression (L94)
3. Server-Timing / ETag / metrics / queryCounter middlewares (L97-106)
4. Passport `initialize()` (L109)
5. **`/api/webhooks/stripe` BEFORE `express.json()`** (L113) — load-bearing for HMAC verification (RESEARCH §Anti-pattern + CLAUDE.md project rule).
6. `express.json()` with `verify` for raw-body capture (L116)

The Phase 37 changes do not touch this block.

### `app.locals` removal pattern
**Source (the bad pattern to remove):** `apps/web/server/index.ts:135` (`app.locals.newsAggregator = newsAggregator`); read at `apps/web/server/routes/news.ts:9, 23, 52, 65, 78, 101`.
**Apply to:** `routes/news.ts` only (no other route currently reads from `app.locals.newsAggregator`).
**Verification:** `grep -r 'app.locals.newsAggregator' apps/web` returns ZERO hits after refactor (RESEARCH §Pitfall 7).

Note: `app.locals.wsService` (L200), `app.locals.cacheService` (L201), `app.locals.aiService` (L202) are intentionally KEPT — they are stateless singletons, not in-memory data caches. Phase 37 only removes `app.locals.newsAggregator`.

### Health/readiness probe shape
**Source:** `apps/web/server/index.ts:211-219` (liveness) and L222-260 (readiness with DB+Redis ping + 3000ms timeout).
**Apply to:** `shutdown.ts` `healthChecks: { '/api/ready': ... }` block.
**Conventions to mirror:**
- `Cache-Control: no-cache, no-store, must-revalidate` header
- `db_latency_ms` / `redis_latency_ms` in success response
- 503 status on failure with `{ status: 'not ready', error: <message> }` shape
- 3-second timeout on each dependency check (`DEPENDENCY_TIMEOUT` at L222)

### Vitest unit-test scaffolding
**Source:** `apps/web/server/services/cleanupService.test.ts:1-77` (mock setup, fake timers, singleton reset in `afterEach`).
**Apply to:** `apps/web/server/__tests__/shutdown.test.ts`.
**Boilerplate to copy:**
- `vi.mock('../db/prisma', () => ({ prisma: { /* methods */ } }))` for DB
- `vi.mock('../utils/logger', ...)` to silence logs
- `beforeAll(() => vi.useFakeTimers())` + `afterAll(() => vi.useRealTimers())` for time-based assertions
- `afterEach`: reset singleton instance via `(Service as unknown as { instance: Service | null }).instance = null`

### Compose service definition (port to Swarm)
**Source:** `D:\NewsHub\docker-compose.yml` (every service block).
**Apply to:** `stack.yml` and `e2e-stack/docker-compose.test.yml`.
**Schema deltas for Swarm:**
- Replace `restart: unless-stopped` (L19, L41, L65, L88, L110, L131) with `deploy.restart_policy: { condition: on-failure, max_attempts: 5, delay: 5s }`
- Add `deploy.replicas: N` (4 for `app`, 1 for everything else in this phase)
- Add `deploy.update_config: { parallelism: 1, delay: 15s, order: start-first, failure_action: rollback }` for rolling updates
- Add `stop_grace_period: 35s` to give terminus 30s + 5s slack (RESEARCH §Pitfall 5)
- For services that need Traefik routing: labels go under `deploy.labels:` NOT `services.<name>.labels:` (RESEARCH §Anti-pattern, Swarm-specific requirement)

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `docs/multi-region-patterns.md` | docs | Greenfield architectural prose; no in-repo doc-style analog. RESEARCH §"Multi-Region Patterns Doc Structure" (L926-947) provides the section list. |
| `pgbouncer/pgbouncer.ini.template` | config | The `edoburu/pgbouncer:1.23.1` image generates `pgbouncer.ini` and `userlist.txt` from env vars at boot — no template file is mounted (RESEARCH §"Don't Hand-Roll" L495). If the planner picks `bitnami/pgbouncer` instead, a template IS required and the analog would be `prometheus/prometheus.yml`'s plain-config-file pattern. |

---

## Metadata

**Analog search scope:**
- `apps/web/server/index.ts` (full bootstrap)
- `apps/web/server/db/prisma.ts` (full)
- `apps/web/server/services/{cacheService,websocketService,cleanupService,newsAggregator,metricsService}.ts`
- `apps/web/server/middleware/rateLimiter.ts`
- `apps/web/server/routes/news.ts`
- `apps/web/server/services/{cleanupService,websocketService}.test.ts` (test patterns)
- `docker-compose.yml`, `Dockerfile`, `prometheus/{prometheus,alert.rules}.yml` (infra patterns)

**Files scanned:** 14
**Pattern extraction date:** 2026-04-29

## PATTERN MAPPING COMPLETE

**Phase:** 37 - horizontal-scaling
**Files classified:** 14
**Analogs found:** 13 / 14

### Coverage
- Files with exact analog: 4 (`stack.yml`, `prometheus/*.yml` additions, `docker-compose.test.yml`)
- Files with role-match analog: 8 (`workerEmitter.ts`, `newsReadService.ts`, `shutdown.ts`, `shutdown.test.ts`, all four MODIFIED files)
- Files with partial-match analog: 1 (`ws-fanout.test.ts` — Vitest+docker hybrid is a new harness shape)
- Files with no analog: 2 (`docs/multi-region-patterns.md`, `pgbouncer/*` config — image-generated)

### Key Patterns Identified
- All long-lived services follow `getInstance()` singleton with `private constructor()` and async `shutdown()` — workerEmitter mirrors this (with module-level state since worker process is short-lived single-purpose).
- Redis clients always read `process.env.REDIS_URL` first, fall back to host/port config; new pubClient/subClient/emitter instances follow this pattern but skip `keyPrefix` (Pub/Sub channels are not prefix-rewritten).
- Health probes use a 3-second per-dependency timeout, return latency in `_latency_ms` fields, and `Cache-Control: no-cache, no-store, must-revalidate` — terminus `/api/ready` healthCheck mirrors this shape.
- Vitest unit tests for singleton services use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` + `afterEach` singleton-instance reset; new `shutdown.test.ts` follows the same shape.
- Express middleware ordering is load-bearing: CORS → compression → diagnostic middlewares → Passport → Stripe webhook (raw-body) → `express.json()`. Phase 37 does not touch this block.
- The single anti-pattern Phase 37 explicitly REMOVES: `app.locals.newsAggregator` reads from `routes/news.ts`. Other `app.locals.*` entries (wsService, cacheService, aiService) stay because they reference stateless singletons, not in-memory data caches.

### File Created
`D:\NewsHub\.planning\phases\37-horizontal-scaling\37-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns in PLAN.md files for: stack.yml authoring, worker entrypoint wiring, news-read refactor, terminus drain, websocket adapter, Prisma+pgbouncer config, Prometheus/alert additions, and the multi-replica integration test harness.
