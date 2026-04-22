# Phase 15: Query Optimization - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 5 (2 new, 3 modified)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/middleware/serverTiming.ts` | middleware | request-response | `server/middleware/rateLimiter.ts` | exact |
| `server/utils/array.ts` | utility | transform | `server/utils/hash.ts` | exact |
| `server/routes/leaderboard.ts` | route | CRUD | `server/routes/badges.ts` | exact |
| `server/services/newsAggregator.ts` | service | batch | (self - refactoring) | exact |
| `server/index.ts` | config | request-response | (self - adding middleware) | exact |

## Pattern Assignments

### `server/middleware/serverTiming.ts` (NEW - middleware, request-response)

**Analog:** `server/middleware/rateLimiter.ts`

**Imports pattern** (lines 1-11):
```typescript
/**
 * Rate Limiting Middleware (D-04, D-05, D-06)
 * Sliding window rate limiting with Redis store
 */

import { rateLimit, type RateLimitRequestHandler, type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Request } from 'express';
import { CacheService } from '../services/cacheService';
import { RATE_LIMITS, type RateLimitTier } from '../config/rateLimits';
import logger from '../utils/logger';
```

**For serverTiming, adapt to:**
```typescript
/**
 * Server Timing Middleware (D-05, D-06)
 * Measures request duration and adds Server-Timing header
 */

import type { Request, Response, NextFunction } from 'express';
```

**Middleware function pattern** (lines 45-48, 75-83):
```typescript
export function createLimiter(
  tier: RateLimitTier,
  overrides?: Partial<Options>
): RateLimitRequestHandler {
  // ...
}

// Pre-configured limiters for common use cases
export const authLimiter = createLimiter('auth');
export const aiLimiter = createLimiter('ai');
export const newsLimiter = createLimiter('news');
```

**Error/response handling pattern** (lines 74-83):
```typescript
// D-06: HTTP 429 with Retry-After header
handler: (_req, res, _next, opts) => {
  const retryAfter = Math.ceil(opts.windowMs / 1000);
  res.set('Retry-After', String(retryAfter));
  res.status(429).json({
    success: false,
    error: 'Too many requests',
    retryAfter,
  });
},
```

---

### `server/utils/array.ts` (NEW - utility, transform)

**Analog:** `server/utils/hash.ts`

**Complete file pattern** (lines 1-13):
```typescript
/**
 * Simple hash function for generating cache keys and IDs
 * Used across services for consistent hashing
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
```

**For array.ts, adapt to:**
```typescript
/**
 * Array utility functions for batch operations
 * Used by services for chunked processing
 */

/**
 * Split array into chunks of specified size
 * @param array - Array to chunk
 * @param size - Maximum chunk size
 * @returns Array of chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

---

### `server/routes/leaderboard.ts` (MODIFY - route, CRUD)

**Analog:** `server/routes/badges.ts` (same Prisma include pattern with UserBadge)

**Imports pattern** (lines 1-4):
```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../services/authService';
export const badgeRoutes = Router();
```

**Auth request type pattern** (lines 6-8):
```typescript
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}
```

**Prisma eager loading pattern** (badges.ts lines 26-31):
```typescript
const userBadges = await prisma.userBadge.findMany({
  where: { userId: req.user!.userId },
  include: { badge: true },
  orderBy: { earnedAt: 'desc' },
});
```

**Standard response format** (badges.ts lines 33, 36-37):
```typescript
res.json({ success: true, data: userBadges });
// ...
res.status(500).json({ success: false, error: 'Failed to fetch user badges' });
```

**Current N+1 pattern in leaderboard.ts to REMOVE** (lines 54-72):
```typescript
// Calculate points and build leaderboard
const leaderboard = await Promise.all(
  users.map(async (user) => {
    const points = await calculateUserPoints(user.id);  // N+1 QUERY - REMOVE
    // ...
  })
);
```

**Replace with batch pattern (from badges.ts):**
```typescript
// Single query with eager loading - eliminates N+1
const users = await prisma.user.findMany({
  where: { showOnLeaderboard: true, emailVerified: true },
  select: {
    id: true,
    name: true,
    avatarUrl: true,
    selectedPresetAvatar: true,
    badges: {
      include: { badge: true }  // Eager load badges with relation
    }
  }
});

// Compute points in memory (no additional queries)
const leaderboard = users.map(user => {
  const points = user.badges.reduce((sum, ub) => {
    const multiplier = tierMultiplier[ub.badge.tier] || 1;
    return sum + ub.badge.threshold * multiplier;
  }, 0);
  return { ...user, points };
});
```

---

### `server/services/newsAggregator.ts` (MODIFY - service, batch)

**Singleton pattern** (lines 21-23, 92-97):
```typescript
export class NewsAggregator {
  private static instance: NewsAggregator;
  private prisma = prisma;
  // ...

  static getInstance(): NewsAggregator {
    if (!NewsAggregator.instance) {
      NewsAggregator.instance = new NewsAggregator();
    }
    return NewsAggregator.instance;
  }
```

**Logger usage pattern** (lines 10, 100, 164, 234):
```typescript
import logger from '../utils/logger';
// ...
logger.info('Syncing news sources with database...');
logger.info(`Loaded ${this.articles.length} articles into memory.`);
logger.info(`Saving ${newArticles.length} new articles to database...`);
```

**Current sequential save pattern to REFACTOR** (lines 233-248):
```typescript
// Persist to database
logger.info(`Saving ${newArticles.length} new articles to database...`);
for (const article of newArticles) {
  try {
    // Ensure source exists before saving article (prevents P2003 foreign key error)
    await this.ensureSourceExists(article.source);

    await prisma.newsArticle.upsert({
      where: { id: article.id },
      update: this.toPrismaArticle(article),
      create: this.toPrismaArticle(article),
    });
  } catch (err) {
    logger.error(`Failed to save article ${article.id}:`, err);
  }
}
```

**Replace with chunked pattern:**
```typescript
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

---

### `server/index.ts` (MODIFY - config, request-response)

**Middleware import pattern** (lines 23):
```typescript
import { authLimiter, aiLimiter, newsLimiter } from './middleware/rateLimiter';
```

**Add serverTiming import:**
```typescript
import { serverTimingMiddleware } from './middleware/serverTiming';
```

**Middleware registration location** (lines 66-74):
```typescript
// Compression middleware - gzip responses over 1KB
app.use(compression({ threshold: 1024 }));

app.use(express.json());

// Debug middleware to log all requests
app.use((req, _res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});
```

**Add serverTiming middleware after compression, before debug logging:**
```typescript
// Compression middleware - gzip responses over 1KB
app.use(compression({ threshold: 1024 }));

// Server-Timing header for p95 latency monitoring (D-05, D-06)
app.use(serverTimingMiddleware);

app.use(express.json());
```

---

## Shared Patterns

### Response Format
**Source:** All route files (e.g., `server/routes/badges.ts` lines 17, 22)
**Apply to:** All modified routes

```typescript
// Success response
res.json({ success: true, data: result });

// Success with metadata
res.json({
  success: true,
  data: ranked,
  meta: { timeframe, total: leaderboard.length },
});

// Error response
res.status(500).json({ success: false, error: 'Human-readable message' });
```

### Prisma Include Pattern
**Source:** `server/routes/badges.ts` lines 27-29
**Apply to:** Leaderboard routes for N+1 fix

```typescript
const userBadges = await prisma.userBadge.findMany({
  where: { userId: req.user!.userId },
  include: { badge: true },  // Eager load relation
  orderBy: { earnedAt: 'desc' },
});
```

### Error Handling in Services
**Source:** `server/services/newsAggregator.ts` lines 245-247
**Apply to:** Chunked save operations

```typescript
try {
  await prisma.newsArticle.upsert({...});
} catch (err) {
  logger.error(`Failed to save article ${article.id}:`, err);
}
```

### TypeScript Utility Function Pattern
**Source:** `server/utils/hash.ts` (entire file)
**Apply to:** New `server/utils/array.ts`

```typescript
/**
 * JSDoc comment describing purpose
 * Used across services for X
 */
export function functionName<T>(param: T): T {
  // Pure function, no side effects
  return result;
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | - | - | All files have close analogs in the codebase |

---

## Metadata

**Analog search scope:**
- `server/middleware/` - 1 file
- `server/utils/` - 5 files
- `server/routes/` - 16 files
- `server/services/` - 10 files

**Files scanned:** 32
**Pattern extraction date:** 2026-04-22

---

## Summary for Planner

### File Dependencies

```
server/utils/array.ts (NEW - no dependencies)
       |
       v
server/middleware/serverTiming.ts (NEW - no dependencies)
       |
       v
server/index.ts (imports serverTiming middleware)
       |
       v
server/routes/leaderboard.ts (pure refactor, no new imports)
       |
       v
server/services/newsAggregator.ts (imports chunk from utils/array)
```

### Implementation Order

1. **Create utilities first:** `server/utils/array.ts` - standalone chunk function
2. **Create middleware:** `server/middleware/serverTiming.ts` - standalone timing middleware
3. **Wire middleware:** `server/index.ts` - import and register serverTiming
4. **Fix N+1:** `server/routes/leaderboard.ts` - refactor to batch query
5. **Chunk saves:** `server/services/newsAggregator.ts` - import chunk, refactor save loop

### Key Transformation Patterns

| From | To | Location |
|------|----|----|
| `await calculateUserPoints(userId)` in loop | Single `prisma.user.findMany({ include: { badges: { include: { badge: true }}}})` | leaderboard.ts |
| `for...of` sequential upserts | `chunk()` + `Promise.all()` per chunk | newsAggregator.ts |
| (none) | `Server-Timing: total;dur=X.XX` header | serverTiming.ts |
