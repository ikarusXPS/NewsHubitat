/**
 * Video routes (Phase 40-05 / CONT-05 / D-D1).
 *
 * Three GET endpoints, all FREE-tier (no requireTier; no auth required):
 *   GET /related/:articleId          — matched videos for a NewsArticle
 *   GET /channels                    — curated VIDEO_CHANNELS browse list
 *   GET /channel/:channelId/recent   — paginated recent videos for a channel
 *
 * The mount in `server/index.ts` wraps these with `newsLimiter` (100 req/min/IP)
 * — that's the per-IP rate limit, not baked here, so this router stays
 * minimal and the rate-limit lifecycle stays consistent with /api/news +
 * /api/podcasts.
 *
 * T-40-05-03 mitigation: per-IP rate limit (newsLimiter at mount) absorbs
 * cache-miss flooding; videoIndexService also gates the YouTube Data API
 * fallback via youtubeQuota. T-40-05-01 mitigation: response shapes never
 * include third-party iframe markup — clients construct iframes via the
 * lite-loader components.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { VideoIndexService } from '../services/videoIndexService';
import { VIDEO_CHANNELS } from '../config/video-channels';
import logger from '../utils/logger';

export const videosRoutes = Router();

// Zod boundary schemas
const articleIdSchema = z.string().min(1).max(128);
const channelIdSchema = z.string().regex(/^UC[A-Za-z0-9_-]{22}$/);
const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// 1. Related videos for a NewsArticle
videosRoutes.get('/related/:articleId', async (req: Request, res: Response) => {
  const parsed = articleIdSchema.safeParse(req.params.articleId);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid article id' });
    return;
  }
  try {
    const result = await VideoIndexService.getInstance().findRelated(parsed.data, {
      limit: 3,
    });
    res.set('Cache-Control', 'public, max-age=300'); // 5 min — matches news.ts
    res.json({
      success: true,
      data: result.videos,
      meta: { source: result.source, total: result.videos.length },
    });
  } catch (err) {
    logger.error(`/api/videos/related/${parsed.data} failed: ${(err as Error).message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch related videos' });
  }
});

// 2. Curated channels browse
videosRoutes.get('/channels', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=86400'); // 24h — config rarely changes
  res.json({
    success: true,
    data: VIDEO_CHANNELS,
    meta: { total: VIDEO_CHANNELS.length },
  });
});

// 3. Recent videos for a channel (paginated)
videosRoutes.get('/channel/:channelId/recent', async (req: Request, res: Response) => {
  const idParsed = channelIdSchema.safeParse(req.params.channelId);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: 'Invalid channelId' });
    return;
  }
  const queryParsed = recentQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ success: false, error: 'Invalid pagination params' });
    return;
  }
  try {
    const videos = await prisma.video.findMany({
      where: { channelId: idParsed.data },
      orderBy: { publishedAt: 'desc' },
      take: queryParsed.data.limit,
      skip: queryParsed.data.offset,
    });
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: videos,
      meta: {
        limit: queryParsed.data.limit,
        offset: queryParsed.data.offset,
        total: videos.length,
      },
    });
  } catch (err) {
    logger.error(
      `/api/videos/channel/${idParsed.data}/recent failed: ${(err as Error).message}`,
    );
    res.status(500).json({ success: false, error: 'Failed to fetch recent videos' });
  }
});
