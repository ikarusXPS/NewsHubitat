import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  AlertCircle,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronRight,
  Globe2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { NewsArticle, PerspectiveRegion } from '../types';

interface CoverageGap {
  topic: string;
  coveredBy: PerspectiveRegion[];
  missingFrom: PerspectiveRegion[];
  articleCount: number;
  importance: 'low' | 'medium' | 'high';
}

interface CoverageGapFinderProps {
  articles: NewsArticle[];
  className?: string;
}

const PERSPECTIVE_COLORS: Record<string, string> = {
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

const PERSPECTIVE_LABELS: Record<string, string> = {
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

const ALL_PERSPECTIVES: PerspectiveRegion[] = [
  'usa',
  'europa',
  'deutschland',
  'nahost',
  'tuerkei',
  'russland',
  'china',
  'asien',
  'afrika',
  'lateinamerika',
  'ozeanien',
  'kanada',
  'alternative',
];

export function CoverageGapFinder({ articles, className }: CoverageGapFinderProps) {
  const [selectedGap, setSelectedGap] = useState<CoverageGap | null>(null);
  const [showOnlyGaps, setShowOnlyGaps] = useState(true);

  const { gaps, topicCoverage, perspectiveCounts } = useMemo(() => {
    // Get all unique topics
    const topicMap = new Map<
      string,
      { perspectives: Set<PerspectiveRegion>; count: number }
    >();

    articles.forEach((article) => {
      article.topics.forEach((topic) => {
        const existing = topicMap.get(topic) || {
          perspectives: new Set<PerspectiveRegion>(),
          count: 0,
        };
        existing.perspectives.add(article.perspective);
        existing.count++;
        topicMap.set(topic, existing);
      });
    });

    // Identify gaps
    const gaps: CoverageGap[] = [];
    const topicCoverage: { topic: string; coverage: number; count: number }[] = [];

    // Get perspectives that actually have articles
    const activePerspectives = new Set(articles.map((a) => a.perspective));
    const activePerspectiveList = ALL_PERSPECTIVES.filter((p) =>
      activePerspectives.has(p)
    );

    topicMap.forEach((data, topic) => {
      const coveredBy = Array.from(data.perspectives);
      const missingFrom = activePerspectiveList.filter(
        (p) => !data.perspectives.has(p)
      );

      const coverage = coveredBy.length / activePerspectiveList.length;
      topicCoverage.push({ topic, coverage, count: data.count });

      // Only consider it a gap if at least one perspective is missing
      if (missingFrom.length > 0 && data.count >= 2) {
        gaps.push({
          topic,
          coveredBy,
          missingFrom,
          articleCount: data.count,
          importance:
            data.count >= 5
              ? 'high'
              : data.count >= 3
              ? 'medium'
              : 'low',
        });
      }
    });

    // Sort gaps by importance and article count
    gaps.sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
        return importanceOrder[a.importance] - importanceOrder[b.importance];
      }
      return b.articleCount - a.articleCount;
    });

    // Sort topic coverage by coverage percentage (ascending, so gaps first)
    topicCoverage.sort((a, b) => a.coverage - b.coverage);

    // Count articles per perspective
    const perspectiveCounts = articles.reduce((acc, a) => {
      acc[a.perspective] = (acc[a.perspective] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { gaps, topicCoverage, perspectiveCounts };
  }, [articles]);

  const displayedTopics = showOnlyGaps
    ? topicCoverage.filter((t) => t.coverage < 1)
    : topicCoverage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-panel rounded-xl border border-[#00f0ff]/20 overflow-hidden', className)}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#00f0ff]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#ff6600]/10 border border-[#ff6600]/30 flex items-center justify-center">
              <Search className="h-5 w-5 text-[#ff6600]" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
                Coverage Gap Finder
              </h3>
              <p className="text-[10px] font-mono text-gray-500">
                {gaps.length} Lücken in {Object.keys(perspectiveCounts).length} Perspektiven
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOnlyGaps(!showOnlyGaps)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all border',
              showOnlyGaps
                ? 'bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]/50'
                : 'bg-[#0a0e1a] text-gray-400 border-gray-700 hover:border-gray-600'
            )}
          >
            {showOnlyGaps ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Nur Lücken
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Alle Topics
              </>
            )}
          </button>
        </div>
      </div>

      {/* Perspective overview */}
      <div className="p-4 border-b border-[#00f0ff]/10 bg-[#0a0e1a]/30">
        <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
          Artikel pro Perspektive
        </h4>
        <div className="flex flex-wrap gap-2">
          {ALL_PERSPECTIVES.map((perspective) => {
            const count = perspectiveCounts[perspective] || 0;
            const isActive = count > 0;
            return (
              <div
                key={perspective}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 border transition-colors',
                  isActive
                    ? 'bg-[#0a0e1a] border-gray-700/50'
                    : 'bg-[#0a0e1a]/50 border-gray-800 opacity-50'
                )}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: isActive ? PERSPECTIVE_COLORS[perspective] : '#4b5563',
                    boxShadow: isActive ? `0 0 6px ${PERSPECTIVE_COLORS[perspective]}` : 'none',
                  }}
                />
                <span className="text-[10px] font-mono text-gray-300">
                  {PERSPECTIVE_LABELS[perspective]}
                </span>
                <span className="text-[10px] font-mono text-[#00f0ff]">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gaps list */}
      <div className="max-h-80 overflow-y-auto">
        {displayedTopics.length === 0 ? (
          <div className="p-8 text-center">
            <Globe2 className="h-12 w-12 text-[#00ff88] mx-auto mb-3" style={{ filter: 'drop-shadow(0 0 10px #00ff88)' }} />
            <p className="text-sm font-mono text-gray-300">Keine Coverage-Lücken gefunden!</p>
            <p className="text-[10px] font-mono text-gray-500 mt-1">
              Alle Topics werden von allen Perspektiven abgedeckt.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {displayedTopics.slice(0, 15).map((item) => {
              const gap = gaps.find((g) => g.topic === item.topic);
              const isSelected = selectedGap?.topic === item.topic;

              return (
                <motion.div
                  key={item.topic}
                  className={cn(
                    'p-4 cursor-pointer transition-colors',
                    isSelected ? 'bg-[#00f0ff]/5' : 'hover:bg-[#0a0e1a]/50'
                  )}
                  onClick={() =>
                    setSelectedGap(isSelected ? null : gap || null)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium text-white truncate">
                          {item.topic}
                        </span>
                        {gap && (
                          <span
                            className={cn(
                              'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider',
                              gap.importance === 'high'
                                ? 'bg-[#ff0044]/20 text-[#ff0044] border-[#ff0044]/40'
                                : gap.importance === 'medium'
                                ? 'bg-[#ffee00]/20 text-[#ffee00] border-[#ffee00]/40'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/40'
                            )}
                          >
                            {gap.importance === 'high'
                              ? 'WICHTIG'
                              : gap.importance === 'medium'
                              ? 'MITTEL'
                              : 'GERING'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-gray-500">
                          {item.count} Artikel
                        </span>
                        <span className="text-[10px] font-mono text-[#00f0ff]">
                          {Math.round(item.coverage * 100)}% Coverage
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Coverage bar */}
                      <div className="w-24 h-2 rounded-full bg-[#0a0e1a] border border-gray-700/50 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.coverage * 100}%`,
                            backgroundColor:
                              item.coverage >= 0.8
                                ? '#00ff88'
                                : item.coverage >= 0.5
                                ? '#ffee00'
                                : '#ff0044',
                            boxShadow: `0 0 6px ${item.coverage >= 0.8
                              ? '#00ff8840'
                              : item.coverage >= 0.5
                              ? '#ffee0040'
                              : '#ff004440'}`,
                          }}
                        />
                      </div>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 text-gray-500 transition-transform',
                          isSelected && 'rotate-90 text-[#00f0ff]'
                        )}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isSelected && gap && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t border-[#00f0ff]/10"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-[10px] font-mono text-[#00ff88] uppercase tracking-wider mb-2">
                              Abgedeckt von
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {gap.coveredBy.map((p) => (
                                <span
                                  key={p}
                                  className="text-[10px] font-mono px-2 py-1 rounded-md border"
                                  style={{
                                    backgroundColor: `${PERSPECTIVE_COLORS[p]}15`,
                                    borderColor: `${PERSPECTIVE_COLORS[p]}40`,
                                    color: PERSPECTIVE_COLORS[p],
                                  }}
                                >
                                  {PERSPECTIVE_LABELS[p]}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-[10px] font-mono text-[#ff0044] uppercase tracking-wider mb-2 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Fehlt bei
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {gap.missingFrom.map((p) => (
                                <span
                                  key={p}
                                  className="text-[10px] font-mono px-2 py-1 rounded-md bg-[#ff0044]/10 text-[#ff0044] border border-[#ff0044]/30"
                                >
                                  {PERSPECTIVE_LABELS[p]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#00f0ff]/10 bg-[#0a0e1a]/30">
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
          <TrendingUp className="h-4 w-4 text-[#ff0044]" />
          <span>
            <span className="text-[#ff0044]">{gaps.filter((g) => g.importance === 'high').length}</span> wichtige Lücken
            erfordern Aufmerksamkeit
          </span>
        </div>
      </div>
    </motion.div>
  );
}
