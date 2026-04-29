# Phase 37: Horizontal Scaling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 37-horizontal-scaling
**Areas discussed:** WebSocket fanout strategy, PgBouncer pool mode + sizing, Singleton job ownership, Swarm deployment artifact + replica target

---

## WebSocket fanout strategy

### Q1 — How should WebSocket broadcasts work across replicas?

| Option | Description | Selected |
|--------|-------------|----------|
| Redis adapter + sticky sessions | `@socket.io/redis-adapter` for cross-replica pub/sub + Traefik sticky sessions for connection stability. | ✓ |
| Sticky sessions only | Cheapest. Cross-replica broadcasts silently fan out to ~1/N of users. | |
| Redis adapter only, no sticky | Reconnect handshakes flaky without sticky. | |

**User's choice:** Redis adapter + sticky sessions
**Notes:** Both moving parts but every existing emit pattern keeps working unchanged.

### Q2 — Sticky session method on Traefik?

| Option | Description | Selected |
|--------|-------------|----------|
| Cookie sticky on the LB | Traefik sets `nh_sticky` cookie. Survives client IP changes. | ✓ |
| IP hash | Breaks when users roam across networks. | |
| Header-based (X-Forwarded-For) | Custom header routing; only useful for special cases. | |

**User's choice:** Cookie sticky on the LB
**Notes:** Cookie name `nh_sticky` mirrors the existing `nh_*` identifier convention.

### Q3 — Redis topology for the Socket.IO adapter?

| Option | Description | Selected |
|--------|-------------|----------|
| Share the existing Redis instance | Reuse `REDIS_URL`. Adapter prefixes its own channels (`socket.io#`). | ✓ |
| Dedicated Redis for pub/sub | Isolates fanout from cache traffic. Premature here. | |
| Redis Sentinel / cluster from day one | HA Redis. Justified later, not now. | |

**User's choice:** Share the existing Redis instance

### Q4 — How to verify WebSocket fanout works?

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-replica integration test | 2 replicas behind Traefik; broadcast on A, assert receive on B. | ✓ |
| Unit-level adapter mock | Doesn't catch sticky/networking issues. | |
| Manual smoke + Grafana | No automation; fragile. | |

**User's choice:** Multi-replica integration test

---

## PgBouncer pool mode + sizing

### Q1 — Pool mode?

| Option | Description | Selected |
|--------|-------------|----------|
| Transaction pooling + Prisma `pgbouncer=true` | Maximum collapse. Codebase has no LISTEN/NOTIFY — safe. | ✓ |
| Session pooling | Compatible with everything but barely better than direct connections. | |
| Two pools — transaction (app) + session (migrations) | Most correct, adds config complexity. | |

**User's choice:** Transaction pooling + `pgbouncer=true`

### Q2 — Migration path (Prisma can't migrate through transaction-mode pgbouncer)?

| Option | Description | Selected |
|--------|-------------|----------|
| DIRECT_URL bypassing PgBouncer | Standard Prisma pattern. | ✓ |
| Second PgBouncer pool in session mode | Avoids exposing Postgres but adds surface. | |
| Run migrations from inside swarm with port-forward | Hides bypass from app config; specialized. | |

**User's choice:** DIRECT_URL bypassing PgBouncer

### Q3 — Pool sizing?

| Option | Description | Selected |
|--------|-------------|----------|
| 4 replicas × Prisma max:20 → PgBouncer pool 25 → PG max_connections 200 | Concrete starting topology with headroom. | ✓ |
| Stick with current Prisma max:10 per replica, just add PgBouncer | Doesn't really exercise INFRA-03's "100+ concurrent connections". | |
| Researcher decides numbers, lock only the topology | Pure topology lock. | |

**User's choice:** 4 × 20 → 25 → 200 (concrete numbers refined by researcher/planner)

### Q4 — Pool observability?

| Option | Description | Selected |
|--------|-------------|----------|
| Prometheus metrics from PgBouncer + Prisma pool | pgbouncer-exporter + getPoolStats(); Grafana + Alertmanager. | ✓ |
| Postgres-side metrics only | Misses client-side waiting. | |
| App-level structured logs only | Cheapest, downstream symptoms only. | |

**User's choice:** Prometheus metrics from PgBouncer + Prisma pool

---

## Singleton job ownership

### Q1 — Job topology?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated worker service in Swarm | `app-worker` (replicas=1, RUN_JOBS=true); web replicas RUN_JOBS=false. | ✓ |
| Leader election via Redis lock | Self-healing but more moving parts (renewal, split-brain). | |
| Move jobs to a separate cron container | Cleanest but loses in-process state. | |

**User's choice:** Dedicated worker service in Swarm

### Q2 — How do web replicas get fresh news data without the in-memory aggregator Maps?

| Option | Description | Selected |
|--------|-------------|----------|
| Web reads from Postgres + Redis cache | Worker writes; web reads via Prisma + CacheService. Worker invalidates relevant cache keys. | ✓ |
| Worker pushes via Redis pub/sub | Each replica holds full dataset — RAM grows linearly. | |
| Defer — keep in-memory Maps, accept staleness | Inconsistent reads across replicas. | |

**User's choice:** Web reads from Postgres + Redis cache

### Q3 — Worker→client real-time path?

| Option | Description | Selected |
|--------|-------------|----------|
| Worker emits via Socket.IO Redis adapter directly | `Emitter` bound to Redis adapter; same code path as web. | ✓ |
| Redis pub/sub channel + web replicas re-broadcast | Two hops; custom code. | |
| Database polling from web | Loses real-time UX. | |

**User's choice:** Worker emits via Socket.IO Redis adapter directly

### Q4 — Phase 37 refactor scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Full split: web no longer holds in-memory Maps | Clean E2E story; one-time refactor sized into phase. | ✓ |
| Minimum viable: gate aggregator startup, accept stale reads | Smaller diff but architecturally muddy. | |
| Keep refactor for a follow-up phase | Risk: empty Maps and broken `/api/news` until follow-up. | |

**User's choice:** Full split lands in Phase 37

---

## Swarm deployment artifact + replica target

### Q1 — Stack file relationship to docker-compose.yml?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `stack.yml` for Swarm; keep `docker-compose.yml` for local dev | Two files, clear separation. | ✓ |
| Extend single docker-compose.yml with `deploy:` keys | One file but env vars leak into local. | |
| compose.yml + compose.swarm.override.yml | Override pattern; third invocation to remember. | |

**User's choice:** Separate `stack.yml`

### Q2 — Validation target for INFRA-01?

| Option | Description | Selected |
|--------|-------------|----------|
| 4 web replicas + 1 worker on a single host | Proves the contract; CI-runnable. | ✓ |
| Multi-host (3-node) Swarm | Real production topology; heavy for one phase. | |
| Lock topology only, no specific replica number | Defers scale validation. | |

**User's choice:** 4 web replicas + 1 worker on single-host Swarm

### Q3 — Multi-region documentation depth (INFRA-05)?

| Option | Description | Selected |
|--------|-------------|----------|
| Architecture doc only — patterns and trade-offs | Closes INFRA-05 cleanly without vendor lock-in. | ✓ |
| Doc + concrete deploy templates for one cloud | Risks scope creep into v1.7. | |
| Lightweight ADR pointing at INFRA-F01 | Minimum viable. | |

**User's choice:** Architecture doc only

### Q4 — Graceful shutdown / zero-downtime deploys?

| Option | Description | Selected |
|--------|-------------|----------|
| In-scope: split readiness + liveness, SIGTERM drain | Required for rolling updates not to drop requests. | ✓ |
| Out-of-scope — keep current single /api/health | Risk: 502s and disconnect storms during deploys. | |
| Add readiness only, defer drain logic | Compromise. | |

**User's choice:** In-scope; split `/api/ready` and `/api/health`, SIGTERM drain Socket.IO with 30s grace, close pg pool

---

## Claude's Discretion

- Exact Traefik service-discovery mechanism (Docker provider labels vs file provider)
- TLS termination location (Traefik vs upstream) unless researcher flags a constraint
- Exact PgBouncer image (`edoburu/pgbouncer` vs `bitnami/pgbouncer` vs official)
- Specific Prometheus exporter versions, dashboard JSON
- Whether worker uses a different Dockerfile entrypoint or env-gated startup branching in `server/index.ts`
- Exact PgBouncer/Prisma numeric tuning (starting topology locked, exact knobs not)
- File paths for `stack.yml` and `docs/multi-region-patterns.md` (existence + shape locked)

## Deferred Ideas

- Multi-host Swarm validation
- Active-active multi-region implementation (INFRA-F01)
- Kubernetes migration (INFRA-F02)
- CDN edge caching implementation (INFRA-F03)
- Redis HA (Sentinel / cluster)
- Autoscaling policies (CPU/RPS-based replica scaling)
- Dedicated Redis instance for Socket.IO pub/sub
- Node-process clustering inside a replica
