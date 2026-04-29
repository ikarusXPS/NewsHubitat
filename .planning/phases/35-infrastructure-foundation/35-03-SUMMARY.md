---
phase: 35-infrastructure-foundation
plan: 03
subsystem: public-api
tags: [openapi, api-key, rate-limiting, public-api, zod]
dependency_graph:
  requires:
    - 35-01 (monorepo workspace setup)
    - 35-02 (API key generation service)
  provides:
    - OpenAPI 3.1 spec generator from Zod schemas
    - API key authentication middleware
    - Tiered rate limiting middleware (free 10/min, pro 100/min)
    - Versioned public API at /api/v1/public/*
  affects:
    - server/index.ts (route mounting, CORS headers)
    - server/config/rateLimits.ts (API tier config)
tech_stack:
  added:
    - "@asteasolutions/zod-to-openapi": "8.5.0"
  patterns:
    - Code-first OpenAPI generation from Zod schemas
    - IETF RateLimit headers (standardHeaders: true)
    - Redis-cached API key validation with 5-min TTL
    - Fire-and-forget usage tracking
key_files:
  created:
    - apps/web/server/openapi/schemas.ts
    - apps/web/server/openapi/generator.ts
    - apps/web/server/middleware/apiKeyAuth.ts
    - apps/web/server/middleware/apiKeyRateLimiter.ts
    - apps/web/server/routes/publicApi.ts
    - apps/web/public/openapi.json
  modified:
    - apps/web/package.json (openapi:generate script)
    - apps/web/server/index.ts (route mounting, X-API-Key CORS)
    - apps/web/server/config/rateLimits.ts (API_TIER_LIMITS)
decisions:
  - "Code-first OpenAPI with zod-to-openapi per D-10"
  - "X-API-Key header for authentication per D-06"
  - "IETF RateLimit-* headers via standardHeaders: true per D-13"
  - "Redis caching for validated keys with 5-min TTL per T-35-10"
  - "Key by API key ID, not IP (NAT/VPN friendly)"
  - "Fire-and-forget usage tracking (never block requests)"
metrics:
  duration: "10 minutes"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 3
  completed: "2026-04-26T09:13:21Z"
---

# Phase 35 Plan 03: Public API Endpoints Summary

OpenAPI-documented public API with tiered rate limiting for external developer access.

## What Was Built

### OpenAPI Spec Generator

Created code-first OpenAPI generation using @asteasolutions/zod-to-openapi:

**apps/web/server/openapi/schemas.ts:**
- Zod schemas extended with `.openapi()` metadata
- `PerspectiveRegionSchema`, `SentimentSchema`, `EventCategorySchema`, `EventSeveritySchema` enums
- `NewsArticleSchema`, `GeoEventSchema`, `SentimentStatsSchema` domain models
- Response wrappers: `NewsListResponseSchema`, `GeoEventsResponseSchema`, etc.
- Error responses: `ErrorResponseSchema`, `RateLimitErrorResponseSchema`

**apps/web/server/openapi/generator.ts:**
- `generateOpenApiSpec(outputPath)` function
- Registers X-API-Key security scheme
- Registers /api/v1/public/news, /news/:id, /events, /sentiment endpoints
- Outputs OpenAPI 3.1.0 JSON spec

**npm script:** `pnpm run openapi:generate` outputs to `public/openapi.json`

### API Key Authentication Middleware

**apps/web/server/middleware/apiKeyAuth.ts:**
- Extracts `X-API-Key` header
- Validates against database via `ApiKeyService.validateApiKey()`
- Caches validated keys in Redis for 5 minutes (T-35-10)
- Attaches `req.apiKey` metadata for downstream middleware
- Fire-and-forget usage tracking via `trackUsage()`
- Never logs full key (T-35-12)

```typescript
interface ApiKeyRequest extends Request {
  apiKey?: {
    keyId: string;
    userId: string;
    tier: ApiKeyTier;
    environment: ApiKeyEnv;
  };
}
```

### Tiered Rate Limiter

**apps/web/server/middleware/apiKeyRateLimiter.ts:**
- Dynamic `max` based on `req.apiKey.tier` (D-12)
- Free tier: 10 req/min, Pro tier: 100 req/min (D-15)
- Keys by API key ID, not IP (NAT/VPN friendly)
- IETF-compliant headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (D-13)
- Redis sliding window algorithm (D-14)
- Graceful degradation when Redis unavailable

### Public API Routes

**apps/web/server/routes/publicApi.ts:**

| Endpoint | Description | Cache-Control |
|----------|-------------|---------------|
| GET /api/v1/public/news | List articles with pagination, filters | 5 minutes |
| GET /api/v1/public/news/:id | Single article by ID | 1 hour |
| GET /api/v1/public/events | Geo-located events for map visualization | 15 minutes |
| GET /api/v1/public/sentiment | Sentiment stats by region | 10 minutes |

**Query parameters for /news:**
- `regions`: Comma-separated filter (e.g., "usa,europa")
- `topics`: Comma-separated filter
- `sentiment`: positive | negative | neutral
- `search`: Full-text search
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

### Route Mounting

**apps/web/server/index.ts:**
```typescript
const apiKeyLimiter = createApiKeyLimiter();
app.use('/api/v1/public', apiKeyAuth, apiKeyLimiter, publicApiRoutes);

// OpenAPI spec served without auth (public documentation)
app.get('/api/openapi.json', (_req, res) => {
  res.sendFile('openapi.json', { root: './public' });
});
```

Added `X-API-Key` to CORS `allowedHeaders`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 1246a6a | Create OpenAPI spec generator with Zod schemas |
| 2 | 62de4da | Create API key authentication and rate limiting middleware |
| 3 | 8cf4ae6 | Create public API routes and mount in Express app |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] OpenAPI spec generator created with zod-to-openapi
- [x] Zod schemas defined for all public API types
- [x] apiKeyAuth middleware validates X-API-Key header
- [x] apiKeyAuth caches key metadata in Redis with 5-min TTL
- [x] createApiKeyLimiter returns tiered rate limiter (10/min free, 100/min pro)
- [x] Rate limiter uses standardHeaders for IETF compliance
- [x] Public API routes created at /api/v1/public/{news,events,sentiment}
- [x] All routes set Cache-Control headers
- [x] Routes mounted in Express with apiKeyAuth -> apiKeyLimiter -> handler chain
- [x] /api/openapi.json served without authentication
- [x] TypeScript type check passes

## Self-Check: PASSED

All files verified to exist:
- apps/web/server/openapi/schemas.ts: FOUND
- apps/web/server/openapi/generator.ts: FOUND
- apps/web/server/middleware/apiKeyAuth.ts: FOUND
- apps/web/server/middleware/apiKeyRateLimiter.ts: FOUND
- apps/web/server/routes/publicApi.ts: FOUND
- apps/web/public/openapi.json: FOUND

All commits verified:
- 1246a6a: FOUND
- 62de4da: FOUND
- 8cf4ae6: FOUND
