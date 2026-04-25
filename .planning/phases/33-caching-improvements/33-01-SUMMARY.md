---
phase: 33-caching-improvements
plan: 01
subsystem: backend/cache
tags: [redis, websocket, cache-invalidation, thundering-herd]
dependency_graph:
  requires: []
  provides: [setWithJitter, cache-invalidation-on-broadcast]
  affects: [news-list-cache, events-cache, clusters-cache]
tech_stack:
  added: []
  patterns: [jitter-based-ttl, fire-and-forget-invalidation]
key_files:
  created: []
  modified:
    - server/services/cacheService.ts
    - server/services/websocketService.ts
    - server/services/cacheService.test.ts
decisions:
  - "10% TTL jitter variance (0.9-1.1 multiplier) per D-09"
  - "getOrSet uses setWithJitter for consistent thundering herd prevention"
  - "Fire-and-forget cache invalidation (void prefix) to not block broadcasts"
metrics:
  duration: ~5 min
  completed: 2026-04-25T22:54:38Z
---

# Phase 33 Plan 01: Cache Invalidation and TTL Jitter Summary

Smart cache invalidation via WebSocket broadcasts and jitter-based TTL for thundering herd prevention.

## One-liner

Cache invalidation on WebSocket data broadcasts with 10% TTL jitter to prevent cache stampedes.

## What Was Built

### CacheService Extensions

1. **setWithJitter() method** - Sets cache values with randomized TTL variance
   - Formula: `baseTTL * (0.9 + Math.random() * 0.2)`
   - Example: 300s base TTL becomes 270-330s actual
   - Prevents thundering herd when many cache entries expire simultaneously

2. **getOrSet() updated** - Now uses `setWithJitter()` internally
   - All computed cache values automatically get jitter
   - Consistent behavior across the codebase

### WebSocketService Cache Invalidation

1. **broadcastNewArticle()** - Invalidates `news:list:*` pattern
2. **broadcastNewEvent()** - Invalidates `events:geo` and `events:timeline`
3. **broadcastClusterUpdate()** - Invalidates `analysis:clusters:*` pattern
4. **broadcastArticleUpdated()** (new) - Invalidates specific article + all lists
5. **broadcastEventUpdated()** (new) - Invalidates event caches

All invalidations use `void` prefix for fire-and-forget pattern - cache invalidation failures don't block real-time broadcasts.

## Technical Details

### Jitter Implementation
```typescript
// D-09: baseTTL * (0.9 + random * 0.2) - 10% below to 10% above
const jitterMultiplier = 0.9 + Math.random() * 0.2;
const actualTtl = Math.floor(baseTtlSeconds * jitterMultiplier);
```

### Cache Invalidation Pattern
```typescript
// D-01, D-02: Invalidate cache synchronously after broadcast
const cache = CacheService.getInstance();
void cache.delPattern('news:list:*');
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| d62d1d0 | feat | Add setWithJitter() method to CacheService |
| 3a9e1cb | feat | Add cache invalidation to WebSocket broadcasts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated getOrSet test expectation**
- **Found during:** Task 2 verification
- **Issue:** Test expected exact TTL but getOrSet now uses jittered TTL
- **Fix:** Changed test to verify TTL is within 10% variance range
- **Files modified:** server/services/cacheService.test.ts
- **Commit:** 3a9e1cb

## Test Coverage

- **New tests added:** 4 tests for `setWithJitter` method
- **Updated tests:** 1 test for `getOrSet` jitter behavior
- **Total tests passing:** 1210/1210

## Verification

```
npm run typecheck  # PASS
npm run test:run   # 1210 tests passing
```

## Self-Check: PASSED

- [x] server/services/cacheService.ts contains setWithJitter
- [x] server/services/websocketService.ts imports CacheService
- [x] Commit d62d1d0 exists
- [x] Commit 3a9e1cb exists
