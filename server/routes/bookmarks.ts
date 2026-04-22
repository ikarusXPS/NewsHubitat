import { Router, Request, Response } from 'express';
import { authMiddleware } from '../services/authService';
import { prisma } from '../db/prisma';

const router = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// POST /api/bookmarks - Create bookmark (idempotent)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { articleId } = req.body;

    if (!articleId || typeof articleId !== 'string') {
      res.status(400).json({ success: false, error: 'articleId is required' });
      return;
    }

    // Check if bookmark exists (idempotent)
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_articleId: { userId, articleId },
      },
    });

    if (existing) {
      res.status(200).json({ success: true, data: existing });
      return;
    }

    // Create new bookmark
    const bookmark = await prisma.bookmark.create({
      data: { userId, articleId },
    });

    res.status(201).json({ success: true, data: bookmark });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create bookmark',
    });
  }
});

export default router;
