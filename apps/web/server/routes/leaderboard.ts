import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../services/authService';
export const leaderboardRoutes = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// Tier multipliers for point calculation (D-01)
const tierMultiplier: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 4,
  platinum: 10,
};

// Type for user with badges from Prisma query
interface UserWithBadges {
  id: string;
  name: string;
  avatarUrl: string | null;
  selectedPresetAvatar: string | null;
  badges: Array<{
    badge: {
      tier: string;
      threshold: number;
    };
  }>;
}

/**
 * Calculate points from user's badges in memory (D-01)
 * No database query - operates on pre-fetched data
 */
export function calculatePointsFromBadges(
  badges: Array<{ badge: { tier: string; threshold: number } }>
): number {
  return badges.reduce((sum, ub) => {
    const multiplier = tierMultiplier[ub.badge.tier] || 1;
    return sum + ub.badge.threshold * multiplier;
  }, 0);
}

/**
 * Build leaderboard entry from user with badges
 */
export function toLeaderboardEntry(user: UserWithBadges) {
  const points = calculatePointsFromBadges(user.badges);
  return {
    userId: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    selectedPresetAvatar: user.selectedPresetAvatar,
    points,
    level: Math.floor(points / 100) + 1,
    streak: 0, // Would need reading history per user
    badgeCount: user.badges.length,
  };
}

// Get leaderboard per D-51, D-57 - REFACTORED (D-01)
leaderboardRoutes.get('/', async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as string) || 'all-time';
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);

  // Single query with eager loading - eliminates N+1 (D-01)
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

  // Build leaderboard and compute points in memory (D-01)
  const leaderboard = users.map(toLeaderboardEntry);

  // Sort by points descending
  leaderboard.sort((a, b) => b.points - a.points);

  // Add ranks and limit
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

// Get user's position per D-54 - REFACTORED (D-03)
leaderboardRoutes.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const timeframe = (req.query.timeframe as string) || 'all-time';

  // Single query for all users with badges - batch approach (D-03)
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true, emailVerified: true },
    select: {
      id: true,
      badges: {
        include: { badge: true },
      },
    },
  });

  // Calculate all points in memory
  const allPoints = users.map((u) => ({
    userId: u.id,
    points: calculatePointsFromBadges(u.badges),
  }));

  // Sort and find user's position
  allPoints.sort((a, b) => b.points - a.points);
  const userRank = allPoints.findIndex((p) => p.userId === userId) + 1;
  const userPoints = allPoints.find((p) => p.userId === userId)?.points || 0;

  // Separate query for user details (only 1 additional query)
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

// Get weekly winner per D-58, D-59 - REFACTORED
leaderboardRoutes.get('/weekly-winner', async (_req: Request, res: Response) => {
  // Check if we're on Monday (show last week's winner)
  const now = new Date();
  const dayOfWeek = now.getDay();

  if (dayOfWeek !== 1) {
    // Not Monday
    res.json({ success: true, data: null });
    return;
  }

  // Single query with badges - eliminates N+1
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true, emailVerified: true },
    select: {
      id: true,
      name: true,
      badges: {
        include: { badge: true },
      },
    },
  });

  // Calculate points and find winner
  const withPoints = users.map((u) => ({
    ...u,
    points: calculatePointsFromBadges(u.badges),
  }));

  const winner = withPoints.sort((a, b) => b.points - a.points)[0];

  res.json({
    success: true,
    data: winner ? { name: winner.name, points: winner.points } : null,
  });
});
