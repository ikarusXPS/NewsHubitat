import { CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BADGE_RARITY_COLORS, type BadgeTier } from '../../types/gamification';

interface BadgeCardProps {
  name: string;
  description: string;
  tier: BadgeTier;
  iconType: string;
  isEarned: boolean;
  progress?: number;
  target?: number;
  onClick?: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
}

// Map icon types to emoji for simplicity (could use lucide icons)
const ICON_MAP: Record<string, string> = {
  'book-open': '\ud83d\udcd6',
  'graduation-cap': '\ud83c\udf93',
  globe: '\ud83c\udf0d',
  flame: '\ud83d\udd25',
  bookmark: '\ud83d\udccc',
  cpu: '\ud83e\udd16',
  sunrise: '\ud83c\udf05',
  moon: '\ud83c\udf19',
  trophy: '\ud83c\udfc6',
  'check-circle': '\u2714\ufe0f',
};

export function BadgeCard({
  name,
  description,
  tier,
  iconType,
  isEarned,
  progress,
  target,
  onClick,
  isSelectable,
  isSelected,
}: BadgeCardProps) {
  const colors = BADGE_RARITY_COLORS[tier];
  const icon = ICON_MAP[iconType] || '\ud83c\udfc5';

  return (
    <button
      onClick={onClick}
      disabled={!isSelectable}
      className={cn(
        'glass-panel rounded-xl p-4 text-left transition-all w-full',
        isEarned ? 'opacity-100' : 'opacity-50',
        isSelectable && 'hover:border-[#00f0ff]/50 cursor-pointer',
        isSelected && 'border-[#00f0ff] ring-2 ring-[#00f0ff]/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn('p-3 rounded-xl text-2xl', isEarned ? '' : 'grayscale')}
          style={{
            backgroundColor: isEarned ? `${colors.bg}20` : '#1a2236',
          }}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-white truncate">{name}</h4>
            <span
              className="text-[10px] font-mono uppercase px-2 py-0.5 rounded flex-shrink-0"
              style={{
                backgroundColor: `${colors.bg}20`,
                color: colors.text,
              }}
            >
              {tier}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{description}</p>

          {/* Progress bar */}
          {progress !== undefined && target && !isEarned && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                <span>Progress</span>
                <span>{progress}/{target}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (progress / target) * 100)}%`,
                    backgroundColor: colors.bg,
                  }}
                />
              </div>
            </div>
          )}

          {/* Earned indicator */}
          {isEarned && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-[#00ff88]">
              <CheckCircle className="h-3 w-3" />
              Earned
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
