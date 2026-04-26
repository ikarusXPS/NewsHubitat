# Phase 34: Database Optimization - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 5 new/modified files
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/phases/34-database-optimization/34-AUDIT.md` | documentation | N/A | None (new format) | N/A |
| `server/middleware/queryCounter.ts` | middleware | request-response | `server/middleware/metricsMiddleware.ts` | exact |
| `server/services/metricsService.ts` | service | metrics-collection | Self (add new gauges) | exact |
| `server/db/prisma.ts` | config | data-access | Self (expose pool) | exact |
| `prisma/schema.prisma` | schema | N/A | Self (add index) | exact |

## Pattern Assignments

### `.planning/phases/34-database-optimization/34-AUDIT.md` (documentation)

**Analog:** None - new document type, but RESEARCH.md provides template structure

**Audit report structure** (from `34-RESEARCH.md` lines 129-163):
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

### EXPLAIN ANALYZE Output

```sql
-- Route: GET /api/leaderboard
EXPLAIN ANALYZE SELECT ...
```
```

---

### `server/middleware/queryCounter.ts` (middleware, request-response)

**Analog:** `server/middleware/metricsMiddleware.ts`

**Imports pattern** (lines 1-8):
```typescript
/**
 * Prometheus Metrics Middleware (D-05, D-06, D-10)
 * Records HTTP request metrics with route normalization to prevent cardinality explosion
 */

import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metricsService';
```

**Dev-only gating pattern** (from `server/db/prisma.ts` lines 17-18):
```typescript
// D-09: Gate logging on NODE_ENV !== 'production'
const isDev = process.env.NODE_ENV !== 'production';
```

**Core request lifecycle pattern** (lines 32-58):
```typescript
/**
 * Express middleware that records HTTP request metrics.
 * Uses res.on('finish') for accurate timing after response completes.
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip health/metrics endpoints (D-10)
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
    const route = normalizeRoute(req.path);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    metricsService.httpRequestDuration.observe(labels, duration);
    metricsService.httpRequestsTotal.inc(labels);
  });

  next();
}
```

**N+1 detection middleware adaptation** (from RESEARCH.md lines 179-206):
```typescript
// Add to server/middleware/queryCounter.ts

import { prisma } from '../db/prisma';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

const isDev = process.env.NODE_ENV !== 'production';
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

---

### `server/services/metricsService.ts` (service, metrics-collection)

**Analog:** Self - adding new gauges following existing pattern

**Gauge declaration pattern** (lines 17-21):
```typescript
  // Service metrics (D-11, D-12, D-13)
  public upGauge: Gauge<string>;
  public websocketConnections: Gauge<string>;
  public dbConnectionsActive: Gauge<string>;
  public redisConnectionsActive: Gauge<string>;
```

**Gauge initialization pattern** (lines 66-78):
```typescript
    // WebSocket connections (D-12)
    this.websocketConnections = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });

    // DB connections (D-11)
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });
```

**Setter method pattern** (lines 142-159):
```typescript
  /**
   * Update WebSocket connection gauge
   */
  setWebSocketConnections(count: number): void {
    this.websocketConnections.set(count);
  }

  /**
   * Update DB connection gauge
   */
  setDbConnections(count: number): void {
    this.dbConnectionsActive.set(count);
  }
```

**New pool metrics to add** (D-14):
```typescript
// Add to MetricsService class

// Pool metrics declarations (D-14 - Phase 34)
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

// Add setter method
updatePoolMetrics(pool: { totalCount: number; idleCount: number; waitingCount: number }): void {
  this.dbPoolTotal.set(pool.totalCount);
  this.dbPoolIdle.set(pool.idleCount);
  this.dbPoolWaiting.set(pool.waitingCount);
}
```

---

### `server/db/prisma.ts` (config, data-access)

**Analog:** Self - expose pool for metrics

**Current adapter configuration** (lines 10-15):
```typescript
const adapter = new PrismaPg({
  connectionString,
  max: 10,                        // D-02: Pool size = 10 connections
  connectionTimeoutMillis: 5_000, // D-04: Connection timeout = 5 seconds
  idleTimeoutMillis: 300_000,     // D-06: Idle timeout = 5 minutes
});
```

**Query event pattern** (lines 32-52):
```typescript
if (isDev) {
  prisma.$on('query', (e: Prisma.QueryEvent) => {
    const duration = e.duration;
    const query = e.query;

    // Color-code slow queries (>100ms) for visibility
    if (duration > 100) {
      console.warn(`[Prisma SLOW ${duration}ms] ${query}`);
    } else {
      console.log(`[Prisma ${duration}ms] ${query}`);
    }

    // Log params for debugging (truncate long values)
    if (e.params && e.params !== '[]') {
      const params = e.params.length > 200
        ? e.params.slice(0, 200) + '...'
        : e.params;
      console.log(`  Params: ${params}`);
    }
  });
}
```

**Pool export pattern** (to add):
```typescript
// Export adapter for pool metrics access
// Note: PrismaPg may expose pool via adapter internals - needs verification
export { adapter };
```

---

### `prisma/schema.prisma` (schema, index addition)

**Analog:** Self - follow existing index patterns

**Single-column index pattern** (lines 39-44):
```prisma
  @@index([publishedAt])
  @@index([perspective])
  @@index([sentiment])
  @@index([sourceId])
```

**Composite index pattern** (lines 43-44):
```prisma
  @@index([publishedAt, perspective])  // Dashboard: filtered timeline
  @@index([sentiment, publishedAt])    // Sentiment charts
```

**User model existing indexes** (lines 126-131):
```prisma
  // Indexes for token lookups (D-53)
  @@index([verificationTokenHash])
  @@index([resetTokenHash])
  @@index([emailVerified, createdAt])  // For cleanup job queries
  @@index([googleIdHash])
  @@index([githubIdHash])
```

**Potential leaderboard index** (only if audit reveals Seq Scan per D-05):
```prisma
model User {
  // ... existing fields ...

  // Add only if EXPLAIN ANALYZE shows Seq Scan (D-05)
  @@index([showOnLeaderboard, emailVerified])
}
```

**Partial index for Team soft deletes** (D-06 - requires raw SQL migration):
```sql
-- Cannot be expressed in Prisma schema, use raw migration
-- Run via: npx prisma db execute --file ./migrations/partial_index_team.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_active
ON "Team" (id) WHERE "deletedAt" IS NULL;
```

---

## Shared Patterns

### Authentication Middleware
**Source:** `server/services/authService.ts` (authMiddleware export)
**Apply to:** None for this phase - no new auth-protected routes

### Error Handling
**Source:** `server/routes/auth.ts` lines 84-89
**Apply to:** N/A - this phase is primarily audit/metrics, minimal new routes
```typescript
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed',
    });
  }
```

### Singleton Service Pattern
**Source:** `server/services/metricsService.ts` lines 125-130
**Apply to:** Any new service classes (none expected for this phase)
```typescript
  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }
```

### Prisma Eager Loading (N+1 Fix Pattern)
**Source:** `server/routes/leaderboard.ts` lines 67-79
**Apply to:** Any routes identified with N+1 issues during audit
```typescript
  // Single query with eager loading - eliminates N+1 (D-01)
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true, emailVerified: true },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      selectedPresetAvatar: true,
      badges: {
        include: { badge: true },
      },
    },
  });
```

### Batch Query Pattern (Avoiding N+1)
**Source:** `server/routes/teams.ts` lines 565-579
**Apply to:** Routes that enrich data from multiple tables
```typescript
  const bookmarks = await prisma.teamBookmark.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch user info for attribution - batch query, not N+1 loop
  const userIds = [...new Set(bookmarks.map((b) => b.addedBy))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `34-AUDIT.md` | documentation | N/A | First audit document in codebase; use template from RESEARCH.md |

---

## Route-Specific N+1 Audit Targets

Based on RESEARCH.md route inventory (lines 466-483), prioritized audit targets:

| Route File | Priority | Potential N+1 Patterns | Existing Pattern Status |
|------------|----------|------------------------|-------------------------|
| `leaderboard.ts` | HIGH | User + UserBadge + Badge | Already optimized with eager loading |
| `teams.ts` | HIGH | Team + TeamMember + TeamBookmark + User | Uses batch queries, verify |
| `comments.ts` | HIGH | Comment + User nested replies | Delegates to CommentService, audit service |
| `auth.ts` | MEDIUM | User lookups, token validation | Simple findUnique, likely OK |
| `bookmarks.ts` | LOW | Bookmark upsert | Single operations |
| `history.ts` | LOW | ReadingHistory create | Single operations |

---

## Metadata

**Analog search scope:** `server/middleware/`, `server/services/`, `server/routes/`, `server/db/`, `prisma/`
**Files scanned:** 25
**Pattern extraction date:** 2026-04-26
