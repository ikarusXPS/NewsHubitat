# Phase 34: Database Optimization - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize database query performance through EXPLAIN ANALYZE audits, composite indexes, N+1 query fixes, and connection pool tuning. Implements DB-01 through DB-04 from v1.5 requirements.

**Target:** 95th percentile database query time under 50ms.

</domain>

<decisions>
## Implementation Decisions

### Audit Approach

- **D-01:** Audit all routes with database queries systematically (~20 routes). Comprehensive baseline before optimization.
- **D-02:** Document findings in single Markdown report (34-AUDIT.md). Tables with route, query, execution plan, recommendations.
- **D-03:** Threshold for action: create index when EXPLAIN shows sequential scan on tables with >1000 rows.
- **D-04:** Run audit both idle and under k6 smoke load. Document both timings to capture contention behavior.

### Index Strategy

- **D-05:** Query-driven composite indexes only. Create composites for specific queries shown slow in audit, not proactively.
- **D-06:** Partial indexes for soft deletes: `WHERE deletedAt IS NULL` on Team table. Excludes deleted rows from index.
- **D-07:** Existing indexes are mostly sufficient (established in Phase 13/15). Add composites only where audit shows need.

### N+1 Fix Patterns

- **D-08:** Identify N+1s via: (1) Prisma log analysis (already enabled), (2) manual code review of loops with DB calls, (3) dev-mode middleware warning on >5 queries per request.
- **D-09:** Fix pattern: Prisma `include`/`select` for eager loading. Prisma handles JOINs, maintains type safety.
- **D-10:** Eager loading depth: 2 levels maximum (e.g., User → Bookmarks → Article). Prevents loading entire graph.
- **D-11:** Avoid raw SQL unless Prisma cannot express the query. Type safety > marginal performance.

### Pool Tuning

- **D-12:** Pool size = 10 connections (already configured). Formula-based: (cores * 2) + spindles. Validate under load but don't change without evidence.
- **D-13:** Pool exhaustion behavior: queue with 5s timeout (current). Graceful under burst, fails on sustained overload.
- **D-14:** Expose pool metrics via Prometheus: pool_size, active_connections, wait_time. Add to Grafana dashboard.

### Claude's Discretion

- Exact format of 34-AUDIT.md tables and sections
- Query selection order during audit
- N+1 detection middleware implementation details
- Prometheus metric names and labels
- Whether to add composite index on User(showOnLeaderboard, emailVerified) — decide based on audit results

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Decisions
- `.planning/phases/13-postgresql-migration/13-CONTEXT.md` — Pool size=10, connection timeout=5s, idle timeout=5min
- `.planning/phases/15-query-optimization/15-CONTEXT.md` — Chunk size 50, Server-Timing headers, N+1 batch patterns
- `.planning/phases/29-measurement-foundation/29-CONTEXT.md` — Prisma query logging (>100ms = slow), Lighthouse CI

### Database Configuration
- `server/db/prisma.ts` — PrismaPg adapter with pool config, query event logging
- `prisma/schema.prisma` — All 20 models with existing indexes (lines 39-46 for NewsArticle, 126-130 for User)

### Requirements
- `.planning/REQUIREMENTS.md` — DB-01, DB-02, DB-03, DB-04 (lines 36-40)

### Monitoring Stack
- `server/services/metricsService.ts` — MetricsService singleton, prom-client registry
- `prometheus/` — Prometheus configuration, alerting rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/db/prisma.ts`: Query event logging already captures slow queries (>100ms)
- `server/services/metricsService.ts`: Prometheus registry pattern for adding pool metrics
- `server/middleware/serverTiming.ts`: Response timing infrastructure
- `server/utils/logger.ts`: Structured JSON logging

### Established Patterns
- Singleton services via `getInstance()` pattern
- Prisma relations with `include` for eager loading (used in newsAggregator)
- Chunk size 50 for batch operations (Phase 15 decision)
- Prometheus metrics via prom-client with route normalization

### Integration Points
- `server/db/prisma.ts` — Add pool metrics exposure
- All route files — Review for N+1 patterns
- `.github/workflows/ci.yml` — Potential for automated N+1 detection

</code_context>

<specifics>
## Specific Ideas

- N+1 detection middleware: wrap Prisma client, count queries per request, warn in dev if >5
- Pool metrics: use pg-pool internals (totalCount, idleCount, waitingCount) exposed via Prometheus
- AUDIT.md structure: one section per route, EXPLAIN ANALYZE output in code blocks, timing comparison table
- k6 smoke test for load timing: use existing `load-tests/smoke.js` with reduced VUs

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-database-optimization*
*Context gathered: 2026-04-26*
