/**
 * YouTube Service (Phase 40-05 / CONT-05 / D-D1, D-D2).
 *
 * Singleton wrapping the public YouTube channel RSS feed (no quota) and the
 * YouTube Data API v3 (quota-controlled). All four methods are pure data
 * accessors — quota gating lives in `youtubeQuota.checkAndConsumeQuota` and
 * is invoked by `videoIndexService` (the caller), NOT here. This service
 * just performs the I/O.
 *
 * Methods
 * ───────
 *   - fetchChannelRSS(channelId)         — public RSS, free, no quota burn
 *   - backfillDurations(youtubeIds[])    — videos.list?part=contentDetails,
 *                                          batched ≤50/call (Pitfall 3)
 *   - searchVideos(query, opts)          — search.list, 100 quota units/call
 *   - resolveChannelByHandle(@handle)    — channels.list?forHandle, 1 unit
 *
 * Reference: 40-RESEARCH.md "YouTube channel RSS parsing" (lines 602-628)
 *            and "Pitfall 3" (lines 422-426).
 */

import Parser from 'rss-parser';
import logger from '../utils/logger';

const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const RSS_BASE = 'https://www.youtube.com/feeds/videos.xml';

export interface RssVideoItem {
  youtubeId: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl?: string;
}

export interface SearchedVideo {
  youtubeId: string;
  channelId?: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

/** Convert ISO-8601 duration (`PT1H2M3S`) to seconds. */
function parseIsoDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, h, mn, s] = m;
  return (
    (h ? parseInt(h, 10) * 3600 : 0) +
    (mn ? parseInt(mn, 10) * 60 : 0) +
    (s ? parseInt(s, 10) : 0)
  );
}

function requireApiKey(): string {
  const key = process.env.YOUTUBE_DATA_API_KEY;
  if (!key) {
    throw new Error('YOUTUBE_DATA_API_KEY not configured');
  }
  return key;
}

export class YouTubeService {
  private static instance: YouTubeService | undefined;

  private readonly parser: Parser;

  private constructor() {
    // customFields per RESEARCH D3 — surfaces yt:videoId, channelId, mediaGroup
    this.parser = new Parser({
      timeout: 10_000,
      headers: {
        'User-Agent': 'NewsHub/2.0 (https://newshub.com; contact@newshub.com)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      customFields: {
        item: [
          ['yt:videoId', 'videoId'],
          ['yt:channelId', 'channelId'],
          ['media:group', 'mediaGroup'],
        ],
      },
    });
    logger.info('YouTubeService initialized');
  }

  static getInstance(): YouTubeService {
    if (!YouTubeService.instance) {
      YouTubeService.instance = new YouTubeService();
    }
    return YouTubeService.instance;
  }

  /**
   * Fetch a YouTube channel's public RSS feed. No API key, no quota.
   * Returns the most recent ~15 videos (YouTube's RSS feed cap).
   * RSS does NOT carry `durationSec`; back-fill via `backfillDurations`.
   */
  async fetchChannelRSS(channelId: string): Promise<RssVideoItem[]> {
    const url = `${RSS_BASE}?channel_id=${encodeURIComponent(channelId)}`;
    const feed = await this.parser.parseURL(url);
    const items: RssVideoItem[] = [];
    for (const item of feed.items ?? []) {
      const youtubeId = (item as { videoId?: string }).videoId;
      if (!youtubeId) continue;
      const mediaGroup = (item as { mediaGroup?: Record<string, unknown> }).mediaGroup;
      const description = extractDescription(mediaGroup);
      const thumbnailUrl = extractThumbnail(mediaGroup);
      items.push({
        youtubeId,
        title: item.title ?? '',
        description,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        thumbnailUrl,
      });
    }
    return items;
  }

  /**
   * Batch back-fill durationSec via videos.list?part=contentDetails.
   * One quota unit per batch (≤50 IDs/call) per Pitfall 3 in RESEARCH.md.
   */
  async backfillDurations(youtubeIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (youtubeIds.length === 0) return out;

    const apiKey = requireApiKey();
    const batchSize = 50;

    for (let i = 0; i < youtubeIds.length; i += batchSize) {
      const batch = youtubeIds.slice(i, i + batchSize);
      const ids = batch.map(encodeURIComponent).join('%2C'); // %2C = url-encoded comma
      const url = `${YT_BASE}/videos?part=contentDetails&id=${ids}&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn(`youtube videos.list batch failed: ${res.status}`);
        continue;
      }
      const data = (await res.json()) as {
        items?: Array<{ id: string; contentDetails?: { duration?: string } }>;
      };
      for (const item of data.items ?? []) {
        const dur = item.contentDetails?.duration;
        if (dur) out.set(item.id, parseIsoDuration(dur));
      }
    }

    return out;
  }

  /**
   * search.list — 100 quota units per call. Caller is responsible for
   * gating with `youtubeQuota.checkAndConsumeQuota()`.
   */
  async searchVideos(
    query: string,
    opts?: { maxResults?: number; relevanceLanguage?: string },
  ): Promise<SearchedVideo[]> {
    const apiKey = requireApiKey();
    const maxResults = Math.min(Math.max(opts?.maxResults ?? 5, 1), 50);

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults: String(maxResults),
      key: apiKey,
    });
    if (opts?.relevanceLanguage) params.set('relevanceLanguage', opts.relevanceLanguage);

    logger.info(`youtube:search.list q="${query}" max=${maxResults}`);
    const url = `${YT_BASE}/search?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube search.list failed: ${res.status}`);
    }
    const data = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string; kind?: string };
        snippet?: {
          channelId?: string;
          title?: string;
          description?: string;
          thumbnails?: Record<string, { url?: string } | undefined>;
        };
      }>;
    };

    const out: SearchedVideo[] = [];
    for (const item of data.items ?? []) {
      const youtubeId = item.id?.videoId;
      if (!youtubeId) continue;
      const snippet = item.snippet ?? {};
      const thumbnails = snippet.thumbnails ?? {};
      const thumbnailUrl =
        thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url;
      out.push({
        youtubeId,
        channelId: snippet.channelId,
        title: snippet.title ?? '',
        description: snippet.description ?? '',
        thumbnailUrl,
      });
    }
    return out;
  }

  /**
   * channels.list?forHandle — 1 quota unit. Used by the maintenance script
   * `apps/web/scripts/resolve-youtube-handles.ts` and exposed here so it
   * can also be called from tests / future tooling.
   */
  async resolveChannelByHandle(handle: string): Promise<string | null> {
    const apiKey = requireApiKey();
    const stripped = handle.replace(/^@/, '');
    const url = `${YT_BASE}/channels?part=id&forHandle=${encodeURIComponent(stripped)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: Array<{ id?: string }> };
    return data.items?.[0]?.id ?? null;
  }
}

/** Extract `media:description` text from the `media:group` namespace blob. */
function extractDescription(mediaGroup: Record<string, unknown> | undefined): string {
  if (!mediaGroup) return '';
  const desc = (mediaGroup as Record<string, unknown>)['media:description'];
  if (Array.isArray(desc)) {
    const first = desc[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && '_' in first) {
      return String((first as { _: unknown })._);
    }
  }
  return '';
}

/** Extract the thumbnail URL from the `media:group` namespace blob. */
function extractThumbnail(mediaGroup: Record<string, unknown> | undefined): string | undefined {
  if (!mediaGroup) return undefined;
  const thumb = (mediaGroup as Record<string, unknown>)['media:thumbnail'];
  if (Array.isArray(thumb) && thumb.length > 0) {
    const first = thumb[0] as { $?: { url?: string } } | undefined;
    return first?.$?.url;
  }
  return undefined;
}
