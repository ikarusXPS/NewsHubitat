# Phase 33: Caching Improvements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 33-caching-improvements
**Areas discussed:** Invalidation triggers, ETag strategy, Jitter calculation, Static asset headers

---

## Invalidation Triggers

### Q1: How should cache invalidation be triggered when WebSocket events fire?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct CacheService call (Recommended) | WebSocket emit triggers cache.del() immediately. Simple, synchronous. | ✓ |
| Event listener pattern | Separate CacheInvalidator service subscribes to events. Decoupled but adds complexity. | |
| Batch invalidation | Collect events for 1s, then invalidate. Reduces Redis calls but adds latency. | |

**User's choice:** Direct CacheService call (Recommended)
**Notes:** Synchronous invalidation keeps it simple, no additional service needed.

### Q2: Should news:new invalidate ALL news list caches or just 'no filters' cache?

| Option | Description | Selected |
|--------|-------------|----------|
| All list caches (Recommended) | Use delPattern('news:list:*') to clear all filter variants. Safest, ~10-50 keys. | ✓ |
| Selective by region | Parse article.region, invalidate only matching filter combos. Complex logic. | |
| No-filters cache only | Only clear 'news:list:' (no filters). Fastest but may serve stale data. | |

**User's choice:** All list caches (Recommended)
**Notes:** Safe over selective — new articles could match any filter combination.

---

## ETag Strategy

### Q3: What should ETags be based on for news list endpoints?

| Option | Description | Selected |
|--------|-------------|----------|
| Content hash (Recommended) | MD5 of JSON response. Accurate but requires computing response before checking. | ✓ |
| Timestamp-based | Hash of last-modified time. Fast but less accurate for filtered queries. | |
| Version counter | Increment global counter on any change. Simple but coarse-grained. | |
| Skip ETags for lists | Only use ETags for single article endpoints. Simpler implementation. | |

**User's choice:** Content hash (Recommended)
**Notes:** Most accurate validation — hash matches only if content is identical.

### Q4: Should ETags use weak validators or strong validators?

| Option | Description | Selected |
|--------|-------------|----------|
| Weak validators (Recommended) | W/"abc123" — semantically equivalent. Standard for dynamic content. | ✓ |
| Strong validators | "abc123" — byte-for-byte identical. More strict, rarely needed for APIs. | |

**User's choice:** Weak validators (Recommended)
**Notes:** Weak validators are the HTTP standard for dynamic API responses.

---

## Jitter Calculation

### Q5: How much TTL jitter should be applied to prevent thundering herd?

| Option | Description | Selected |
|--------|-------------|----------|
| 10% variance (Recommended) | 300s base → 270-330s actual. Spreads expiration over 60s window. | ✓ |
| 20% variance | 300s base → 240-360s actual. Wider spread for high traffic. | |
| Fixed ± offset | 300s ± 30s fixed. Simpler but less adaptive to base TTL. | |

**User's choice:** 10% variance (Recommended)
**Notes:** 10% provides sufficient spread without excessive variance.

### Q6: Should jitter be applied to all caches or only high-volume endpoints?

| Option | Description | Selected |
|--------|-------------|----------|
| All caches (Recommended) | Consistent behavior. setWithJitter() method in CacheService. | ✓ |
| News list only | Only high-volume endpoint. Others use fixed TTL. | |
| Configurable per key | Flag to enable/disable jitter. Most flexible but adds complexity. | |

**User's choice:** All caches (Recommended)
**Notes:** Consistency over complexity — all caches benefit from jitter.

---

## Static Asset Headers

### Q7: What Cache-Control should static assets (JS/CSS/fonts) have?

| Option | Description | Selected |
|--------|-------------|----------|
| immutable, max-age=1yr (Recommended) | Cache-Control: public, max-age=31536000, immutable. Industry standard for hashed assets. | ✓ |
| max-age=1yr without immutable | Some older proxies don't support immutable. Falls back to standard behavior. | |
| max-age=7d | Shorter cache. Less aggressive but may miss optimization. | |

**User's choice:** immutable, max-age=1yr (Recommended)
**Notes:** Vite content hashes make assets safe to cache indefinitely.

### Q8: Where should static asset headers be set?

| Option | Description | Selected |
|--------|-------------|----------|
| Express static middleware (Recommended) | express.static with setHeaders option. Already serves assets. | ✓ |
| Nginx/reverse proxy | Set headers at CDN/proxy layer. Requires deployment config change. | |
| Both layers | Defense in depth. Express sets, proxy can override. | |

**User's choice:** Express static middleware (Recommended)
**Notes:** Keep configuration in application code for now; CDN layer in v1.6.

---

## Claude's Discretion

- ETag hash algorithm details (MD5 truncation, encoding)
- Redis KEYS vs SCAN for pattern deletion
- Last-Modified header alongside ETag

## Deferred Ideas

- Stale-while-revalidate pattern
- Cache warming on startup
- CDN edge caching (v1.6)
- Cache statistics dashboard
- Conditional invalidation (hash comparison)
