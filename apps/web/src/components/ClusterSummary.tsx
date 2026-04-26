import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Sparkles, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useState } from 'react';
import { cn, getRegionColor } from '../lib/utils';
import type { PerspectiveRegion } from '../types';

interface ClusterData {
  topic: string;
  articleCount: number;
  regions: PerspectiveRegion[];
  articles: Array<{
    id: string;
    title: string;
    source: string;
    perspective: PerspectiveRegion;
    sentiment: string;
    url: string;
  }>;
  summary?: {
    topic: string;
    summary: string;
    perspectives: Array<{
      region: PerspectiveRegion;
      stance: string;
      keyPoints: string[];
    }>;
    commonGround: string[];
    divergences: string[];
    generatedAt: string;
  };
}

interface ApiResponse {
  success: boolean;
  data: ClusterData[];
  meta?: {
    aiAvailable: boolean;
  };
}

async function fetchClusters(withSummaries: boolean): Promise<ApiResponse> {
  const url = withSummaries
    ? '/api/analysis/clusters?summaries=true'
    : '/api/analysis/clusters';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch clusters');
  return response.json();
}

const REGION_COLORS_HEX: Record<PerspectiveRegion, string> = {
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

function ClusterCard({ cluster, isExpanded, onToggle }: {
  cluster: ClusterData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="glass-panel rounded-xl border border-[#00f0ff]/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-[#00f0ff]/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
            {cluster.topic}
          </span>
          <span className="rounded-md bg-[#0a0e1a] border border-[#00f0ff]/20 px-2 py-0.5 text-[10px] font-mono text-[#00f0ff]">
            {cluster.articleCount} Artikel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {cluster.regions.map((region) => (
              <div
                key={region}
                className="h-2 w-2 rounded-full"
                title={REGION_LABELS[region]}
                style={{
                  backgroundColor: REGION_COLORS_HEX[region],
                  boxShadow: `0 0 6px ${REGION_COLORS_HEX[region]}`,
                }}
              />
            ))}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[#00f0ff]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#00f0ff]/10 p-4 space-y-4">
          {/* AI Summary */}
          {cluster.summary && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#bf00ff]">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider">KI-Zusammenfassung</span>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed font-mono">
                {cluster.summary.summary}
              </p>

              {/* Perspectives */}
              <div className="grid gap-3 sm:grid-cols-2">
                {cluster.summary.perspectives.map((p) => (
                  <div
                    key={p.region}
                    className="rounded-lg bg-[#0a0e1a] p-3 border-l-2"
                    style={{ borderColor: REGION_COLORS_HEX[p.region] }}
                  >
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
                      {REGION_LABELS[p.region]}
                    </p>
                    <p className="text-xs text-gray-300">{p.stance}</p>
                    {p.keyPoints.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {p.keyPoints.map((point, i) => (
                          <li key={i} className="text-[10px] text-gray-400 flex items-start gap-1 font-mono">
                            <span className="text-[#00f0ff]">-</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Common Ground & Divergences */}
              <div className="grid gap-3 sm:grid-cols-2">
                {cluster.summary.commonGround.length > 0 && (
                  <div className="rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 p-3">
                    <p className="text-[10px] font-mono text-[#00ff88] uppercase tracking-wider mb-2">
                      Ubereinstimmungen
                    </p>
                    <ul className="space-y-1">
                      {cluster.summary.commonGround.map((item, i) => (
                        <li key={i} className="text-[10px] text-gray-300 font-mono">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {cluster.summary.divergences.length > 0 && (
                  <div className="rounded-lg bg-[#ff0044]/10 border border-[#ff0044]/30 p-3">
                    <p className="text-[10px] font-mono text-[#ff0044] uppercase tracking-wider mb-2">
                      Abweichungen
                    </p>
                    <ul className="space-y-1">
                      {cluster.summary.divergences.map((item, i) => (
                        <li key={i} className="text-[10px] text-gray-300 font-mono">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Article List */}
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
              Artikel in diesem Cluster:
            </p>
            <div className="space-y-2">
              {cluster.articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-sm p-2 rounded-md border border-transparent hover:border-[#00f0ff]/30 hover:bg-[#00f0ff]/5 transition-all group cursor-pointer"
                >
                  <div
                    className={cn(
                      'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                      getRegionColor(article.perspective)
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-[#00f0ff]/70">[{article.source}]</span>
                    <span className="text-xs text-gray-300 ml-1 truncate block group-hover:text-[#00f0ff] transition-colors">
                      {article.title}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClusterSummary() {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [loadSummaries, setLoadSummaries] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['clusters', loadSummaries],
    queryFn: () => fetchClusters(loadSummaries),
    staleTime: 5 * 60 * 1000,
  });

  const toggleCluster = (topic: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const handleLoadSummaries = () => {
    setLoadSummaries(true);
    refetch();
  };

  if (error) {
    return (
      <div className="glass-panel rounded-xl p-6 border border-[#00f0ff]/20">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-[#ff0044]" />
          <p className="text-sm font-mono text-gray-400">Fehler beim Laden der Cluster</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
            <Layers className="h-5 w-5 text-[#00f0ff]" />
          </div>
          <h2 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
            Themen-Cluster
          </h2>
        </div>
        {!loadSummaries && (
          <button
            onClick={handleLoadSummaries}
            disabled={isFetching}
            className="btn-cyber btn-cyber-primary flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-mono uppercase tracking-wider">KI-Analyse laden</span>
          </button>
        )}
      </div>

      {isLoading || isFetching ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
            <span className="text-[10px] font-mono text-[#00f0ff]/70 uppercase tracking-wider">
              {loadSummaries ? 'Generiere KI-Zusammenfassungen...' : 'Lade Cluster...'}
            </span>
          </div>
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="space-y-3">
          {data.data.map((cluster) => (
            <ClusterCard
              key={cluster.topic}
              cluster={cluster}
              isExpanded={expandedClusters.has(cluster.topic)}
              onToggle={() => toggleCluster(cluster.topic)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-6 border border-[#00f0ff]/20 text-center">
          <p className="text-sm font-mono text-gray-400">Keine Cluster verfugbar</p>
          <p className="mt-1 text-[10px] font-mono text-gray-500">
            Es werden mindestens 3 Artikel aus 2 Regionen benotigt.
          </p>
        </div>
      )}

      {data?.meta?.aiAvailable === false && loadSummaries && (
        <p className="text-[10px] font-mono text-[#ffee00] text-center">
          KI-Service nicht verfugbar. Zeige Basis-Analyse.
        </p>
      )}
    </div>
  );
}
