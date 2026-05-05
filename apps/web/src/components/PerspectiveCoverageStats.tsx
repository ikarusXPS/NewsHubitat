import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Loader2, BarChart3, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface CoverageGapDetail {
  perspective: string;
  currentCount: number;
  expectedCount: number;
  deficit: number;
  severity: 'critical' | 'high' | 'medium';
}

interface OverRepresentedDetail {
  perspective: string;
  count: number;
  percentageOfTotal: number;
}

interface CoverageGapsResponse {
  success: boolean;
  data: {
    totalArticles: number;
    avgCoveragePerPerspective: number;
    maxCoverage: number;
    coverageDistribution: Record<string, number>;
    gaps: {
      count: number;
      details: CoverageGapDetail[];
      recommendations: Array<{ perspective: string; recommendation: string }>;
    };
    overRepresented: {
      count: number;
      details: OverRepresentedDetail[];
    };
  };
}

const PERSPECTIVE_COLORS: Record<string, string> = {
  western: '#3b82f6',
  'middle-east': '#22c55e',
  turkish: '#ef4444',
  russian: '#dc2626',
  chinese: '#eab308',
  alternative: '#06b6d4',
  afrika: '#84cc16',
  asien: '#f59e0b',
  deutschland: '#1e40af',
  europa: '#8b5cf6',
  kanada: '#f87171',
  lateinamerika: '#fbbf24',
  nahost: '#10b981',
  ozeanien: '#14b8a6',
  tuerkei: '#dc2626',
  usa: '#3b82f6',
};

const PERSPECTIVE_LABELS: Record<string, string> = {
  western: 'Western',
  'middle-east': 'Middle East',
  turkish: 'Turkish',
  russian: 'Russian',
  chinese: 'Chinese',
  alternative: 'Alternative',
  afrika: 'Afrika',
  asien: 'Asien',
  deutschland: 'Deutschland',
  europa: 'Europa',
  kanada: 'Kanada',
  lateinamerika: 'Lateinamerika',
  nahost: 'Nahost',
  ozeanien: 'Ozeanien',
  tuerkei: 'Türkei',
  usa: 'USA',
};

// TODO(api-fetch-wrapper): see todos/pending/40-07-shared-api-fetch.md
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('newshub-auth-token') ?? '';
}

async function fetchCoverageGaps(): Promise<CoverageGapsResponse> {
  const response = await fetch('/api/analysis/coverage-gaps', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Failed to fetch coverage gaps');
  return response.json();
}

export function PerspectiveCoverageStats({ className }: { className?: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coverage-gaps'],
    queryFn: fetchCoverageGaps,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className={cn('glass-panel rounded-xl border border-[#00f0ff]/20 p-8', className)}>
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 text-[#00f0ff] animate-spin" />
          <span className="text-sm font-mono text-gray-400">Analysiere Perspektiven-Coverage...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className={cn('glass-panel rounded-xl border border-[#ff0044]/20 p-6', className)}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-[#ff0044] mx-auto mb-2" />
          <p className="text-sm font-mono text-gray-400">Fehler beim Laden der Coverage-Daten</p>
        </div>
      </div>
    );
  }

  const { totalArticles, avgCoveragePerPerspective, gaps, overRepresented, coverageDistribution } = data.data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-panel rounded-xl border border-[#00f0ff]/20 overflow-hidden', className)}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#00f0ff]/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-[#00f0ff]" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
              Perspektiven-Verteilung
            </h3>
            <p className="text-[10px] font-mono text-gray-500">
              {totalArticles} Artikel • Ø {avgCoveragePerPerspective} pro Perspektive
            </p>
          </div>
        </div>
      </div>

      {/* Coverage Distribution Chart */}
      <div className="p-4 border-b border-[#00f0ff]/10 bg-[#0a0e1a]/30">
        <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
          Artikel pro Perspektive
        </h4>
        <div className="space-y-2">
          {Object.entries(coverageDistribution)
            .sort((a, b) => b[1] - a[1])
            .map(([perspective, count]) => {
              const percentage = (count / totalArticles) * 100;
              const isGap = gaps.details.some((g) => g.perspective === perspective);
              const isOver = overRepresented.details.some((o) => o.perspective === perspective);

              return (
                <div key={perspective} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-gray-300">{PERSPECTIVE_LABELS[perspective] || perspective}</span>
                    <span className={cn(
                      'font-bold',
                      isGap ? 'text-[#ff0044]' : isOver ? 'text-[#ffee00]' : 'text-[#00f0ff]'
                    )}>
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0a0e1a] border border-gray-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: isGap
                          ? '#ff0044'
                          : isOver
                          ? '#ffee00'
                          : PERSPECTIVE_COLORS[perspective] || '#00f0ff',
                        boxShadow: `0 0 8px ${isGap ? '#ff004440' : isOver ? '#ffee0040' : `${PERSPECTIVE_COLORS[perspective]}40`}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Gaps Section */}
      {gaps.count > 0 && (
        <div className="p-4 border-b border-[#00f0ff]/10">
          <h4 className="text-[10px] font-mono text-[#ff0044] uppercase tracking-wider mb-3 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Unterrepräsentierte Perspektiven ({gaps.count})
          </h4>
          <div className="space-y-2">
            {gaps.details.slice(0, 5).map((gap) => (
              <div
                key={gap.perspective}
                className={cn(
                  'p-3 rounded-lg border',
                  gap.severity === 'critical'
                    ? 'bg-[#ff0044]/10 border-[#ff0044]/30'
                    : gap.severity === 'high'
                    ? 'bg-[#ff6600]/10 border-[#ff6600]/30'
                    : 'bg-[#ffee00]/10 border-[#ffee00]/30'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-white">
                    {PERSPECTIVE_LABELS[gap.perspective] || gap.perspective}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider',
                      gap.severity === 'critical'
                        ? 'bg-[#ff0044]/20 text-[#ff0044] border-[#ff0044]/40'
                        : gap.severity === 'high'
                        ? 'bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]/40'
                        : 'bg-[#ffee00]/20 text-[#ffee00] border-[#ffee00]/40'
                    )}
                  >
                    {gap.severity}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400">
                  <span>
                    Aktuell: <span className="text-[#ff0044] font-bold">{gap.currentCount}</span>
                  </span>
                  <span>
                    Erwartet: <span className="text-[#00f0ff] font-bold">{gap.expectedCount}</span>
                  </span>
                  <span>
                    Defizit: <span className="text-[#ff6600] font-bold">{gap.deficit}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Over-represented Section */}
      {overRepresented.count > 0 && (
        <div className="p-4 border-b border-[#00f0ff]/10 bg-[#0a0e1a]/30">
          <h4 className="text-[10px] font-mono text-[#ffee00] uppercase tracking-wider mb-3 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Überrepräsentierte Perspektiven ({overRepresented.count})
          </h4>
          <div className="space-y-2">
            {overRepresented.details.slice(0, 3).map((over) => (
              <div
                key={over.perspective}
                className="p-2 rounded-lg bg-[#ffee00]/5 border border-[#ffee00]/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-white">
                    {PERSPECTIVE_LABELS[over.perspective] || over.perspective}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-400">
                      {over.count} Artikel
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#ffee00]">
                      {over.percentageOfTotal}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {gaps.recommendations.length > 0 && (
        <div className="p-4 bg-[#0a0e1a]/30">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/20">
            <Info className="h-4 w-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[10px] font-mono text-[#00f0ff] uppercase tracking-wider mb-2">
                Empfehlungen
              </h5>
              <ul className="space-y-1">
                {gaps.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="text-[10px] font-mono text-gray-400 leading-relaxed">
                    • {rec.recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
