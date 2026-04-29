# Phase 33: Caching Improvements - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

API responses served from cache with smart invalidation maintaining data freshness. WebSocket events trigger cache invalidation for affected API responses. Static assets have immutable cache headers. Jitter-based TTL prevents thundering herd on cache expiration.

</domain>

<decisions>
## Implementation Decisions

### Invalidation Triggers
- **D-01:** Direct CacheService call — WebSocket emit triggers `cache.del()` immediately, synchronous and simple
- **D-02:** `news:new` invalidates ALL list caches via `delPattern('news:list:*')` — clears all filter variants (~10-50 keys), safe over selective
- **D-03:** Event-to-cache mapping:
  - `news:new` → `delPattern('news:list:*')`
  - `news:updated` → `del('news:article:{id}')` + `delPattern('news:list:*')`
  - `analysis:cluster-updated` → `delPattern('analysis:clusters:*')`
  - `event:new` / `event:updated` → `del('events:geo')` + `del('events:timeline')`

### ETag Strategy
- **D-04:** Content hash ETags — MD5 of JSON response for accurate validation
- **D-05:** Weak validators (W/"...") — standard for dynamic API content, semantically equivalent
- **D-06:** ETag middleware checks `If-None-Match` header, returns 304 Not Modified when matched

### Jitter Calculation
- **D-07:** 10% TTL variance — 300s base → 270-330s actual, spreads expiration over 60s window
- **D-08:** Apply jitter to ALL caches — consistent `setWithJitter()` method in CacheService
- **D-09:** Jitter formula: `baseTTL * (0.9 + Math.random() * 0.2)` — 10% below to 10% above

### Static Asset Headers
- **D-10:** Immutable with 1-year max-age — `Cache-Control: public, max-age=31536000, immutable` for hashed assets
- **D-11:** Express static middleware — use `setHeaders` option in `express.static()` configuration
- **D-12:** Target assets: `/assets/` directory containing Vite-built JS/CSS with content hashes in filenames

### Claude's Discretion
- ETag hash algorithm details (MD5 truncation length, hex vs base64)
- Redis `KEYS` vs `SCAN` for pattern deletion (performance tradeoff)
- Whether to add `Last-Modified` header alongside ETag

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Cache Infrastructure
- `server/services/cacheService.ts` — Redis wrapper with get/set/del/delPattern, TTL presets (SHORT: 60s, MEDIUM: 300s), CacheKeys builders
- `server/services/cacheService.ts:361-393` — CacheKeys definitions for news, analysis, events

### WebSocket Events
- `server/services/websocketService.ts:13-43` — ServerToClientEvents interface defining `news:new`, `news:updated`, `analysis:cluster-updated` events

### Existing HTTP Headers
- `server/routes/news.ts:34-36` — Already sets `Cache-Control: public, max-age=300` and `Vary: Accept-Encoding`
- `server/routes/news.ts:54-56` — Sources endpoint: 24-hour cache
- `server/routes/news.ts:89-91` — Single article: 10-minute cache

### Static Asset Serving
- `server/index.ts` — Express static middleware configuration

### Phase 14 Decisions
- `.planning/phases/14-redis-caching/14-CONTEXT.md` — Original Redis integration decisions, graceful degradation pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CacheService.delPattern(pattern)` — Already implemented for pattern-based invalidation
- `CacheService.getOrSet(key, computeFn, ttl)` — Cache-aside pattern already implemented
- `CacheKeys.newsList(filters)`, `CacheKeys.clusters(withSummaries)` — Key builders already defined
- `CACHE_TTL` presets — SHORT: 60s, MEDIUM: 300s, LONG: 1800s, HOUR: 3600s, DAY: 86400s

### Established Patterns
- Singleton services via `getInstance()` pattern
- Graceful degradation with `isAvailable()` checks before Redis operations
- WebSocket emit pattern: `this.io.emit('news:new', article)`
- Express middleware chain for request processing

### Integration Points
- `server/services/websocketService.ts` — Add invalidation calls after WebSocket emits
- `server/index.ts` — Add ETag middleware before routes, configure static headers
- `server/services/cacheService.ts` — Add `setWithJitter()` method alongside existing `set()`
- `server/routes/news.ts` — Update Cache-Control headers for API responses

</code_context>

<specifics>
## Specific Ideas

- ETag middleware should be lightweight — compute hash only if response is cacheable
- Consider storing computed ETags in Redis alongside cached responses to avoid recomputation
- `Vary: Accept-Encoding` already set — ensures compressed and uncompressed versions cached separately
- Static asset path `/assets/` matches Vite's default output directory

</specifics>

<deferred>
## Deferred Ideas

- **Stale-while-revalidate** — Serve stale cache while refreshing in background. Requires async pattern change.
- **Cache warming** — Pre-populate caches on server start or after deployment. Optimization for later.
- **CDN edge caching** — Push cache to CDN edge nodes. Infrastructure change for v1.6.
- **Cache statistics dashboard** — Hit/miss ratio visualization. Monitoring enhancement.
- **Conditional invalidation** — Only invalidate if content actually changed (compare hashes). Optimization.

</deferred>

---

*Phase: 33-caching-improvements*
*Context gathered: 2026-04-26*
