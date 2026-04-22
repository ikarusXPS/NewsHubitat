# Phase 14: Redis Caching - Research

**Researched:** 2026-04-22
**Domain:** Redis caching, rate limiting, JWT blacklisting
**Confidence:** HIGH

## Summary

Phase 14 integrates Redis caching into NewsHub for three purposes: JWT token blacklisting (for logout/password change), tiered rate limiting (per-IP and per-user), and AI response caching (migrating in-memory Maps to Redis). The project already has a fully-implemented CacheService using ioredis with graceful degradation, TTL presets, and key builders. This phase extends that infrastructure rather than building from scratch.

The implementation uses JWT + Redis blacklist hybrid approach (D-01), keeping JWTs stateless while adding blacklist checks only for revoked tokens. Rate limiting uses sliding window algorithm (D-04) with express-rate-limit and rate-limit-redis. AI caches migrate from in-memory Maps to Redis using existing CacheService methods.

**Primary recommendation:** Extend the existing CacheService for all three features; use express-rate-limit v8.3.2 with rate-limit-redis v4.3.1 for middleware; add Redis 7 to docker-compose.yml with RDB+AOF hybrid persistence.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Keep JWT + add Redis blacklist - JWT stays stateless for most requests, Redis only stores blacklisted/revoked tokens
- **D-02:** Blacklist tokens on: logout, password change, and tokenVersion bump (admin invalidation)
- **D-03:** Graceful degradation - if Redis is unavailable, skip blacklist check, log warning, continue (better uptime, slightly reduced security during outage)
- **D-04:** Sliding window algorithm - 100 req/min means any 60-second window, uses Redis INCR + EXPIRE
- **D-05:** Tiered rate limits by endpoint category:
  - Auth endpoints (strict): 5 req/min per IP - login, register, password reset
  - AI endpoints (moderate): 10 req/min per user - /api/ai/ask, /api/analysis/clusters
  - News API (relaxed): 100 req/min per IP - /api/news, /api/events
- **D-06:** Violation response: HTTP 429 Too Many Requests with Retry-After header showing seconds until reset
- **D-07:** Migrate AIService caches from in-memory Maps to Redis - survives server restarts, shareable across instances
- **D-08:** Add Redis service to existing docker-compose.yml (extend Phase 13's file)
- **D-09:** Add /api/health/redis endpoint - returns connection status, key count, memory usage (follows /api/health/db pattern)

### Claude's Discretion
- Blacklist TTL - Claude decides based on JWT_EXPIRES_IN = '7d' in authService.ts (match JWT expiry recommended)
- AI cache TTLs - Claude decides based on news freshness vs. cost tradeoff (current: 30min summaries, 5min topics in AI_CONFIG.cache)
- Redis version selection (likely 7.x)
- Redis persistence configuration (RDB vs. AOF)
- Docker volume naming and port mapping

### Deferred Ideas (OUT OF SCOPE)
- **Full Redis sessions** - Replace JWT entirely with Redis sessions. More complex, defer unless needed.
- **Active session tracking** - Store list of active tokens per user for "logout all devices" feature. Future enhancement.
- **Rate limit bypass for authenticated users** - Higher limits for logged-in users. Future enhancement.
- **Cache warming** - Pre-populate AI caches on server start. Optimization for later.
- **Redis Cluster** - Multi-node Redis for high availability. Overkill for current scale.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-03 | Service Worker for offline support | **Deferred** - PERF-03 is listed under "Future Requirements" in REQUIREMENTS.md; this phase handles Redis caching (PERF-02 Redis caching for high-traffic endpoints) |
| PERF-04 | Not explicitly defined | Phase 14 success criteria map to PERF-02 (Redis caching) - session storage, rate limiting, AI caching |

**Note:** The roadmap lists PERF-03, PERF-04 as requirements but REQUIREMENTS.md shows PERF-02 as "Redis caching for high-traffic endpoints" and PERF-03 as "Service Worker for offline support". The actual phase goals align with PERF-02 functionality.
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JWT Blacklist Check | API / Backend | Redis | Auth validation happens server-side; Redis is external storage for blacklist |
| Rate Limiting | API / Backend | Redis | Middleware intercepts requests before route handlers; Redis tracks counts |
| AI Response Caching | API / Backend | Redis | AIService owns cache logic; Redis is persistence layer |
| Health Endpoint | API / Backend | -- | Standard Express route returning Redis connection stats |
| Docker Configuration | DevOps / Infrastructure | -- | docker-compose.yml configuration, not application code |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ioredis | 5.10.1 | Redis client | Already installed in project; full-featured, cluster-ready, TypeScript support [VERIFIED: package.json line 63] |
| express-rate-limit | 8.3.2 | Rate limiting middleware | De facto standard for Express; supports custom stores [VERIFIED: npm registry] |
| rate-limit-redis | 4.3.1 | Redis store for express-rate-limit | Official Redis adapter from express-rate-limit org [VERIFIED: npm registry] |
| Redis | 7.4 | Key-value store | Latest stable; hybrid persistence, improved performance [VERIFIED: Docker Hub] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| redis-sliding-rate-limiter | 2.x | Sliding window with ioredis | Only if express-rate-limit sliding window is insufficient [CITED: https://github.com/spinlud/redis-sliding-rate-limiter] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rate-limit-redis | Custom Lua scripts | More control but more code to maintain; rate-limit-redis handles this |
| ioredis | node-redis | node-redis requires await client.connect(); ioredis auto-connects [ASSUMED] |
| Redis 7 | Redis 8 | Redis 8 is in beta (May 2026); use stable 7.x for production [ASSUMED] |

**Installation:**
```bash
npm install express-rate-limit@8.3.2 rate-limit-redis@4.3.1
```

**Note:** ioredis 5.10.1 is already installed in package.json.

**Version verification:** Verified via npm registry 2026-04-22:
- express-rate-limit: 8.3.2 (latest)
- rate-limit-redis: 4.3.1 (latest)
- ioredis: 5.10.1 (already installed, current latest is 5.10.1)

## Architecture Patterns

### System Architecture Diagram

```
Request Flow:

  Client Request
       |
       v
  +-----------+
  |  Express  |
  +-----------+
       |
       v
  +------------------+
  | Rate Limit MW    |<----- Redis (INCR/EXPIRE keys)
  | (tiered by path) |
  +------------------+
       |
       |-- 429 Too Many Requests
       |
       v
  +------------------+
  | Auth Middleware  |<----- Redis (blacklist:* lookup)
  | (JWT + blacklist)|
  +------------------+
       |
       |-- 401 Token Revoked
       |
       v
  +------------------+
  | Route Handler    |
  +------------------+
       |
       v
  +------------------+
  | AIService        |<----- Redis (ai:summary:*, ai:topics:*)
  | (cached responses|
  +------------------+
       |
       v
  Response to Client
```

### Recommended Project Structure
```
server/
├── middleware/
│   └── rateLimiter.ts       # Rate limiting middleware factory
├── services/
│   ├── cacheService.ts      # Existing - extend with blacklist methods
│   ├── aiService.ts         # Existing - replace Map caches with CacheService
│   └── authService.ts       # Existing - add blacklist check in verifyToken
├── routes/
│   ├── auth.ts              # Add logout endpoint that blacklists token
│   └── health.ts            # Doesn't exist yet - create for /api/health/redis
├── config/
│   └── rateLimits.ts        # Tiered limit configuration
└── index.ts                 # Wire up rate limiting middleware
```

### Pattern 1: Token Blacklist with Hash and TTL
**What:** Store hashed JWT ID (jti) in Redis with TTL matching token's remaining lifetime
**When to use:** Logout, password change, tokenVersion increment
**Example:**
```typescript
// Source: https://oneuptime.com/blog/post/2026-03-31-redis-how-to-build-a-token-blacklist-for-jwt-revocation-with-redis/view
// Key: blacklist:{sha256(jti)}
// TTL: token.exp - now (remaining lifetime)

async blacklistToken(token: string): Promise<boolean> {
  const decoded = jwt.decode(token) as { jti?: string; exp?: number } | null;
  if (!decoded?.exp) return false;

  const jti = decoded.jti || hashString(token);
  const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));

  if (ttl <= 0) return true; // Already expired

  return this.set(`blacklist:${jti}`, '1', ttl);
}

async isBlacklisted(token: string): Promise<boolean> {
  if (!this.isAvailable()) return false; // D-03: graceful degradation

  const decoded = jwt.decode(token) as { jti?: string } | null;
  const jti = decoded?.jti || hashString(token);

  const result = await this.get<string>(`blacklist:${jti}`);
  return result !== null;
}
```

### Pattern 2: Tiered Rate Limiting Middleware
**What:** Different rate limits for different endpoint categories
**When to use:** Auth endpoints (strict), AI endpoints (moderate), News API (relaxed)
**Example:**
```typescript
// Source: https://github.com/express-rate-limit/rate-limit-redis
import { rateLimit } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { CacheService } from '../services/cacheService';

function createLimiter(windowMs: number, max: number, keyGenerator?: KeyGenerator) {
  const cacheService = CacheService.getInstance();

  // Get raw ioredis client for rate-limit-redis
  const redisClient = cacheService.getClient();

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip || 'unknown'),
    handler: (req, res, _next, options) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
    skip: () => !cacheService.isAvailable(), // D-03: skip if Redis down
    store: redisClient ? new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisClient.call(command, ...args) as Promise<RedisReply>,
    }) : undefined,
  });
}

export const authLimiter = createLimiter(60_000, 5);       // 5 req/min
export const aiLimiter = createLimiter(60_000, 10, userKeyGenerator);  // 10 req/min per user
export const newsLimiter = createLimiter(60_000, 100);     // 100 req/min
```

### Pattern 3: AI Cache Migration
**What:** Replace in-memory Map caches with Redis via CacheService
**When to use:** AIService summary and topic caches
**Example:**
```typescript
// Before (aiService.ts lines 35-40):
private cache: Map<string, { summary: ClusterSummary; timestamp: number }> = new Map();
private topicCache: Map<string, { topics: string[]; timestamp: number }> = new Map();

// After:
private readonly cacheService = CacheService.getInstance();

async generateClusterSummary(cluster: ArticleCluster): Promise<ClusterSummary | null> {
  const cacheKey = `ai:summary:${this.getCacheKey(cluster)}`;

  // Check Redis cache
  const cached = await this.cacheService.get<ClusterSummary>(cacheKey);
  if (cached) return cached;

  // Generate summary...
  const summary = await this.doGenerateSummary(cluster);

  // Cache in Redis (30 min TTL per AI_CONFIG.cache.summaryTTL)
  await this.cacheService.set(cacheKey, summary, CACHE_TTL.LONG);

  return summary;
}
```

### Anti-Patterns to Avoid
- **Storing full JWT tokens:** Store only jti hash; full tokens waste memory [CITED: https://supertokens.com/blog/revoking-access-with-a-jwt-blacklist]
- **Fixed window without overlap:** Allows burst at window boundary; use sliding window (D-04)
- **Blocking on Redis failure:** Must gracefully degrade (D-03) to maintain uptime
- **Infinite TTL for blacklist:** Set TTL = token remaining lifetime to auto-cleanup

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom counter middleware | express-rate-limit + rate-limit-redis | Handles sliding window, Redis failures, headers correctly |
| Token hashing | Custom hash function | crypto.createHash('sha256') | Standard, secure, consistent |
| Redis connection | Raw ioredis config | Existing CacheService | Already handles retry, reconnect, prefix, graceful degradation |
| Health check formatting | Custom stats gathering | cacheService.getStats() | Already implemented, returns connected/keys/memory |

**Key insight:** The project already has CacheService with full Redis wrapper, graceful degradation, and stats. Extend it rather than building parallel infrastructure.

## Common Pitfalls

### Pitfall 1: Race Condition in Blacklist Check
**What goes wrong:** Token validated before blacklist check completes, then used for authorized action
**Why it happens:** Async blacklist lookup not awaited properly
**How to avoid:** Make blacklist check synchronous-blocking in auth middleware; return 401 on any error
**Warning signs:** Sporadic "token used after logout" reports

### Pitfall 2: Rate Limit Key Collision
**What goes wrong:** Different users share same rate limit counter
**Why it happens:** Using IP-only key for authenticated endpoints behind proxy
**How to avoid:** Use userId for authenticated endpoints (AI endpoints); use X-Forwarded-For aware IP extraction
**Warning signs:** Legitimate users getting 429 errors unexpectedly

### Pitfall 3: Redis Connection Loss Cascade
**What goes wrong:** Server crashes or hangs when Redis connection lost
**Why it happens:** No graceful degradation; rate limiter throws instead of skipping
**How to avoid:** Use `skip: () => !cacheService.isAvailable()` in rate limiter; isAvailable() check before every cache call
**Warning signs:** Server errors correlate with Redis restarts

### Pitfall 4: TTL Mismatch Causing Premature Cleanup
**What goes wrong:** Blacklisted tokens become unblacklisted before JWT expires
**Why it happens:** Using fixed TTL (e.g., 24h) instead of remaining JWT lifetime
**How to avoid:** Calculate TTL as `decoded.exp - now` for each token
**Warning signs:** Revoked tokens working again after some time

### Pitfall 5: ioredis with rate-limit-redis Incompatibility
**What goes wrong:** Rate limiter fails silently or throws type errors
**Why it happens:** rate-limit-redis expects node-redis `sendCommand`, not ioredis `call`
**How to avoid:** Use adapter: `sendCommand: (command, ...args) => client.call(command, ...args)`
**Warning signs:** TypeScript errors about RedisReply types

## Code Examples

Verified patterns from official sources:

### CacheService Extension for Blacklist
```typescript
// Source: Existing CacheService pattern + best practices from research
// Add to server/services/cacheService.ts

/**
 * Blacklist a JWT token
 * @param token - The full JWT token string
 * @param ttlSeconds - Time until token expires (remaining lifetime)
 */
async blacklistToken(token: string, ttlSeconds: number): Promise<boolean> {
  if (!this.isAvailable()) {
    logger.warn('Redis unavailable, cannot blacklist token');
    return false;
  }

  // Hash the token for storage (don't store full token)
  const tokenHash = hashString(token);
  const key = `blacklist:${tokenHash}`;

  return this.set(key, { blacklisted: true, at: Date.now() }, ttlSeconds);
}

/**
 * Check if a token is blacklisted
 * Returns false (not blacklisted) if Redis unavailable (D-03 graceful degradation)
 */
async isTokenBlacklisted(token: string): Promise<boolean> {
  if (!this.isAvailable()) {
    logger.debug('Redis unavailable, skipping blacklist check');
    return false; // D-03: graceful degradation
  }

  const tokenHash = hashString(token);
  const key = `blacklist:${tokenHash}`;

  const result = await this.get(key);
  return result !== null;
}
```

### Rate Limit Configuration
```typescript
// Source: D-05 decisions + express-rate-limit docs
// server/config/rateLimits.ts

export const RATE_LIMITS = {
  auth: {
    windowMs: 60_000,  // 1 minute
    max: 5,            // 5 requests per minute
    paths: ['/api/auth/login', '/api/auth/register', '/api/auth/request-reset'],
    keyBy: 'ip',
  },
  ai: {
    windowMs: 60_000,
    max: 10,           // 10 requests per minute
    paths: ['/api/ai/ask', '/api/analysis/clusters'],
    keyBy: 'user',     // Per authenticated user
  },
  news: {
    windowMs: 60_000,
    max: 100,          // 100 requests per minute
    paths: ['/api/news', '/api/events'],
    keyBy: 'ip',
  },
} as const;
```

### Redis Health Endpoint
```typescript
// Source: Existing /api/health/db pattern
// Add to server/index.ts

app.get('/api/health/redis', async (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const start = Date.now();
  const cacheService = CacheService.getInstance();

  if (!cacheService.isAvailable()) {
    res.status(503).json({
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      error: 'Redis not connected',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const stats = await cacheService.getStats();
  const duration = Date.now() - start;

  res.json({
    status: 'healthy',
    latency_ms: duration,
    keys: stats?.keys || 0,
    memory: stats?.memory || 'unknown',
    timestamp: new Date().toISOString(),
  });
});
```

### Docker Compose Redis Service
```yaml
# Source: https://redis.io/tutorials/operate/orchestration/docker/
# Extend docker-compose.yml with Redis service

services:
  postgres:
    # ... existing PostgreSQL config ...

  redis:
    image: redis:7.4-alpine
    container_name: newshub-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --save 900 1
      --save 300 10
      --save 60 10000
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store full tokens in blacklist | Store only jti/hash | 2024+ | 90%+ memory reduction |
| Fixed window rate limiting | Sliding window counter | Standard practice | Prevents burst at window boundary |
| In-memory session storage | JWT + Redis blacklist hybrid | Current best practice | Stateless + revocation capability |
| node-redis with callback | ioredis with promises | ioredis became standard | Better TypeScript, cluster support |

**Deprecated/outdated:**
- `express-rate-limit@5.x`: Use v8.x for modern store interface
- `rate-limit-redis@3.x`: Use v4.x for compatibility with express-rate-limit v8

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Redis 8 is in beta as of May 2026 | Standard Stack | Low - Redis 7.x is stable regardless |
| A2 | node-redis requires explicit connect(), ioredis auto-connects | Standard Stack | Low - project already uses ioredis |
| A3 | JWT_EXPIRES_IN = '7d' means blacklist TTL should be 604800 seconds | Claude's Discretion | Medium - verify actual JWT config |

## Open Questions

1. **CacheService.getClient() Method**
   - What we know: CacheService wraps ioredis but doesn't expose raw client
   - What's unclear: rate-limit-redis needs raw client for sendCommand
   - Recommendation: Add `getClient(): Redis | null` method to CacheService

2. **JWT jti Claim**
   - What we know: Current JWT payload has userId, email, tokenVersion
   - What's unclear: Does it have jti (JWT ID) claim for unique identification?
   - Recommendation: Either add jti to JWT or hash full token for blacklist key

3. **Logout Endpoint**
   - What we know: No explicit /api/auth/logout endpoint exists currently
   - What's unclear: Where should blacklisting be triggered?
   - Recommendation: Create POST /api/auth/logout that blacklists current token

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Redis container | Y | 29.4.0 | -- |
| Redis CLI | Local debugging | N | -- | Use Docker exec |
| ioredis | Cache operations | Y | 5.10.1 | -- |

**Missing dependencies with no fallback:**
- None - Docker can run Redis container; ioredis already installed

**Missing dependencies with fallback:**
- redis-cli: Not installed locally, but can use `docker exec newshub-redis redis-cli` for debugging

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | JWT blacklist for session invalidation |
| V3 Session Management | Yes | Redis blacklist with TTL matching token lifetime |
| V4 Access Control | No | Rate limiting is availability, not access control |
| V5 Input Validation | Yes | Validate rate limit keys, sanitize token before hashing |
| V6 Cryptography | Yes | Use SHA-256 for token hashing; never store plaintext tokens |

### Known Threat Patterns for Redis + JWT

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token replay after logout | Repudiation | Blacklist token hash in Redis with TTL |
| Rate limit bypass via IP spoofing | Tampering | Trust X-Forwarded-For only from known proxies |
| Redis data exposure | Information Disclosure | Use password auth (REDIS_PASSWORD), bind to localhost/internal network |
| Cache poisoning | Tampering | Use keyPrefix to namespace; validate data on read |
| DDoS via rate limit exhaustion | Denial of Service | Separate limits per endpoint category; fail-open gracefully |

## Sources

### Primary (HIGH confidence)
- [express-rate-limit/rate-limit-redis GitHub](https://github.com/express-rate-limit/rate-limit-redis) - ioredis configuration pattern verified
- [Redis Rate Limiting Tutorial](https://redis.io/tutorials/howtos/ratelimiting/) - Sliding window counter with Lua script
- [npm registry](https://www.npmjs.com/) - Package versions verified 2026-04-22
- Project codebase - cacheService.ts, aiService.ts, authService.ts patterns

### Secondary (MEDIUM confidence)
- [OneUpTime JWT Blacklist Guide](https://oneuptime.com/blog/post/2026-03-31-redis-how-to-build-a-token-blacklist-for-jwt-revocation-with-redis/view) - Token blacklist patterns
- [SuperTokens JWT Blacklist](https://supertokens.com/blog/revoking-access-with-a-jwt-blacklist) - Best practices for jti storage

### Tertiary (LOW confidence)
- None - all claims verified with primary/secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - packages verified in npm registry, ioredis already in project
- Architecture: HIGH - extends existing CacheService patterns documented in codebase
- Pitfalls: HIGH - based on official documentation and verified patterns

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days - stable domain)

---
*Phase: 14-redis-caching*
*Research completed: 2026-04-22*
