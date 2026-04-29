import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Search, Frame, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { PerspectiveRegion } from '../types';

// Common search suggestions
const SUGGESTED_TOPICS = [
  'Ukraine',
  'Gaza',
  'Hamas',
  'Israel',
  'NATO',
  'China',
  'Taiwan',
  'Russia',
  'Wirtschaft',
  'Inflation',
  'Klimawandel',
  'AI',
  'Energie',
  'Migration',
  'EU',
  'USA',
];

interface FramingData {
  topic: string;
  regions: Record<string, { count: number; avgSentiment: number }>;
  framing?: Record<PerspectiveRegion, string>;
  bias?: Record<PerspectiveRegion, number>;
  aiGenerated: boolean;
}

interface ApiResponse {
  success: boolean;
  data: FramingData;
}

async function fetchFraming(topic?: string): Promise<ApiResponse> {
  const url = topic
    ? `/api/analysis/framing?topic=${encodeURIComponent(topic)}`
    : '/api/analysis/framing';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch framing data');
  return response.json();
}

const REGION_LABELS: Record<PerspectiveRegion, string> = {
  usa: 'USA',
  europa: 'Europa',
  deutschland: 'Deutschland',
  nahost: 'Nahost',
  tuerkei: 'Türkei',
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
  usa: '#3b82f6',
  europa: '#8b5cf6',
  deutschland: '#000000',
  nahost: '#22c55e',
  tuerkei: '#ef4444',
  russland: '#dc2626',
  china: '#eab308',
  asien: '#06b6d4',
  afrika: '#84cc16',
  lateinamerika: '#f59e0b',
  ozeanien: '#14b8a6',
  kanada: '#ef4444',
  alternative: '#06b6d4',
};

export function FramingComparison() {
  const [topic, setTopic] = useState('');
  const [searchTopic, setSearchTopic] = useState<string | undefined>();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['framing', searchTopic],
    queryFn: () => fetchFraming(searchTopic),
    staleTime: 5 * 60 * 1000,
  });

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!topic) return SUGGESTED_TOPICS.slice(0, 6);
    const lower = topic.toLowerCase();
    return SUGGESTED_TOPICS.filter(s =>
      s.toLowerCase().includes(lower) && s.toLowerCase() !== lower
    ).slice(0, 6);
  }, [topic]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic) {
      // Add to recent searches
      setRecentSearches(prev => {
        const updated = [topic, ...prev.filter(s => s !== topic)].slice(0, 5);
        return updated;
      });
    }
    setSearchTopic(topic || undefined);
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setTopic(suggestion);
    setSearchTopic(suggestion);
    setShowSuggestions(false);
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [suggestion, ...prev.filter(s => s !== suggestion)].slice(0, 5);
      return updated;
    });
  };

  const getSentimentLabel = (score: number): { label: string; color: string } => {
    if (score < -0.3) return { label: 'Negativ', color: 'text-[#ff0044]' };
    if (score > 0.3) return { label: 'Positiv', color: 'text-[#00ff88]' };
    return { label: 'Neutral', color: 'text-gray-400' };
  };

  const getSentimentBarPosition = (score: number): number => {
    // Convert score (-1 to 1) to percentage (0 to 100)
    return ((score + 1) / 2) * 100;
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-[#bf00ff]/10 border border-[#bf00ff]/30 flex items-center justify-center">
          <Frame className="h-5 w-5 text-[#bf00ff]" />
        </div>
        <h2 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
          Framing-Vergleich
        </h2>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00f0ff]/50 z-10" />
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Thema eingeben (z.B. Gaza, Hamas)"
              className="w-full rounded-lg bg-[#0a0e1a] border border-[#00f0ff]/20 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 font-mono focus:border-[#00f0ff]/50 focus:outline-none transition-colors"
            />

            {/* Autocomplete Suggestions */}
            <AnimatePresence>
              {showSuggestions && (filteredSuggestions.length > 0 || recentSearches.length > 0) && (
                <motion.div
                  ref={suggestionsRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-[#0a0e1a] border border-[#00f0ff]/30 shadow-lg shadow-[#00f0ff]/10 z-50 overflow-hidden"
                >
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && !topic && (
                    <div className="p-2 border-b border-gray-800">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 px-2">
                        <Clock className="h-3 w-3" />
                        Letzte Suchen
                      </div>
                      {recentSearches.map((search) => (
                        <button
                          key={search}
                          type="button"
                          onClick={() => handleSelectSuggestion(search)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm font-mono text-gray-300 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] rounded transition-colors"
                        >
                          <Clock className="h-3 w-3 text-gray-500" />
                          {search}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Trending/Suggested Topics */}
                  <div className="p-2">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 px-2">
                      <TrendingUp className="h-3 w-3" />
                      {topic ? 'Vorschläge' : 'Trending Topics'}
                    </div>
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-left text-sm font-mono text-gray-300 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] rounded transition-colors group"
                      >
                        <span>{suggestion}</span>
                        <ChevronRight className="h-3 w-3 text-gray-500 group-hover:text-[#00f0ff] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-cyber px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider disabled:opacity-50"
          >
            Analysieren
          </button>
        </div>
      </form>

      {error && (
        <p className="text-center text-sm font-mono text-[#ff0044]">
          Fehler beim Laden der Daten
        </p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
            <span className="text-[10px] font-mono text-[#00f0ff]/70 uppercase tracking-wider">
              Analyzing...
            </span>
          </div>
        </div>
      )}

      {data?.data && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-gray-400">
              Thema: <span className="text-[#00f0ff]">{data.data.topic}</span>
            </p>
            {data.data.aiGenerated && (
              <span className="rounded-md bg-[#bf00ff]/20 px-2 py-0.5 text-[10px] font-mono text-[#bf00ff] border border-[#bf00ff]/30">
                KI-analysiert
              </span>
            )}
          </div>

          {/* Sentiment Scale Legend */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
              <span className="text-[#ff0044]">Negativ</span>
              <span className="text-gray-400">Neutral</span>
              <span className="text-[#00ff88]">Positiv</span>
            </div>
            <div className="h-1.5 rounded-full bg-gradient-to-r from-[#ff0044] via-gray-500 to-[#00ff88]" />
          </div>

          {/* Region Sentiment Bars */}
          <div className="space-y-3">
            {Object.entries(data.data.regions).map(([region, stats]) => {
              const sentiment = getSentimentLabel(stats.avgSentiment);
              const position = getSentimentBarPosition(stats.avgSentiment);

              return (
                <div key={region} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: REGION_COLORS[region as PerspectiveRegion] || '#6b7280',
                          boxShadow: `0 0 6px ${REGION_COLORS[region as PerspectiveRegion] || '#6b7280'}`,
                        }}
                      />
                      <span className="text-xs font-mono text-white">
                        {REGION_LABELS[region as PerspectiveRegion] || region}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('text-[10px] font-mono', sentiment.color)}>
                        {sentiment.label}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {stats.count} Artikel
                      </span>
                    </div>
                  </div>

                  {/* Sentiment Position Indicator */}
                  <div className="relative h-4 rounded-md bg-[#0a0e1a] border border-gray-700/50">
                    <div
                      className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white"
                      style={{
                        left: `${Math.max(5, Math.min(95, position))}%`,
                        backgroundColor: REGION_COLORS[region as PerspectiveRegion] || '#6b7280',
                        boxShadow: `0 0 8px ${REGION_COLORS[region as PerspectiveRegion] || '#6b7280'}`,
                      }}
                    />
                  </div>

                  {/* AI-generated framing description */}
                  {data.data.framing?.[region as PerspectiveRegion] && (
                    <p className="text-[10px] font-mono text-gray-400 pl-4 border-l-2 border-[#00f0ff]/20 ml-1">
                      {data.data.framing[region as PerspectiveRegion]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {Object.keys(data.data.regions).length === 0 && (
            <p className="py-4 text-center text-sm font-mono text-gray-500">
              Keine Daten fur dieses Thema gefunden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
