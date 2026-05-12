/**
 * Podcast routes (Phase 40-03 / CONT-03 / D-B3).
 *
 * Four GET endpoints, all FREE-tier (no requireTier; no auth required):
 *   GET /                     — browse curated PODCAST_FEEDS
 *   GET /episodes/:episodeId  — single episode (route order matters; see below)
 *   GET /:feedId/episodes     — episodes for a curated feed
 *   GET /related/:articleId   — matched episodes for a NewsArticle
 *
 * Route ordering: the `episodes/:episodeId` literal MUST precede `/:feedId/episodes`
 * — otherwise Express's path-matcher would treat the literal `episodes` segment
 * as a feedId and the dynamic route would swallow the request.
 *
 * T-40-03-03 mitigation: every path param goes through Zod safeParse; service
 * exceptions return a generic 500 message ("Failed to fetch related podcasts")
 * with full detail in server logs only (no stack-trace leak to client).
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PodcastService } from '../services/podcastService';
import { PODCAST_FEEDS } from '../config/podcasts';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../services/authService';
import { requireTier, type TierRequest } from '../middleware/requireTier';
import logger from '../utils/logger';

interface TranscriptSegment {
  startSec: number;
  endSec: number;
  text: string;
}

interface TranscriptHit {
  episodeId: string;
  episodeTitle: string;
  podcastTitle: string;
  excerpt: string;
  startSec?: number;
}

export const podcastRoutes = Router();
const podcastService = PodcastService.getInstance();

// Zod boundary schemas
const feedIdSchema = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/i);
const episodeIdSchema = z.string().min(1).max(128);
const articleIdSchema = z.string().min(1).max(128);
const limitSchema = z.coerce.number().int().min(1).max(100).default(50);
const transcriptSearchSchema = z.object({ q: z.string().min(1).max(200) });

const TRANSCRIPT_SEARCH_EPISODE_LIMIT = 20;
const TRANSCRIPT_SEARCH_SEGMENTS_PER_EPISODE = 3;
const TRANSCRIPT_SEARCH_EXCERPT_CHARS = 220;

// 1. Browse curated podcasts (FREE)
podcastRoutes.get('/', async (_req: Request, res: Response) => {
  const data = await podcastService.listCurated();
  res.set('Cache-Control', 'public, max-age=86400');
  res.set('Vary', 'Accept-Encoding');
  res.json({ success: true, data, meta: { total: data.length } });
});

// 1b. Cross-episode transcript search (PREMIUM-gated).
// MUST precede the /:feedId/episodes dynamic route so Express does not treat
// "transcripts" as a feedId. Uses the FTS GIN index on Transcript.search_tsv
// (Phase 40-01) to narrow rows, then filters segments in JS for excerpt picks.
// Frontend consumer: apps/web/src/pages/PodcastsPage.tsx fetchTranscriptSearch().
podcastRoutes.get(
  '/transcripts/search',
  authMiddleware,
  requireTier('PREMIUM'),
  async (req: TierRequest, res: Response) => {
    const parsed = transcriptSearchSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'invalid_query' });
      return;
    }
    const query = parsed.data.q;
    try {
      const matches = (await prisma.$queryRaw`
        SELECT t."contentId", t.segments, e.title AS "episodeTitle", e."podcastId"
        FROM "Transcript" t
        INNER JOIN "PodcastEpisode" e ON e.id = t."contentId"
        WHERE t."contentType" = 'podcast'
          AND t.provider <> 'unavailable'
          AND t.search_tsv @@ websearch_to_tsquery('simple', ${query})
        LIMIT ${TRANSCRIPT_SEARCH_EPISODE_LIMIT}
      `) as Array<{
        contentId: string;
        segments: unknown;
        episodeTitle: string;
        podcastId: string;
      }>;

      const tokens = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length >= 2);
      const hits: TranscriptHit[] = [];

      for (const m of matches) {
        const feed = PODCAST_FEEDS.find((f) => f.id === m.podcastId);
        const podcastTitle = feed?.title ?? m.podcastId;
        const segs = Array.isArray(m.segments) ? (m.segments as TranscriptSegment[]) : [];
        const matching =
          tokens.length === 0
            ? segs
            : segs.filter((s) =>
                tokens.every((tok) => s.text.toLowerCase().includes(tok)),
              );
        for (const seg of matching.slice(0, TRANSCRIPT_SEARCH_SEGMENTS_PER_EPISODE)) {
          const text = String(seg.text ?? '').trim();
          hits.push({
            episodeId: m.contentId,
            episodeTitle: m.episodeTitle,
            podcastTitle,
            excerpt:
              text.length > TRANSCRIPT_SEARCH_EXCERPT_CHARS
                ? text.slice(0, TRANSCRIPT_SEARCH_EXCERPT_CHARS) + '…'
                : text,
            startSec: typeof seg.startSec === 'number' ? seg.startSec : undefined,
          });
        }
      }
      res.set('Cache-Control', 'private, max-age=300');
      res.json({ success: true, data: hits, meta: { total: hits.length } });
    } catch (err) {
      logger.error('podcastsTranscriptsSearch:failed', { err: String(err) });
      res.status(500).json({ success: false, error: 'internal_error' });
    }
  },
);

// 2. Single episode by id — MUST precede the /:feedId/episodes dynamic route
podcastRoutes.get('/episodes/:episodeId', async (req: Request, res: Response) => {
  const parsed = episodeIdSchema.safeParse(req.params.episodeId);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid episode id' });
    return;
  }
  const episode = await podcastService.getEpisode(parsed.data);
  if (!episode) {
    res.status(404).json({ success: false, error: 'Episode not found' });
    return;
  }
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ success: true, data: episode });
});

// 3. Episodes for a curated feed
podcastRoutes.get('/:feedId/episodes', async (req: Request, res: Response) => {
  const idParsed = feedIdSchema.safeParse(req.params.feedId);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: 'Invalid feed id' });
    return;
  }
  const limitParsed = limitSchema.safeParse(req.query.limit);
  if (!limitParsed.success) {
    res.status(400).json({ success: false, error: 'Invalid limit' });
    return;
  }
  const known = PODCAST_FEEDS.find(f => f.id === idParsed.data);
  if (!known) {
    res.status(404).json({ success: false, error: 'Feed not found' });
    return;
  }
  const data = await podcastService.getEpisodes(idParsed.data, limitParsed.data);
  res.set('Cache-Control', 'public, max-age=600');
  res.json({
    success: true,
    data,
    meta: { total: Array.isArray(data) ? data.length : 0, limit: limitParsed.data },
  });
});

// 4. Related episodes for a NewsArticle
podcastRoutes.get('/related/:articleId', async (req: Request, res: Response) => {
  const parsed = articleIdSchema.safeParse(req.params.articleId);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid article id' });
    return;
  }
  try {
    const data = await podcastService.findRelated(parsed.data);
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ success: true, data, meta: { total: data.length } });
  } catch (err) {
    // Log full detail server-side; return safe message client-side (T-40-03-03)
    logger.error(`/api/podcasts/related/${parsed.data} failed: ${(err as Error).message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch related podcasts' });
  }
});
