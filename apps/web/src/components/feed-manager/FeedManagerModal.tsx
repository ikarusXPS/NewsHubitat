import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Rss,
  ToggleLeft,
  ToggleRight,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { SourceRow } from './SourceRow';
import { CustomFeedForm } from './CustomFeedForm';
import type { PerspectiveRegion, NewsSource } from '../../types';

interface FeedManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: NewsSource[];
}

const REGION_LABELS: Record<PerspectiveRegion, string> = {
  usa: 'USA',
  europa: 'Europa',
  deutschland: 'Deutschland',
  nahost: 'Nahost',
  tuerkei: 'Turkei',
  russland: 'Russland',
  china: 'China',
  asien: 'Asien',
  afrika: 'Afrika',
  lateinamerika: 'Lateinamerika',
  ozeanien: 'Ozeanien',
  kanada: 'Kanada',
  alternative: 'Alternative',
};

const REGION_COLORS: Record<PerspectiveRegion, string> = {
  usa: '#00f0ff',
  europa: '#a855f7',
  deutschland: '#06b6d4',
  nahost: '#f59e0b',
  tuerkei: '#ec4899',
  russland: '#ef4444',
  china: '#eab308',
  asien: '#f97316',
  afrika: '#10b981',
  lateinamerika: '#14b8a6',
  ozeanien: '#0ea5e9',
  kanada: '#dc2626',
  alternative: '#8b5cf6',
};

export function FeedManagerModal({ isOpen, onClose, sources }: FeedManagerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomFeedForm, setShowCustomFeedForm] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<Set<PerspectiveRegion>>(new Set());

  const {
    feedState,
    toggleSource,
    toggleAllSourcesInRegion,
    enableAllSources,
    disableAllSources,
    addCustomFeed,
  } = useAppStore();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Group sources by region
  const sourcesByRegion = useMemo(() => {
    const grouped: Partial<Record<PerspectiveRegion, NewsSource[]>> = {};
    sources.forEach((source) => {
      if (!grouped[source.region]) {
        grouped[source.region] = [];
      }
      grouped[source.region]!.push(source);
    });
    return grouped;
  }, [sources]);

  // Filter sources by search
  const filteredSourcesByRegion = useMemo(() => {
    if (!searchQuery.trim()) return sourcesByRegion;

    const query = searchQuery.toLowerCase();
    const filtered: Partial<Record<PerspectiveRegion, NewsSource[]>> = {};

    Object.entries(sourcesByRegion).forEach(([region, regionSources]) => {
      const matchingSources = regionSources?.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.country.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query)
      );
      if (matchingSources && matchingSources.length > 0) {
        filtered[region as PerspectiveRegion] = matchingSources;
      }
    });

    return filtered;
  }, [sourcesByRegion, searchQuery]);

  // Count enabled sources per region
  const getRegionStats = (region: PerspectiveRegion) => {
    const regionSources = sourcesByRegion[region] || [];
    const enabledCount = regionSources.filter((s) => {
      // If not in enabledSources, default to enabled
      return feedState.enabledSources[s.id] !== false;
    }).length;
    return { total: regionSources.length, enabled: enabledCount };
  };

  // Check if all sources in region are enabled
  const isRegionFullyEnabled = (region: PerspectiveRegion) => {
    const stats = getRegionStats(region);
    return stats.enabled === stats.total;
  };

  const toggleRegionExpand = (region: PerspectiveRegion) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  };

  const totalEnabled = useMemo(() => {
    return sources.filter((s) => feedState.enabledSources[s.id] !== false).length;
  }, [sources, feedState.enabledSources]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[85vh] rounded-xl border border-[#00f0ff]/20 bg-[#0a0e1a] shadow-2xl shadow-[#00f0ff]/5 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                <Rss className="h-5 w-5 text-[#00f0ff]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Feed Manager</h2>
                <p className="text-xs text-gray-500 font-mono">
                  {totalEnabled}/{sources.length} sources enabled
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search & Actions */}
          <div className="p-4 border-b border-gray-800 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-[#00f0ff]/50 focus:outline-none text-sm"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={enableAllSources}
                  className="px-3 py-1.5 rounded-md text-xs font-mono bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 hover:bg-[#00ff88]/20 transition-colors"
                >
                  <Check className="h-3 w-3 inline mr-1" />
                  Enable All
                </button>
                <button
                  onClick={disableAllSources}
                  className="px-3 py-1.5 rounded-md text-xs font-mono bg-[#ff0044]/10 text-[#ff0044] border border-[#ff0044]/20 hover:bg-[#ff0044]/20 transition-colors"
                >
                  <X className="h-3 w-3 inline mr-1" />
                  Disable All
                </button>
              </div>

              <button
                onClick={() => setShowCustomFeedForm(true)}
                className="px-3 py-1.5 rounded-md text-xs font-mono bg-[#bf00ff]/10 text-[#bf00ff] border border-[#bf00ff]/20 hover:bg-[#bf00ff]/20 transition-colors"
              >
                <Plus className="h-3 w-3 inline mr-1" />
                Add Custom Feed
              </button>
            </div>
          </div>

          {/* Sources List */}
          <div className="overflow-y-auto max-h-[calc(85vh-220px)] p-4 space-y-2">
            {Object.entries(filteredSourcesByRegion).map(([region, regionSources]) => {
              const regionKey = region as PerspectiveRegion;
              const stats = getRegionStats(regionKey);
              const isExpanded = expandedRegions.has(regionKey);
              const isFullyEnabled = isRegionFullyEnabled(regionKey);
              const color = REGION_COLORS[regionKey];

              return (
                <div
                  key={region}
                  className="rounded-lg border border-gray-800 overflow-hidden"
                >
                  {/* Region Header */}
                  <div
                    className="flex items-center justify-between p-3 bg-gray-900/50 cursor-pointer hover:bg-gray-900 transition-colors"
                    onClick={() => toggleRegionExpand(regionKey)}
                  >
                    <div className="flex items-center gap-3">
                      <button className="p-1 hover:bg-gray-800 rounded transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium text-white">
                        {REGION_LABELS[regionKey]}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        {stats.enabled}/{stats.total}
                      </span>
                    </div>

                    {/* Region Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllSourcesInRegion(regionKey, !isFullyEnabled);
                      }}
                      className={cn(
                        'p-1.5 rounded-md transition-colors',
                        isFullyEnabled
                          ? 'text-[#00ff88] hover:bg-[#00ff88]/10'
                          : 'text-gray-500 hover:bg-gray-800'
                      )}
                      title={isFullyEnabled ? 'Disable all in region' : 'Enable all in region'}
                    >
                      {isFullyEnabled ? (
                        <ToggleRight className="h-5 w-5" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Sources in Region */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 space-y-1 bg-gray-950/50">
                          {regionSources?.map((source) => (
                            <SourceRow
                              key={source.id}
                              source={source}
                              isEnabled={feedState.enabledSources[source.id] !== false}
                              onToggle={() => toggleSource(source.id)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Custom Feeds Section */}
            {feedState.customFeeds.length > 0 && (
              <div className="rounded-lg border border-[#bf00ff]/30 overflow-hidden mt-4">
                <div className="p-3 bg-[#bf00ff]/10 flex items-center gap-3">
                  <Globe className="h-4 w-4 text-[#bf00ff]" />
                  <span className="text-sm font-medium text-[#bf00ff]">Custom Feeds</span>
                  <span className="text-xs font-mono text-gray-500">
                    {feedState.customFeeds.length}
                  </span>
                </div>
                <div className="p-2 space-y-1 bg-gray-950/50">
                  {feedState.customFeeds.map((feed) => (
                    <div
                      key={feed.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Rss className="h-4 w-4 text-[#bf00ff]" />
                        <span className="text-sm text-white">{feed.name}</span>
                        <span className="text-xs text-gray-500 font-mono">
                          {REGION_LABELS[feed.region]}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-mono px-2 py-0.5 rounded',
                          feed.isActive
                            ? 'bg-[#00ff88]/10 text-[#00ff88]'
                            : 'bg-gray-700 text-gray-400'
                        )}
                      >
                        {feed.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {Object.keys(filteredSourcesByRegion).length === 0 && (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No sources match your search</p>
              </div>
            )}
          </div>

          {/* Custom Feed Form Modal */}
          {showCustomFeedForm && (
            <CustomFeedForm
              onClose={() => setShowCustomFeedForm(false)}
              onAdd={(feed) => {
                addCustomFeed(feed);
                setShowCustomFeedForm(false);
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
