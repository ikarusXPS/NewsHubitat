---
phase: 14-redis-caching
plan: 04
subsystem: ai-caching
tags: [redis, ai, caching, performance]
dependency_graph:
  requires: [14-01]
  provides: [ai-redis-cache, persistent-ai-summaries]
  affects: [analysis-service, cluster-endpoint]
tech_stack:
  added: []
  patterns: [redis-caching, graceful-degradation]
key_files:
  created: []
  modified:
    - server/config/aiProviders.ts
    - server/services/cacheService.ts
    - server/services/aiService.ts
decisions:
  - "Changed topicTTL from 24h to 5min for news freshness (Claude's discretion per CONTEXT.md)"
  - "Remove cleanup timer/methods - Redis handles TTL expiration automatically"
metrics:
  duration_minutes: 14
  completed_date: "2026-04-22"
---

# Phase 14 Plan 04: AI Cache Migration Summary

Redis-backed AI summaries and topic classifications with graceful degradation.

## One-liner

AIService migrated from in-memory Maps to Redis cache with 30-min summary and 5-min topic TTLs per D-07.

## What Was Built

### Task 1: Update AI_CONFIG cache TTLs (ebd6176)
- Changed `summaryTTL` to `summaryTTLSeconds` (30 min = 1800s)
- Changed `topicTTL` to `topicTTLSeconds` (5 min = 300s)
- Removed `cleanupInterval` (Redis handles expiration)
- Added D-07 reference comment

### Task 2: Add AI cache keys to CacheKeys (f8bbc0f)
- Added `aiSummary(clusterKey)` key builder
- Added `aiTopics(contentHash)` key builder
- Both namespaced under `ai:` prefix

### Task 3: Migrate AIService caches to Redis (7ec05e4)
- Added CacheService import and instance
- Removed in-memory `cache` and `topicCache` Maps
- Removed `CACHE_TTL`, `TOPIC_CACHE_TTL`, `CLEANUP_INTERVAL` constants
- Removed `cleanupTimer` and `startCacheCleanup()` method
- Removed `cleanupCaches()` method
- Updated `generateClusterSummary()` to use Redis
- Updated `classifyTopics()` to use Redis
- Simplified `shutdown()` method

## Key Implementation Details

### Redis Cache Integration
```typescript
// Summary caching (30-min TTL)
const cacheKey = CacheKeys.aiSummary(this.getCacheKey(cluster));
const cached = await this.cacheService.get<ClusterSummary>(cacheKey);
if (cached) return cached;
// ... generate summary ...
await this.cacheService.set(cacheKey, summary, AI_CONFIG.cache.summaryTTLSeconds);

// Topic caching (5-min TTL)
const cacheKey = CacheKeys.aiTopics(hashString(title + content));
const cached = await this.cacheService.get<string[]>(cacheKey);
if (cached) return cached;
// ... classify topics ...
await this.cacheService.set(cacheKey, result, AI_CONFIG.cache.topicTTLSeconds);
```

### Graceful Degradation (T-14-12)
When Redis is unavailable, the service falls back to regenerating AI responses. This is acceptable per the threat model (T-14-12: accept disposition).

### Topic TTL Decision
Changed from 24 hours to 5 minutes per CONTEXT.md Claude's Discretion section. News topics need freshness alignment with the 5-minute stale time used by TanStack Query on the frontend.

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compiles | PASS |
| Map<string count in aiService.ts | 2 (byRegion Maps for grouping, not caching) |
| CacheService import present | PASS |
| CacheKeys.aiSummary used | PASS |
| CacheKeys.aiTopics used | PASS |
| summaryTTLSeconds in config | PASS |
| topicTTLSeconds in config | PASS |
| cleanupInterval removed | PASS |
| cleanupTimer removed | PASS |
| startCacheCleanup removed | PASS |
| cleanupCaches removed | PASS |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | ebd6176 | feat(14-04): update AI_CONFIG cache TTLs to seconds for Redis |
| 2 | f8bbc0f | feat(14-04): add AI cache keys to CacheKeys |
| 3 | 7ec05e4 | feat(14-04): migrate AIService caches from Map to Redis |

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

| File | Changes |
|------|---------|
| server/config/aiProviders.ts | TTLs changed to seconds, cleanupInterval removed |
| server/services/cacheService.ts | +4 lines (aiSummary, aiTopics key builders) |
| server/services/aiService.ts | +18/-73 lines (Redis migration, cleanup removal) |

## Self-Check: PASSED

- [x] server/config/aiProviders.ts contains summaryTTLSeconds: FOUND
- [x] server/config/aiProviders.ts contains topicTTLSeconds: FOUND
- [x] server/services/cacheService.ts contains aiSummary: FOUND
- [x] server/services/cacheService.ts contains aiTopics: FOUND
- [x] server/services/aiService.ts contains CacheService import: FOUND
- [x] server/services/aiService.ts contains cacheService.get: FOUND
- [x] server/services/aiService.ts does NOT contain private cache: Map: CONFIRMED
- [x] Commit ebd6176: FOUND
- [x] Commit f8bbc0f: FOUND
- [x] Commit 7ec05e4: FOUND
