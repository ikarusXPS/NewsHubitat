import { cn } from '../../lib/utils';
import type { LeaderboardEntry } from '../../types/gamification';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-lg transition-colors',
        isCurrentUser
          ? 'bg-[#00f0ff]/10 border border-[#00f0ff]/30'
          : 'hover:bg-gray-800/50'
      )}
    >
      {/* Rank */}
      <span
        className={cn(
          'w-8 text-center font-mono font-bold',
          isCurrentUser ? 'text-[#00f0ff]' : 'text-gray-500'
        )}
      >
        #{entry.rank}
      </span>

      {/* Avatar */}
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold">
        {entry.name.charAt(0).toUpperCase()}
      </div>

      {/* Name & Level */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">
          {entry.name}
          {isCurrentUser && (
            <span className="text-[10px] font-mono text-[#00f0ff] ml-2">(You)</span>
          )}
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Lv. {entry.level}
        </div>
      </div>

      {/* Streak */}
      <div className="text-center">
        <div className="text-sm font-mono text-[#ff6600]">{entry.streak}</div>
        <div className="text-[10px] text-gray-500">Streak</div>
      </div>

      {/* Points */}
      <div className="text-right">
        <div className="text-sm font-mono font-bold text-white">
          {entry.points.toLocaleString()}
        </div>
        <div className="text-[10px] text-gray-500">XP</div>
      </div>
    </div>
  );
}
