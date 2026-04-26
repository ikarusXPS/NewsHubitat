import { Router, Request, Response } from 'express';
import { authMiddleware } from '../services/authService';
import { prisma } from '../db/prisma';

const router = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// POST /api/history - Create reading history entry
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
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
