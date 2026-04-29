# Phase 34: Database Optimization - Research

**Researched:** 2026-04-26
**Domain:** PostgreSQL query optimization, Prisma ORM, connection pooling
**Confidence:** HIGH

## Summary

Phase 34 addresses the final performance optimization milestone (v1.5) by auditing and optimizing database queries. The codebase already has solid foundations from Phase 13 (PostgreSQL migration with pool size=10), Phase 15 (N+1 batch patterns), and Phase 29 (Prisma query logging with >100ms threshold).

The primary work involves: (1) systematic EXPLAIN ANALYZE audit of all routes with database queries, (2) adding composite indexes where audit shows sequential scans on large tables, (3) identifying and fixing remaining N+1 patterns via Prisma log analysis and code review, and (4) exposing pg-pool metrics to Prometheus for connection pool visibility.

**Primary recommendation:** Execute the audit systematically by route category (auth, teams, comments, leaderboard), document findings in 34-AUDIT.md, then implement targeted fixes based on evidence. The existing Prisma query logging (>100ms warning) already provides visibility into slow queries.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audit Approach**
- D-01: Audit all routes with database queries systematically (~20 routes). Comprehensive baseline before optimization.
- D-02: Document findings in single Markdown report (34-AUDIT.md). Tables with route, query, execution plan, recommendations.
- D-03: Threshold for action: create index when EXPLAIN shows sequential scan on tables with >1000 rows.
- D-04: Run audit both idle and under k6 smoke load. Document both timings to capture contention behavior.

**Index Strategy**
- D-05: Query-driven composite indexes only. Create composites for specific queries shown slow in audit, not proactively.
- D-06: Partial indexes for soft deletes: `WHERE deletedAt IS NULL` on Team table. Excludes deleted rows from index.
- D-07: Existing indexes are mostly sufficient (established in Phase 13/15). Add composites only where audit shows need.

**N+1 Fix Patterns**
- D-08: Identify N+1s via: (1) Prisma log analysis (already enabled), (2) manual code review of loops with DB calls, (3) dev-mode middleware warning on >5 queries per request.
- D-09: Fix pattern: Prisma `include`/`select` for eager loading. Prisma handles JOINs, maintains type safety.
- D-10: Eager loading depth: 2 levels maximum (e.g., User -> Bookmarks -> Article). Prevents loading entire graph.
- D-11: Avoid raw SQL unless Prisma cannot express the query. Type safety > marginal performance.

**Pool Tuning**
- D-12: Pool size = 10 connections (already configured). Formula-based: (cores * 2) + spindles. Validate under load but don't change without evidence.
- D-13: Pool exhaustion behavior: queue with 5s timeout (current). Graceful under burst, fails on sustained overload.
- D-14: Expose pool metrics via Prometheus: pool_size, active_connections, wait_time. Add to Grafana dashboard.

### Claude's Discretion

- Exact format of 34-AUDIT.md tables and sections
- Query selection order during audit
- N+1 detection middleware implementation details
- Prometheus metric names and labels
- Whether to add composite index on User(showOnLeaderboard, emailVerified) - decide based on audit results

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-01 | EXPLAIN ANALYZE audit completed for all major query patterns | Prisma `$queryRaw` supports EXPLAIN ANALYZE; audit template and route inventory documented |
| DB-02 | Composite indexes added for identified slow queries | Query-driven approach per D-05; existing indexes cover most cases per Phase 13/15 |
| DB-03 | N+1 query patterns identified and fixed in Prisma queries | Prisma log analysis (already enabled), dev middleware for query counting, `include`/`select` patterns |
| DB-04 | Connection pool tuned based on workload analysis | Pool metrics via pg-pool properties (totalCount, idleCount, waitingCount) exposed to Prometheus |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Query execution | Database (PostgreSQL) | - | All queries execute in PostgreSQL; Prisma translates |
| Index management | Database (PostgreSQL) | - | Indexes are PostgreSQL-native; Prisma schema declares them |
| Connection pooling | Backend (pg-pool) | - | Pool managed by @prisma/adapter-pg with pg-pool underneath |
| Query logging | Backend (Prisma) | - | Prisma events emit query timing; backend logs |
| Metrics exposure | Backend (Express) | - | /api/metrics endpoint serves Prometheus format |
| Pool monitoring | Backend + Grafana | - | Pool metrics collected by MetricsService, visualized in Grafana |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/adapter-pg | ^7.7.0 | PostgreSQL adapter for Prisma | [VERIFIED: package.json] Already installed; provides pg-pool internals |
| prisma | ^7.7.0 | ORM with query logging | [VERIFIED: package.json] Already installed; $queryRaw for EXPLAIN ANALYZE |
| prom-client | ^15.1.3 | Prometheus metrics | [VERIFIED: package.json] Already installed; MetricsService pattern established |
| pg | ^8.20.0 | PostgreSQL driver | [VERIFIED: package.json] Already installed; Pool exposes metrics properties |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new required) | - | - | All dependencies already installed |

**No new installations required.** All optimization work uses existing libraries.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│   API Routes    │───>│  Prisma Client   │───>│   pg-pool (10)    │
│  (~20 routes)   │    │  (query events)  │    │  (connection mgmt)│
└────────┬────────┘    └────────┬─────────┘    └─────────┬─────────┘
         │                      │                        │
         │ N+1 detection        │ Query logging          │ Pool metrics
         │ middleware           │ (>100ms warning)       │ (totalCount, idleCount)
         ▼                      ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│  Request-scoped │    │  Dev Console     │    │   PostgreSQL      │
│  Query Counter  │    │  Slow Query Warn │    │   (EXPLAIN ANALYZE)│
└────────┬────────┘    └──────────────────┘    └───────────────────┘
         │
         │ >5 queries warning
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MetricsService                              │
│  (pool_size, db_connections_active, db_query_wait_time)         │
└─────────────────────────────────────────────────────────────────┘
         │
         │ /api/metrics
         ▼
┌─────────────────┐    ┌──────────────────┐
│   Prometheus    │───>│     Grafana      │
│   (scrape)      │    │   (dashboard)    │
└─────────────────┘    └──────────────────┘
```

### Recommended Audit Structure (34-AUDIT.md)

```markdown
# Database Query Audit

**Date:** YYYY-MM-DD
**Environment:** Development / k6 smoke load

## Summary
- Total routes audited: N
- Queries needing optimization: N
- Indexes recommended: N

## Route Audits

### Auth Routes

| Route | Method | Query | Exec Time (idle) | Exec Time (load) | Plan | Recommendation |
|-------|--------|-------|------------------|------------------|------|----------------|
| /api/auth/login | POST | User.findUnique | 2ms | 5ms | Index Scan | OK |
| ... | ... | ... | ... | ... | ... | ... |

### EXPLAIN ANALYZE Output

\`\`\`sql
-- Route: GET /api/leaderboard
EXPLAIN ANALYZE
SELECT ...
\`\`\`

\`\`\`
Index Scan using user_pkey on "User"  (cost=0.29..8.31 rows=1 width=...)
  actual time=0.015..0.016 rows=1 loops=1
\`\`\`
```

### Pattern 1: EXPLAIN ANALYZE via Prisma $queryRaw
**What:** Execute EXPLAIN ANALYZE for any Prisma query using raw SQL
**When to use:** During audit phase to understand query execution plans
**Example:**
```typescript
// Source: Prisma docs - raw queries
const result = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM "User"
  WHERE "showOnLeaderboard" = true AND "emailVerified" = true
`;
console.log(result); // Array of execution plan rows
```

### Pattern 2: N+1 Detection Middleware
**What:** Request-scoped counter that warns when >5 queries execute per request
**When to use:** Development mode only (gated by NODE_ENV)
**Example:**
```typescript
// Source: [ASSUMED] - middleware pattern from Prisma community practices
import { prisma } from '../db/prisma';

// Extend Prisma client with query counting
let requestQueryCount = 0;

prisma.$on('query', () => {
  requestQueryCount++;
});

// Express middleware
export function queryCountMiddleware(req, res, next) {
  requestQueryCount = 0;  // Reset for new request

  res.on('finish', () => {
    if (requestQueryCount > 5) {
      console.warn(`[N+1 WARNING] ${req.method} ${req.path}: ${requestQueryCount} queries`);
    }
  });

  next();
}
```

### Pattern 3: Pool Metrics via pg-pool Properties
**What:** Expose connection pool statistics to Prometheus
**When to use:** Always (production monitoring)
**Example:**
```typescript
// Source: [CITED: node-postgres.com/apis/pool] - Pool properties
// Access pool from PrismaPg adapter internals
import { Gauge } from 'prom-client';

// Note: PrismaPg wraps pg Pool; access via adapter internals
// The pool exposes: totalCount, idleCount, waitingCount

const poolSizeGauge = new Gauge({
  name: 'db_pool_total_connections',
  help: 'Total number of connections in the pool',
});

const poolIdleGauge = new Gauge({
  name: 'db_pool_idle_connections',
  help: 'Number of idle connections in the pool',
});

const poolWaitingGauge = new Gauge({
  name: 'db_pool_waiting_requests',
  help: 'Number of requests waiting for a connection',
});

// Update gauges periodically or on each request
function updatePoolMetrics(pool) {
  poolSizeGauge.set(pool.totalCount);
  poolIdleGauge.set(pool.idleCount);
  poolWaitingGauge.set(pool.waitingCount);
}
```

### Pattern 4: Composite Index for Leaderboard Query
**What:** Add composite index when EXPLAIN shows sequential scan
**When to use:** Only if audit reveals Seq Scan on User table for leaderboard queries
**Example:**
```prisma
// Source: [CITED: postgresql.org/docs/current/indexes-partial.html]
// Only add if audit shows need (per D-05)

model User {
  // ... existing fields ...

  // Composite index for leaderboard query
  // SELECT * FROM User WHERE showOnLeaderboard = true AND emailVerified = true
  @@index([showOnLeaderboard, emailVerified])
}
```

### Pattern 5: Partial Index for Soft Deletes
**What:** Index only non-deleted rows to reduce index size and improve query performance
**When to use:** Tables with soft delete pattern (deletedAt column)
**Example:**
```prisma
// Source: [CITED: postgresql.org/docs/current/indexes-partial.html]
// Per D-06: Partial index for Team table

model Team {
  // ... existing fields ...
  deletedAt DateTime?

  // Partial index excluding deleted teams
  // Requires raw SQL migration since Prisma doesn't support WHERE clause in index
  @@index([deletedAt])  // Standard index; partial requires migration
}

// Migration SQL (run via prisma db execute):
// CREATE INDEX CONCURRENTLY idx_team_active ON "Team" (id) WHERE "deletedAt" IS NULL;
```

### Anti-Patterns to Avoid

- **Creating indexes proactively:** Don't add indexes without EXPLAIN ANALYZE evidence (D-05)
- **Deep eager loading:** Limit `include` depth to 2 levels (D-10)
- **Raw SQL for Prisma-expressible queries:** Maintain type safety (D-11)
- **Changing pool size without evidence:** Keep pool at 10 until load testing proves otherwise (D-12)
- **Query counting in production:** N+1 detection middleware is dev-only (performance overhead)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom pool manager | pg-pool via @prisma/adapter-pg | [VERIFIED: already configured] Battle-tested, handles edge cases |
| Query logging | Custom query interceptor | Prisma `$on('query')` events | [VERIFIED: server/db/prisma.ts] Already implemented in Phase 29 |
| Metrics collection | Custom metrics | prom-client with MetricsService | [VERIFIED: server/services/metricsService.ts] Established pattern |
| N+1 detection | Complex static analysis | Runtime query counting + Prisma logs | Simple, accurate, development-only |

**Key insight:** The codebase already has all infrastructure pieces in place. This phase is about using existing tools (Prisma logging, prom-client, pg-pool) to audit, measure, and optimize -- not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Optimizing Without Evidence
**What goes wrong:** Adding indexes based on intuition; indexes have write overhead and may not help reads
**Why it happens:** Developer assumes query patterns without measuring
**How to avoid:** Always run EXPLAIN ANALYZE before and after index creation; document improvement
**Warning signs:** Plan still shows Seq Scan, or query time unchanged

### Pitfall 2: Premature Pool Size Changes
**What goes wrong:** Increasing pool size causes PostgreSQL connection exhaustion or memory pressure
**Why it happens:** Misunderstanding of pool sizing formula; not accounting for other services
**How to avoid:** Monitor pool metrics under load first; formula is (cores * 2) + spindles
**Warning signs:** Pool waiting count > 0 sustained, but pool total already at limit

### Pitfall 3: N+1 Fixes That Create New Problems
**What goes wrong:** Adding `include` loads too much data; eager loading becomes over-fetching
**Why it happens:** Blanket application of `include` without considering payload size
**How to avoid:** Use `select` to limit fields; respect 2-level depth limit (D-10)
**Warning signs:** API response time improves but payload size increases 10x+

### Pitfall 4: Partial Index Syntax in Prisma
**What goes wrong:** Prisma schema doesn't support WHERE clause in @@index
**Why it happens:** Assuming Prisma has full PostgreSQL index feature parity
**How to avoid:** Use raw SQL migration for partial indexes; document in schema comments
**Warning signs:** `prisma db push` fails or ignores WHERE clause

### Pitfall 5: Concurrent Index Creation Blocking
**What goes wrong:** CREATE INDEX locks table; blocking writes in production
**Why it happens:** Using standard CREATE INDEX instead of CONCURRENTLY
**How to avoid:** Always use `CREATE INDEX CONCURRENTLY` for production tables
**Warning signs:** Lock wait timeouts during index creation

## Code Examples

### Example 1: Running EXPLAIN ANALYZE Audit
```typescript
// Source: [CITED: prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries]
async function auditLeaderboardQuery() {
  // The actual query from leaderboard.ts:68-79
  const plan = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT u.id, u.name, u."avatarUrl", u."selectedPresetAvatar"
    FROM "User" u
    WHERE u."showOnLeaderboard" = true AND u."emailVerified" = true
  `;

  console.log(JSON.stringify(plan, null, 2));
  // Look for: "Node Type": "Seq Scan" vs "Index Scan"
  // If Seq Scan on >1000 rows, consider composite index
}
```

### Example 2: Detecting Query Patterns Needing Indexes
```typescript
// Source: [ASSUMED] - common PostgreSQL best practice
// After running EXPLAIN ANALYZE, check for these patterns:

// BAD: Sequential scan on large table
// "Node Type": "Seq Scan",
// "Rows": 5000,
// "Actual Rows": 50

// GOOD: Index scan
// "Node Type": "Index Scan",
// "Index Name": "User_showOnLeaderboard_emailVerified_idx"

// Decision threshold per D-03:
// If Seq Scan AND table has >1000 rows AND query is frequent -> add index
```

### Example 3: Pool Metrics Integration with MetricsService
```typescript
// Source: [CITED: node-postgres.com/apis/pool] + existing MetricsService pattern
// Add to server/services/metricsService.ts

// New gauges for pool metrics
public dbPoolTotal: Gauge<string>;
public dbPoolIdle: Gauge<string>;
public dbPoolWaiting: Gauge<string>;

// In constructor:
this.dbPoolTotal = new Gauge({
  name: 'db_pool_total_connections',
  help: 'Total connections in database pool',
  registers: [this.registry],
});

this.dbPoolIdle = new Gauge({
  name: 'db_pool_idle_connections',
  help: 'Idle connections in database pool',
  registers: [this.registry],
});

this.dbPoolWaiting = new Gauge({
  name: 'db_pool_waiting_requests',
  help: 'Requests waiting for database connection',
  registers: [this.registry],
});

// Method to update metrics
updatePoolMetrics(pool: { totalCount: number; idleCount: number; waitingCount: number }): void {
  this.dbPoolTotal.set(pool.totalCount);
  this.dbPoolIdle.set(pool.idleCount);
  this.dbPoolWaiting.set(pool.waitingCount);
}
```

### Example 4: N+1 Detection Middleware (Dev Only)
```typescript
// Source: [ASSUMED] - Express middleware + Prisma event pattern
// Add to server/middleware/queryCounter.ts

import { prisma } from '../db/prisma';
import { Request, Response, NextFunction } from 'express';

// Only enable in development
const isDev = process.env.NODE_ENV !== 'production';

// AsyncLocalStorage for request-scoped counter
import { AsyncLocalStorage } from 'async_hooks';
const queryCountStorage = new AsyncLocalStorage<{ count: number }>();

if (isDev) {
  prisma.$on('query', () => {
    const store = queryCountStorage.getStore();
    if (store) {
      store.count++;
    }
  });
}

export function queryCounterMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!isDev) {
    return next();
  }

  const store = { count: 0 };

  queryCountStorage.run(store, () => {
    res.on('finish', () => {
      if (store.count > 5) {  // Per D-08: warn on >5 queries
        console.warn(`[N+1 WARNING] ${req.method} ${req.path}: ${store.count} queries`);
      }
    });
    next();
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential database queries | Prisma eager loading with `include` | Phase 15 (2026-04-22) | Batch queries reduce N+1 |
| Manual connection management | pg-pool via PrismaPg adapter | Phase 13 (2026-04-22) | Automatic pooling with configurable limits |
| Console.log query debugging | Prisma query events with timing | Phase 29 (2026-04-25) | >100ms warnings in dev mode |
| Guessing at indexes | EXPLAIN ANALYZE audit | This phase | Evidence-based optimization |

**Deprecated/outdated:**
- SQLite: Migrated to PostgreSQL in Phase 13; no longer used
- Prisma middleware API: Deprecated in favor of client extensions (use `$on('query')` for logging)

## Routes Requiring Audit

Based on codebase analysis, these routes have database queries:

| Route File | Routes | Query Complexity | Priority |
|------------|--------|------------------|----------|
| leaderboard.ts | 3 | User + UserBadge + Badge joins | HIGH (already optimized but verify) |
| teams.ts | 12 | Team + TeamMember + TeamBookmark + User | HIGH (multiple tables) |
| comments.ts | 5 | Comment + User nested replies | HIGH (nested includes) |
| auth.ts | 12 | User lookups, token validation | MEDIUM |
| bookmarks.ts | 1 | Bookmark upsert | LOW |
| history.ts | 1 | ReadingHistory create | LOW |
| profile.ts | varies | User updates | LOW |
| badges.ts | varies | Badge + UserBadge | MEDIUM |
| personas.ts | varies | AIPersona + UserPersona | LOW |
| sharing.ts | varies | SharedContent + ShareClick | LOW |
| email.ts | varies | EmailSubscription | LOW |
| account.ts | varies | User data export | MEDIUM |
| oauth.ts | varies | User OAuth fields | LOW |

**Total: ~20 routes with database queries**

## Existing Indexes (from schema.prisma)

Already indexed (from Phase 13/15):

**NewsArticle:**
- publishedAt (single)
- perspective (single)
- sentiment (single)
- sourceId (single)
- publishedAt + perspective (composite)
- sentiment + publishedAt (composite)
- topics (GIN)
- entities (GIN)

**User:**
- email (unique)
- verificationTokenHash
- resetTokenHash
- emailVerified + createdAt (composite)
- googleIdHash (unique)
- githubIdHash (unique)

**Comment:**
- articleId
- userId
- parentId
- isFlagged
- createdAt

**Team:**
- deletedAt

**TeamMember:**
- teamId
- userId
- teamId + userId (unique)

**Likely candidates for new indexes (to be confirmed by audit):**
- User(showOnLeaderboard, emailVerified) - leaderboard query
- Team partial index WHERE deletedAt IS NULL - active teams filter

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | N+1 detection middleware using AsyncLocalStorage works with Prisma query events | Code Examples | May need alternative approach like cls-hooked |
| A2 | PrismaPg adapter exposes underlying pg-pool for metrics access | Architecture Patterns | May need to access pool differently |
| A3 | Partial indexes require raw SQL migration (Prisma doesn't support WHERE in @@index) | Pattern 5 | Migration approach may differ |

## Open Questions

1. **How to access pg-pool from PrismaPg adapter?**
   - What we know: PrismaPg uses pg-pool internally; pool has totalCount/idleCount/waitingCount
   - What's unclear: Exact API to access pool instance from adapter
   - Recommendation: Check adapter source or use Prisma metrics client extension

2. **Request-scoped query counting implementation**
   - What we know: AsyncLocalStorage provides request context; Prisma $on('query') fires per query
   - What's unclear: Whether query events fire synchronously in same async context
   - Recommendation: Test in isolated development before rolling into middleware

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | All queries | Yes | Via Docker Compose | - |
| Prisma CLI | EXPLAIN ANALYZE | Yes | ^7.7.0 | - |
| k6 | Load audit | Yes | npm run load:smoke | Manual load testing |
| Grafana | Pool dashboard | Yes | Docker Compose | Console metrics only |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not relevant to DB optimization |
| V3 Session Management | No | Not relevant to DB optimization |
| V4 Access Control | No | Not relevant to DB optimization |
| V5 Input Validation | Yes | Prisma parameterized queries (already used) |
| V6 Cryptography | No | Not relevant to DB optimization |

### Known Threat Patterns for PostgreSQL + Prisma

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via raw queries | Tampering | Use $queryRaw with template literals (parameterized) |
| Connection pool exhaustion DoS | Denial of Service | Pool size limit + queue timeout (already configured) |
| Query timing attacks | Information Disclosure | Rate limiting (already in place via express-rate-limit) |

**Note:** This phase primarily uses EXPLAIN ANALYZE which is read-only diagnostic. No new attack surface introduced.

## Sources

### Primary (HIGH confidence)
- [VERIFIED: package.json] - Prisma 7.7.0, pg 8.20.0, prom-client 15.1.3
- [VERIFIED: server/db/prisma.ts] - Pool config (max: 10, timeout: 5s), query logging
- [VERIFIED: prisma/schema.prisma] - 20 models with existing indexes
- [VERIFIED: server/services/metricsService.ts] - Prometheus gauge/counter pattern

### Secondary (MEDIUM confidence)
- [CITED: node-postgres.com/apis/pool](https://node-postgres.com/apis/pool) - Pool properties (totalCount, idleCount, waitingCount)
- [CITED: prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries) - $queryRaw for EXPLAIN ANALYZE
- [CITED: postgresql.org/docs/current/indexes-partial.html](https://www.postgresql.org/docs/current/indexes-partial.html) - Partial index syntax and benefits

### Tertiary (LOW confidence)
- [ASSUMED] AsyncLocalStorage for request-scoped query counting - common Node.js pattern but needs verification with Prisma

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Building on established patterns from Phase 13/15/29
- Pitfalls: HIGH - PostgreSQL and Prisma pitfalls well-documented

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days - stable domain)
