/**
 * News Read Service
 *
 * Stateless function module providing the read-side API for news articles,
 * sources, and sentiment aggregates. Web replicas (RUN_JOBS=false) MUST use
 * this service instead of NewsAggregator's in-memory Maps so they remain
 * stateless and horizontally scalable.
 *
 * Closes JOB-02: web replicas no longer hold in-memory aggregator state;
 * reads route through Prisma + CacheService (Redis).
 *
 * Mitigates T-37-06 (DoS via N+1): every read path wraps Prisma in
 * CacheService.getOrSet so repeated requests hit Redis instead of Postgres.
 * Worker invalidates `news:list:*` on writes (via workerEmitter — Plan 01).
 */

import { prisma } from '../db/prisma';
import { CacheService, CacheKeys, CACHE_TTL } from './cacheService';
import { NEWS_SOURCES } from '../config/sources';
import logger from '../utils/logger';
import type {
  NewsArticle,
  NewsSource,
  PerspectiveRegion,
  Sentiment,
  OwnershipType,
} from '../../src/types';

interface ListOptions {
  regions?: PerspectiveRegion[];
  topics?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  sentiment?: Sentiment;
  language?: string;
}

type SentimentByRegion = Record<
  PerspectiveRegion,
  { positive: number; negative: number; neutral: number; count: number }
>;

/**
 * Map a Prisma NewsArticle row (with included source) into our NewsArticle
 * shape. Mirrors NewsAggregator.fromPrismaArticle: titleTranslated and
 * contentTranslated are JSON-stringified strings stored in JSONB columns;
 * topics and entities are JSON-stringified string[] (legacy double-encoded
 * format — preserved for backward compatibility with the existing writer).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToNewsArticle(row: any): NewsArticle {
  const source: NewsSource = {
    id: row.source.id,
    name: row.source.name,
    country: row.source.country,
    region: row.source.region as PerspectiveRegion,
    language: row.source.language,
    bias: {
      political: row.source.politicalBias,
      reliability: row.source.reliability,
      ownership: row.source.ownership as OwnershipType,
    },
    apiEndpoint: row.source.apiEndpoint || undefined,
    rateLimit: row.source.rateLimit,
  };

  return {
    id: row.id,
    title: row.title,
    titleTranslated:
      row.titleTranslated != null
        ? typeof row.titleTranslated === 'string'
          ? JSON.parse(row.titleTranslated)
          : row.titleTranslated
        : undefined,
    content: row.content,
    contentTranslated:
      row.contentTranslated != null
        ? typeof row.contentTranslated === 'string'
          ? JSON.parse(row.contentTranslated)
          : row.contentTranslated
        : undefined,
    summary: row.summary ?? undefined,
    source,
    originalLanguage: row.originalLanguage,
    publishedAt: row.publishedAt,
    url: row.url,
    imageUrl: row.imageUrl ?? undefined,
    sentiment: row.sentiment as Sentiment,
    sentimentScore: row.sentimentScore,
    perspective: row.perspective as PerspectiveRegion,
    topics:
      typeof row.topics === 'string' ? JSON.parse(row.topics) : (row.topics ?? []),
    entities:
      typeof row.entities === 'string'
        ? JSON.parse(row.entities)
        : (row.entities ?? []),
    translationQuality: row.translationQuality ?? undefined,
    cached: row.cached,
    confidence: row.confidence ?? undefined,
  };
}

/**
 * Build the Prisma `where` clause from ListOptions.
 * Topics filter uses JSON string-contains to match the existing writer's
 * JSON.stringify(topics) format. Search is case-insensitive across title +
 * content. Language filters by originalLanguage.
 */
function buildWhere(opts: ListOptions): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (opts.regions?.length) {
    where.perspective = { in: opts.regions };
  }
  if (opts.sentiment) {
    where.sentiment = opts.sentiment;
  }
  if (opts.language) {
    where.originalLanguage = opts.language;
  }
  if (opts.search) {
    where.OR = [
      { title: { contains: opts.search, mode: 'insensitive' } },
      { content: { contains: opts.search, mode: 'insensitive' } },
    ];
  }
  if (opts.topics?.length) {
    // topics is JSONB containing a JSON-stringified array (legacy format).
    // string_contains matches when the JSON text includes the topic literal.
    where.AND = opts.topics.map((t) => ({
      topics: { string_contains: t },
    }));
  }

  return where;
}

/**
 * List articles with filters + pagination.
 *
 * Cache: CacheKeys.newsList(JSON.stringify(opts)), TTL.SHORT (60s).
 * Worker invalidates via cache.delPattern('news:list:*') on writes.
 */
export async function getArticles(
  opts: ListOptions = {}
): Promise<{ articles: NewsArticle[]; total: number }> {
  const cache = CacheService.getInstance();
  const cacheKey = CacheKeys.newsList(JSON.stringify(opts));

  return cache.getOrSet(
    cacheKey,
    async () => {
      const where = buildWhere(opts);
      const limit = opts.limit ?? 20;
      const offset = opts.offset ?? 0;

      try {
        const [rows, total] = await prisma.$transaction([
          prisma.newsArticle.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { publishedAt: 'desc' },
            include: { source: true },
          }),
          prisma.newsArticle.count({ where }),
        ]);

        return {
          articles: rows.map((r) => mapToNewsArticle(r)),
          total,
        };
      } catch (err) {
        logger.error('newsReadService.getArticles failed:', err);
        return { articles: [], total: 0 };
      }
    },
    CACHE_TTL.SHORT
  );
}

/**
 * Get a single article by ID.
 *
 * Cache: CacheKeys.newsArticle(id), TTL.MEDIUM (5min).
 * Worker invalidates on update via cache.del(CacheKeys.newsArticle(id)).
 */
export async function getArticleById(id: string): Promise<NewsArticle | null> {
  const cache = CacheService.getInstance();

  return cache.getOrSet(
    CacheKeys.newsArticle(id),
    async () => {
      try {
        const row = await prisma.newsArticle.findUnique({
          where: { id },
          include: { source: true },
        });
        return row ? mapToNewsArticle(row) : null;
      } catch (err) {
        logger.error(`newsReadService.getArticleById(${id}) failed:`, err);
        return null;
      }
    },
    CACHE_TTL.MEDIUM
  );
}

/**
 * Get the static news source catalog.
 *
 * Sources are configuration (not user data) and live in
 * apps/web/server/config/sources.ts. Returned through cache.getOrSet for
 * symmetry with the other read methods; TTL.LONG (30min) since the file
 * only changes on deploy.
 */
export async function getSources(): Promise<NewsSource[]> {
  const cache = CacheService.getInstance();

  return cache.getOrSet(
    CacheKeys.newsSources(),
    async () => NEWS_SOURCES,
    CACHE_TTL.LONG
  );
}

/**
 * Aggregate sentiment counts grouped by perspective region.
 *
 * Uses prisma.newsArticle.groupBy({ by: ['perspective', 'sentiment'] }) and
 * reshapes into the legacy NewsAggregator.getSentimentByRegion shape.
 *
 * Cache: CacheKeys.newsSentiment(), TTL.SHORT (60s).
 */
export async function getSentimentByRegion(): Promise<SentimentByRegion> {
  const cache = CacheService.getInstance();

  return cache.getOrSet(
    CacheKeys.newsSentiment(),
    async () => {
      try {
        const groups = await prisma.newsArticle.groupBy({
          by: ['perspective', 'sentiment'],
          _count: { _all: true },
        });

        const stats: Record<
          string,
          { positive: number; negative: number; neutral: number; count: number }
        > = {};

        for (const g of groups) {
          const region = g.perspective;
          const sentiment = g.sentiment as Sentiment;
          const count = g._count._all;
          if (!stats[region]) {
            stats[region] = { positive: 0, negative: 0, neutral: 0, count: 0 };
          }
          stats[region][sentiment] += count;
          stats[region].count += count;
        }

        return stats as SentimentByRegion;
      } catch (err) {
        logger.error('newsReadService.getSentimentByRegion failed:', err);
        return {} as SentimentByRegion;
      }
    },
    CACHE_TTL.SHORT
  );
}
