import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PerspectiveRegion } from '../types';

interface RegionOption {
  id: PerspectiveRegion;
  name: string;
  emoji: string;
  description: string;
}

const REGION_OPTIONS: RegionOption[] = [
  { id: 'usa', name: 'USA', emoji: '🇺🇸', description: 'United States perspective' },
  { id: 'europa', name: 'Europa', emoji: '🇪🇺', description: 'European coverage' },
  { id: 'deutschland', name: 'Deutschland', emoji: '🇩🇪', description: 'German media' },
  { id: 'nahost', name: 'Nahost', emoji: '🕌', description: 'Middle East sources' },
  { id: 'tuerkei', name: 'Türkei', emoji: '🇹🇷', description: 'Turkish perspective' },
  { id: 'russland', name: 'Russland', emoji: '🇷🇺', description: 'Russian media' },
  { id: 'china', name: 'China', emoji: '🇨🇳', description: 'Chinese viewpoint' },
  { id: 'asien', name: 'Asien', emoji: '🌏', description: 'Asian coverage' },
  { id: 'afrika', name: 'Afrika', emoji: '🌍', description: 'African sources' },
  { id: 'lateinamerika', name: 'Lateinamerika', emoji: '🌎', description: 'Latin American perspective' },
  { id: 'ozeanien', name: 'Ozeanien', emoji: '🦘', description: 'Oceania coverage' },
  { id: 'kanada', name: 'Kanada', emoji: '🇨🇦', description: 'Canadian media' },
  { id: 'alternative', name: 'Alternative', emoji: '📡', description: 'Independent sources' },
];

interface RegionSelectorProps {
  selectedRegions: PerspectiveRegion[];
  onToggle: (region: PerspectiveRegion) => void;
}

export function RegionSelector({ selectedRegions, onToggle }: RegionSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {REGION_OPTIONS.map((region, index) => {
        const isSelected = selectedRegions.includes(region.id);

        return (
          <motion.button
            key={region.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            onClick={() => onToggle(region.id)}
            className={`
              relative p-4 rounded-lg border-2 transition-all
              ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }
            `}
          >
            {/* Checkmark */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-slate-900" />
              </motion.div>
            )}

            {/* Emoji */}
            <div className="text-3xl mb-2">{region.emoji}</div>

            {/* Name */}
            <div className={`font-semibold text-sm mb-1 ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
              {region.name}
            </div>

            {/* Description */}
            <div className="text-xs text-slate-400 leading-tight">
              {region.description}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
