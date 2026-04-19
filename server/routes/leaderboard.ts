import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../services/authService';
export const leaderboardRoutes = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// Calculate user points from badges and activity
async function calculateUserPoints(userId: string): Promise<number> {
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
  });

  // Points: badge thresholds + tier multipliers
  const tierMultiplier: Record<string, number> = {
    bronze: 1,
    silver: 2,
    gold: 4,
    platinum: 10,
  };

  let points = 0;
  userBadges.forEach((ub) => {
    const multiplier = tierMultiplier[ub.badge.tier] || 1;
    points += ub.badge.threshold * multiplier;
  });

  return points;
}

// Get leaderboard per D-51, D-57
leaderboardRoutes.get('/', async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as string) || 'all-time';
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);

  // Get users who opted in to leaderboard
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true, emailVerified: true },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      selectedPresetAvatar: true,
      badges: {
        include: { badge: true },
      },
    },
  });

  // Calculate points and build leaderboard
  const leaderboard = await Promise.all(
    users.map(async (user) => {
      const points = await calculateUserPoints(user.id);
      const level = Math.floor(points / 100) + 1;
      const streak = 0; // Would need reading history per user
      const badgeCount = user.badges.length;

      return {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        selectedPresetAvatar: user.selectedPresetAvatar,
        points,
        level,
        streak,
        badgeCount,
      };
    })
  );

  // Sort by points
  leaderboard.sort((a, b) => b.points - a.points);

  // Add ranks
  const ranked = leaderboard.slice(0, limit).map((entry, i) => ({
    ...entry,
    rank: i + 1,
  }));

  res.json({
    success: true,
    data: ranked,
    meta: {
      timeframe,
      total: leaderboard.length,
    },
  });
});

// Get user's position per D-54
leaderboardRoutes.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const timeframe = (req.query.timeframe as string) || 'all-time';

  // Get all users for ranking
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true, emailVerified: true },
    select: { id: true },
  });

  // Calculate all points
  const allPoints = await Promise.all(
    users.map(async (u) => ({
      userId: u.id,
      points: await calculateUserPoints(u.id),
    }))
  );

  // Sort and find user's position
  allPoints.sort((a, b) => b.points - a.points);
  const userRank = allPoints.findIndex((p) => p.userId === userId) + 1;
  const userPoints = allPoints.find((p) => p.userId === userId)?.points || 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      avatarUrl: true,
      selectedPresetAvatar: true,
      badges: true,
    },
  });

  res.json({
    success: true,
    data: {
      rank: userRank || null,
      userId,
      name: user?.name || 'Unknown',
      avatarUrl: user?.avatarUrl,
      selectedPresetAvatar: user?.selectedPresetAvatar,
      points: userPoints,
      level: Math.floor(userPoints / 100) + 1,
      streak: 0,
      badgeCount: user?.badges.length || 0,
    },
    meta: {
      timeframe,
    },
  });
});

// Get weekly winner per D-58, D-59
leaderboardRoutes.get('/weekly-winner', async (_req: Request, res: Response) => {
  // Check if we're on Monday (show last week's winner)
  const now = new Date();
  const dayOfWeek = now.getDay();

  if (dayOfWeek !== 1) {
    // Not Monday
    res.json({ success: true, data: null });
    return;
  }

  // Get last week's top user (simplified - would use LeaderboardSnapshot in production)
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true, emailVerified: true },
    select: { id: true, name: true },
  });

  const withPoints = await Promise.all(
    users.map(async (u) => ({
      ...u,
      points: await calculateUserPoints(u.id),
    }))
  );

  const winner = withPoints.sort((a, b) => b.points - a.points)[0];

  res.json({
    success: true,
    data: winner ? { name: winner.name, points: winner.points } : null,
  });
});
