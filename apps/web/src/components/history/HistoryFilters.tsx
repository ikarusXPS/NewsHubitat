import { useState, useCallback } from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PerspectiveRegion, Sentiment } from '../../types';

const REGIONS: { id: PerspectiveRegion; label: string; color: string }[] = [
  { id: 'usa', label: 'USA', color: '#00f0ff' },
  { id: 'europa', label: 'Europa', color: '#a855f7' },
  { id: 'deutschland', label: 'DE', color: '#06b6d4' },
  { id: 'nahost', label: 'Nahost', color: '#f59e0b' },
  { id: 'tuerkei', label: 'Turkei', color: '#ec4899' },
  { id: 'russland', label: 'Russland', color: '#ef4444' },
  { id: 'china', label: 'China', color: '#eab308' },
  { id: 'asien', label: 'Asien', color: '#f97316' },
  { id: 'afrika', label: 'Afrika', color: '#10b981' },
  { id: 'lateinamerika', label: 'Latam', color: '#14b8a6' },
  { id: 'ozeanien', label: 'Ozeanien', color: '#0ea5e9' },
  { id: 'kanada', label: 'Kanada', color: '#dc2626' },
  { id: 'alternative', label: 'Alt', color: '#00ff88' },
];

const DATE_PRESETS = [
  { id: 'today', label: 'Today', days: 1 },
  { id: 'yesterday', label: 'Yesterday', days: 2 },
  { id: '7d', label: 'Last 7 Days', days: 7 },
  { id: '30d', label: 'Last 30 Days', days: 30 },
  { id: 'all', label: 'All Time', days: null },
] as const;

export interface HistoryFilters {
  search: string;
  regions: PerspectiveRegion[];
  datePreset: string;
  customDateFrom: Date | null;
  customDateTo: Date | null;
  sentiment: Sentiment | null;
}

interface HistoryFiltersProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
}

export function HistoryFilters({ filters, onFiltersChange }: HistoryFiltersProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Debounced search (300ms per D-77)
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onFiltersChange({ ...filters, search: value });
    },
    [filters, onFiltersChange]
  );

  const toggleRegion = (region: PerspectiveRegion) => {
    const newRegions = filters.regions.includes(region)
      ? filters.regions.filter((r) => r !== region)
      : [...filters.regions, region];
    onFiltersChange({ ...filters, regions: newRegions });
  };

  const setDatePreset = (preset: string) => {
    onFiltersChange({
      ...filters,
      datePreset: preset,
      customDateFrom: null,
      customDateTo: null,
    });
    setShowDatePicker(false);
  };

  const setSentiment = (sentiment: Sentiment | null) => {
    onFiltersChange({ ...filters, sentiment });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      regions: [],
      datePreset: 'all',
      customDateFrom: null,
      customDateTo: null,
      sentiment: null,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.regions.length > 0 ||
    filters.datePreset !== 'all' ||
    filters.sentiment;

  return (
    <div className="glass-panel rounded-xl p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search reading history..."
          value={filters.search}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-mono focus:border-[#00f0ff] focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-xs font-mono text-gray-500">
          <Filter className="h-3 w-3" />
          <span>Filters:</span>
        </div>

        {/* Region Toggles - Scrollable on mobile */}
        <div className="flex flex-wrap gap-1 max-w-full overflow-x-auto">
          {REGIONS.map((region) => (
            <button
              key={region.id}
              onClick={() => toggleRegion(region.id)}
              className={cn(
                'px-2 py-1 rounded text-xs font-mono transition-all whitespace-nowrap',
                filters.regions.includes(region.id)
                  ? 'text-black font-medium'
                  : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700'
              )}
              style={{
                backgroundColor: filters.regions.includes(region.id) ? region.color : undefined,
              }}
            >
              {region.label}
            </button>
          ))}
        </div>
      </div>

      {/* Second Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Preset */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-all',
              filters.datePreset !== 'all'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            )}
          >
            <Calendar className="h-3 w-3" />
            {DATE_PRESETS.find((p) => p.id === filters.datePreset)?.label || 'Date'}
          </button>
          {showDatePicker && (
            <div className="absolute top-full mt-1 left-0 z-10 bg-gray-900 border border-gray-700 rounded-lg p-2 min-w-[140px]">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded text-xs font-mono transition-colors',
                    filters.datePreset === preset.id
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sentiment Filter */}
        <div className="flex gap-1">
          {(['positive', 'neutral', 'negative'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSentiment(filters.sentiment === s ? null : s)}
              className={cn(
                'px-2 py-1 rounded text-xs font-mono transition-all',
                filters.sentiment === s
                  ? s === 'positive'
                    ? 'bg-[#00ff88]/20 text-[#00ff88]'
                    : s === 'negative'
                      ? 'bg-[#ff0044]/20 text-[#ff0044]'
                      : 'bg-gray-500/20 text-gray-300'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// Default filters exported from separate file: historyFilterDefaults.ts
