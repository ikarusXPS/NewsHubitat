# Phase 14: Redis Caching - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 14-redis-caching
**Areas discussed:** Session storage strategy, Rate limiting design, AI cache migration, Docker + health checks

---

## Session Storage Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep JWT + add Redis blacklist | JWT stays stateless for most requests. Redis only stores blacklisted/revoked tokens. Best performance, minimal Redis load. | ✓ |
| Hybrid: JWT + Redis session data | JWT for auth, Redis stores session metadata (last active, active devices). More features, more Redis queries. | |
| Full Redis sessions (replace JWT) | Opaque session tokens, all state in Redis. Full control but every request hits Redis. | |
| You decide | Claude picks based on current JWT implementation | |

**User's choice:** Keep JWT + add Redis blacklist (Recommended)
**Notes:** Maintains stateless JWT benefits while enabling token revocation

---

## Blacklist Triggers

| Option | Description | Selected |
|--------|-------------|----------|
| On logout | User explicitly logs out → token goes to blacklist until expiry | ✓ |
| On password change | Password changed → all existing tokens for user blacklisted | ✓ |
| On tokenVersion bump | Admin invalidates all sessions → previous tokenVersion tokens blacklisted | ✓ |
| All of the above | Comprehensive security: logout, password change, and admin invalidation all trigger blacklist | ✓ |

**User's choice:** All of the above (Recommended)
**Notes:** Full coverage for all security-relevant events

---

## Blacklist TTL

| Option | Description | Selected |
|--------|-------------|----------|
| Match JWT expiry (7 days) | Token stays blacklisted until it would have expired naturally. No cleanup needed — Redis TTL handles it. | |
| Shorter (24 hours) | Assume most attack windows are short. Reduces Redis memory but brief vulnerability window. | |
| You decide | Claude picks based on JWT_EXPIRES_IN = '7d' in authService.ts | ✓ |

**User's choice:** You decide
**Notes:** Claude deferred — will match JWT expiry for security

---

## Graceful Degradation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, graceful degradation | Redis down → skip blacklist check, log warning, continue. Better uptime, slightly reduced security during outage. | ✓ |
| No, fail closed | Redis down → reject all auth requests. Maximum security but app unusable during Redis outage. | |
| You decide | Claude picks based on existing CacheService.isAvailable() pattern | |

**User's choice:** Yes, graceful degradation (Recommended)
**Notes:** Follows existing CacheService pattern

---

## Rate Limiting Algorithm

| Option | Description | Selected |
|--------|-------------|----------|
| Sliding window | Smooth rate limiting. 100 req/min means any 60-second window. Uses Redis INCR + EXPIRE. Industry standard. | ✓ |
| Fixed window | Simple: count resets at minute boundary. Can allow 2x burst at window edges. Easier to implement. | |
| Token bucket | Allows controlled bursts. More complex but smoother for bursty traffic patterns. | |
| You decide | Claude picks based on typical news app traffic patterns | |

**User's choice:** Sliding window (Recommended)
**Notes:** Industry standard approach

---

## Rate Limited Endpoints

| Option | Description | Selected |
|--------|-------------|----------|
| Auth endpoints (strict) | Login, register, password reset — prevent brute force. Suggestion: 5 req/min per IP | ✓ |
| AI endpoints (moderate) | /api/ai/ask, /api/analysis/clusters — expensive operations. Suggestion: 10 req/min per user | ✓ |
| News API (relaxed) | /api/news, /api/events — general browsing. Suggestion: 100 req/min per IP | ✓ |
| All of the above | Tiered limits: strict for auth, moderate for AI, relaxed for browsing | ✓ |

**User's choice:** All of the above (Recommended)
**Notes:** Tiered approach based on endpoint sensitivity

---

## Violation Response

| Option | Description | Selected |
|--------|-------------|----------|
| 429 + Retry-After header | Standard HTTP 429 Too Many Requests with Retry-After header showing seconds until reset. Client-friendly. | ✓ |
| 429 + exponential backoff suggestion | 429 response body includes recommended wait time that doubles with each violation. | |
| Silent throttling | Slow down responses instead of rejecting. Harder to detect but less transparent. | |
| You decide | Claude picks standard approach | |

**User's choice:** 429 + Retry-After header (Recommended)
**Notes:** Standard HTTP approach

---

## AI Cache Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, migrate to Redis | Summaries and topics cached in Redis. Survives server restarts. Shared across instances if you scale. | ✓ |
| Hybrid: Redis primary, Map fallback | Try Redis first, fall back to Map if unavailable. More code but resilient. | |
| Keep in-memory Maps | Current approach works. Redis for sessions/rate limiting only. Simplest change. | |
| You decide | Claude picks based on CacheService capabilities | |

**User's choice:** Yes, migrate to Redis (Recommended)
**Notes:** Better for persistence and scaling

---

## AI Cache TTLs

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current: 30min summaries, 5min topics | AI_CONFIG.cache already defines these. News changes frequently, short TTLs make sense. | |
| Longer: 1hr summaries, 15min topics | AI calls are expensive. Longer cache reduces API costs but may show stale analysis. | |
| Shorter: 15min summaries, 2min topics | Fresher analysis but more AI API calls and costs. | |
| You decide | Claude picks based on news freshness vs. cost tradeoff | ✓ |

**User's choice:** You decide
**Notes:** Claude deferred — will evaluate current settings

---

## Docker Compose Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Add Redis service to existing docker-compose.yml | Extend Phase 13's docker-compose.yml with Redis service. Single file, simple local dev. | ✓ |
| Separate docker-compose.redis.yml | Override file: `docker-compose -f docker-compose.yml -f docker-compose.redis.yml up`. More flexible but complex. | |
| You decide | Claude picks based on existing docker-compose.yml structure | |

**User's choice:** Add Redis service to existing docker-compose.yml (Recommended)
**Notes:** Keep it simple

---

## Redis Health Endpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, /api/health/redis | Separate endpoint for Redis health. Returns connection status, key count, memory usage. Useful for monitoring. | ✓ |
| Extend /api/health to include Redis | Single health endpoint reports both DB and Redis status. Simpler but less granular. | |
| No dedicated endpoint | CacheService.getStats() exists for programmatic access. No HTTP endpoint needed. | |
| You decide | Claude picks based on existing /api/health/db pattern | |

**User's choice:** Yes, /api/health/redis (Recommended)
**Notes:** Follows existing pattern from Phase 13

---

## Claude's Discretion

- Blacklist TTL decision
- AI cache TTL decision
- Redis version selection
- Redis persistence configuration
- Docker volume naming

## Deferred Ideas

- Full Redis sessions (replace JWT)
- Active session tracking per user
- Rate limit bypass for authenticated users
- Cache warming on server start
- Redis Cluster for HA
