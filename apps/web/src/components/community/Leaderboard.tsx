import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Loader2 } from 'lucide-react';
import { LeaderboardPodium } from './LeaderboardPodium';
import { LeaderboardRow } from './LeaderboardRow';
import { WeeklyWinnerBanner } from './WeeklyWinnerBanner';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/api';
import type { LeaderboardEntry, LeaderboardTimeFilter } from '../../types/gamification';

interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
  meta: { timeframe: string; total: number };
}

interface UserPositionResponse {
  success: boolean;
  data: LeaderboardEntry;
}

interface WeeklyWinnerResponse {
  success: boolean;
  data: { name: string; points: number } | null;
}

async function fetchLeaderboard(timeframe: LeaderboardTimeFilter): Promise<LeaderboardEntry[]> {
  const response = await fetch(`/api/leaderboard?timeframe=${timeframe}&limit=100`);
  if (!response.ok) throw new Error('Failed to fetch leaderboard');
  const data: LeaderboardResponse = await response.json();
  return data.data;
}

async function fetchUserPosition(timeframe: LeaderboardTimeFilter): Promise<LeaderboardEntry | null> {
  const response = await apiFetch(`/api/leaderboard/me?timeframe=${timeframe}`);
  if (!response.ok) return null;
  const data: UserPositionResponse = await response.json();
  return data.data;
}

async function fetchWeeklyWinner(): Promise<{ name: string; points: number } | null> {
  const response = await fetch('/api/leaderboard/weekly-winner');
  if (!response.ok) return null;
  const data: WeeklyWinnerResponse = await response.json();
  return data.data;
}

export function Leaderboard() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useAppStore();
  const [timeframe, setTimeframe] = useState<LeaderboardTimeFilter>('all-time');

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', timeframe],
    queryFn: () => fetchLeaderboard(timeframe),
    staleTime: 60_000,
  });

  const { data: userPosition } = useQuery({
    queryKey: ['leaderboard-me', timeframe],
    queryFn: () => fetchUserPosition(timeframe),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const { data: weeklyWinner } = useQuery({
    queryKey: ['weekly-winner'],
    queryFn: fetchWeeklyWinner,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const topThree = leaderboard?.slice(0, 3) || [];
  const restOfList = leaderboard?.slice(3) || [];
  const userInTop100 = leaderboard?.some((e) => e.userId === user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Winner Banner per D-58, D-59 */}
      {weeklyWinner && (
        <WeeklyWinnerBanner winnerName={weeklyWinner.name} points={weeklyWinner.points} />
      )}

      {/* Time Filter per D-57 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#00f0ff]" />
          <span className="text-sm font-mono text-gray-400">
            {language === 'de' ? 'Top Leser' : 'Top Contributors'}
          </span>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-gray-800/50">
          {([
            { id: 'all-time', label: language === 'de' ? 'Gesamt' : 'All Time' },
            { id: 'monthly', label: language === 'de' ? 'Monat' : 'This Month' },
            { id: 'weekly', label: language === 'de' ? 'Woche' : 'This Week' },
          ] as const).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTimeframe(filter.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-mono transition-all',
                timeframe === filter.id
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                  : 'text-gray-500 hover:text-white'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Podium for top 3 */}
      {topThree.length >= 3 && <LeaderboardPodium entries={topThree} />}

      {/* Rest of list (4-100) */}
      <div className="space-y-1">
        {restOfList.map((entry) => (
          <LeaderboardRow
            key={entry.userId}
            entry={entry}
            isCurrentUser={entry.userId === user?.id}
          />
        ))}
      </div>

      {/* User's position (pinned) per D-54 */}
      {isAuthenticated && userPosition && !userInTop100 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs font-mono text-gray-500 uppercase mb-2">
            {language === 'de' ? 'Deine Position' : 'Your Position'}
          </div>
          <LeaderboardRow entry={userPosition} isCurrentUser />
        </div>
      )}

      {/* Opt-out message */}
      {isAuthenticated && user && !(user as { showOnLeaderboard?: boolean }).showOnLeaderboard && (
        <p className="text-center text-sm text-gray-500">
          {language === 'de'
            ? 'Du bist nicht auf der Rangliste sichtbar. Aktiviere dies in den Einstellungen.'
            : "You're not visible on the leaderboard. Enable this in Settings."}
        </p>
      )}
    </div>
  );
}
