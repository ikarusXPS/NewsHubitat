/**
 * Rate Limiting Middleware (D-04, D-05, D-06)
 * Sliding window rate limiting with Redis store
 */

import { rateLimit, type RateLimitRequestHandler, type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Request } from 'express';
import { CacheService } from '../services/cacheService';
import { RATE_LIMITS, type RateLimitTier } from '../config/rateLimits';
import logger from '../utils/logger';

// Extended request type with optional user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

/**
 * Key generator for IP-based limiting
 * Uses X-Forwarded-For if behind proxy, falls back to req.ip
 */
function ipKeyGenerator(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

/**
 * Key generator for user-based limiting (AI endpoints)
 * Falls back to IP if not authenticated
 */
function userKeyGenerator(req: AuthenticatedRequest): string {
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }
  // Fallback to IP for unauthenticated requests
  return ipKeyGenerator(req);
}

/**
 * Create a rate limiter with Redis store (D-04: sliding window)
 */
export function createLimiter(
  tier: RateLimitTier,
  overrides?: Partial<Options>
): RateLimitRequestHandler {
  const config = RATE_LIMITS[tier];
  const cacheService = CacheService.getInstance();
  const redisClient = cacheService.getClient();

  // Determine key generator based on tier config
  const keyGenerator = config.keyBy === 'user' ? userKeyGenerator : ipKeyGenerator;

  // Build store - use Redis if available, otherwise memory store
  let store: RedisStore | undefined;
  if (redisClient) {
    store = new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisClient.call(command, ...args) as Promise<RedisReply>,
      prefix: 'rl:',  // Rate limit key prefix
    });
  }

  // Build limiter options
  const options: Partial<Options> = {
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,  // Return rate limit info in headers
    legacyHeaders: false,   // Disable X-RateLimit-* headers
    keyGenerator,

    // D-06: HTTP 429 with Retry-After header
    handler: (_req, res, _next, opts) => {
      const retryAfter = Math.ceil(opts.windowMs / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter,
      });
    },

    // D-03: Skip rate limiting if Redis unavailable (graceful degradation)
    skip: () => {
      if (!cacheService.isAvailable()) {
        logger.debug('Rate limiting skipped: Redis unavailable (D-03)');
        return true;
      }
      return false;
    },

    // Use Redis store if available
    store,

    ...overrides,
  };

  return rateLimit(options);
}

// Pre-configured limiters for common use cases
export const authLimiter = createLimiter('auth');
export const aiLimiter = createLimiter('ai');
export const newsLimiter = createLimiter('news');
