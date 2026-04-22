# Phase 15: Query Optimization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 15-query-optimization
**Areas discussed:** N+1 Query Fixes, Index Strategy, API Response Timing, Batch Operations

---

## N+1 Query Fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Batch load + compute | Single query for all UserBadges with Badge. Compute points in JS. Simple, no schema change. | ✓ |
| Stored computed column | Add User.totalPoints field. Update on badge earn. Fastest reads, but requires migration + triggers. | |
| Redis-cached rankings | Cache computed leaderboard in Redis (TTL 5min). Best for scale, adds complexity. | |

**User's choice:** Batch load + compute (Recommended)
**Notes:** Chosen for simplicity — no schema changes, minimal risk.

### Follow-up: /leaderboard/me Endpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Same batch approach | Each endpoint computes independently. Simpler, stateless. | ✓ |
| Share cached result | Cache main leaderboard result, /me looks up position. Faster for /me, adds coupling. | |

**User's choice:** Same batch approach
**Notes:** Keeps endpoints independent, avoids shared state.

---

## Index Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add composite index | Leaderboard queries filter by both fields. Speeds up WHERE clause. | |
| Skip for now | User table is small (<1000). Index overhead not worth it until scale. | |
| You decide | Claude judges based on query patterns and table size. | ✓ |

**User's choice:** You decide
**Notes:** Deferred to Claude's discretion during planning.

---

## API Response Timing

### Measurement Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Response-time middleware | Add Express middleware that logs request duration. Lightweight, no external deps. | ✓ |
| prom-client metrics | Prometheus-compatible metrics with histogram buckets. Good for production monitoring dashboards. | |
| Structured JSON logs only | Log duration in existing logger. Parse logs for percentiles later. | |

**User's choice:** Response-time middleware (Recommended)
**Notes:** Lightweight, no external dependencies needed.

### Output Location

| Option | Description | Selected |
|--------|-------------|----------|
| Server-Timing header | Standard HTTP header. Chrome DevTools shows it. No log parsing needed. | ✓ |
| JSON log line | Structured log per request: {path, method, status, durationMs}. Parse later. | |
| Both | Header for dev inspection + log for aggregation. More complete. | |

**User's choice:** Server-Timing header (Recommended)
**Notes:** Chrome DevTools integration makes debugging easy.

---

## Batch Operations

| Option | Description | Selected |
|--------|-------------|----------|
| Promise.all with chunks | Split into chunks of 50, run each chunk in parallel. Simple, avoids connection exhaustion. | ✓ |
| Prisma transaction batch | $transaction with array of operations. Atomic but slower than parallel. | |
| Keep sequential, add concurrency limit | Use p-limit or similar. Sequential but prevents overwhelming DB. | |

**User's choice:** Promise.all with chunks (Recommended)
**Notes:** Chunk size 50 chosen to balance parallelism with connection pool limits.

---

## Claude's Discretion

- Whether to add composite index on `User(showOnLeaderboard, emailVerified)`

## Deferred Ideas

- Prometheus metrics with prom-client
- Slow query logging (>100ms)
- Redis-cached leaderboard rankings
- PostgreSQL full-text search (tsvector)
