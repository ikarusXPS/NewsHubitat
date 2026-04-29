/**
 * Rate Limit Configuration (D-05)
 * Tiered limits by endpoint category
 */

export const RATE_LIMITS = {
  /**
   * Auth endpoints (strict) - 5 req/min per IP
   * Protects against brute force attacks
   */
  auth: {
    windowMs: 60_000,  // 1 minute
    max: 5,
    keyBy: 'ip' as const,
    paths: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/request-reset',
      '/api/auth/reset-password',
    ],
  },

  /**
   * AI endpoints (moderate) - 10 req/min per user
   * Limits AI API costs while allowing reasonable usage
   */
  ai: {
    windowMs: 60_000,
    max: 10,
    keyBy: 'user' as const,
    paths: [
      '/api/ai/ask',
      '/api/analysis/clusters',
      '/api/analysis/framing',
    ],
  },

  /**
   * News API (relaxed) - 100 req/min per IP
   * Allows normal browsing while preventing scraping
   */
  news: {
    windowMs: 60_000,
    max: 100,
    keyBy: 'ip' as const,
    paths: [
      '/api/news',
      '/api/events',
      '/api/markets',
    ],
  },

  /**
   * Comment endpoints (moderate) - 5 req/min per user (Phase 27)
   * Prevents spam while allowing rapid-fire discussions
   */
  comment: {
    windowMs: 60_000,
    max: 5,
    keyBy: 'user' as const,
    paths: [
      '/api/comments',
      '/api/comments/:id/edit',
      '/api/comments/:id/flag',
    ],
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

/**
 * Public API tier limits (D-15)
 * Applied via API key middleware - separate from internal rate limits
 */
export const API_TIER_LIMITS = {
  /**
   * Free tier - 10 requests per minute
   * For evaluation and low-volume use cases
   */
  free: {
    windowMs: 60_000,  // 1 minute
    max: 10,
    description: 'Free tier: 10 requests per minute',
  },
  /**
   * Pro tier - 100 requests per minute
   * For production applications
   */
  pro: {
    windowMs: 60_000,
    max: 100,
    description: 'Pro tier: 100 requests per minute',
  },
} as const;

export type ApiTier = keyof typeof API_TIER_LIMITS;
