# Phase 14: Redis Caching - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Redis for session blacklisting, rate limiting, and AI response caching. This phase integrates Redis into the existing CacheService infrastructure and creates middleware for rate limiting. Full session migration to Redis is out of scope — JWT remains the primary auth mechanism.

</domain>

<decisions>
## Implementation Decisions

### Session Storage Strategy
- **D-01:** Keep JWT + add Redis blacklist — JWT stays stateless for most requests, Redis only stores blacklisted/revoked tokens
- **D-02:** Blacklist tokens on: logout, password change, and tokenVersion bump (admin invalidation)
- **D-03:** Graceful degradation — if Redis is unavailable, skip blacklist check, log warning, continue (better uptime, slightly reduced security during outage)

### Claude's Discretion (Sessions)
- Blacklist TTL — Claude decides based on JWT_EXPIRES_IN = '7d' in authService.ts (match JWT expiry recommended)

### Rate Limiting Design
- **D-04:** Sliding window algorithm — 100 req/min means any 60-second window, uses Redis INCR + EXPIRE
- **D-05:** Tiered rate limits by endpoint category:
  - Auth endpoints (strict): 5 req/min per IP — login, register, password reset
  - AI endpoints (moderate): 10 req/min per user — /api/ai/ask, /api/analysis/clusters
  - News API (relaxed): 100 req/min per IP — /api/news, /api/events
- **D-06:** Violation response: HTTP 429 Too Many Requests with Retry-After header showing seconds until reset

### AI Cache Migration
- **D-07:** Migrate AIService caches from in-memory Maps to Redis — survives server restarts, shareable across instances

### Claude's Discretion (AI Cache)
- AI cache TTLs — Claude decides based on news freshness vs. cost tradeoff (current: 30min summaries, 5min topics in AI_CONFIG.cache)

### Docker + Health Checks
- **D-08:** Add Redis service to existing docker-compose.yml (extend Phase 13's file)
- **D-09:** Add /api/health/redis endpoint — returns connection status, key count, memory usage (follows /api/health/db pattern)

### Claude's Discretion (Docker)
- Redis version selection (likely 7.x)
- Redis persistence configuration (RDB vs. AOF)
- Docker volume naming and port mapping

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Cache Infrastructure
- `server/services/cacheService.ts` — Already fully implemented CacheService with ioredis, TTL presets, key builders, graceful degradation
- `server/config/aiProviders.ts` — AI_CONFIG.cache settings (summaryTTL: 30min, topicTTL: 5min)

### Auth Integration
- `server/services/authService.ts` — JWT implementation with tokenVersion, JWT_EXPIRES_IN = '7d'
- `server/utils/tokenUtils.ts` — Token generation and validation utilities

### AI Service Integration
- `server/services/aiService.ts` — In-memory Map caches to migrate (lines 35-40)

### Docker Configuration
- `docker-compose.yml` — Phase 13 added PostgreSQL, extend with Redis

### Health Endpoint Pattern
- `server/routes/health.ts` — Existing /api/health and /api/health/db patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CacheService` — Full Redis wrapper already exists with get/set/del/incr/expire, TTL presets, key builders
- `CacheKeys.rateLimit(ip, endpoint)` — Key builder for rate limiting already defined
- `CacheKeys.userSession(userId)` — Key builder for session data already defined
- `CacheService.getStats()` — Returns connected status, key count, memory usage

### Established Patterns
- Singleton services via `getInstance()` pattern
- Graceful degradation with `isAvailable()` checks
- JSON structured logging via `server/utils/logger.ts`
- Express middleware pattern for route protection

### Integration Points
- `server/index.ts` — Add rate limiting middleware before routes
- `server/services/authService.ts` — Add blacklist check in token validation
- `server/services/aiService.ts` — Replace Map caches with CacheService calls
- `server/routes/health.ts` — Add Redis health endpoint

</code_context>

<specifics>
## Specific Ideas

- Rate limit middleware should be Express middleware applied globally with route-specific overrides
- Blacklist key format: `blacklist:{tokenHash}` with TTL matching remaining JWT lifetime
- AI cache keys follow existing CacheKeys pattern: `ai:summary:{hash}`, `ai:topics:{hash}`
- Health endpoint should return same JSON structure as /api/health/db for consistency

</specifics>

<deferred>
## Deferred Ideas

- **Full Redis sessions** — Replace JWT entirely with Redis sessions. More complex, defer unless needed.
- **Active session tracking** — Store list of active tokens per user for "logout all devices" feature. Future enhancement.
- **Rate limit bypass for authenticated users** — Higher limits for logged-in users. Future enhancement.
- **Cache warming** — Pre-populate AI caches on server start. Optimization for later.
- **Redis Cluster** — Multi-node Redis for high availability. Overkill for current scale.

</deferred>

---

*Phase: 14-redis-caching*
*Context gathered: 2026-04-22*
