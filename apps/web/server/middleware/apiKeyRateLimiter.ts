/**
 * API Key Tiered Rate Limiter (Phase 35, Plan 03)
 *
 * Rate limiter for public API endpoints with tier-based limits.
 * Uses Redis sliding window algorithm for distributed rate limiting.
 *
 * D-12: Store tier on ApiKey model, lookup from Redis-cached key metadata
 * D-13: Use standard RateLimit headers per IETF draft
 * D-14: Use sliding window algorithm (express-rate-limit + Redis)
 * D-15: Free tier: 10 req/min, Pro tier: 100 req/min
 */
import { rateLimit, type RateLimitRequestHandler, type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Response } from 'express';
import { CacheService } from '../services/cacheService';
import type { ApiKeyRequest } from './apiKeyAuth';
import type { ApiKeyTier } from '../services/apiKeyService';
import logger from '../utils/logger';

/**
 * Tier-based rate limits per D-15.
 * Applied per API key ID (not per IP).
 */
const TIER_LIMITS: Record<ApiKeyTier, number> = {
  free: 10,   // 10 requests per minute
  pro: 100,   // 100 requests per minute
};

/**
 * Create tiered rate limiter for API key-authenticated endpoints.
 *
 * Features:
 * - Dynamic max based on tier (D-12)
 * - Keys by API key ID, not IP (prevents NAT/VPN issues)
 * - IETF-compliant RateLimit-* headers (D-13)
 * - Sliding window via Redis (D-14)
 * - Graceful degradation when Redis unavailable
 *
 * Usage:
 * ```typescript
 * const apiKeyLimiter = createApiKeyLimiter();
 * app.use('/api/v1/public', apiKeyAuth, apiKeyLimiter, publicApiRoutes);
 * ```
 */
export function createApiKeyLimiter(): RateLimitRequestHandler {
  const cacheService = CacheService.getInstance();
  const redisClient = cacheService.getClient();

  // Build Redis store for distributed rate limiting
  let store: RedisStore | undefined;
  if (redisClient) {
    store = new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisClient.call(command, ...args) as Promise<RedisReply>,
      prefix: 'rl:api:',  // Separate namespace from internal rate limits
    });
  }

  const options: Partial<Options> = {
    windowMs: 60_000,  // 1 minute window

    // D-12: Dynamic max based on tier
    max: async (req: ApiKeyRequest) => {
      const tier = req.apiKey?.tier || 'free';
      return TIER_LIMITS[tier];
    },

    // Key by API key ID (not IP) - prevents NAT/VPN issues
    keyGenerator: (req: ApiKeyRequest) => {
      return req.apiKey?.keyId || 'anonymous';
    },

    // D-14: Use Redis store for sliding window
    store,

    // D-13: IETF RateLimit headers
    standardHeaders: true,   // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
    legacyHeaders: false,    // No X-RateLimit-* headers

    // Custom 429 response with upgrade info
    handler: (req: ApiKeyRequest, res: Response) => {
      const tier = req.apiKey?.tier || 'free';
      const limit = TIER_LIMITS[tier];
      const retryAfter = 60;  // 1 minute window

      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        tier,
        limit,
        window: '1 minute',
        upgradeUrl: '/pricing',
      });
    },

    // Graceful degradation: skip rate limiting if Redis unavailable
    skip: () => {
      if (!cacheService.isAvailable()) {
        logger.debug('API rate limiting skipped: Redis unavailable');
        return true;
      }
      return false;
    },
  };

  return rateLimit(options);
}

/**
 * Pre-configured API key rate limiter instance.
 * Use this for mounting on public API routes.
 */
export const apiKeyLimiter = createApiKeyLimiter();
