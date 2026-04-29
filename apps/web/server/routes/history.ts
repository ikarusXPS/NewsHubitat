import { Router, Response } from 'express';
import { Prisma } from '../../src/generated/prisma';
import { authMiddleware } from '../services/authService';
import { prisma } from '../db/prisma';
import { attachUserTier, TierRequest, hasTier } from '../middleware/requireTier';

const router = Router();

/**
 * GET /api/history - List reading history entries
 * Per CONTEXT.md: FREE tier = 7 days, PREMIUM/ENTERPRISE = unlimited
 */
router.get('/', authMiddleware, attachUserTier, async (req: TierRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const isPremium = hasTier(req.userTier || 'FREE', 'PREMIUM');

    const whereClause: Prisma.ReadingHistoryWhereInput = {
      userId,
    };

    // Only apply 7-day filter for FREE tier
    if (!isPremium) {
      whereClause.readAt = {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
    }

    const history = await prisma.readingHistory.findMany({
      where: whereClause,
      orderBy: { readAt: 'desc' },
      take: isPremium ? 1000 : 100, // Premium gets more history entries
    });

    res.json({
      success: true,
      data: history,
      meta: {
        tier: req.userTier,
        isPremium,
        limit: isPremium ? 'unlimited' : '7 days',
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch history',
    });
  }
});

// POST /api/history - Create reading history entry
router.post('/', authMiddleware, async (req: TierRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { articleId, title, source, readAt } = req.body;

    if (!articleId || typeof articleId !== 'string') {
      res.status(400).json({ success: false, error: 'articleId is required' });
      return;
    }

    // Create history entry (readAt timestamp makes it unique)
    const history = await prisma.readingHistory.create({
      data: {
        userId,
        articleId,
        title: title || null,
        source: source || null,
        readAt: readAt ? new Date(readAt) : new Date(),
      },
    });

    res.status(201).json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create history entry',
    });
  }
});

export default router;
