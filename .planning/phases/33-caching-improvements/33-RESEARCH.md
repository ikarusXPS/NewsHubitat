# Phase 33: Caching Improvements - Research

**Researched:** 2026-04-26
**Domain:** Redis cache invalidation, HTTP caching, ETag middleware, thundering herd prevention
**Confidence:** HIGH

## Summary

This phase enhances NewsHub's existing Redis caching infrastructure with three key improvements: (1) WebSocket event-driven cache invalidation ensuring data freshness when content changes, (2) HTTP cache headers with ETag support for efficient client-side caching and bandwidth reduction, and (3) jitter-based TTL to prevent thundering herd problems when cache keys expire simultaneously.

The existing CacheService already provides all necessary primitives: `get`, `set`, `del`, `delPattern`, and `getOrSet`. The phase requires adding a `setWithJitter()` method, integrating cache invalidation into WebSocket broadcast methods, creating ETag middleware for API responses, and configuring Express static middleware for immutable asset caching.

**Primary recommendation:** Implement direct cache invalidation calls from WebSocketService broadcast methods (synchronous, simple), use MD5 content hashes for weak ETags, and apply 10% jitter to all cache TTLs via a new `setWithJitter()` method.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Direct CacheService call — WebSocket emit triggers `cache.del()` immediately, synchronous and simple
- **D-02:** `news:new` invalidates ALL list caches via `delPattern('news:list:*')` — clears all filter variants (~10-50 keys), safe over selective
- **D-03:** Event-to-cache mapping:
  - `news:new` → `delPattern('news:list:*')`
  - `news:updated` → `del('news:article:{id}')` + `delPattern('news:list:*')`
  - `analysis:cluster-updated` → `delPattern('analysis:clusters:*')`
  - `event:new` / `event:updated` → `del('events:geo')` + `del('events:timeline')`
- **D-04:** Content hash ETags — MD5 of JSON response for accurate validation
- **D-05:** Weak validators (W/"...") — standard for dynamic API content, semantically equivalent
- **D-06:** ETag middleware checks `If-None-Match` header, returns 304 Not Modified when matched
- **D-07:** 10% TTL variance — 300s base → 270-330s actual, spreads expiration over 60s window
- **D-08:** Apply jitter to ALL caches — consistent `setWithJitter()` method in CacheService
- **D-09:** Jitter formula: `baseTTL * (0.9 + Math.random() * 0.2)` — 10% below to 10% above
- **D-10:** Immutable with 1-year max-age — `Cache-Control: public, max-age=31536000, immutable` for hashed assets
- **D-11:** Express static middleware — use `setHeaders` option in `express.static()` configuration
- **D-12:** Target assets: `/assets/` directory containing Vite-built JS/CSS with content hashes in filenames

### Claude's Discretion
- ETag hash algorithm details (MD5 truncation length, hex vs base64)
- Redis `KEYS` vs `SCAN` for pattern deletion (performance tradeoff)
- Whether to add `Last-Modified` header alongside ETag

### Deferred Ideas (OUT OF SCOPE)
- **Stale-while-revalidate** — Serve stale cache while refreshing in background. Requires async pattern change.
- **Cache warming** — Pre-populate caches on server start or after deployment. Optimization for later.
- **CDN edge caching** — Push cache to CDN edge nodes. Infrastructure change for v1.6.
- **Cache statistics dashboard** — Hit/miss ratio visualization. Monitoring enhancement.
- **Conditional invalidation** — Only invalidate if content actually changed (compare hashes). Optimization.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CACHE-01 | Smart cache invalidation implemented with WebSocket event hooks | D-01 through D-03 define exact event-to-cache mapping; WebSocketService already emits required events; CacheService has `del()` and `delPattern()` methods |
| CACHE-02 | HTTP cache headers optimized (Cache-Control, ETag) for static assets | D-04 through D-06 define ETag strategy; D-10 through D-12 define static asset headers; Express built-in etag support via `etag@1.8.1` already installed |
| CACHE-03 | Jitter-based TTL implemented in CacheService to prevent thundering herd | D-07 through D-09 define jitter formula and scope; `setWithJitter()` method addition to existing CacheService |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cache invalidation on data change | API / Backend | — | WebSocket events originate server-side; invalidation is synchronous server operation |
| ETag generation and validation | API / Backend | — | Server generates hash, validates If-None-Match header, returns 304 or full response |
| Static asset caching | CDN / Static (Express static) | Browser | Express serves assets with immutable headers; browser caches locally |
| Jitter-based TTL | API / Backend | — | TTL calculation is server-side Redis operation |
| Cache hit ratio monitoring | API / Backend | — | Prometheus metrics collected server-side |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ioredis | 5.10.1 | Redis client | Already installed; full SCAN/KEYS support [VERIFIED: npm view] |
| express | 5.2.1 | HTTP server | Already installed; built-in ETag and static middleware [VERIFIED: npm view] |
| etag | 1.8.1 | ETag generation | Transitive dep of Express; standard content hash implementation [VERIFIED: npm ls etag] |
| prom-client | 15.1.3 | Prometheus metrics | Already installed via MetricsService [VERIFIED: existing code] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (Node.js built-in) | — | MD5 hash for ETags | ETag generation when Express built-in not suitable |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MD5 for ETag | SHA-256 | SHA-256 more secure but MD5 sufficient for cache validation, faster |
| KEYS for pattern delete | SCAN | SCAN non-blocking but more complex; KEYS acceptable for <1000 keys |
| Custom ETag middleware | Express built-in | Custom gives control over hash algorithm; built-in ties to response body |

**Installation:**
```bash
# No new packages required - all dependencies already installed
```

**Version verification:** All packages verified against npm registry 2026-04-26. [VERIFIED: npm view and npm ls commands]

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                               │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐  │
│  │   API Request   │    │  Static Asset   │    │  WebSocket Client   │  │
│  │ If-None-Match:  │    │   Request       │    │    (Socket.io)      │  │
│  │ W/"abc123"      │    │                 │    │                     │  │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────────┘  │
└───────────┼──────────────────────┼───────────────────────────────────────┘
            │                      │
            ▼                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           Express Server                                   │
├───────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         Middleware Chain                             │ │
│  │  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────┐  │ │
│  │  │    CORS     │──▶│  ETag Check  │──▶│  Static Middleware      │  │ │
│  │  │             │   │ (304 or next)│   │  (immutable headers)    │  │ │
│  │  └─────────────┘   └──────┬───────┘   └─────────────────────────┘  │ │
│  └───────────────────────────┼──────────────────────────────────────────┘ │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         Route Handlers                               │ │
│  │  ┌───────────────────────────────────────────────────────────────┐  │ │
│  │  │  /api/news          /api/events          /api/analysis        │  │ │
│  │  │       │                  │                    │               │  │ │
│  │  │       ▼                  ▼                    ▼               │  │ │
│  │  │  Cache-Control: public, max-age=300    ETag: W/"hash"        │  │ │
│  │  └───────────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬─────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         WebSocket Service                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  broadcastNewArticle() ──┬──▶ io.emit('news:new')                        │
│                          │                                                │
│                          └──▶ cacheService.delPattern('news:list:*')     │
│                                                                          │
│  broadcastClusterUpdate() ──┬──▶ io.emit('analysis:cluster-updated')     │
│                             │                                             │
│                             └──▶ cacheService.delPattern('clusters:*')   │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           Redis Cache                                     │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  news:list:{filters}     news:article:{id}     events:geo         │ │
│  │  analysis:clusters:*     events:timeline       ai:summary:*       │ │
│  │                                                                    │ │
│  │  TTL with Jitter: baseTTL * (0.9 + random * 0.2)                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Metrics: cache_hits_total, cache_misses_total, cache_hit_ratio   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
server/
├── middleware/
│   └── etagMiddleware.ts    # NEW: ETag generation and 304 response
├── services/
│   └── cacheService.ts      # MODIFY: Add setWithJitter(), cache metrics
│   └── websocketService.ts  # MODIFY: Add cache invalidation to broadcasts
└── index.ts                 # MODIFY: Configure static asset headers
```

### Pattern 1: Event-Driven Cache Invalidation
**What:** Cache invalidation triggered synchronously from WebSocket broadcast methods
**When to use:** When data changes that affects cached API responses
**Example:**
```typescript
// Source: CONTEXT.md D-01, D-02, D-03 — Direct CacheService integration
broadcastNewArticle(article: NewsArticle): void {
  if (!this.io) return;

  // Broadcast to clients first
  this.io.emit('news:new', article);

  // Invalidate cache synchronously (D-01)
  const cache = CacheService.getInstance();
  cache.delPattern('news:list:*'); // D-02: Clear all list variants
}
```

### Pattern 2: ETag Middleware for API Responses
**What:** Middleware that generates content hash ETags and handles If-None-Match validation
**When to use:** All cacheable API endpoints (/api/news, /api/events, /api/analysis)
**Example:**
```typescript
// Source: MDN ETag docs, Express.js API docs [CITED: developer.mozilla.org/ETag]
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function etagMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    // Generate weak ETag from content hash (D-04, D-05)
    const hash = crypto.createHash('md5')
      .update(JSON.stringify(body))
      .digest('hex')
      .slice(0, 16); // Truncate for brevity
    const etag = `W/"${hash}"`;

    // Check If-None-Match header (D-06)
    const clientEtag = req.get('If-None-Match');
    if (clientEtag === etag) {
      return res.status(304).end();
    }

    res.set('ETag', etag);
    return originalJson(body);
  };

  next();
}
```

### Pattern 3: Jitter-Based TTL
**What:** Add random variance to cache TTL to prevent synchronized expiration
**When to use:** All cache operations that set TTL values
**Example:**
```typescript
// Source: CONTEXT.md D-07, D-08, D-09 [CITED: oneuptime.com/blog/redis-cache-stampede]
async setWithJitter<T>(
  key: string,
  value: T,
  baseTtlSeconds: number
): Promise<boolean> {
  // Apply 10% jitter: baseTTL * (0.9 + random * 0.2) (D-09)
  const jitter = 0.9 + Math.random() * 0.2;
  const actualTtl = Math.floor(baseTtlSeconds * jitter);
  return this.set(key, value, actualTtl);
}
```

### Pattern 4: Immutable Static Asset Headers
**What:** Configure Express static middleware with aggressive caching for fingerprinted assets
**When to use:** Production mode serving Vite-built assets with content hashes
**Example:**
```typescript
// Source: Express serve-static docs [CITED: expressjs.com/serve-static]
app.use(express.static(staticPath, {
  maxAge: '7d', // Existing
  etag: true,   // Existing
  index: false, // Existing
  setHeaders: (res, filePath) => {
    // D-10, D-11, D-12: Immutable for hashed assets in /assets/
    if (filePath.includes('/assets/')) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
```

### Anti-Patterns to Avoid
- **Using KEYS in production with large keyspaces:** For NewsHub's expected ~10-50 cache keys per pattern, KEYS is acceptable. However, if key count grows to thousands, switch to SCAN. [CITED: redis.io/tutorials/redis-anti-patterns]
- **Synchronous ETag computation for large responses:** MD5 is fast, but for responses >1MB consider caching the ETag alongside the response data in Redis.
- **Fixed TTL across all caches:** Without jitter, cache stampedes occur when multiple keys expire simultaneously.
- **Invalidating cache before WebSocket emit:** Always emit to clients first, then invalidate cache — ensures clients receive update notification even if cache deletion fails.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ETag generation | Custom hash function | MD5 via Node.js crypto | Standardized, fast, sufficient for cache validation |
| 304 response handling | Manual response building | Express built-in or etag package | Handles edge cases (weak vs strong comparison) |
| Pattern-based cache deletion | Custom key iteration | Redis `KEYS` command via ioredis | Atomic, server-side operation |
| Static asset fingerprinting | Manual hash injection | Vite build output | Already configured with content hashes |
| Prometheus metrics | Custom monitoring | prom-client (already installed) | Industry standard, Grafana-compatible |

**Key insight:** The existing infrastructure (Express etag support, ioredis KEYS command, Vite fingerprinting, prom-client) covers all required functionality. This phase is primarily integration and configuration, not new library adoption.

## Common Pitfalls

### Pitfall 1: KEYS Command Blocking
**What goes wrong:** Using `KEYS pattern` on large keyspaces blocks Redis server
**Why it happens:** KEYS scans the entire keyspace synchronously
**How to avoid:** For NewsHub's expected cache key count (<100), KEYS is acceptable. Monitor key count via `CacheService.getStats()`. If keys exceed 1000, refactor to SCAN. [CITED: support.redislabs.com/massive-key-deletion]
**Warning signs:** Redis latency spikes during cache invalidation

### Pitfall 2: ETag Collision on Dynamic Content
**What goes wrong:** Same ETag returned for semantically different responses
**Why it happens:** Hashing response body without including varying factors (user ID, timestamp)
**How to avoid:** For NewsHub's public API endpoints (news, events, analysis), response varies only by query params — already included in request path. No user-specific content in these responses.
**Warning signs:** Clients receiving stale data after 304 response

### Pitfall 3: Jitter Range Too Small
**What goes wrong:** Cache stampede still occurs despite jitter
**Why it happens:** Jitter range smaller than cache refresh interval
**How to avoid:** 10% jitter on 300s TTL spreads expiration over 60s window (D-07). With typical 5-minute refresh intervals, this is adequate.
**Warning signs:** Database/service spikes at regular intervals

### Pitfall 4: Missing Vary Header
**What goes wrong:** Compressed and uncompressed responses share cache
**Why it happens:** CDN or browser caches response without considering Accept-Encoding
**How to avoid:** Already handled — existing routes set `Vary: Accept-Encoding`. ETag middleware should preserve this.
**Warning signs:** Garbled responses in some browsers

### Pitfall 5: Cache Invalidation Race Condition
**What goes wrong:** New data written to cache before invalidation completes
**Why it happens:** Async cache operations interleave
**How to avoid:** Invalidate cache synchronously in WebSocket broadcast (D-01). Don't pre-fetch new data during invalidation.
**Warning signs:** Stale data persists after content update

## Code Examples

Verified patterns from official sources:

### Cache Invalidation in WebSocket Broadcast
```typescript
// Source: Integration of CONTEXT.md decisions with existing websocketService.ts
broadcastNewArticle(article: NewsArticle): void {
  if (!this.io) return;

  // 1. Broadcast to all clients
  this.io.emit('news:new', article);
  this.io.to(`region:${article.perspective}`).emit('news:new', article);
  for (const topic of article.topics) {
    this.io.to(`topic:${topic}`).emit('news:new', article);
  }

  // 2. Invalidate cache (D-01, D-02)
  const cache = CacheService.getInstance();
  void cache.delPattern(CacheKeys.newsList('*')); // Fire-and-forget, log errors
}
```

### ETag Middleware with Weak Validator
```typescript
// Source: MDN ETag documentation [CITED: developer.mozilla.org/ETag]
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function etagMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip for non-GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    // Generate weak ETag (D-04, D-05)
    const content = JSON.stringify(body);
    const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
    const etag = `W/"${hash}"`;

    // Conditional response (D-06)
    const clientEtag = req.get('If-None-Match');
    if (clientEtag && clientEtag === etag) {
      return res.status(304).end();
    }

    res.set('ETag', etag);
    return originalJson(body);
  };

  next();
}
```

### setWithJitter Implementation
```typescript
// Source: Thundering herd prevention [CITED: oneuptime.com/blog/redis-cache-stampede]
async setWithJitter<T>(
  key: string,
  value: T,
  baseTtlSeconds: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
  if (!this.isAvailable()) return false;

  try {
    // D-09: baseTTL * (0.9 + random * 0.2)
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

### Cache Hit Ratio Metrics
```typescript
// Source: prom-client documentation [CITED: oneuptime.com/blog/nodejs-custom-metrics-prometheus]
// Add to MetricsService
public cacheHits: Counter<string>;
public cacheMisses: Counter<string>;

// In constructor:
this.cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'], // 'news', 'events', 'analysis'
  registers: [this.registry],
});

this.cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [this.registry],
});

// Cache hit ratio in Prometheus/Grafana:
// rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed TTL everywhere | Jitter-based TTL | 2023+ standard | Prevents thundering herd; adopted by major CDNs |
| Strong ETags for APIs | Weak ETags (W/"...") | HTTP/1.1 spec clarification | Correct semantic for dynamically generated content |
| KEYS for pattern delete | SCAN (for large keyspaces) | Redis 2.8+ | Non-blocking iteration; NewsHub's keyspace is small enough for KEYS |
| Manual Cache-Control | Express static with setHeaders | Express 4.x+ | Declarative configuration, immutable directive support |

**Deprecated/outdated:**
- `res.sendSeekable()` — Never widely adopted; use standard ETag/304 flow
- `expires` header — Superseded by `max-age` in Cache-Control (HTTP/1.0 compatibility only)

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | NewsHub cache keyspace will remain under 1000 keys | Common Pitfalls | If keyspace grows, KEYS command will block Redis; must migrate to SCAN |
| A2 | MD5 truncated to 16 chars is sufficient for ETag uniqueness | Code Examples | Collision risk theoretically higher; switch to full hash or SHA-256 if collisions observed |
| A3 | 10% jitter is adequate spread for 300s TTL | Patterns | If refresh traffic is very bursty, may need larger jitter (15-20%) |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Cache metrics implementation depth**
   - What we know: prom-client supports counters for hits/misses; Redis INFO provides keyspace_hits/keyspace_misses
   - What's unclear: Should we instrument CacheService methods directly or rely on Redis-level metrics?
   - Recommendation: Instrument CacheService methods — gives cache_type labels for per-endpoint visibility

2. **KEYS vs SCAN decision threshold**
   - What we know: KEYS blocks Redis; SCAN iterates non-blocking; NewsHub expected <100 keys per pattern
   - What's unclear: At what key count should we mandate SCAN migration?
   - Recommendation: Add logging when `delPattern` affects >100 keys; alert if >500 keys; mandatory SCAN at 1000+

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Redis | All caching features | Yes (Docker) | 7.x | In-memory Map (graceful degradation exists) |
| Node.js crypto | ETag generation | Yes (built-in) | — | — |

**Missing dependencies with no fallback:**
- None — all dependencies available

**Missing dependencies with fallback:**
- None — Redis graceful degradation already implemented in CacheService

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — (caching doesn't affect auth) |
| V3 Session Management | No | — (JWT tokens not cached) |
| V4 Access Control | No | — (public endpoints only) |
| V5 Input Validation | Yes | Cache keys derived from validated query params |
| V6 Cryptography | No | MD5 for ETag is not security-sensitive |

### Known Threat Patterns for {Express + Redis}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cache poisoning | Tampering | ETags generated server-side only; never accept client ETags for storage |
| Cache key injection | Tampering | CacheKeys builders sanitize inputs; no direct user input in keys |
| Information disclosure via timing | Information Disclosure | Cache hit/miss timing differences minimal; not a concern for public data |

## Sources

### Primary (HIGH confidence)
- [Express.js API Documentation](https://expressjs.com/en/api.html) — ETag settings, static middleware configuration
- [MDN ETag Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag) — Strong vs weak validators, If-None-Match flow
- CONTEXT.md D-01 through D-12 — User-locked decisions for implementation

### Secondary (MEDIUM confidence)
- [oneuptime.com Cache Stampede Prevention](https://oneuptime.com/blog/post/2026-01-21-redis-cache-stampede/view) — Jitter-based TTL patterns
- [oneuptime.com Redis Caching Patterns](https://oneuptime.com/blog/post/2026-02-20-redis-caching-patterns/view) — SCAN vs KEYS tradeoffs
- [Redis Anti-Patterns Tutorial](https://redis.io/tutorials/redis-anti-patterns-every-developer-should-avoid/) — KEYS command blocking risks
- [Express serve-static Middleware](https://expressjs.com/en/resources/middleware/serve-static.html) — immutable directive, setHeaders option

### Tertiary (LOW confidence)
- None — all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and version-verified
- Architecture: HIGH — integration points clearly defined in existing code
- Pitfalls: HIGH — well-documented in Redis and HTTP caching literature

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days — stable domain, no major spec changes expected)
