import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Loader2,
  BarChart3,
  Shield,
  Scale,
  Info,
} from 'lucide-react';
import { SentimentChart } from '../components/SentimentChart';
import { ClusterSummary } from '../components/ClusterSummary';
import { FramingComparison } from '../components/FramingComparison';
import { BiasRadarChart } from '../components/BiasRadarChart';
import { CoverageGapFinder } from '../components/CoverageGapFinder';
import { PerspectiveCoverageStats } from '../components/PerspectiveCoverageStats';
import { CompareMode } from '../components/CompareMode';
import { cn } from '../lib/utils';
import type { NewsArticle, ApiResponse } from '../types';

async function fetchArticles(): Promise<ApiResponse<NewsArticle[]>> {
  const response = await fetch('/api/news?limit=100');
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

// Source data with separated political alignment and reliability
const SOURCE_DATA = [
  { name: 'Reuters', alignment: 50, reliability: 9 },
  { name: 'AP News', alignment: 48, reliability: 9 },
  { name: 'Al Jazeera', alignment: 35, reliability: 7 },
  { name: 'BBC', alignment: 45, reliability: 8 },
  { name: 'TRT World', alignment: 40, reliability: 6 },
  { name: 'RT', alignment: 25, reliability: 4 },
  { name: 'Xinhua', alignment: 30, reliability: 4 },
  { name: 'Fox News', alignment: 70, reliability: 5 },
  { name: 'MSNBC', alignment: 30, reliability: 5 },
];

// Feature explanation component
function FeatureInfo({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-[#0a0e1a]/50 border border-[#00f0ff]/10">
      <Info className="h-4 w-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="text-xs font-mono text-[#00f0ff] uppercase tracking-wider mb-1">{title}</h4>
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function Analysis() {
  const [showCompare, setShowCompare] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['analysis-articles'],
    queryFn: fetchArticles,
    staleTime: 5 * 60 * 1000,
  });

  const articles = data?.data || [];

  return (
    <div className="space-y-6" data-testid="analysis-ready">
      {/* Header - Cyber styled */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-[#00f0ff]" />
            <span className="gradient-text-cyber">PERSPEKTIVEN-ANALYSE</span>
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-1">
            Vergleiche die Berichterstattung verschiedener Medienregionen.
          </p>
        </div>
        <button
          onClick={() => setShowCompare(true)}
          className="btn-cyber btn-cyber-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span className="font-mono uppercase tracking-wider">Artikel vergleichen</span>
        </button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
            <span className="text-sm font-mono text-[#00f0ff]/70 uppercase tracking-wider">
              Analyzing data...
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* AI Cluster Summaries with explanation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <FeatureInfo
              title="Themen-Cluster (KI-Analyse)"
              description="Gruppiert Artikel automatisch nach Themen und zeigt, wie verschiedene Regionen dasselbe Thema behandeln. Die KI erkennt Übereinstimmungen und Abweichungen zwischen den Perspektiven."
            />
            <ClusterSummary />
          </motion.div>

          {/* Charts Row with explanations */}
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <FeatureInfo
                title="Sentiment nach Perspektive"
                description="Zeigt die emotionale Tendenz (positiv/negativ/neutral) der Berichterstattung pro Region. Ermöglicht den Vergleich, wie verschiedene Medien dieselben Ereignisse emotional einordnen."
              />
              <SentimentChart />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-3"
            >
              <FeatureInfo
                title="Framing-Vergleich"
                description="Analysiert, wie verschiedene Regionen ein Thema darstellen (framen). Suchen Sie nach einem Thema, um zu sehen, wie verschiedene Medien es unterschiedlich interpretieren."
              />
              <FramingComparison />
            </motion.div>
          </div>

          {/* New Analytics Row with explanations */}
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <FeatureInfo
                title="Bias-Radar (Multi-Dimensional)"
                description="Visualisiert verschiedene Dimensionen der Berichterstattung pro Perspektive: Artikelanzahl, Negativität, Positivität, Themenbreite und Aktualität. Zeigt, wo jede Region ihre Schwerpunkte setzt."
              />
              <BiasRadarChart articles={articles} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-3"
            >
              <FeatureInfo
                title="Coverage Gap Finder"
                description="Identifiziert Themen, die nur von bestimmten Regionen abgedeckt werden. Zeigt blinde Flecken in der Berichterstattung und hilft, einseitige Informationsquellen zu erkennen."
              />
              <CoverageGapFinder articles={articles} />
            </motion.div>
          </div>

          {/* Perspective Distribution Analytics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <FeatureInfo
              title="Perspektiven-Verteilung (Global)"
              description="Zeigt die gesamte Verteilung der Artikel über alle Perspektiven. Identifiziert unterrepräsentierte und überrepräsentierte Regionen, um ein ausgewogenes Informationsbild zu gewährleisten."
            />
            <PerspectiveCoverageStats />
          </motion.div>

          {/* Separated Source Analysis - Cyber styled */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Political Alignment Chart */}
            <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-[#00f0ff]" />
                </div>
                <div>
                  <h2 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
                    Politische Ausrichtung
                  </h2>
                  <p className="text-[10px] font-mono text-gray-500">
                    Links ← Neutral → Rechts
                  </p>
                </div>
              </div>

              <FeatureInfo
                title="Was zeigt diese Grafik?"
                description="Visualisiert die politische Tendenz jeder Quelle auf einer Skala von Links (0) über Neutral (50) bis Rechts (100). Basiert auf Analyse der Berichterstattung und redaktionellen Positionen."
              />

              <div className="mt-4 space-y-3">
                {/* Scale Legend */}
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-2">
                  <span className="text-[#3b82f6]">LINKS</span>
                  <span className="text-gray-400">NEUTRAL</span>
                  <span className="text-[#ef4444]">RECHTS</span>
                </div>
                <div className="h-1.5 rounded-full bg-gradient-to-r from-[#3b82f6] via-gray-500 to-[#ef4444] mb-4" />

                {SOURCE_DATA.map((source, idx) => (
                  <motion.div
                    key={source.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-xs font-mono text-gray-300 truncate">
                        {source.name}
                      </span>
                      <div className="flex-1 h-6 bg-[#0a0e1a] rounded-md border border-gray-700/50 relative overflow-hidden">
                        {/* Center line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />

                        {/* Position marker */}
                        <motion.div
                          initial={{ left: '50%' }}
                          animate={{ left: `${source.alignment}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: source.alignment < 40
                              ? '#3b82f6'
                              : source.alignment > 60
                                ? '#ef4444'
                                : '#6b7280',
                            boxShadow: `0 0 10px ${source.alignment < 40
                              ? '#3b82f6'
                              : source.alignment > 60
                                ? '#ef4444'
                                : '#6b7280'}`,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          'w-16 text-[10px] font-mono text-right',
                          source.alignment < 40
                            ? 'text-[#3b82f6]'
                            : source.alignment > 60
                              ? 'text-[#ef4444]'
                              : 'text-gray-400'
                        )}
                      >
                        {source.alignment < 40
                          ? 'Links'
                          : source.alignment > 60
                            ? 'Rechts'
                            : 'Neutral'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Reliability Chart */}
            <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-[#00ff88]" />
                </div>
                <div>
                  <h2 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
                    Zuverlässigkeits-Index
                  </h2>
                  <p className="text-[10px] font-mono text-gray-500">
                    Faktentreue & Quellenqualität
                  </p>
                </div>
              </div>

              <FeatureInfo
                title="Was zeigt diese Grafik?"
                description="Bewertet die Zuverlässigkeit jeder Quelle auf einer Skala von 1-10. Basiert auf Faktentreue, Quellenangaben, Korrekturen und journalistischen Standards."
              />

              <div className="mt-4 space-y-3">
                {/* Scale Legend */}
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-2">
                  <span className="text-[#ff0044]">GERING</span>
                  <span className="text-[#ffee00]">MITTEL</span>
                  <span className="text-[#00ff88]">HOCH</span>
                </div>

                {SOURCE_DATA.sort((a, b) => b.reliability - a.reliability).map((source, idx) => (
                  <motion.div
                    key={source.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-xs font-mono text-gray-300 truncate">
                        {source.name}
                      </span>
                      <div className="flex-1">
                        <div className="h-4 bg-[#0a0e1a] rounded-md border border-gray-700/50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${source.reliability * 10}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.05 }}
                            className="h-full rounded-md"
                            style={{
                              backgroundColor: source.reliability >= 7
                                ? '#00ff88'
                                : source.reliability >= 5
                                  ? '#ffee00'
                                  : '#ff0044',
                              boxShadow: `0 0 10px ${source.reliability >= 7
                                ? '#00ff8840'
                                : source.reliability >= 5
                                  ? '#ffee0040'
                                  : '#ff004440'}`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-20 justify-end">
                        <div className="flex gap-0.5">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                'h-3 w-1 rounded-sm transition-colors',
                                i < source.reliability
                                  ? source.reliability >= 7
                                    ? 'bg-[#00ff88]'
                                    : source.reliability >= 5
                                      ? 'bg-[#ffee00]'
                                      : 'bg-[#ff0044]'
                                  : 'bg-gray-700'
                              )}
                            />
                          ))}
                        </div>
                        <span
                          className={cn(
                            'text-xs font-mono',
                            source.reliability >= 7
                              ? 'text-[#00ff88]'
                              : source.reliability >= 5
                                ? 'text-[#ffee00]'
                                : 'text-[#ff0044]'
                          )}
                        >
                          {source.reliability}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Compare Mode Modal */}
      <CompareMode
        articles={articles}
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
      />
    </div>
  );
}
