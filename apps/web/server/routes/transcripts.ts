/**
 * Transcript routes (Phase 40-06 / CC-02 / T-40-06-03).
 *
 * Two Premium-gated GET endpoints:
 *   GET /:contentType/:id            — single transcript (segments + meta)
 *   GET /:contentType/:id/search?q=  — FTS search across the transcript (Q-05)
 *
 * Auth + authMiddleware are applied at the mount-site in `server/index.ts`
 * (`app.use('/api/transcripts', authMiddleware, transcriptRoutes)`) so that
 * `requireTier('PREMIUM')` always sees a populated `req.user`. Mirrors the
 * `app.use('/api/ai', authMiddleware, aiTierLimiter, aiRoutes)` convention.
 *
 * T-40-06-03 mitigation: requireTier returns 401 without auth and 403 below
 * Premium. The frontend FREE-tier UpgradePrompt is purely UX — the gate is
 * here. Full server-side enforcement.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireTier, type TierRequest } from '../middleware/requireTier';
import { TranscriptService } from '../services/transcriptService';
import logger from '../utils/logger';

export const transcriptRoutes = Router();

const paramsSchema = z.object({
  contentType: z.enum(['podcast', 'video']),
  id: z.string().min(1).max(128),
});
const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

// GET /api/transcripts/:contentType/:id
transcriptRoutes.get(
  '/:contentType/:id',
  requireTier('PREMIUM'),
  async (req: TierRequest, res: Response) => {
    const parsed = paramsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'invalid_params' });
      return;
    }
    try {
      const transcript = await TranscriptService.getInstance().getTranscript(
        parsed.data.contentType,
        parsed.data.id,
      );
      if (!transcript) {
        res.status(404).json({ success: false, error: 'transcript_unavailable' });
        return;
      }
      res.set('Cache-Control', 'private, max-age=3600');
      res.json({ success: true, data: transcript });
    } catch (err) {
      logger.error('transcripts:get_failed', { err: String(err), params: parsed.data });
      res.status(500).json({ success: false, error: 'internal_error' });
    }
  },
);

// GET /api/transcripts/:contentType/:id/search?q=...
transcriptRoutes.get(
  '/:contentType/:id/search',
  requireTier('PREMIUM'),
  async (req: TierRequest, res: Response) => {
    const params = paramsSchema.safeParse(req.params);
    const query = searchQuerySchema.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ success: false, error: 'invalid_request' });
      return;
    }
    try {
      const segments = await TranscriptService.getInstance().searchSegments(
        params.data.contentType,
        params.data.id,
        query.data.q,
      );
      res.set('Cache-Control', 'private, max-age=3600');
      res.json({ success: true, data: { segments, total: segments.length } });
    } catch (err) {
      logger.error('transcripts:search_failed', { err: String(err) });
      res.status(500).json({ success: false, error: 'internal_error' });
    }
  },
);
