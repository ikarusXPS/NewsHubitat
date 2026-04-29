# Phase 34: Database Optimization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 34-database-optimization
**Areas discussed:** Audit approach, Index strategy, N+1 fix patterns, Pool tuning

---

## Audit Approach

### Query Priority Selection

| Option | Description | Selected |
|--------|-------------|----------|
| All routes (Recommended) | Audit every API endpoint query systematically. ~20 routes with DB queries. Comprehensive baseline. | ✓ |
| Hot paths only | Focus on /api/news, /api/analysis, /api/events - the most frequent queries. Faster but less complete. | |
| Slow queries only | Only audit queries already flagged >100ms in dev logs. Risk: misses queries that degrade under load. | |

**User's choice:** All routes (Recommended)
**Notes:** Systematic audit of all routes provides comprehensive baseline for optimization decisions.

### Documentation Format

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown report (Recommended) | Single AUDIT.md file with tables: route, query, execution plan, recommendations. Easy to review in PR. | ✓ |
| JSON + summary | Machine-readable JSON for each query, plus human-readable summary. Enables future automation. | |
| Inline code comments | Add EXPLAIN results as comments in service files. Risk: clutters code, harder to update. | |

**User's choice:** Markdown report (Recommended)
**Notes:** Single file makes PR review straightforward.

### Action Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential scan >1000 rows | Create index when EXPLAIN shows seq scan on tables with >1000 rows. Balanced approach. | ✓ |
| Sequential scan >5000 rows | Conservative - only index large scans. Fewer indexes, simpler maintenance. | |
| Any seq scan on indexed column | Aggressive - index planner should use indexes. Risk: over-indexing small tables. | |

**User's choice:** Sequential scan >1000 rows
**Notes:** Balanced threshold for action.

### Load Testing Inclusion

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with load (Recommended) | Run EXPLAIN ANALYZE during k6 smoke test. Shows real-world behavior with concurrent connections. | |
| Idle only | Run against idle database. Faster audit but may miss contention issues. | |
| Both | Document both idle and loaded timings. More complete but doubles audit time. | ✓ |

**User's choice:** Both
**Notes:** Complete picture with idle and loaded timings to capture contention behavior.

---

## Index Strategy

### Composite Index Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Query-driven (Recommended) | Create composite indexes only for specific queries shown slow in audit. Minimal indexes. | ✓ |
| Proactive multi-column | Add composites for common filter patterns (region+sentiment, userId+createdAt). Anticipate needs. | |
| Covering indexes | Include all SELECT columns in index to avoid table lookups. Larger indexes but fastest queries. | |

**User's choice:** Query-driven (Recommended)
**Notes:** Minimal indexes, only where audit proves need.

### Partial Index Usage

| Option | Description | Selected |
|--------|-------------|----------|
| For soft deletes (Recommended) | WHERE deletedAt IS NULL on Team table. Excludes deleted rows from index. Common pattern. | ✓ |
| For active records | WHERE isActive = true on EmailSubscription. Smaller index for active-only queries. | |
| Avoid partials | Keep indexes simple. Partial indexes add maintenance complexity. | |

**User's choice:** For soft deletes (Recommended)
**Notes:** Team table has soft delete pattern, partial index makes sense.

---

## N+1 Fix Patterns

### Detection Method

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma log analysis (Recommended) | Parse dev logs for repeated query patterns. Already enabled in Phase 29. Low effort. | |
| Manual code review | Review all loops that make DB calls. Thorough but time-consuming. | |
| Both + automated check | Code review plus add a dev-mode middleware that warns on >5 queries per request. | ✓ |

**User's choice:** Both + automated check
**Notes:** Comprehensive detection with automated warning for future development.

### Fix Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma include (Recommended) | Use include/select to eager load relations. Prisma handles JOINs. Safest, most maintainable. | ✓ |
| Batch queries | Collect IDs, then findMany({ where: { id: { in: ids } } }). Manual but explicit. | |
| Raw SQL for complex cases | Use prisma.$queryRaw for complex JOINs or aggregates. Maximum control but loses type safety. | |

**User's choice:** Prisma include (Recommended)
**Notes:** Type safety and maintainability over marginal performance gains.

### Eager Loading Depth

| Option | Description | Selected |
|--------|-------------|----------|
| 2 levels max (Recommended) | User → Bookmarks → Article. Prevents loading entire graph. Balance completeness and performance. | ✓ |
| 1 level only | Direct relations only (User → Bookmarks). Strictest but may require separate queries. | |
| Query-specific | Set depth per use case. Flexible but requires more decisions per endpoint. | |

**User's choice:** 2 levels max (Recommended)
**Notes:** Reasonable depth limit prevents over-fetching.

---

## Pool Tuning

### Pool Size Determination

| Option | Description | Selected |
|--------|-------------|----------|
| Formula-based (Recommended) | Use (cores * 2) + disk spindles formula. For 4-core: pool=10. Already configured, validate under load. | ✓ |
| Empirical testing | Run k6 at various pool sizes (5, 10, 20, 30), measure p95 latency and error rate. | |
| Start conservative | Keep pool=10, only increase if connection wait metrics show exhaustion. | |

**User's choice:** Formula-based (Recommended)
**Notes:** Current pool=10 is formula-compliant, validate but don't change without evidence.

### Exhaustion Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Queue with timeout (Current) | Wait up to 5s for connection. Already configured. Graceful under burst, fails on sustained overload. | ✓ |
| Fail fast | Return error immediately on exhaustion. Forces upstream to handle. Faster feedback loop. | |
| Queue + circuit breaker | Queue but trip breaker after N timeouts. Prevents cascade. More complex. | |

**User's choice:** Queue with timeout (Current)
**Notes:** Keep current behavior, it's working well.

### Pool Monitoring

| Option | Description | Selected |
|--------|-------------|----------|
| Prometheus metrics (Recommended) | Expose pool_size, active_connections, wait_time via /metrics. Dashboard in Grafana. | ✓ |
| Log-based only | Log pool exhaustion events. Simpler but harder to trend. Already have some logging. | |
| Both + alerts | Metrics plus alert on >80% pool utilization for >1min. Proactive but more setup. | |

**User's choice:** Prometheus metrics (Recommended)
**Notes:** Integrate with existing Prometheus/Grafana stack.

---

## Claude's Discretion

- Exact format of 34-AUDIT.md tables and sections
- Query selection order during audit
- N+1 detection middleware implementation details
- Prometheus metric names and labels
- Whether to add composite index on User(showOnLeaderboard, emailVerified)

## Deferred Ideas

None — discussion stayed within phase scope
