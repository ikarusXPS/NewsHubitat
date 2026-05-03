/**
 * iTunes Search API wrapper (Phase 40-03 / CONT-03 / D-B1).
 *
 * No auth required (public endpoint). Soft ~20 req/min/IP rate limit, so we
 * enforce an in-process min-gap throttle (100ms) and 24h cache by (country, term).
 *
 * Pitfall 6: results are inconsistent without `country=` — we always pass it
 * (default 'US' for English; callers pass 'DE' / 'FR' per detected article
 * language).
 *
 * Graceful degradation: 429 → [] + warn-log; non-2xx → [] + warn-log;
 * network error → [] + error-log. Never throws.
 */

import crypto from 'crypto';
import logger from '../utils/logger';
import { CacheService, CACHE_TTL } from './cacheService';

const ITUNES_BASE = 'https://itunes.apple.com/search';
const USER_AGENT = 'NewsHub/2.0 (https://newshub.example)';
const MIN_GAP_MS = 100;

export interface ItunesPodcast {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  feedUrl?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  country?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  trackCount?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ItunesPodcastService {
  private static instance: ItunesPodcastService;
  private readonly cacheService = CacheService.getInstance();
  private lastFetchAt = 0;

  private constructor() {}

  static getInstance(): ItunesPodcastService {
    if (!ItunesPodcastService.instance) {
      ItunesPodcastService.instance = new ItunesPodcastService();
    }
    return ItunesPodcastService.instance;
  }

  /**
   * Search iTunes for podcasts. Country defaults to 'US' (Pitfall 6).
   * Cached 24h by (country, sha1(term|limit)).
   */
  async searchPodcasts(term: string, country = 'US', limit = 10): Promise<ItunesPodcast[]> {
    const cacheKey = this.makeCacheKey(country, term, limit);
    const cached = await this.safeCacheGet<ItunesPodcast[]>(cacheKey);
    if (cached) return cached;

    await this.waitForSlot();

    const url =
      `${ITUNES_BASE}?` +
      new URLSearchParams({
        term,
        country,
        media: 'podcast',
        entity: 'podcast',
        limit: String(limit),
      }).toString();

    let res: Response;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      this.lastFetchAt = Date.now();
    } catch (err) {
      logger.error(`iTunes Search network error: ${(err as Error).message}`);
      return [];
    }

    if (res.status === 429) {
      logger.warn('iTunes Search 429 — backing off');
      return [];
    }
    if (!res.ok) {
      logger.warn(`iTunes Search returned ${res.status}`);
      return [];
    }

    let body: { results?: ItunesPodcast[] };
    try {
      body = (await res.json()) as { results?: ItunesPodcast[] };
    } catch (err) {
      logger.error(`iTunes Search JSON parse error: ${(err as Error).message}`);
      return [];
    }

    const results = body.results ?? [];
    await this.safeCacheSet(cacheKey, results, CACHE_TTL.DAY);
    return results;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────────

  private async waitForSlot(): Promise<void> {
    const elapsed = Date.now() - this.lastFetchAt;
    if (this.lastFetchAt === 0) return;
    if (elapsed < MIN_GAP_MS) {
      await sleep(MIN_GAP_MS - elapsed);
    }
  }

  private makeCacheKey(country: string, term: string, limit: number): string {
    const hash = crypto.createHash('sha1').update(`${term}|${limit}`).digest('hex');
    return `itunes:search:${country}:${hash}`;
  }

  private async safeCacheGet<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheService.get<T>(key);
    } catch {
      return null;
    }
  }

  private async safeCacheSet<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await this.cacheService.set(key, value, ttl);
    } catch {
      // non-fatal
    }
  }
}
