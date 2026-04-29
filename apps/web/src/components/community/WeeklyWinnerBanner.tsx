import { Trophy, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface WeeklyWinnerBannerProps {
  winnerName: string;
  points: number;
}

export function WeeklyWinnerBanner({ winnerName, points }: WeeklyWinnerBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl p-4 mb-6 border-[#ffee00]/30"
      style={{ boxShadow: '0 0 20px rgba(255,238,0,0.2)' }}
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-[#ffee00]/20">
          <Trophy className="h-6 w-6 text-[#ffee00]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#ffee00]" />
            <span className="text-sm font-mono text-[#ffee00]">Weekly Champion</span>
          </div>
          <p className="text-white">
            Last week's champion: <span className="font-bold">@{winnerName}</span> with{' '}
            <span className="font-mono text-[#ffee00]">{points.toLocaleString()}</span> XP!
          </p>
        </div>
      </div>
    </motion.div>
  );
}
