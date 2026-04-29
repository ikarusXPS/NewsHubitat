import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Trophy, Globe2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AchievementUnlock } from '../types/gamification';

interface AchievementToastProps {
  achievement: AchievementUnlock | null;
  onClose: () => void;
  duration?: number;
}

const ACHIEVEMENT_ICONS = {
  badge: Award,
  'region-avatars': Globe2,
  'weekly-champion': Trophy,
};

const ACHIEVEMENT_COLORS = {
  badge: { bg: '#bf00ff', glow: 'rgba(191,0,255,0.4)' },
  'region-avatars': { bg: '#00f0ff', glow: 'rgba(0,240,255,0.4)' },
  'weekly-champion': { bg: '#ffee00', glow: 'rgba(255,238,0,0.4)' },
};

export function AchievementToast({ achievement, onClose, duration = 5000 }: AchievementToastProps) {
  useEffect(() => {
    if (achievement && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [achievement, duration, onClose]);

  if (!achievement) return null;

  const Icon = ACHIEVEMENT_ICONS[achievement.type] || Award;
  const colors = ACHIEVEMENT_COLORS[achievement.type] || ACHIEVEMENT_COLORS.badge;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="fixed top-20 right-6 z-50 max-w-sm"
        >
          <div
            className={cn(
              'glass-panel rounded-xl p-4 border-2',
              'flex items-start gap-4'
            )}
            style={{
              borderColor: colors.bg,
              boxShadow: `0 0 30px ${colors.glow}, 0 0 60px ${colors.glow}`,
            }}
          >
            {/* Icon with glow animation */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: 2,
                ease: 'easeInOut',
              }}
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${colors.bg}30` }}
            >
              <Icon className="h-8 w-8" style={{ color: colors.bg }} />
            </motion.div>

            {/* Content */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h4
                  className="text-lg font-bold font-mono"
                  style={{ color: colors.bg }}
                >
                  {achievement.type === 'badge'
                    ? 'Badge Earned!'
                    : achievement.type === 'region-avatars'
                      ? 'Avatars Unlocked!'
                      : 'Weekly Champion!'}
                </h4>
                <p className="text-sm text-gray-300 mt-1">{achievement.message}</p>
                {achievement.badgeName && (
                  <div
                    className="inline-block mt-2 px-2 py-1 rounded text-xs font-mono"
                    style={{
                      backgroundColor: `${colors.bg}20`,
                      color: colors.bg,
                    }}
                  >
                    {achievement.badgeName}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
