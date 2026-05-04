/**
 * YouTube Data API daily quota gate (Phase 40-05 / Q-03 / D-D1).
 *
 * Mirrors `aiTierLimiter` (rateLimiter.ts:115-174) Redis-store semantics —
 * INCR + EXPIREAT pattern, graceful skip when Redis is unavailable —
 * but exposes a plain async function rather than Express middleware. The
 * gate runs from inside `videoIndexService.ts` before each YouTube
 * Data API search.list call, NOT from a route handler.
 *
 * Cap: 50 search.list calls per UTC day. At 100 quota units per search,
 * that's 5,000 of the 10,000 free daily quota — leaves headroom for the
 * worker job's batched videos.list calls per Pitfall 3.
 *
 * Returns:
 *   - true  → caller may proceed (quota available, OR Redis down)
 *   - false → caller must fall back to local-only result
 */

import { CacheService } from '../services/cacheService';
import logger from '../utils/logger';

const QUOTA_KEY = (date: string): string => `youtube:quota:${date}`;

/** Daily cap on quota-spending YouTube Data API search.list calls (D-D1). */
export const YOUTUBE_DAILY_CAP = 50;

/**
 * Atomically increment today's counter (UTC) and report whether the call
 * is still under cap. First increment of the day also pins an EXPIREAT
 * to next-UTC-midnight so stale keys don't accumulate forever.
 *
 * @returns `true` if the caller may proceed, `false` if the daily cap is
 *          exhausted. Redis-down → `true` (graceful degradation, mirrors
 *          rateLimiter.ts:137-141).
 */
export async function checkAndConsumeQuota(): Promise<boolean> {
  const cache = CacheService.getInstance();
  const client = cache.getClient();
  if (!client) {
    logger.debug('youtubeQuota skipped: Redis unavailable');
    return true;
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = QUOTA_KEY(today);

  const count = await client.incr(key);

  if (count === 1) {
    // First increment of the day: pin expiry to next-UTC-midnight.
    // The key prefix from CacheService (`newshub:`) is auto-applied by
    // ioredis, so we pass the un-prefixed key as-is.
    const tomorrowMidnight = Math.floor(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
      ) / 1000,
    );
    await client.expireat(key, tomorrowMidnight);
  }

  const ok = count <= YOUTUBE_DAILY_CAP;
  if (!ok) {
    logger.warn(
      `youtubeQuota: daily cap (${YOUTUBE_DAILY_CAP}) reached for ${today}; falling back to local-only`,
    );
  }
  return ok;
}
