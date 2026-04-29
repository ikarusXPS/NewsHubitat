import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Search, Frame, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, getRegionColor } from '../lib/utils';
import { useAppStore } from '../store';
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

/**
 * Phase 38 D-14 LOCKED: structured per-region framing produced by
 * AIService.generateFramingAnalysis. The legacy heuristic shape (region
 * counts + per-region sentiment scores) is gone — the new shape carries
 * narrative / omissions / vocabulary / evidence quotes per region.
 */
interface FramingPerspective {
  narrative: string;
  omissions: string[];
  vocabulary: string[];
  evidenceQuotes: string[];
}

interface FramingData {
  topic: string;
  locale: string;
  perspectives: Partial<Record<PerspectiveRegion, FramingPerspective>>;
  aiGenerated: boolean;
}

interface ApiResponse {
  success: boolean;
  data: FramingData;
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

export function FramingComparison() {
  const { t } = useTranslation('credibility');
  const language = useAppStore((s) => s.language);

  const [topic, setTopic] = useState('');
  const [searchTopic, setSearchTopic] = useState<string | undefined>();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<FramingData>({
    queryKey: ['framing', topic, language],
    queryFn: async () => {
      const r = await fetch(
        `/api/analysis/framing?topic=${encodeURIComponent(searchTopic ?? '')}&locale=${encodeURIComponent(language)}`
      );
      if (!r.ok) throw new Error('Framing fetch failed');
      const body: ApiResponse = await r.json();
      return body.data;
    },
    enabled: !!searchTopic && searchTopic.trim().length >= 2,
    staleTime: 24 * 60 * 60 * 1000, // matches server cache TTL per D-17
  });

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!topic) return SUGGESTED_TOPICS.slice(0, 6);
    const lower = topic.toLowerCase();
    return SUGGESTED_TOPICS.filter(
      (s) => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower
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
      setRecentSearches((prev) => {
        const updated = [topic, ...prev.filter((s) => s !== topic)].slice(0, 5);
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
    setRecentSearches((prev) => {
      const updated = [suggestion, ...prev.filter((s) => s !== suggestion)].slice(0, 5);
      return updated;
    });
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

      {data && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-gray-400">
              Thema: <span className="text-[#00f0ff]">{data.topic}</span>
            </p>
            {data.aiGenerated && (
              <span className="text-[10px] uppercase tracking-wide bg-[#00f0ff]/10 text-[#00f0ff] px-2 py-0.5 rounded">
                {t('framing.aiGenerated')}
              </span>
            )}
          </div>

          {/* Per-region structured framing grid (D-14) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.perspectives).map(([region, p]) => {
              if (!p) return null;
              return (
                <div key={region} className="glass-panel rounded-xl p-4 space-y-3">
                  <h3 className="signal-label flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-mono text-white',
                        getRegionColor(region)
                      )}
                    >
                      {REGION_LABELS[region as PerspectiveRegion] || region.toUpperCase()}
                    </span>
                  </h3>

                  <section>
                    <h4 className="text-[10px] text-gray-400 uppercase tracking-wide">
                      {t('framing.section.narrative')}
                    </h4>
                    <p className="text-xs text-gray-200">{p.narrative}</p>
                  </section>

                  {p.omissions.length > 0 ? (
                    <section>
                      <h4 className="text-[10px] text-gray-400 uppercase tracking-wide">
                        {t('framing.section.omissions')}
                      </h4>
                      <ul className="text-xs text-gray-300 list-disc list-inside space-y-0.5">
                        {p.omissions.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {p.vocabulary.length > 0 ? (
                    <section>
                      <h4 className="text-[10px] text-gray-400 uppercase tracking-wide">
                        {t('framing.section.vocabulary')}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {p.vocabulary.map((v, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {p.evidenceQuotes.length > 0 ? (
                    <section>
                      <h4 className="text-[10px] text-gray-400 uppercase tracking-wide">
                        {t('framing.section.evidenceQuotes')}
                      </h4>
                      <ul className="text-xs text-gray-400 italic space-y-0.5">
                        {p.evidenceQuotes.map((q, i) => (
                          <li key={i}>&ldquo;{q}&rdquo;</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              );
            })}
          </div>

          {Object.keys(data.perspectives).length === 0 && (
            <p className="py-4 text-center text-xs font-mono text-gray-500 italic">
              {t('framing.noData')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
