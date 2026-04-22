# Phase 15: Query Optimization - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize database queries and API response times. This phase eliminates N+1 query patterns, adds missing indexes, implements response timing, and batches bulk operations. Target: p95 response time < 200ms.

</domain>

<decisions>
## Implementation Decisions

### N+1 Query Fixes
- **D-01:** Leaderboard N+1 fix — batch load all UserBadges with Badge relation in single query, compute points in JS
- **D-02:** No schema changes — avoid stored computed columns or triggers
- **D-03:** `/leaderboard/me` endpoint uses same batch approach (independent computation, no shared cache)

### Index Strategy
- **D-04:** Existing indexes are sufficient — NewsArticle has compound indexes, UserBadge has unique constraint (creates implicit index)

### Claude's Discretion (Indexes)
- Whether to add composite index on `User(showOnLeaderboard, emailVerified)` — Claude decides based on query patterns and actual table size

### API Response Timing
- **D-05:** Add Express middleware for response timing measurement
- **D-06:** Output timing via `Server-Timing` HTTP header — Chrome DevTools compatible, no log parsing needed

### Batch Operations
- **D-07:** NewsAggregator article saves — use `Promise.all` with chunks of 50 articles
- **D-08:** Parallel chunks prevent connection pool exhaustion while maximizing throughput

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### N+1 Query Patterns
- `server/routes/leaderboard.ts` — Lines 11-32 (`calculateUserPoints`), 40-56 (N+1 loop), 99-114 (`/me` endpoint)
- Fix pattern: single `prisma.userBadge.findMany()` → group by userId → compute in memory

### Batch Operations
- `server/services/newsAggregator.ts` — Lines 233-248 (sequential upsert loop)
- Fix pattern: chunk array, `Promise.all` per chunk

### Existing Indexes (for reference)
- `prisma/schema.prisma` — Lines 39-46 (NewsArticle indexes), 112-114 (User indexes), 125 (Bookmark)

### Database Configuration
- `server/db/prisma.ts` — Prisma client singleton with PostgreSQL adapter
- Phase 13/14 established pooling: 10 connections, 5s timeout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/utils/logger.ts` — Structured JSON logging for timing data
- Express middleware pattern already used for auth and rate limiting

### Established Patterns
- Singleton services via `getInstance()` pattern
- Prisma relations with `include` for eager loading
- All routes return `{ success: boolean, data?: T, error?: string }` format

### Integration Points
- `server/index.ts` — Add timing middleware before routes (after rate limiting)
- `server/routes/leaderboard.ts` — Refactor `calculateUserPoints` to batch approach
- `server/services/newsAggregator.ts` — Refactor article save loop to chunked parallel

</code_context>

<specifics>
## Specific Ideas

- Timing middleware should use `process.hrtime.bigint()` for nanosecond precision
- `Server-Timing: total;dur={ms}` header format
- Chunk size 50 balances parallelism vs connection pool (10 connections × 5 concurrent = 50)
- Leaderboard batch query: `prisma.userBadge.findMany({ where: { userId: { in: userIds } }, include: { badge: true } })`

</specifics>

<deferred>
## Deferred Ideas

- **Prometheus metrics** — prom-client with histogram buckets. Defer to monitoring phase.
- **Query logging** — Log slow queries (>100ms). Add after timing baseline established.
- **Redis-cached leaderboard** — Cache computed rankings. Defer unless scale demands it.
- **PostgreSQL full-text search** — Replace LIKE queries with tsvector. Separate phase.

</deferred>

---

*Phase: 15-query-optimization*
*Context gathered: 2026-04-22*
