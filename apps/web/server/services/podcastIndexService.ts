/**
 * Podcast Index API wrapper (Phase 40-03 / CONT-03 / D-B1).
 *
 * Wraps the Podcast Index Open API with HMAC SHA-1 authentication
 * (sha1(KEY + SECRET + unixTimeSeconds), lowercase hex).
 *
 * Graceful degradation: when env vars are absent, every public method returns
 * an empty array and warn-logs once. Mirrors the cacheService.isAvailable()
 * skip behavior so a single missing key never crashes the request path.
 *
 * Threat T-40-03-01 mitigation: API key/secret values are never passed to the
 * logger. Constructor warn-logs the absence of a value, never the value itself.
 *
 * Caching: Each searchEpisodes/searchPodcasts call is keyed by sha1(query|max)
 * with a 1-hour TTL via CacheService. Mirrors aiService.ts's cache-first pattern.
 */

import crypto from 'crypto';
import logger from '../utils/logger';
import { CacheService, CACHE_TTL } from './cacheService';

const PODCAST_INDEX_BASE = 'https://api.podcastindex.org/api/1.0';
const USER_AGENT = 'NewsHub/2.0 (https://newshub.example)';

export interface PodcastIndexEpisode {
  id?: number;
  title?: string;
  description?: string;
  enclosureUrl?: string;
  audioUrl?: string;
  datePublished?: number; // unix seconds
  duration?: number;
  feedTitle?: string;
  feedId?: number;
  feedImage?: string;
  transcriptUrl?: string;
  podcastGuid?: string;
  guid?: string;
}

export interface PodcastIndexPodcast {
  id?: number;
  title?: string;
  description?: string;
  url?: string; // RSS feed URL
  podcastGuid?: string;
  image?: string;
  artwork?: string;
  language?: string;
}

export class PodcastIndexService {
  private static instance: PodcastIndexService;
  private readonly key = process.env.PODCAST_INDEX_API_KEY ?? '';
  private readonly secret = process.env.PODCAST_INDEX_API_SECRET ?? '';
  private readonly cacheService = CacheService.getInstance();

  private constructor() {
    if (!this.key || !this.secret) {
      // Never log the actual key/secret values — only their absence.
      logger.warn(
        'PodcastIndexService: PODCAST_INDEX_API_KEY/SECRET not set — service will return empty results',
      );
    }
  }

  static getInstance(): PodcastIndexService {
    if (!PodcastIndexService.instance) {
      PodcastIndexService.instance = new PodcastIndexService();
    }
    return PodcastIndexService.instance;
  }

  /**
   * Search Podcast Index by term and return up to `max` matching items.
   * Uses /search/byterm with fulltext=. Returns [] on auth/network failure.
   */
  async searchEpisodes(query: string, max = 10): Promise<PodcastIndexEpisode[]> {
    if (!this.key || !this.secret) return [];
    const cacheKey = this.makeCacheKey('search', query, max);
    const cached = await this.safeCacheGet<PodcastIndexEpisode[]>(cacheKey);
    if (cached) return cached;

    const data = await this.piFetch('/search/byterm', { q: query, max: String(max), fulltext: '' });
    if (!data) return [];

    const items = (data.items as PodcastIndexEpisode[] | undefined)
      ?? (data.feeds as PodcastIndexEpisode[] | undefined)
      ?? [];
    await this.safeCacheSet(cacheKey, items, CACHE_TTL.HOUR);
    return items;
  }

  /**
   * Search Podcast Index by term and return up to `max` matching podcasts (feeds).
   */
  async searchPodcasts(query: string, max = 10): Promise<PodcastIndexPodcast[]> {
    if (!this.key || !this.secret) return [];
    const cacheKey = this.makeCacheKey('podcasts', query, max);
    const cached = await this.safeCacheGet<PodcastIndexPodcast[]>(cacheKey);
    if (cached) return cached;

    const data = await this.piFetch('/search/byterm', { q: query, max: String(max) });
    if (!data) return [];

    const feeds = (data.feeds as PodcastIndexPodcast[] | undefined) ?? [];
    await this.safeCacheSet(cacheKey, feeds, CACHE_TTL.HOUR);
    return feeds;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────────

  private async piFetch(
    path: string,
    params: Record<string, string>,
  ): Promise<Record<string, unknown> | null> {
    const apiHeaderTime = Math.floor(Date.now() / 1000).toString();
    const authorization = crypto
      .createHash('sha1')
      .update(this.key + this.secret + apiHeaderTime)
      .digest('hex');

    const url = `${PODCAST_INDEX_BASE}${path}?${new URLSearchParams(params).toString()}`;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'X-Auth-Date': apiHeaderTime,
          'X-Auth-Key': this.key,
          Authorization: authorization,
        },
      });
    } catch (err) {
      // Never log the secret/key — only the error message.
      logger.error(`PodcastIndex network error on ${path}: ${(err as Error).message}`);
      return null;
    }

    if (!res.ok) {
      // 4xx = warn (likely config/auth); 5xx = error (provider outage). Neither logs the secret.
      if (res.status >= 500) {
        logger.error(`PodcastIndex ${path} returned ${res.status}`);
      } else {
        logger.warn(`PodcastIndex ${path} returned ${res.status}`);
      }
      return null;
    }

    try {
      return (await res.json()) as Record<string, unknown>;
    } catch (err) {
      logger.error(`PodcastIndex JSON parse error on ${path}: ${(err as Error).message}`);
      return null;
    }
  }

  private makeCacheKey(prefix: string, query: string, max: number): string {
    const hash = crypto.createHash('sha1').update(`${query}|${max}`).digest('hex');
    return `podcastindex:${prefix}:${hash}`;
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
      // Cache failures are non-fatal — origin already returned a value.
    }
  }
}
