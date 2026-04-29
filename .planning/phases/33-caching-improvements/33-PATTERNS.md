# Phase 33: Caching Improvements - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 4 (1 new, 3 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/middleware/etagMiddleware.ts` | middleware | request-response | `server/middleware/serverTiming.ts` | exact |
| `server/services/cacheService.ts` | service | CRUD | self (extend existing) | exact |
| `server/services/websocketService.ts` | service | event-driven | self (extend existing) | exact |
| `server/index.ts` | config | request-response | self (extend existing) | exact |

## Pattern Assignments

### `server/middleware/etagMiddleware.ts` (middleware, request-response) - NEW

**Analog:** `server/middleware/serverTiming.ts`

**Imports pattern** (lines 1-8):
```typescript
import type { Request, Response, NextFunction } from 'express';
import type { OutgoingHttpHeaders } from 'http';
```

**Middleware function signature** (lines 16-20):
```typescript
export function serverTimingMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
```

**Response interception pattern** (lines 24-38):
```typescript
// Intercept when headers are about to be sent
const originalWriteHead = res.writeHead.bind(res);

res.writeHead = function (
  statusCode: number,
  statusMessage?: string | OutgoingHttpHeaders,
  headers?: OutgoingHttpHeaders
): Response {
  // ... modify response headers ...
  res.setHeader('Server-Timing', `total;dur=${durationMs.toFixed(2)}`);

  return originalWriteHead.call(this, statusCode, statusMessage, headers);
} as typeof res.writeHead;
```

**Early return pattern** (from `metricsMiddleware.ts` lines 37-40):
```typescript
// Skip health/metrics endpoints (D-10)
if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
  return next();
}
```

**ETag-specific implementation guidance** (from RESEARCH.md):
```typescript
// D-04, D-05, D-06: Content hash ETag with weak validator
import crypto from 'crypto';

res.json = (body: unknown) => {
  const content = JSON.stringify(body);
  const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
  const etag = `W/"${hash}"`;

  const clientEtag = req.get('If-None-Match');
  if (clientEtag && clientEtag === etag) {
    return res.status(304).end();
  }

  res.set('ETag', etag);
  return originalJson(body);
};
```

---

### `server/services/cacheService.ts` (service, CRUD) - MODIFY

**Analog:** self - extend existing CacheService class

**Method signature pattern** (lines 187-197):
```typescript
async set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.MEDIUM): Promise<boolean> {
  if (!this.isAvailable()) return false;

  try {
    await this.client!.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.debug(`Cache set error for key ${key}: ${err}`);
    return false;
  }
}
```

**New method to add - `setWithJitter()`** (follows `set()` pattern, lines 187-197):
```typescript
// D-07, D-08, D-09: Jitter-based TTL to prevent thundering herd
async setWithJitter<T>(
  key: string,
  value: T,
  baseTtlSeconds: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
  if (!this.isAvailable()) return false;

  try {
    // D-09: baseTTL * (0.9 + random * 0.2) - 10% below to 10% above
    const jitterMultiplier = 0.9 + Math.random() * 0.2;
    const actualTtl = Math.floor(baseTtlSeconds * jitterMultiplier);

    await this.client!.setex(key, actualTtl, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.debug(`Cache setWithJitter error for key ${key}: ${err}`);
    return false;
  }
}
```

**Existing `delPattern()` method** (lines 217-228) - no changes needed:
```typescript
async delPattern(pattern: string): Promise<number> {
  if (!this.isAvailable()) return 0;

  try {
    const keys = await this.client!.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.client!.del(...keys);
  } catch (err) {
    logger.debug(`Cache delete pattern error: ${err}`);
    return 0;
  }
}
```

**CacheKeys builders** (lines 361-393) - reference for invalidation:
```typescript
export const CacheKeys = {
  newsList: (filters: string) => `news:list:${filters}`,
  newsArticle: (id: string) => `news:article:${id}`,
  clusters: (withSummaries: boolean) => `analysis:clusters:${withSummaries}`,
  geoEvents: () => 'events:geo',
  timeline: () => 'events:timeline',
  // ...
} as const;
```

---

### `server/services/websocketService.ts` (service, event-driven) - MODIFY

**Analog:** self - extend existing broadcast methods

**Broadcast method pattern** (lines 292-305):
```typescript
broadcastNewArticle(article: NewsArticle): void {
  if (!this.io) return;

  // Broadcast to all
  this.io.emit('news:new', article);

  // Broadcast to region room
  this.io.to(`region:${article.perspective}`).emit('news:new', article);

  // Broadcast to topic rooms
  for (const topic of article.topics) {
    this.io.to(`topic:${topic}`).emit('news:new', article);
  }
}
```

**Cache invalidation integration** (D-01, D-02, D-03 from CONTEXT.md):
```typescript
broadcastNewArticle(article: NewsArticle): void {
  if (!this.io) return;

  // 1. Broadcast to clients first
  this.io.emit('news:new', article);
  this.io.to(`region:${article.perspective}`).emit('news:new', article);
  for (const topic of article.topics) {
    this.io.to(`topic:${topic}`).emit('news:new', article);
  }

  // 2. Invalidate cache (D-01: synchronous, D-02: all list variants)
  const cache = CacheService.getInstance();
  void cache.delPattern('news:list:*');  // Fire-and-forget, log errors
}
```

**Event-to-cache mapping** (D-03 from CONTEXT.md):
| Event | Cache Invalidation |
|-------|-------------------|
| `news:new` | `delPattern('news:list:*')` |
| `news:updated` | `del('news:article:{id}')` + `delPattern('news:list:*')` |
| `analysis:cluster-updated` | `delPattern('analysis:clusters:*')` |
| `event:new` / `event:updated` | `del('events:geo')` + `del('events:timeline')` |

**Existing import pattern** (line 1-9):
```typescript
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';
import type { NewsArticle, GeoEvent } from '../../src/types';
```

**Add CacheService import:**
```typescript
import { CacheService } from './cacheService';
```

---

### `server/index.ts` (config, request-response) - MODIFY

**Analog:** self - extend existing static middleware configuration

**Current static middleware config** (lines 389-393):
```typescript
app.use(express.static(staticPath, {
  maxAge: '7d',
  etag: true,
  index: false,  // Don't serve index.html for directory requests (SPA handles this)
}));
```

**Enhanced config with immutable assets** (D-10, D-11, D-12):
```typescript
app.use(express.static(staticPath, {
  maxAge: '7d',
  etag: true,
  index: false,
  setHeaders: (res, filePath) => {
    // D-10, D-11, D-12: Immutable for hashed assets in /assets/
    if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
```

**Middleware registration order** (lines 86-91):
```typescript
// Compression middleware - gzip responses over 1KB
app.use(compression({ threshold: 1024 }));

// Server-Timing header for p95 latency monitoring (D-05, D-06)
app.use(serverTimingMiddleware);

// Prometheus metrics collection (D-05)
app.use(metricsMiddleware);
```

**ETag middleware placement** (add after serverTiming, before metrics):
```typescript
app.use(compression({ threshold: 1024 }));
app.use(serverTimingMiddleware);
app.use(etagMiddleware);  // NEW: ETag generation and 304 responses
app.use(metricsMiddleware);
```

---

## Shared Patterns

### Graceful Degradation
**Source:** `server/services/cacheService.ts` lines 111-113, 172-173
**Apply to:** All cache operations in WebSocketService invalidation

```typescript
// Always check availability before cache operations
isAvailable(): boolean {
  return this.isConnected && this.client !== null;
}

// Return early if unavailable
async get<T>(key: string): Promise<T | null> {
  if (!this.isAvailable()) return null;
  // ...
}
```

### Error Handling
**Source:** `server/services/cacheService.ts` lines 178-181
**Apply to:** All new cache methods

```typescript
} catch (err) {
  logger.debug(`Cache get error for key ${key}: ${err}`);
  return null;
}
```

### Singleton Pattern
**Source:** `server/services/cacheService.ts` lines 47-52
**Apply to:** Already applied - no changes needed

```typescript
static getInstance(): CacheService {
  if (!CacheService.instance) {
    CacheService.instance = new CacheService();
  }
  return CacheService.instance;
}
```

### Request Skip Pattern
**Source:** `server/middleware/metricsMiddleware.ts` lines 12-13, 37-40
**Apply to:** ETag middleware (skip non-GET requests)

```typescript
const SKIP_PATHS = ['/health', '/readiness', '/metrics', '/api/health'];

if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
  return next();
}
```

---

## No Analog Found

No files without analogs. All new functionality follows existing patterns in the codebase.

---

## Metadata

**Analog search scope:** `server/middleware/`, `server/services/`, `server/routes/`
**Files scanned:** 12
**Pattern extraction date:** 2026-04-26
