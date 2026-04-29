import { Filter, CheckSquare, Square } from 'lucide-react';
import { useAppStore } from '../store';
import { cn, getRegionLabel } from '../lib/utils';
import type { PerspectiveRegion } from '../types';

const ALL_REGIONS: PerspectiveRegion[] = [
  'afrika', 'alternative', 'asien', 'china', 'deutschland', 'europa', 'kanada',
  'lateinamerika', 'nahost', 'ozeanien', 'russland', 'tuerkei', 'usa',
];

// Alphabetically sorted with optimized colors (no similar colors adjacent)
// Regions use 🌍/🌏/🌎 globes, Countries use 🇺🇸 flags
// Split into two rows: First row ends at Kanada, Second row starts at Lateinamerika
const sourceRegionsRow1: { id: PerspectiveRegion; icon: string; color: string }[] = [
  { id: 'afrika', icon: '🌍', color: '#10b981' },        // emerald green - region
  { id: 'alternative', icon: '📰', color: '#8b5cf6' },   // violet - category
  { id: 'asien', icon: '🌏', color: '#f97316' },         // orange - region
  { id: 'china', icon: '🇨🇳', color: '#eab308' },        // yellow - country
  { id: 'deutschland', icon: '🇩🇪', color: '#06b6d4' },  // sky blue - country
  { id: 'europa', icon: '🌍', color: '#a855f7' },        // purple - region (Weltkugel)
  { id: 'kanada', icon: '🇨🇦', color: '#dc2626' },       // red - country
];

const sourceRegionsRow2: { id: PerspectiveRegion; icon: string; color: string }[] = [
  { id: 'lateinamerika', icon: '🌎', color: '#14b8a6' }, // teal - region
  { id: 'nahost', icon: '🌍', color: '#f59e0b' },        // amber - region
  { id: 'ozeanien', icon: '🌊', color: '#0ea5e9' },      // light blue - region
  { id: 'russland', icon: '🇷🇺', color: '#ef4444' },     // rose - country
  { id: 'tuerkei', icon: '🇹🇷', color: '#ec4899' },      // pink - country
  { id: 'usa', icon: '🇺🇸', color: '#00f0ff' },          // cyan - country
];

export function SourceFilter() {
  const { filters, toggleRegion, setRegions } = useAppStore();

  const selectAll = () => setRegions(ALL_REGIONS);
  const selectNone = () => setRegions([]);
  const allSelected = filters.regions.length === ALL_REGIONS.length;
  const noneSelected = filters.regions.length === 0;

  const renderRegionButton = (region: typeof sourceRegionsRow1[0]) => {
    const isSelected = filters.regions.includes(region.id);
    return (
      <button
        key={region.id}
        onClick={() => toggleRegion(region.id)}
        className={cn(
          'perspective-filter-btn flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all',
          isSelected
            ? 'text-white'
            : 'text-gray-500 hover:text-gray-300'
        )}
        style={{
          backgroundColor: isSelected ? `${region.color}20` : 'transparent',
          borderColor: isSelected ? `${region.color}50` : 'rgba(255,255,255,0.1)',
          borderWidth: '1px',
          borderStyle: 'solid',
          color: isSelected ? region.color : undefined,
          boxShadow: isSelected ? `0 0 10px ${region.color}20` : 'none',
        }}
      >
        <span className="text-xs">{region.icon}</span>
        <span className="hidden sm:inline">{getRegionLabel(region.id)}</span>
      </button>
    );
  };

  return (
    <div className="space-y-1.5">
      {/* Label with All/None buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-500">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-[10px] font-mono uppercase tracking-wider">Perspectives</span>
          <span className="text-[9px] font-mono text-[#00f0ff]">
            {filters.regions.length}/{ALL_REGIONS.length}
          </span>
        </div>

        {/* All/None Quick Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={selectAll}
            disabled={allSelected}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all',
              allSelected
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-[#00f0ff] hover:bg-[#00f0ff]/10 border border-[#00f0ff]/30'
            )}
            title="Select All"
          >
            <CheckSquare className="h-3 w-3" />
            <span className="hidden sm:inline">All</span>
          </button>
          <button
            onClick={selectNone}
            disabled={noneSelected}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all',
              noneSelected
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:bg-gray-700/30 border border-gray-600/30'
            )}
            title="Deselect All"
          >
            <Square className="h-3 w-3" />
            <span className="hidden sm:inline">None</span>
          </button>
        </div>
      </div>

      {/* Region Buttons - Responsive Grid */}
      <div className="space-y-1">
        {/* Mobile: Single scrollable row */}
        <div className="flex flex-wrap gap-1.5 sm:hidden overflow-x-auto pb-2 -mx-1 px-1">
          {[...sourceRegionsRow1, ...sourceRegionsRow2].map(renderRegionButton)}
        </div>

        {/* Desktop: Two Rows */}
        <div className="hidden sm:block space-y-1">
          {/* Row 1: Afrika to Kanada */}
          <div className="flex flex-wrap gap-1.5">
            {sourceRegionsRow1.map(renderRegionButton)}
          </div>

          {/* Row 2: Lateinamerika to USA */}
          <div className="flex flex-wrap gap-1.5">
            {sourceRegionsRow2.map(renderRegionButton)}
          </div>
        </div>
      </div>
    </div>
  );
}
