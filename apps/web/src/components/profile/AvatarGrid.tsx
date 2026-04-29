import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AvatarPreset } from '../../types/gamification';
import type { PerspectiveRegion } from '../../types';

interface AvatarGridProps {
  presets: AvatarPreset[];
  region: PerspectiveRegion;
  regionLabel: string;
  selectedId: string | null;
  onSelect: (preset: AvatarPreset) => void;
}

export function AvatarGrid({ presets, region, regionLabel, selectedId, onSelect }: AvatarGridProps) {
  const regionPresets = presets.filter((p) => p.region === region);

  if (regionPresets.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">
        {regionLabel}
      </h4>
      <div className="grid grid-cols-5 gap-3">
        {regionPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            className={cn(
              'relative group',
              'w-16 h-16 rounded-xl overflow-hidden',
              'border-2 transition-all',
              selectedId === preset.id
                ? 'border-[#00f0ff] ring-2 ring-[#00f0ff]/50'
                : 'border-gray-700 hover:border-gray-500'
            )}
            title={`${preset.name} (${preset.era})`}
            aria-label={`Select ${preset.name} from ${preset.era}`}
          >
            {/* Avatar Image */}
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-2xl">
              {/* Placeholder initials until real images */}
              {preset.name.charAt(0)}
            </div>

            {/* Selection indicator */}
            {selectedId === preset.id && (
              <div className="absolute inset-0 bg-[#00f0ff]/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-[#00f0ff]" />
              </div>
            )}

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {preset.name}
              <span className="text-gray-400 ml-1">({preset.era})</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
