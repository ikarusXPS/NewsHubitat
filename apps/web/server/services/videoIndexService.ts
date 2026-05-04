/**
 * Video Index Service (Phase 40-05 / CONT-05 / D-D1).
 *
 * Singleton orchestrator for per-article video discovery:
 *   findRelated(articleId) → MatchedVideo[]
 *
 * Algorithm
 * ─────────
 *   1. Cache check (Redis key `video:related:{articleId}`, 24h TTL).
 *   2. Article load: pull `entities` + `topics` JSONB from NewsArticle.
 *   3. Local FTS query against the Phase-40-01 Video.search_tsv GIN index.
 *      Sanitized OR-joined `to_tsquery('simple', ...)` over the top-3
 *      entities + top-2 topics. ts_rank for relevance ordering.
 *   4. If local rows present → return them (source='local').
 *   5. Else → check `youtubeQuota.checkAndConsumeQuota()`. If denied,
 *      return empty (source='none'). Else call `YouTubeService.searchVideos`.
 *   6. Cache the result (any source) for CACHE_TTL.DAY.
 *
 * SQL safety
 * ──────────
 * Token list passes through `sanitizeFtsToken()` first — strips everything
 * outside `[A-Za-z0-9_-]` and lowercases. Tokens shorter than 2 chars are
 * dropped. The resulting space-free OR-joined string is passed as a Prisma
 * `$queryRaw` template parameter, NOT string-interpolated, so even if a
 * sanitization gap existed, parameter binding still prevents SQL injection.
 * (Defense in depth per RESEARCH "Pattern 1" + Common Pitfalls.)
 */

import { prisma } from '../db/prisma';
import { CacheService, CACHE_TTL } from './cacheService';
import { YouTubeService } from './youtubeService';
import { checkAndConsumeQuota } from '../middleware/youtubeQuota';
import logger from '../utils/logger';
import type { MatchedVideo, Video } from '../../src/types/videos';

interface VideoIndexRow {
  id: string;
  youtubeId: string | null;
  channelId: string | null;
  channelName: string | null;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  publishedAt: Date;
  rank: number;
}

interface FindRelatedResult {
  videos: MatchedVideo[];
  source: 'cache' | 'local' | 'youtube-search' | 'none';
}

const CACHE_KEY = (articleId: string): string => `video:related:${articleId}`;

/**
 * Strip non-alphanumeric chars; lowercase; drop short tokens.
 *
 * Defense in depth (Rule 2): even though the token feeds a Prisma `$queryRaw`
 * template parameter (binding-protected), we additionally reject every char
 * outside `[a-z0-9]`. This blocks `--` SQL-comment markers, `;` statement
 * separators, and FTS-meta chars (`& | ! ( )`) that could otherwise reshape
 * `to_tsquery('simple', ${ftsQuery})` semantics.
 */
function sanitizeFtsToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function buildFtsQuery(entities: string[], topics: string[]): string {
  const tokens = new Set<string>();
  for (const e of entities.slice(0, 3)) {
    const t = sanitizeFtsToken(e);
    if (t.length >= 2) tokens.add(t);
  }
  for (const t of topics.slice(0, 2)) {
    const tk = sanitizeFtsToken(t);
    if (tk.length >= 2) tokens.add(tk);
  }
  return Array.from(tokens).join(' | ');
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p.filter((x): x is string => typeof x === 'string');
    } catch {
      /* ignore */
    }
  }
  return [];
}

function rowToMatchedVideo(
  row: VideoIndexRow,
  matchedTerms: string[],
  source: 'local-index' | 'youtube-api',
): MatchedVideo {
  const video: Video = {
    id: row.id,
    youtubeId: row.youtubeId ?? undefined,
    channelId: row.channelId ?? undefined,
    title: row.title,
    description: row.description,
    durationSec: row.durationSec ?? undefined,
    publishedAt: row.publishedAt,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
  };
  return {
    video,
    matchScore: row.rank,
    matchedTerms,
    source,
  };
}

export class VideoIndexService {
  private static instance: VideoIndexService | undefined;

  private readonly cache = CacheService.getInstance();
  private readonly youtube = YouTubeService.getInstance();

  private constructor() {
    logger.info('VideoIndexService initialized');
  }

  static getInstance(): VideoIndexService {
    if (!VideoIndexService.instance) {
      VideoIndexService.instance = new VideoIndexService();
    }
    return VideoIndexService.instance;
  }

  async findRelated(
    articleId: string,
    opts?: { limit?: number },
  ): Promise<FindRelatedResult> {
    const limit = Math.max(1, Math.min(opts?.limit ?? 3, 10));
    const cacheKey = CACHE_KEY(articleId);

    // 1. Cache check
    const cached = await this.cache.get<FindRelatedResult>(cacheKey);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    // 2. Article load
    const article = await prisma.newsArticle.findUnique({
      where: { id: articleId },
      select: { entities: true, topics: true, language: false } as never,
    }).catch(err => {
      logger.warn(`videoIndexService: article lookup failed: ${(err as Error).message}`);
      return null;
    });

    if (!article) {
      return { videos: [], source: 'none' };
    }

    const entities = asStringArray((article as { entities?: unknown }).entities);
    const topics = asStringArray((article as { topics?: unknown }).topics);
    const ftsQuery = buildFtsQuery(entities, topics);

    if (!ftsQuery) {
      return { videos: [], source: 'none' };
    }

    // 3. Local FTS query (parameterized).
    let rows: VideoIndexRow[] = [];
    try {
      rows = await prisma.$queryRaw<VideoIndexRow[]>`
        SELECT id,
               "youtubeId",
               "channelId",
               "channelName",
               title,
               description,
               "thumbnailUrl",
               "durationSec",
               "publishedAt",
               ts_rank(search_tsv, to_tsquery('simple', ${ftsQuery}))::float8 AS rank
        FROM "Video"
        WHERE search_tsv @@ to_tsquery('simple', ${ftsQuery})
        ORDER BY rank DESC, "publishedAt" DESC
        LIMIT ${limit}
      `;
    } catch (err) {
      logger.warn(`videoIndexService: FTS query failed: ${(err as Error).message}`);
      rows = [];
    }

    const matchedTerms = ftsQuery.split('|').map(s => s.trim()).filter(Boolean);

    if (rows.length > 0) {
      const videos = rows.map(r => rowToMatchedVideo(r, matchedTerms, 'local-index'));
      const result: FindRelatedResult = { videos, source: 'local' };
      await this.cache.set(cacheKey, result, CACHE_TTL.DAY);
      return result;
    }

    // 4. Local empty → quota gate
    const quotaOk = await checkAndConsumeQuota();
    if (!quotaOk) {
      const result: FindRelatedResult = { videos: [], source: 'none' };
      // Brief cache of "no results" so we don't burn DB on repeated misses
      await this.cache.set(cacheKey, result, CACHE_TTL.HOUR);
      return result;
    }

    // 5. YouTube Data API fallback (search.list)
    let searched: Awaited<ReturnType<YouTubeService['searchVideos']>> = [];
    try {
      const queryString = matchedTerms.slice(0, 3).join(' ');
      searched = await this.youtube.searchVideos(queryString, {
        maxResults: limit,
      });
    } catch (err) {
      logger.warn(`videoIndexService: YouTube search.list failed: ${(err as Error).message}`);
    }

    const videos: MatchedVideo[] = searched.map((s, idx) => ({
      video: {
        // Synthetic id namespace for non-indexed results — these aren't
        // persisted to the Video table; they're transient search hits.
        id: `youtube-search:${s.youtubeId}`,
        youtubeId: s.youtubeId,
        channelId: s.channelId,
        title: s.title,
        description: s.description,
        thumbnailUrl: s.thumbnailUrl,
        publishedAt: new Date(),
      },
      matchScore: 1 - idx / Math.max(searched.length, 1), // descending pseudo-rank
      matchedTerms,
      source: 'youtube-api',
    }));

    const result: FindRelatedResult =
      videos.length > 0
        ? { videos, source: 'youtube-search' }
        : { videos: [], source: 'none' };
    await this.cache.set(cacheKey, result, CACHE_TTL.DAY);
    return result;
  }
}
