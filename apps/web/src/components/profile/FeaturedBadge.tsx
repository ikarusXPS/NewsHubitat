import { Award, X } from 'lucide-react';
import { BADGE_RARITY_COLORS, type BadgeTier } from '../../types/gamification';

interface FeaturedBadgeProps {
  name: string;
  description: string;
  tier: BadgeTier;
  iconType: string;
  onRemove?: () => void;
}

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

export function FeaturedBadge({ name, description, tier, iconType, onRemove }: FeaturedBadgeProps) {
  const colors = BADGE_RARITY_COLORS[tier];
  const icon = ICON_MAP[iconType] || '\ud83c\udfc5';

  return (
    <div
      className="glass-panel rounded-xl p-6 relative"
      style={{
        borderColor: `${colors.bg}40`,
        boxShadow: `0 0 20px ${colors.bg}20`,
      }}
    >
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 hover:bg-gray-700 rounded"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      )}

      <div className="flex items-center gap-4">
        <div
          className="text-4xl p-4 rounded-xl"
          style={{ backgroundColor: `${colors.bg}20` }}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" style={{ color: colors.text }} />
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: colors.text }}
            >
              Featured Badge
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1">{name}</h3>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
