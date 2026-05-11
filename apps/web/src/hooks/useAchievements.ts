import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import type { AchievementUnlock } from '../types/gamification';
import { logger } from '../lib/logger';
import { apiFetch } from '../lib/api';

interface UseAchievementsResult {
  pendingUnlock: AchievementUnlock | null;
  dismissUnlock: () => void;
  checkBadgeProgress: () => Promise<void>;
}

// Calculate user stats from reading history
function calculateStats(
  readingHistory: Array<{ articleId: string; timestamp: number; readCount?: number }>,
  bookmarks: string[]
): {
  totalArticles: number;
  dailyStreak: number;
  earlyBirdCount: number;
  nightOwlCount: number;
  bookmarkCount: number;
} {
  const DAY = 24 * 60 * 60 * 1000;

  // Group by day for streak
  const dayMap = new Map<string, boolean>();
  let earlyBirdCount = 0;
  let nightOwlCount = 0;

  readingHistory.forEach((entry) => {
    const date = new Date(entry.timestamp);
    dayMap.set(date.toDateString(), true);

    const hour = date.getHours();
    if (hour < 6) earlyBirdCount++;
    if (hour >= 0 && hour < 6) nightOwlCount++; // Midnight to 6am
  });

  // Calculate streak
  let streak = 0;
  let checkDate = new Date();
  while (true) {
    const dayStr = checkDate.toDateString();
    if (dayMap.has(dayStr)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - DAY);
    } else if (streak === 0) {
      checkDate = new Date(checkDate.getTime() - DAY);
      if (!dayMap.has(checkDate.toDateString())) break;
    } else {
      break;
    }
  }

  return {
    totalArticles: readingHistory.length,
    dailyStreak: streak,
    earlyBirdCount,
    nightOwlCount,
    bookmarkCount: bookmarks.length,
  };
}

export function useAchievements(): UseAchievementsResult {
  const { user, isAuthenticated } = useAuth();
  const { readingHistory, bookmarkedArticles } = useAppStore();
  const [pendingUnlock, setPendingUnlock] = useState<AchievementUnlock | null>(null);
  const lastCheckedRef = useRef<number>(0);
  const previousStatsRef = useRef<{ articles: number; bookmarks: number }>({ articles: 0, bookmarks: 0 });

  const dismissUnlock = useCallback(() => {
    setPendingUnlock(null);
  }, []);

  const checkBadgeProgress = useCallback(async () => {
    if (!isAuthenticated || !user?.emailVerified) return;

    const stats = calculateStats(readingHistory, bookmarkedArticles);

    // Check for milestone crossings
    const prevStats = previousStatsRef.current;

    // Bookworm milestones
    const bookwormMilestones = [10, 50, 100, 500];
    for (const milestone of bookwormMilestones) {
      if (stats.totalArticles >= milestone && prevStats.articles < milestone) {
        const tier = milestone === 10 ? 'bronze' : milestone === 50 ? 'silver' : milestone === 100 ? 'gold' : 'platinum';
        setPendingUnlock({
          type: 'badge',
          badgeId: `bookworm-${tier}`,
          badgeName: `Bookworm (${tier.charAt(0).toUpperCase() + tier.slice(1)})`,
          message: `You've read ${milestone} articles!`,
        });

        // Persist to server
        try {
          await apiFetch('/api/badges/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              badgeId: `bookworm-${tier}`,
              progress: stats.totalArticles,
            }),
          });
        } catch (e) {
          logger.error('Failed to award badge:', e);
        }
        break; // Only show one unlock at a time
      }
    }

    // Curator milestones
    const curatorMilestones = [5, 20, 50, 100];
    for (const milestone of curatorMilestones) {
      if (stats.bookmarkCount >= milestone && prevStats.bookmarks < milestone) {
        const tier = milestone === 5 ? 'bronze' : milestone === 20 ? 'silver' : milestone === 50 ? 'gold' : 'platinum';
        setPendingUnlock({
          type: 'badge',
          badgeId: `curator-${tier}`,
          badgeName: `Curator (${tier.charAt(0).toUpperCase() + tier.slice(1)})`,
          message: `You've bookmarked ${milestone} articles!`,
        });
        break;
      }
    }

    // Update previous stats
    previousStatsRef.current = {
      articles: stats.totalArticles,
      bookmarks: stats.bookmarkCount,
    };
  }, [isAuthenticated, user, readingHistory, bookmarkedArticles]);

  // Check on history/bookmark changes (debounced)
  useEffect(() => {
    const now = Date.now();
    if (now - lastCheckedRef.current < 5000) return; // Debounce 5s

    lastCheckedRef.current = now;
    checkBadgeProgress();
  }, [readingHistory.length, bookmarkedArticles.length, checkBadgeProgress]);

  return {
    pendingUnlock,
    dismissUnlock,
    checkBadgeProgress,
  };
}
