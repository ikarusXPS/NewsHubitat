/**
 * Podcast Service (Phase 40-03 / CONT-03 / D-B1, D-B2).
 *
 * Singleton orchestrator for browse + match + persist:
 *   - findRelated(articleId)  — multi-source fan-out, ranked, 24h Redis cached
 *   - listCurated()           — static curated feeds (PODCAST_FEEDS)
 *   - getEpisodes(feedId)     — Prisma read by feed
 *   - getEpisode(id)          — Prisma read by episode id
 *   - pollFeed(feed)          — RSS parse + persistence (used by the worker job)
 *
 * HTML-strip persistence boundary (H8 + M2 fix — load-bearing for downstream UX):
 * `stripHtml()` is applied to every PodcastEpisode `description` and `title`
 * write inside pollFeed. RSS feeds frequently embed `<p>`/`<a>`/`<strong>` in
 * descriptions. Stripping at the persistence boundary means downstream consumers
 * (PodcastEpisodeCard, RelatedPodcasts, transcript-excerpt search, RAG context)
 * receive plain text — no DOMPurify dependency on the frontend.
 *
 * The rss-parser instance carries a `customFields.item` config that captures
 * the Podcasting 2.0 `<podcast:transcript>` and `<podcast:guid>` namespace tags
 * (Pitfall 4 — load-bearing for the Phase 40-06 transcript orchestrator's cost
 * model; silent failure burns Whisper $$).
 */

import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { CacheService, CACHE_TTL } from './cacheService';
import { PodcastIndexService, type PodcastIndexEpisode } from './podcastIndexService';
import { ItunesPodcastService, type ItunesPodcast } from './itunesPodcastService';
import {
  PodcastMatcherService,
  type CandidateEpisode,
  type MatchedEpisode,
} from './podcastMatcherService';
import { PODCAST_FEEDS, type PodcastFeed } from '../config/podcasts';
import logger from '../utils/logger';

// ──────────────────────────────────────────────────────────────────────────
// HTML-strip persistence-boundary helper (H8 / M2 fix). Exported for unit tests.
// Production callers go through pollFeed().
// ──────────────────────────────────────────────────────────────────────────
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  // Insert whitespace between adjacent block-level elements so cheerio's
  // text extraction preserves the gap between `<p>line 1</p><p>line 2</p>`.
  // Without this, .text() concatenates child text nodes producing "line 1line 2".
  const padded = String(html).replace(/<\/?(p|div|br|li|h[1-6]|tr|td|th|section|article)\b[^>]*>/gi, ' ');
  const $ = cheerio.load(padded, { decodeEntities: true });
  return $.root().text().trim().replace(/\s+/g, ' ');
}

// ──────────────────────────────────────────────────────────────────────────
// Module-level rss-parser with Podcasting 2.0 customFields (Pitfall 4)
// ──────────────────────────────────────────────────────────────────────────
const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'NewsHub/2.0 (https://newshub.com; contact@newshub.com)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
  customFields: {
    item: [
      ['podcast:transcript', 'transcripts', { keepArray: true }],
      ['podcast:guid', 'podcastGuid'],
      ['itunes:duration', 'itunesDuration'],
      ['itunes:image', 'itunesImage'],
    ],
  },
});

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function parseDurationToSeconds(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  // Plain integer seconds
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  // HH:MM:SS or MM:SS
  const parts = s.split(':').map(p => parseInt(p, 10));
  if (parts.some(p => Number.isNaN(p))) return undefined;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return undefined;
}

function asArray(maybeJson: unknown): string[] {
  if (Array.isArray(maybeJson)) return maybeJson.filter((x): x is string => typeof x === 'string');
  if (typeof maybeJson === 'string') {
    try {
      const parsed = JSON.parse(maybeJson);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    } catch {
      // fall through
    }
  }
  return [];
}

function pickCountry(language: string | null | undefined): string {
  if (language === 'de') return 'DE';
  if (language === 'fr') return 'FR';
  return 'US';
}

// ──────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────

export class PodcastService {
  private static instance: PodcastService;
  private readonly cacheService = CacheService.getInstance();
  private readonly podcastIndex = PodcastIndexService.getInstance();
  private readonly itunes = ItunesPodcastService.getInstance();
  private readonly matcher = PodcastMatcherService.getInstance();

  private constructor() {}

  static getInstance(): PodcastService {
    if (!PodcastService.instance) {
      PodcastService.instance = new PodcastService();
    }
    return PodcastService.instance;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Browse / read paths
  // ──────────────────────────────────────────────────────────────────────

  async listCurated(): Promise<PodcastFeed[]> {
    return PODCAST_FEEDS;
  }

  async getEpisodes(feedId: string, limit = 50): Promise<unknown[]> {
    return prisma.podcastEpisode.findMany({
      where: { podcastId: feedId },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  async getEpisode(id: string): Promise<unknown | null> {
    return prisma.podcastEpisode.findUnique({ where: { id } });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Match path (cache-first, multi-source fan-out, deterministic rank)
  // ──────────────────────────────────────────────────────────────────────

  async findRelated(articleId: string): Promise<MatchedEpisode[]> {
    const cacheKey = `podcast:related:${articleId}`;
    const cached = await this.safeCacheGet<MatchedEpisode[]>(cacheKey);
    if (cached) return cached;

    const article = await prisma.newsArticle.findUnique({
      where: { id: articleId },
      select: { entities: true, topics: true, originalLanguage: true },
    });
    if (!article) return [];

    const entities = asArray(article.entities);
    const topics = asArray(article.topics);
    const queryParts = [...entities.slice(0, 3), ...topics.slice(0, 2)].filter(Boolean);
    if (queryParts.length === 0) return [];
    const query = queryParts.join(' ');
    const country = pickCountry((article as { originalLanguage?: string }).originalLanguage);

    const [piResult, itResult] = await Promise.allSettled([
      this.podcastIndex.searchEpisodes(query, 10),
      this.itunes.searchPodcasts(query, country, 10),
    ]);
    const piEpisodes = piResult.status === 'fulfilled' ? piResult.value : [];
    const itPodcasts = itResult.status === 'fulfilled' ? itResult.value : [];

    const candidates: CandidateEpisode[] = [
      ...this.normaliseFromPodcastIndex(piEpisodes),
      ...this.normaliseFromItunes(itPodcasts),
      ...(await this.normaliseFromCurated()),
    ];

    const ranked = this.matcher.rank({ entities, topics }, candidates);
    await this.safeCacheSet(cacheKey, ranked, CACHE_TTL.DAY);
    return ranked;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Worker-job path: poll one feed and upsert episodes
  // (HTML stripped at the persistence boundary — H8/M2 fix)
  // ──────────────────────────────────────────────────────────────────────

  async pollFeed(feed: PodcastFeed): Promise<number> {
    let inserted = 0;
    let rss: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      rss = await parser.parseURL(feed.rssUrl);
    } catch (err) {
      logger.warn(`pollFeed(${feed.id}) parse failed: ${(err as Error).message}`);
      return 0;
    }

    try {
      await prisma.podcast.upsert({
        where: { id: feed.id },
        create: {
          id: feed.id,
          title: stripHtml(feed.title),
          rssUrl: feed.rssUrl,
          region: feed.region,
          language: feed.language,
          category: feed.category,
          reliability: feed.reliability,
          source: 'curated',
          description: stripHtml(rss.description ?? null) || null,
          imageUrl: rss.image?.url ?? null,
        },
        update: {
          title: stripHtml(feed.title),
          description: stripHtml(rss.description ?? null) || null,
          imageUrl: rss.image?.url ?? null,
          region: feed.region,
          language: feed.language,
          category: feed.category,
          reliability: feed.reliability,
        },
      });
    } catch (err) {
      logger.warn(`pollFeed(${feed.id}) podcast upsert failed: ${(err as Error).message}`);
      // Continue trying episodes — Podcast row may already exist
    }

    for (const item of rss.items ?? []) {
      const audioUrl = item.enclosure?.url ?? null;
      if (!audioUrl || !item.title) continue;

      // RSS guid resolution: prefer Podcasting 2.0 <podcast:guid>, fall back to
      // <guid>, fall back to deterministic hash. PodcastEpisode.podcastGuid is
      // NON-NULL @unique in the schema, so we always supply one.
      const rawPodcastGuid =
        (item as Record<string, unknown>).podcastGuid as string | { '#'?: string } | undefined;
      const guidFromNamespace =
        typeof rawPodcastGuid === 'string'
          ? rawPodcastGuid
          : (rawPodcastGuid as { '#'?: string } | undefined)?.['#'] ?? null;
      const guidFromGuid = (item as { guid?: string }).guid ?? null;
      const podcastGuid =
        guidFromNamespace ??
        guidFromGuid ??
        crypto
          .createHash('sha1')
          .update(`${feed.id}|${item.title}|${item.pubDate ?? ''}`)
          .digest('hex');

      const id = crypto.createHash('sha1').update(`pg:${podcastGuid}`).digest('hex');

      const transcripts = (item as { transcripts?: Array<{ $: { url: string; type: string } }> })
        .transcripts;
      const transcript = transcripts?.[0]?.$;

      // H8 + M2 FIX: strip HTML at the persistence boundary so PodcastEpisodeCard
      // (planned in 40-04) renders description as plain text without literal markup.
      const cleanTitle = stripHtml(item.title);
      const cleanDescription =
        stripHtml(item.content ?? item.contentSnippet ?? null) || null;

      const itunesImage = (item as { itunesImage?: { $?: { href?: string } } }).itunesImage;
      const itunesDuration = (item as { itunesDuration?: string }).itunesDuration;

      try {
        await prisma.podcastEpisode.upsert({
          where: { id },
          create: {
            id,
            podcastId: feed.id,
            podcastGuid,
            title: cleanTitle,
            description: cleanDescription,
            audioUrl,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            durationSec: parseDurationToSeconds(itunesDuration) ?? null,
            imageUrl: itunesImage?.$?.href ?? null,
            transcriptUrl: transcript?.url ?? null,
            transcriptType: transcript?.type ?? null,
          },
          // Backfill `transcriptUrl` + `transcriptType` on existing rows.
          // Phase 40-03 originally shipped with `update: {}` so episodes
          // imported before a publisher added `<podcast:transcript>` to
          // their feed would never get the field. Pitfall 4's cost guard
          // (publisher transcript wins over Whisper) only fires when the
          // field is set, so re-poll backfill is required to actually
          // honor it. See .planning/todos/pending/40-14-publisher-transcripts.md.
          update: {
            transcriptUrl: transcript?.url ?? null,
            transcriptType: transcript?.type ?? null,
          },
        });
        inserted++;
      } catch (err) {
        logger.debug(`PodcastEpisode upsert skipped (likely dup): ${(err as Error).message}`);
      }
    }
    return inserted;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internals — provider normalisation
  // ──────────────────────────────────────────────────────────────────────

  private normaliseFromPodcastIndex(rows: PodcastIndexEpisode[]): CandidateEpisode[] {
    return rows
      .map(r => {
        const audioUrl = r.enclosureUrl ?? r.audioUrl ?? null;
        if (!audioUrl) return null;
        const publishedAt = r.datePublished ? new Date(r.datePublished * 1000) : new Date();
        return {
          id: String(r.id ?? r.guid ?? `${r.feedId}|${r.title}`),
          podcastGuid: r.podcastGuid ?? r.guid ?? null,
          podcastTitle: stripHtml(r.feedTitle ?? '') || 'Unknown',
          episodeTitle: stripHtml(r.title ?? ''),
          description: stripHtml(r.description ?? ''),
          audioUrl,
          publishedAt,
          durationSec: r.duration ?? undefined,
          imageUrl: r.feedImage ?? undefined,
          transcriptUrl: r.transcriptUrl ?? undefined,
        } satisfies CandidateEpisode;
      })
      .filter((x): x is CandidateEpisode => x !== null);
  }

  private normaliseFromItunes(rows: ItunesPodcast[]): CandidateEpisode[] {
    // iTunes Search returns podcasts (feeds), not episodes. Treat each as a
    // feed-level candidate with the collection name as both podcast + episode title.
    return rows
      .map(r => {
        if (!r.feedUrl || !r.collectionName) return null;
        const publishedAt = r.releaseDate ? new Date(r.releaseDate) : new Date();
        return {
          id: String(r.collectionId ?? r.feedUrl),
          podcastGuid: null,
          podcastTitle: stripHtml(r.collectionName ?? ''),
          episodeTitle: stripHtml(r.collectionName ?? ''),
          description: stripHtml(r.primaryGenreName ?? ''),
          audioUrl: r.feedUrl, // RSS URL — caller should treat as feed, not direct audio
          publishedAt,
          imageUrl: r.artworkUrl600 ?? r.artworkUrl100 ?? undefined,
        } satisfies CandidateEpisode;
      })
      .filter((x): x is CandidateEpisode => x !== null);
  }

  private async normaliseFromCurated(): Promise<CandidateEpisode[]> {
    // Most-recent N per curated feed — bounded so the matcher stays O(small).
    const candidates: CandidateEpisode[] = [];
    for (const feed of PODCAST_FEEDS) {
      try {
        const rows = (await prisma.podcastEpisode.findMany({
          where: { podcastId: feed.id },
          orderBy: { publishedAt: 'desc' },
          take: 5,
        })) as Array<{
          id: string;
          podcastGuid: string | null;
          title: string;
          description: string | null;
          audioUrl: string;
          publishedAt: Date;
          durationSec: number | null;
          imageUrl: string | null;
          transcriptUrl: string | null;
          transcriptType: string | null;
        }>;
        for (const row of rows) {
          candidates.push({
            id: row.id,
            podcastGuid: row.podcastGuid,
            podcastTitle: feed.title,
            episodeTitle: row.title,
            description: row.description ?? '',
            audioUrl: row.audioUrl,
            publishedAt: row.publishedAt,
            durationSec: row.durationSec ?? undefined,
            imageUrl: row.imageUrl ?? undefined,
            transcriptUrl: row.transcriptUrl ?? undefined,
            transcriptType: row.transcriptType ?? undefined,
          });
        }
      } catch (err) {
        logger.debug(`normaliseFromCurated(${feed.id}): ${(err as Error).message}`);
      }
    }
    return candidates;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Cache helpers (graceful — never throw to caller)
  // ──────────────────────────────────────────────────────────────────────

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
