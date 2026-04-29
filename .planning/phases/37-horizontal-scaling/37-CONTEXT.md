# Phase 37: Horizontal Scaling - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

NewsHub runs as N stateless web replicas behind Traefik with sticky-cookie load balancing, a singleton background-jobs worker, and PgBouncer-fronted Postgres so the system serves 30k concurrent users without database exhaustion or duplicate work. Real-time WebSocket fanout works correctly across replicas via the Socket.IO Redis adapter. Multi-region deployment is *documented*, not implemented.

**Delivers:**
- Docker Swarm `stack.yml` deploying Traefik (LB), `app` (web replicas), `app-worker` (singleton jobs), PgBouncer, Postgres, Redis, Prometheus, Alertmanager, Grafana
- Web replicas: stateless, no in-memory aggregator Maps, read via Prisma + Redis cache
- `app-worker`: owns RSS aggregation, cleanup jobs, email digests; emits real-time events via Socket.IO Emitter bound to the same Redis adapter
- PgBouncer in transaction-pool mode in front of Postgres; `DATABASE_URL` carries `?pgbouncer=true`; `DIRECT_URL` reaches Postgres directly for migrations
- Prometheus metrics for PgBouncer pool + Prisma pool; Alertmanager rule on sustained pool wait
- Split readiness/liveness endpoints with SIGTERM drain for zero-downtime rolling updates
- Architecture doc covering multi-region patterns (active-active, active-passive, data residency, edge caching) — no concrete deploy templates

**Out of scope (deferred):**
- Kubernetes migration (tracked under INFRA-F02)
- Active-active multi-region implementation (INFRA-F01)
- CDN edge caching implementation (INFRA-F03)
- Autoscaling policies; load testing at 30k concurrent (Phase 21 already covers k6 harness, this phase doesn't re-tune)

</domain>

<decisions>
## Implementation Decisions

### WebSocket fanout
- **WS-01:** Add `@socket.io/redis-adapter`. Required for cross-replica broadcast fanout (`news:new`, `news:breaking`, `event:new`, `comment:new`, `team:bookmark:new`). Without it, an emit on replica-A only reaches clients connected to replica-A.
- **WS-02:** Traefik cookie-based sticky sessions (cookie name: `nh_sticky`). Required for Engine.IO long-poll → WebSocket upgrade handshake to complete on a single replica. Cookie sticky (not IP hash) so users on roaming networks stay pinned.
- **WS-03:** Reuse the existing Redis 7.4-alpine container for the Socket.IO adapter. Adapter uses its own channel prefix (`socket.io#`) — no collision with the `newshub:` cache namespace. Single Redis is consistent with current architecture; HA Redis (Sentinel/cluster) is deferred.
- **WS-04:** Verification gate is a docker-compose-based integration test that boots ≥2 web replicas behind Traefik, connects 2 Socket.IO clients, emits on replica A, and asserts the client on replica B receives the event. Mocked-adapter unit tests are insufficient.

### Database connection pooling (PgBouncer)
- **DB-01:** PgBouncer runs in **transaction pool mode**. `DATABASE_URL` includes `?pgbouncer=true` so Prisma disables prepared-statement caching. Verified safe: codebase uses no `LISTEN/NOTIFY`, no advisory locks, no session-scoped state.
- **DB-02:** A second URL — `DIRECT_URL` — bypasses PgBouncer and connects directly to Postgres on 5432 for `prisma migrate deploy` / `prisma db push`. This is Prisma's documented pattern for transaction-mode poolers.
- **DB-03:** Topology target: 4 web replicas × Prisma `max: 20` per replica → PgBouncer `default_pool_size: 25` → Postgres `max_connections: 200`. These are starting values; the planner/researcher refines specific numbers from the load profile. The shape (collapse client conns → small backend pool) is locked.
- **DB-04:** Observability: `prometheus-pgbouncer-exporter` for `cl_active`/`cl_waiting`/`sv_active`/`sv_idle`; export Prisma `getPoolStats()` (already stubbed at `apps/web/server/db/prisma.ts:58`) as Prometheus gauges; Grafana panel + Alertmanager rule firing when `pgbouncer_pools_client_waiting > 0` for 1m.

### Singleton background jobs
- **JOB-01:** New `app-worker` Swarm service (replicas=1, same image as `app`) with env `RUN_JOBS=true`. Web replicas run with `RUN_JOBS=false` and skip `NewsAggregator.startAggregation()`, `cleanupService`, and email-digest schedulers on boot. Single source of truth for "who runs the loop": environment, not lock contention.
- **JOB-02:** Web replicas no longer hold in-memory aggregator Maps (`topicMap`, `entityMap`). All news read paths go through Prisma + `CacheService` (Redis). Worker writes articles to Postgres (already happens) and invalidates the relevant cache keys when new articles land.
- **JOB-03:** Worker emits real-time events using a Socket.IO `Emitter` bound to the Redis adapter — NOT through an HTTP server (the worker has no HTTP listener). Same code path as web-replica emits. One pub/sub channel set, two producer types.
- **JOB-04:** **Full refactor lands in Phase 37.** Removing in-memory Maps from web replicas and rerouting reads through Postgres+Redis is in-scope for this phase. No follow-up phase needed; the architectural cut is clean.

### Swarm deployment artifact
- **DEPLOY-01:** Separate `stack.yml` for Swarm; `docker-compose.yml` stays untouched for local dev. Local dev experience does not change. `docker stack deploy -c stack.yml newshub` deploys the full topology.
- **DEPLOY-02:** Validation target: 4 web replicas + 1 worker on a single-host Swarm (`docker swarm init`). This proves the contract end-to-end (replicas, sticky, adapter, pgbouncer, worker singleton, graceful shutdown) and is CI-runnable. Multi-host Swarm is a documented future step, not a verification requirement.
- **DEPLOY-03:** Multi-region (INFRA-05): single architecture markdown at `docs/multi-region-patterns.md` covering active-active vs active-passive, Postgres replication options (logical/physical/managed services), Redis replication options, latency-vs-consistency trade-offs, CDN edge-caching pointers. No vendor templates — that's INFRA-F01 territory.

### Graceful shutdown / zero-downtime deploys
- **DEPLOY-04:** Split health endpoints: `/api/health` (liveness — process is alive) vs `/api/ready` (readiness — accepting new connections; flips to false on SIGTERM, then to true again only after warmup completes on next boot). Traefik health check uses `/api/ready`.
- **DEPLOY-05:** SIGTERM drain handler: stop accepting new HTTP connections, broadcast `disconnect` warning to Socket.IO clients with 30s grace, close Prisma pool, exit. Required for Swarm rolling updates not to drop user requests.

### Claude's Discretion
- Exact Traefik service-discovery mechanism (Docker provider labels vs file provider) — researcher picks
- TLS termination location (Traefik vs upstream) — out of scope unless researcher flags a constraint
- Exact PgBouncer image (`edoburu/pgbouncer` vs `bitnami/pgbouncer` vs official) — researcher picks
- Specific Prometheus exporter versions, dashboard JSON
- Exact `.dockerignore` and image layer optimization for the worker (same image, smaller startup surface)
- Whether worker uses a different Dockerfile entrypoint or just env-gated startup branching in `server/index.ts`
- File names for the stack file and architecture doc (only the existence + content shape are locked)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` §"Phase 37: Horizontal Scaling" — goal, depends-on, success criteria (5 items)
- `.planning/REQUIREMENTS.md` §"Infrastructure & Scaling" — INFRA-01..INFRA-05 with traceability table
- `.planning/PROJECT.md` — product vision and core value (read for tone/scope only)

### Existing infrastructure
- `docker-compose.yml` — current single-host topology (postgres, redis, app, prometheus, alertmanager, grafana). The new `stack.yml` builds on this, does not replace it.
- `Dockerfile` (project root) — production image used by `app` service; the new `app-worker` reuses this image
- `apps/web/server/index.ts` — Express bootstrap; currently starts `NewsAggregator`, `cleanupService`, and email schedulers unconditionally — must become `RUN_JOBS`-gated
- `apps/web/server/db/prisma.ts` — `PrismaPg` adapter with `max: 10`; `getPoolStats()` stub at L58 to wire into Prometheus
- `apps/web/server/services/websocketService.ts` — Socket.IO `Server` setup; `ServerToClientEvents` lists every cross-replica broadcast that depends on the Redis adapter
- `apps/web/server/services/newsAggregator.ts` — singleton write path; web-side read methods get refactored to go through Prisma + Redis
- `apps/web/server/services/cleanupService.ts` — daily job; must be gated by `RUN_JOBS`
- `apps/web/server/services/cacheService.ts` — Redis client wrapper with `newshub:` key prefix and TTL presets (SHORT/MEDIUM/LONG/HOUR/DAY/WEEK); web reads route through this
- `apps/web/server/middleware/rateLimiter.ts` — already Redis-backed via express-rate-limit; no changes needed for horizontal scaling

### Codebase maps
- `.planning/codebase/ARCHITECTURE.md` — current layered-monolith architecture; Phase 37 decomposes the "all in one Express server" assumption
- `.planning/codebase/INTEGRATIONS.md` — external integrations summary (AI, translation, news APIs); confirms Redis is the only existing pub/sub-capable shared store
- `.planning/codebase/STACK.md` — current dependency versions; constrains adapter choice to socket.io 4.8.x compatible

### Prior phase context
- `.planning/phases/17-docker-deployment/17-CONTEXT.md` and `17-PATTERNS.md` — original single-replica Docker deployment decisions
- `.planning/phases/35-infrastructure-foundation/35-CONTEXT.md` — monorepo structure (`apps/web`, `packages/types`); Phase 37's `stack.yml` paths are relative to this layout

### Standards / external docs (researcher will pull these)
- Prisma "Connection pooling with PgBouncer" guide — for `?pgbouncer=true` flag and `DIRECT_URL` migration pattern
- `@socket.io/redis-adapter` README — for Emitter usage from a non-HTTP-server context (worker)
- Traefik v3 sticky session docs — `loadBalancer.sticky.cookie` configuration
- Docker Swarm `deploy:` reference — `replicas`, `update_config`, `restart_policy`, `placement`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CacheService` (`apps/web/server/services/cacheService.ts`) — already a Redis singleton with key prefix and TTL presets; web read paths plug straight into it
- `getPoolStats()` (`apps/web/server/db/prisma.ts:58`) — already stubbed for Prometheus export; just needs to be hooked into the metrics route
- `/api/metrics` and `/api/health` — Prometheus scrape and health endpoint already exist; readiness split adds `/api/ready` alongside
- Existing `prometheus`, `alertmanager`, `grafana` containers in `docker-compose.yml` — port to `stack.yml` with the same configs
- Express middleware chain — already has CORS, compression, rate limiting; no Phase 37 changes needed there
- JWT auth is stateless — no shared session store needed (already correct for multi-replica)

### Established Patterns
- Singleton service pattern (`getInstance()`) — used by `NewsAggregator`, `WebSocketService`, etc. Phase 37 turns `RUN_JOBS=true` into "this replica owns the singleton's startup", `RUN_JOBS=false` into "this replica only consumes the singleton's outputs via Prisma/Redis"
- Redis-backed rate limiter via `express-rate-limit` + `rate-limit-redis` — confirms Redis is already a horizontal-scaling-ready shared store; same Redis hosts the Socket.IO adapter
- Multi-provider fallback chains (AI, translation) — these are stateless per-call; safe to run on every web replica

### Integration Points
- `server/index.ts` startup block — gates `NewsAggregator.startAggregation()`, `cleanupService.start()`, email digest registration on `RUN_JOBS === 'true'`
- Socket.IO `io = new Server(httpServer, ...)` initialization — wraps with `io.adapter(createAdapter(pubClient, subClient))` from `@socket.io/redis-adapter`
- News-read routes (`server/routes/news.ts`) — currently read from `req.app.locals.newsAggregator`'s in-memory Maps; refactor to read via Prisma + `CacheService`
- New `server/jobs/worker.ts` (or similar) entrypoint for `app-worker` — boots only the singleton services, no Express HTTP server, but does construct the Socket.IO `Emitter`

### What stays unchanged
- Frontend code (`apps/web/src/`) — no changes; still talks to one logical backend
- Public API routes (`apps/web/server/routes/publicApi.ts`) — already stateless
- Test harness patterns (Vitest, Playwright) — augmented with the new multi-replica integration test, not replaced

</code_context>

<specifics>
## Specific Ideas

- Sticky cookie name `nh_sticky` mirrors the `nh_*` prefix already used for API keys (`nh_live_…`) — keeps NewsHub's cookie/identifier conventions consistent
- Worker service name `app-worker` (not `worker` or `jobs`) so it groups with `app` alphabetically in Swarm output and Grafana panels
- Architecture doc lives at `docs/multi-region-patterns.md` (root `docs/`, not `.planning/`) so it's discoverable to ops engineers without GSD context
- `RUN_JOBS=true|false` env (not `IS_WORKER=...` or `MODE=worker`) so the variable name describes the *behavior* (run scheduled jobs), not the role label
- PgBouncer pool target of 25 backends sized so `max_connections=200` retains ~80 slots for migrations, replication, and operational tools

</specifics>

<deferred>
## Deferred Ideas

- **Multi-host Swarm** — Phase 37 validates on single-host. Multi-host (3-node manager+workers, encrypted overlay) would be a v1.7 phase or absorbed into INFRA-F01.
- **Active-active multi-region** (INFRA-F01) — INFRA-05 here is *documentation only*. The implementation is future work.
- **Kubernetes migration** (INFRA-F02) — not on roadmap until v1.7+; the Swarm topology is the durable choice for this milestone.
- **CDN edge caching** (INFRA-F03) — not in scope; the multi-region doc points at it.
- **Redis HA (Sentinel / cluster)** — single Redis is the choice for Phase 37. Once Redis becomes a SPOF (post-30k load tests), revisit in a follow-up.
- **Autoscaling policies** (CPU/RPS-based replica scaling) — Swarm supports it but the success criterion is "scales to N replicas via `deploy.replicas`", not auto-scale. Defer.
- **Dedicated Redis for Socket.IO pub/sub** — single shared Redis is fine until adapter throughput becomes a bottleneck.
- **Node-process clustering inside a replica** — out of scope; the unit of scaling is the container, not the worker process.

</deferred>

---

*Phase: 37-horizontal-scaling*
*Context gathered: 2026-04-29*
