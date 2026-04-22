# Phase 15: Query Optimization - Research

**Researched:** 2026-04-22
**Domain:** Database query optimization, API response timing, N+1 elimination
**Confidence:** HIGH

## Summary

This phase addresses database query performance issues and API response timing for NewsHub. The codebase has a clear N+1 query pattern in the leaderboard routes where `calculateUserPoints()` is called in a loop, executing separate database queries for each user. The newsAggregator also has a sequential upsert loop that can benefit from chunked parallel execution.

User decisions from CONTEXT.md provide specific implementation guidance: batch UserBadge queries with Badge relations, add Server-Timing headers via Express middleware using `process.hrtime.bigint()`, and chunk article saves in groups of 50 using `Promise.all`. The existing connection pool (10 connections, 5s timeout) from Phase 13/14 provides the constraint for chunk sizing.

**Primary recommendation:** Fix the N+1 pattern by replacing per-user `calculateUserPoints()` calls with a single batch query, add timing middleware before routes, and refactor newsAggregator's save loop to use chunked `Promise.all`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Leaderboard N+1 fix - batch load all UserBadges with Badge relation in single query, compute points in JS
- **D-02:** No schema changes - avoid stored computed columns or triggers
- **D-03:** `/leaderboard/me` endpoint uses same batch approach (independent computation, no shared cache)
- **D-04:** Existing indexes are sufficient - NewsArticle has compound indexes, UserBadge has unique constraint (creates implicit index)
- **D-05:** Add Express middleware for response timing measurement
- **D-06:** Output timing via `Server-Timing` HTTP header - Chrome DevTools compatible, no log parsing needed
- **D-07:** NewsAggregator article saves - use `Promise.all` with chunks of 50 articles
- **D-08:** Parallel chunks prevent connection pool exhaustion while maximizing throughput

### Claude's Discretion
- Whether to add composite index on `User(showOnLeaderboard, emailVerified)` - Claude decides based on query patterns and actual table size

### Deferred Ideas (OUT OF SCOPE)
- Prometheus metrics - prom-client with histogram buckets (defer to monitoring phase)
- Query logging - Log slow queries (>100ms) (add after timing baseline established)
- Redis-cached leaderboard - Cache computed rankings (defer unless scale demands it)
- PostgreSQL full-text search - Replace LIKE queries with tsvector (separate phase)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-05 | Query optimization and API response times | N+1 elimination via batch queries (D-01, D-03), Server-Timing headers for p95 measurement (D-05, D-06), chunked parallel saves (D-07, D-08) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| N+1 query elimination | Database / Storage | API / Backend | Prisma client constructs optimized queries; API layer organizes batch requests |
| Response timing measurement | API / Backend | - | Express middleware layer owns request lifecycle timing |
| Server-Timing header | API / Backend | Browser / Client | Backend writes header; browser DevTools consumes it |
| Batch article saves | API / Backend | Database / Storage | Service layer coordinates chunking; Prisma handles individual upserts |
| Connection pool management | Database / Storage | - | pg driver pool configuration from Phase 13 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | 7.8.0 | ORM with eager loading | Already installed; `include` and `relationLoadStrategy` solve N+1 [VERIFIED: npm ls] |
| Express 5 | 5.2.1 | HTTP framework | Already installed; res object supports custom headers [VERIFIED: npm registry] |
| process.hrtime.bigint() | Node.js built-in | Nanosecond precision timing | No dependencies; immune to clock drift [CITED: nodejs.org/api/perf_hooks.html] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| response-time | 2.3.4 | Alternative timing middleware | Only if custom middleware insufficient [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom timing middleware | response-time package | Custom allows Server-Timing format; response-time uses X-Response-Time header |
| In-JS point computation | PostgreSQL computed column | D-02 explicitly forbids schema changes |
| p-map for concurrency | Promise.all + chunking | p-map adds dependency; chunking achieves same result |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

**Version verification:**
- @prisma/client: 7.8.0 (verified via `npm ls @prisma/client`)
- Express: 5.0.1 (verified via package.json)
- Node.js provides process.hrtime.bigint() since v10.7.0

## Architecture Patterns

### System Architecture Diagram

```
                          REQUEST FLOW WITH TIMING

┌─────────────────────────────────────────────────────────────────────┐
│                         Express Application                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │    Client    │───▶│   Timing     │───▶│    Rate Limiter      │   │
│  │   Request    │    │  Middleware  │    │    (existing)        │   │
│  └──────────────┘    │  start=hrtime│    └──────────────────────┘   │
│                      └──────────────┘              │                  │
│                             ▲                      ▼                  │
│                             │         ┌──────────────────────┐       │
│                             │         │    Route Handler     │       │
│                             │         └──────────────────────┘       │
│                             │                      │                  │
│                             │                      ▼                  │
│    ┌────────────────────────┴──────────────────────────────────┐    │
│    │                    Response Path                            │    │
│    │                                                             │    │
│    │  1. Route completes → calls next() or res.json()           │    │
│    │  2. Timing middleware intercepts (res.on('finish'))        │    │
│    │  3. Calculates: duration = hrtime.bigint() - start         │    │
│    │  4. Sets header: Server-Timing: total;dur={ms}             │    │
│    │  5. Response sent to client                                 │    │
│    └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

                       LEADERBOARD N+1 FIX

┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  BEFORE (N+1 pattern)               AFTER (batch pattern)           │
│  ─────────────────────              ──────────────────────           │
│                                                                       │
│  GET /leaderboard                   GET /leaderboard                 │
│       │                                  │                            │
│       ▼                                  ▼                            │
│  findMany(User)  ──┐            findMany(User) ──────────┐           │
│       │            │                 (with badges.badge)  │           │
│       ▼            │                     │                │           │
│  for each user:    │  N+1               ▼                │  1 query   │
│   └─▶ findMany     │                 Map by userId       │           │
│       (UserBadge)  │                     │                │           │
│           │        │                     ▼                │           │
│           ▼        │                 Compute points      │           │
│        ...repeat   │                 in memory           │           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

                      CHUNKED BATCH SAVES

┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  Articles to save: [a1, a2, a3, ... a150]                           │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Chunk 1 (50)          Chunk 2 (50)          Chunk 3 (50)       │ │
│  │ [a1-a50]              [a51-a100]            [a101-a150]        │ │
│  │      │                     │                     │              │ │
│  │      ▼                     ▼                     ▼              │ │
│  │ Promise.all ──────────────────────────────────▶ await          │ │
│  │ (parallel)                                       (sequential)   │ │
│  │                                                                 │ │
│  │ Connection pool: 10 connections                                │ │
│  │ Chunk size: 50 = safe headroom                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Process: await chunks sequentially; within each chunk, parallel    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
server/
├── middleware/
│   ├── rateLimiter.ts      # Existing rate limiting
│   └── serverTiming.ts     # NEW: Response timing middleware
├── routes/
│   └── leaderboard.ts      # MODIFY: Batch query pattern
├── services/
│   └── newsAggregator.ts   # MODIFY: Chunked saves
└── utils/
    └── array.ts            # NEW: chunk() utility function
```

### Pattern 1: Batch Query with Include

**What:** Single Prisma query with eager loading to eliminate N+1
**When to use:** When iterating over parent records and accessing relations

```typescript
// Source: prisma.io/docs/orm/prisma-client/queries/query-optimization-performance
// BEFORE: N+1 pattern (BAD)
const users = await prisma.user.findMany({ where: { ... } });
for (const user of users) {
  const badges = await prisma.userBadge.findMany({
    where: { userId: user.id },
    include: { badge: true }
  }); // N additional queries!
}

// AFTER: Single batch query (GOOD)
const users = await prisma.user.findMany({
  where: { showOnLeaderboard: true, emailVerified: true },
  select: {
    id: true,
    name: true,
    avatarUrl: true,
    selectedPresetAvatar: true,
    badges: {
      include: { badge: true }  // Eager load in same query
    }
  }
});

// Compute points in memory
const leaderboard = users.map(user => ({
  ...user,
  points: user.badges.reduce((sum, ub) => {
    const multiplier = tierMultiplier[ub.badge.tier] || 1;
    return sum + ub.badge.threshold * multiplier;
  }, 0)
}));
```

### Pattern 2: Server-Timing Middleware

**What:** Express middleware that measures request duration and adds Server-Timing header
**When to use:** All API routes for p95 latency monitoring

```typescript
// Source: BBC iPlayer implementation pattern (medium.com/bbc-product-technology/server-timing-in-the-wild)
import type { Request, Response, NextFunction } from 'express';

export function serverTimingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationNs = end - start;
    const durationMs = Number(durationNs) / 1_000_000;

    // Format: Server-Timing: total;dur=123.45
    res.setHeader('Server-Timing', `total;dur=${durationMs.toFixed(2)}`);
  });

  next();
}
```

### Pattern 3: Chunked Promise.all

**What:** Process array in chunks with parallel execution within each chunk
**When to use:** Bulk database operations to avoid connection pool exhaustion

```typescript
// Source: github.com/alexpsi/43dd7fd4d6a263c7485326b843677740
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Usage in newsAggregator
const CHUNK_SIZE = 50;  // Connection pool = 10, safe headroom
const articleChunks = chunk(newArticles, CHUNK_SIZE);

for (const articleChunk of articleChunks) {
  await Promise.all(
    articleChunk.map(async (article) => {
      await this.ensureSourceExists(article.source);
      await prisma.newsArticle.upsert({
        where: { id: article.id },
        update: this.toPrismaArticle(article),
        create: this.toPrismaArticle(article),
      });
    })
  );
}
```

### Anti-Patterns to Avoid

- **Nested Promise.all with unlimited concurrency:** Can exhaust connection pool with 50+ simultaneous queries [CITED: mattburke.dev/promise-all-is-too-much-of-a-good-thing]
- **Calling async functions in loops without batching:** Creates N+1 pattern silently
- **Deep include chains (3+ levels):** Can produce JOINs slower than N+1; benchmark beyond 2 levels [CITED: prisma.io/docs]
- **Date.now() for timing:** Subject to clock drift; use process.hrtime.bigint() instead

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query timing | Custom Date.now() timing | process.hrtime.bigint() | Nanosecond precision, immune to clock drift |
| N+1 detection | Manual query counting | Prisma `log: ['query']` option | Built-in query logging shows actual SQL |
| Connection pooling | Custom connection manager | PrismaPg adapter pool config | Phase 13 already configured (max: 10) |
| Response headers | Manual header management | Express res.setHeader() | Standard Express API |

**Key insight:** The core optimizations are query pattern changes (N+1 elimination) and code organization (chunking), not new infrastructure. The existing Prisma + Express stack has all needed capabilities.

## Common Pitfalls

### Pitfall 1: Server-Timing Header Not Appearing
**What goes wrong:** Header set after response already sent
**Why it happens:** res.setHeader() called in res.on('finish') - headers already flushed
**How to avoid:** Use res.on('header') or set header before res.json() via custom wrapper
**Warning signs:** Header missing in DevTools despite middleware running

### Pitfall 2: Chunk Size Too Large
**What goes wrong:** "Connection pool exhausted" errors under load
**Why it happens:** Chunk size exceeds pool size * safety margin
**How to avoid:** Use CHUNK_SIZE = 50 for pool of 10 (5x safety factor)
**Warning signs:** Timeout errors during bulk saves

### Pitfall 3: Forgetting Include on Nested Relations
**What goes wrong:** N+1 persists despite using include
**Why it happens:** Second-level relation not included (e.g., badges without badge)
**How to avoid:** Always verify with Prisma query logging: `log: ['query']`
**Warning signs:** More queries than expected in logs

### Pitfall 4: hrtime Precision Loss in Arithmetic
**What goes wrong:** Incorrect millisecond values due to BigInt/Number conversion
**Why it happens:** Dividing BigInt by BigInt loses decimal precision
**How to avoid:** Convert to Number before division: `Number(durationNs) / 1_000_000`
**Warning signs:** All timings round to whole milliseconds

## Code Examples

### Complete Timing Middleware

```typescript
// server/middleware/serverTiming.ts
// Source: Node.js perf_hooks docs + BBC iPlayer pattern

import type { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that adds Server-Timing header to all responses.
 * Uses process.hrtime.bigint() for nanosecond precision.
 *
 * Header format: Server-Timing: total;dur=123.45
 * Visible in Chrome DevTools Network tab "Timing" section.
 */
export function serverTimingMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();

  // Intercept when headers are about to be sent
  const originalWriteHead = res.writeHead.bind(res);

  res.writeHead = function(
    statusCode: number,
    statusMessage?: string | Record<string, string | number | string[]>,
    headers?: Record<string, string | number | string[]>
  ) {
    const end = process.hrtime.bigint();
    const durationNs = end - start;
    const durationMs = Number(durationNs) / 1_000_000;

    res.setHeader('Server-Timing', `total;dur=${durationMs.toFixed(2)}`);

    return originalWriteHead(statusCode, statusMessage, headers);
  };

  next();
}
```

### Refactored Leaderboard Route

```typescript
// server/routes/leaderboard.ts (refactored)
// Source: Prisma query optimization docs

const tierMultiplier: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 4,
  platinum: 10,
};

leaderboardRoutes.get('/', async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as string) || 'all-time';
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);

  // Single query with eager loading - eliminates N+1
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true, emailVerified: true },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      selectedPresetAvatar: true,
      badges: {
        include: { badge: true }
      }
    }
  });

  // Compute points in memory
  const leaderboard = users.map(user => {
    const points = user.badges.reduce((sum, ub) => {
      const multiplier = tierMultiplier[ub.badge.tier] || 1;
      return sum + ub.badge.threshold * multiplier;
    }, 0);

    return {
      userId: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      selectedPresetAvatar: user.selectedPresetAvatar,
      points,
      level: Math.floor(points / 100) + 1,
      streak: 0,
      badgeCount: user.badges.length,
    };
  });

  // Sort and rank
  leaderboard.sort((a, b) => b.points - a.points);
  const ranked = leaderboard.slice(0, limit).map((entry, i) => ({
    ...entry,
    rank: i + 1,
  }));

  res.json({
    success: true,
    data: ranked,
    meta: { timeframe, total: leaderboard.length },
  });
});
```

### Chunked Article Saves

```typescript
// server/utils/array.ts
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// server/services/newsAggregator.ts (refactored save section)
import { chunk } from '../utils/array';

const CHUNK_SIZE = 50;  // Safe for pool of 10 connections

// Persist to database with chunked parallel execution
logger.info(`Saving ${newArticles.length} new articles to database...`);
const articleChunks = chunk(newArticles, CHUNK_SIZE);

for (const articleChunk of articleChunks) {
  await Promise.all(
    articleChunk.map(async (article) => {
      try {
        await this.ensureSourceExists(article.source);
        await prisma.newsArticle.upsert({
          where: { id: article.id },
          update: this.toPrismaArticle(article),
          create: this.toPrismaArticle(article),
        });
      } catch (err) {
        logger.error(`Failed to save article ${article.id}:`, err);
      }
    })
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| process.hrtime() tuple | process.hrtime.bigint() | Node.js 10.7.0+ | Simpler API, no tuple arithmetic |
| X-Response-Time header | Server-Timing header | W3C spec 2019+ | DevTools integration, multiple metrics |
| Sequential upserts | Chunked Promise.all | Best practice 2023+ | 5-10x throughput improvement |
| Multiple queries + merge | Prisma include | Prisma 2.0+ | Single query with JOIN |

**Deprecated/outdated:**
- `process.hrtime()` tuple API: Still works but BigInt version is cleaner
- Manual JOIN construction: Prisma handles this automatically with `include`
- setTimeout-based concurrency limiting: Use proper chunking or p-map

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Chunk size of 50 provides adequate safety margin for pool of 10 | Patterns | Connection exhaustion under extreme load; may need to reduce to 25-30 |
| A2 | User table size is small enough that composite index on (showOnLeaderboard, emailVerified) is unnecessary | Claude's Discretion | Sequential scan if table grows to 100k+ users |

**If this table is empty:** All claims in this research were verified or cited - no user confirmation needed.

## Open Questions

1. **Composite index decision**
   - What we know: User table currently small; unique constraint on (userId, badgeId) creates implicit index
   - What's unclear: Projected user growth rate and leaderboard query frequency
   - Recommendation: Skip index for now; add if EXPLAIN shows sequential scan on User table

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Batch queries | Yes | 15+ | - (required) |
| Node.js hrtime.bigint() | Timing middleware | Yes | v10.7.0+ | process.hrtime() tuple |
| Prisma include | N+1 fix | Yes | 7.8.0 | Manual JOINs (not recommended) |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Sources

### Primary (HIGH confidence)
- [Prisma Query Optimization Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance) - N+1 patterns and include usage
- [Node.js perf_hooks API](https://nodejs.org/api/perf_hooks.html) - process.hrtime.bigint() specification
- NewsHub codebase - leaderboard.ts lines 11-56, newsAggregator.ts lines 233-248

### Secondary (MEDIUM confidence)
- [BBC Server Timing Implementation](https://medium.com/bbc-product-technology/server-timing-in-the-wild-bfb34816322e) - Express middleware pattern
- [Promise.all Chunking Gist](https://gist.github.com/alexpsi/43dd7fd4d6a263c7485326b843677740) - Chunked execution pattern
- [Matt Burke on Promise.all](https://mattburke.dev/promise-all-is-too-much-of-a-good-thing) - Connection pool exhaustion analysis

### Tertiary (LOW confidence)
- npm registry version checks - Package versions current as of 2026-04-22

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified
- Architecture: HIGH - Patterns well-documented by Prisma and Node.js
- Pitfalls: HIGH - Common issues documented in multiple sources

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days - stable patterns)
