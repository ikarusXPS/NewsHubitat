import { motion } from 'framer-motion';
import { Crown, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '../../types/gamification';

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
}

const PODIUM_CONFIG = {
  1: { height: 140, color: '#ffee00', glow: 'rgba(255,238,0,0.4)', icon: Crown },
  2: { height: 100, color: '#c0c0c0', glow: 'rgba(192,192,192,0.3)', icon: Medal },
  3: { height: 72, color: '#cd7f32', glow: 'rgba(205,127,50,0.3)', icon: Medal },
} as const;

export function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  // Reorder: 2nd, 1st, 3rd for visual display
  const displayOrder = [entries[1], entries[0], entries[2]].filter(Boolean);

  if (displayOrder.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-4 mb-8 px-4">
      {displayOrder.map((entry, idx) => {
        const rank = entry.rank as 1 | 2 | 3;
        const config = PODIUM_CONFIG[rank];

        return (
          <motion.div
            key={entry.userId}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: idx * 0.15, duration: 0.4 }}
            className="flex flex-col items-center"
            style={{ order: rank === 1 ? 2 : rank === 2 ? 1 : 3 }}
          >
            {/* User Card */}
            <div
              className="glass-panel rounded-xl p-4 mb-3 text-center relative"
              style={{
                borderColor: `${config.color}40`,
                boxShadow: `0 0 20px ${config.glow}`,
                minWidth: rank === 1 ? '140px' : '120px',
              }}
            >
              {/* Rank Badge */}
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: config.color,
                  color: '#000',
                  boxShadow: `0 0 10px ${config.glow}`,
                }}
              >
                {rank}
              </div>

              {/* Avatar */}
              <div className={rank === 1 ? 'text-5xl mb-2' : 'text-4xl mb-2'}>
                {entry.selectedPresetAvatar ? (
                  entry.name.charAt(0)
                ) : (
                  <div
                    className="mx-auto rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center text-white font-bold"
                    style={{ width: rank === 1 ? 56 : 48, height: rank === 1 ? 56 : 48 }}
                  >
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className={rank === 1 ? 'font-bold text-white text-base' : 'font-bold text-white text-sm'}>
                {entry.name}
              </div>

              {/* Points */}
              <div
                className={rank === 1 ? 'font-mono font-bold mt-1 text-lg' : 'font-mono font-bold mt-1 text-base'}
                style={{ color: config.color }}
              >
                {entry.points.toLocaleString()}
                <span className="text-xs ml-1 opacity-70">XP</span>
              </div>

              {/* Level */}
              <div className="mt-2 flex items-center justify-center gap-1">
                <span className="text-[10px] font-mono text-gray-500">Lv.</span>
                <span className="text-xs font-bold text-[#00f0ff]">{entry.level}</span>
              </div>
            </div>

            {/* Podium */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: config.height }}
              transition={{ delay: 0.3 + idx * 0.1, duration: 0.5, ease: 'easeOut' }}
              className="w-24 rounded-t-lg"
              style={{
                backgroundColor: `${config.color}20`,
                borderTop: `3px solid ${config.color}`,
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
