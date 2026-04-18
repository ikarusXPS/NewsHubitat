import { Router, Request, Response } from 'express';
import { PrismaClient } from '../../src/generated/prisma';
import { authMiddleware } from '../services/authService';

const prisma = new PrismaClient();
export const badgeRoutes = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// Get all badge definitions
badgeRoutes.get('/definitions', async (_req: Request, res: Response) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: [{ category: 'asc' }, { threshold: 'asc' }],
    });

    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Failed to fetch badge definitions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

// Get user's earned badges
badgeRoutes.get('/user', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: req.user!.userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });

    res.json({ success: true, data: userBadges });
  } catch (error) {
    console.error('Failed to fetch user badges:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user badges' });
  }
});

// Get user's badge progress
badgeRoutes.get('/progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: req.user!.userId },
      include: { badge: true },
    });

    // Group by badge base name (without tier)
    const progressMap = new Map<string, { earned: string[]; progress: number }>();
    userBadges.forEach((ub) => {
      const baseName = ub.badge.name.replace(/-bronze|-silver|-gold|-platinum$/, '');
      const existing = progressMap.get(baseName) || { earned: [], progress: ub.progress };
      existing.earned.push(ub.badge.tier);
      existing.progress = Math.max(existing.progress, ub.progress);
      progressMap.set(baseName, existing);
    });

    res.json({
      success: true,
      data: Object.fromEntries(progressMap),
    });
  } catch (error) {
    console.error('Failed to fetch badge progress:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// Award badge (internal use or admin) - T-06-10: Server validates threshold
badgeRoutes.post('/award', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId, progress } = req.body;

    if (!badgeId) {
      res.status(400).json({ success: false, error: 'Badge ID required' });
      return;
    }

    const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
    if (!badge) {
      res.status(404).json({ success: false, error: 'Badge not found' });
      return;
    }

    const userBadge = await prisma.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId: req.user!.userId,
          badgeId,
        },
      },
      update: { progress: progress || 0 },
      create: {
        userId: req.user!.userId,
        badgeId,
        progress: progress || 0,
      },
      include: { badge: true },
    });

    res.json({ success: true, data: userBadge });
  } catch (error) {
    console.error('Failed to award badge:', error);
    res.status(500).json({ success: false, error: 'Failed to award badge' });
  }
});

// Set featured badge per D-43 - T-06-11: Server checks user has earned badge
badgeRoutes.put('/featured', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.body;

    // Verify user has this badge
    if (badgeId) {
      const userBadge = await prisma.userBadge.findFirst({
        where: { userId: req.user!.userId, badgeId },
      });
      if (!userBadge) {
        res.status(400).json({ success: false, error: 'Badge not earned' });
        return;
      }
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { featuredBadgeId: badgeId || null },
    });

    res.json({ success: true, message: 'Featured badge updated' });
  } catch (error) {
    console.error('Failed to set featured badge:', error);
    res.status(500).json({ success: false, error: 'Failed to update featured badge' });
  }
});
