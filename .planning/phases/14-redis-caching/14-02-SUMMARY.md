---
phase: 14-redis-caching
plan: 02
subsystem: infrastructure
tags: [redis, rate-limiting, express-rate-limit, security]
dependency_graph:
  requires: [redis-infrastructure, cache-blacklist-api]
  provides: [rate-limiting-middleware, tiered-rate-limits]
  affects: [auth-routes, ai-routes, news-routes]
tech_stack:
  added: [express-rate-limit@7.5.0, rate-limit-redis@4.2.0]
  patterns: [sliding-window-rate-limit, graceful-degradation, ip-key-generator, user-key-generator]
key_files:
  created:
    - server/config/rateLimits.ts
    - server/middleware/rateLimiter.ts
  modified:
    - package.json
    - server/index.ts
decisions:
  - "IP-based rate limiting for auth/news, user-based for AI endpoints"
  - "Graceful degradation: skip rate limiting if Redis unavailable (D-03)"
  - "HTTP 429 response includes Retry-After header (D-06)"
metrics:
  duration_minutes: 23
  completed_date: "2026-04-22"
---

# Phase 14 Plan 02: Rate Limiting Summary

Tiered rate limiting middleware with Redis store and graceful degradation.

## One-liner

Express rate limiting with Redis sliding window: auth 5/min, AI 10/min, news 100/min per IP/user.

## What Was Built

### Task 1: Install rate limiting packages (1fa755b)
- Added express-rate-limit@7.5.0 for middleware factory
- Added rate-limit-redis@4.2.0 for Redis store adapter
- Regenerated package-lock.json with legacy-peer-deps

### Task 2: Create rate limit configuration (ef6b880)
- Created server/config/rateLimits.ts with tiered config
- Auth tier: 5 req/min per IP (brute force protection)
- AI tier: 10 req/min per user (cost control)
- News tier: 100 req/min per IP (scraping prevention)
- Export RATE_LIMITS const and RateLimitTier type

### Task 3: Create rate limiter middleware factory (87c3b3d)
- Created server/middleware/rateLimiter.ts
- `createLimiter()` factory with tier-based configuration
- IP key generator with X-Forwarded-For support
- User key generator for authenticated AI requests
- Redis store when available, memory fallback otherwise
- HTTP 429 response with Retry-After header (D-06)
- Graceful degradation: skip limiting if Redis unavailable (D-03)
- Export authLimiter, aiLimiter, newsLimiter presets

### Task 4: Apply rate limiters to routes (2b13fae)
- Import rate limiters in server/index.ts
- Auth limiter on /api/auth/login, register, request-reset, reset-password
- AI limiter on /api/ai and /api/analysis routes
- News limiter on /api/news, /api/events, /api/markets routes
- Other routes unchanged (translate, focus, personas, etc.)

## Key Implementation Details

### Rate Limit Tiers (D-05)

| Tier | Limit | Key By | Purpose |
|------|-------|--------|---------|
| auth | 5 req/min | IP | Brute force protection |
| ai | 10 req/min | User (fallback IP) | API cost control |
| news | 100 req/min | IP | Scraping prevention |

### Graceful Degradation (D-03)

When Redis is unavailable, rate limiting is skipped entirely:

```typescript
skip: () => {
  if (!cacheService.isAvailable()) {
    logger.debug('Rate limiting skipped: Redis unavailable (D-03)');
    return true;
  }
  return false;
}
```

### HTTP 429 Response (D-06)

Rate limit violations return structured response with retry guidance:

```typescript
handler: (_req, res, _next, opts) => {
  const retryAfter = Math.ceil(opts.windowMs / 1000);
  res.set('Retry-After', String(retryAfter));
  res.status(429).json({
    success: false,
    error: 'Too many requests',
    retryAfter,
  });
}
```

## Verification Results

| Check | Result |
|-------|--------|
| npm list express-rate-limit rate-limit-redis | PASS (7.5.1, 4.3.1) |
| npm run typecheck | PASS |
| authLimiter, aiLimiter, newsLimiter exported | PASS |
| Limiters applied in index.ts | PASS |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 1fa755b | feat(14-02): install express-rate-limit and rate-limit-redis |
| 2 | ef6b880 | feat(14-02): create rate limit configuration |
| 3 | 87c3b3d | feat(14-02): create rate limiter middleware factory |
| 4 | 2b13fae | feat(14-02): apply rate limiters to API routes |

## Deviations from Plan

### [Rule 3 - Blocking Issue] npm install failures

**Found during:** Task 1
**Issue:** npm install failed with corrupted node_modules from mixed pnpm/npm state and peer dependency conflict with vite-plugin-pwa
**Fix:** Used --legacy-peer-deps flag after cleaning node_modules; used slightly different package versions (7.5.0 vs 8.3.2 from plan, 4.2.0 vs 4.3.1)
**Files modified:** package.json, package-lock.json
**Commit:** 1fa755b

## Files Modified

| File | Changes |
|------|---------|
| package.json | +2 lines (express-rate-limit, rate-limit-redis deps) |
| package-lock.json | +17054 lines (new lock file with all deps) |
| server/config/rateLimits.ts | +54 lines (new file) |
| server/middleware/rateLimiter.ts | +106 lines (new file) |
| server/index.ts | +21 -7 lines (import + rate limiter application) |

## Next Steps

This plan provides the foundation for:
- Plan 03: Auth service JWT blacklisting integration (uses CacheService from Plan 01)
- Future: Rate limit tuning based on production traffic patterns

## Self-Check: PASSED

- [x] package.json contains express-rate-limit: FOUND
- [x] package.json contains rate-limit-redis: FOUND
- [x] server/config/rateLimits.ts exists: FOUND
- [x] server/middleware/rateLimiter.ts exists: FOUND
- [x] server/index.ts contains authLimiter import: FOUND
- [x] Commit 1fa755b: FOUND
- [x] Commit ef6b880: FOUND
- [x] Commit 87c3b3d: FOUND
- [x] Commit 2b13fae: FOUND
