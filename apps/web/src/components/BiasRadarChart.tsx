import { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { Radar as RadarIcon } from 'lucide-react';
import type { NewsArticle } from '../types';

interface BiasRadarChartProps {
  articles: NewsArticle[];
  className?: string;
}

interface BiasMetric {
  dimension: string;
  usa: number;
  europa: number;
  deutschland: number;
  nahost: number;
  tuerkei: number;
  russland: number;
  china: number;
  asien: number;
  afrika: number;
  lateinamerika: number;
  ozeanien: number;
  kanada: number;
  alternative: number;
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

export function BiasRadarChart({ articles, className }: BiasRadarChartProps) {
  const biasData = useMemo(() => {
    // Group articles by perspective
    const byPerspective = articles.reduce((acc, article) => {
      if (!acc[article.perspective]) {
        acc[article.perspective] = [];
      }
      acc[article.perspective].push(article);
      return acc;
    }, {} as Record<string, NewsArticle[]>);

    // Calculate metrics for each perspective
    const dimensions = [
      'Artikelanzahl',
      'Negativität',
      'Positivität',
      'Themenbreite',
      'Aktualität',
    ];

    const maxArticles = Math.max(
      ...Object.values(byPerspective).map((arr) => arr.length),
      1
    );

    return dimensions.map((dimension) => {
      const metric: BiasMetric = {
        dimension,
        usa: 0,
        europa: 0,
        deutschland: 0,
        nahost: 0,
        tuerkei: 0,
        russland: 0,
        china: 0,
        asien: 0,
        afrika: 0,
        lateinamerika: 0,
        ozeanien: 0,
        kanada: 0,
        alternative: 0,
      };

      Object.entries(byPerspective).forEach(([perspective, perspectiveArticles]) => {
        const key = perspective as keyof Omit<BiasMetric, 'dimension'>;

        switch (dimension) {
          case 'Artikelanzahl':
            metric[key] = (perspectiveArticles.length / maxArticles) * 100;
            break;
          case 'Negativität':
            metric[key] =
              (perspectiveArticles.filter((a) => a.sentiment === 'negative').length /
                Math.max(perspectiveArticles.length, 1)) *
              100;
            break;
          case 'Positivität':
            metric[key] =
              (perspectiveArticles.filter((a) => a.sentiment === 'positive').length /
                Math.max(perspectiveArticles.length, 1)) *
              100;
            break;
          case 'Themenbreite': {
            const uniqueTopics = new Set(perspectiveArticles.flatMap((a) => a.topics));
            metric[key] = Math.min(uniqueTopics.size * 10, 100);
            break;
          }
          case 'Aktualität': {
            const now = Date.now();
            const avgAge =
              perspectiveArticles.reduce((sum, a) => {
                if (!a.publishedAt) return sum;
                const publishedDate = typeof a.publishedAt === 'string' ? new Date(a.publishedAt) : a.publishedAt;
                const age = now - publishedDate.getTime();
                return sum + age;
              }, 0) / Math.max(perspectiveArticles.length, 1);
            // Convert to score (newer = higher score)
            const hourAge = avgAge / (1000 * 60 * 60);
            metric[key] = Math.max(0, 100 - hourAge * 2);
            break;
          }
        }
      });

      return metric;
    });
  }, [articles]);

  const activePerspectives = useMemo(() => {
    const perspectives = new Set(articles.map((a) => a.perspective));
    return Array.from(perspectives);
  }, [articles]);

  if (articles.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 glass-panel rounded-xl border border-[#00f0ff]/20 ${className}`}>
        <p className="text-sm font-mono text-gray-400">Keine Daten verfügbar</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={className}
    >
      <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-[#ff6600]/10 border border-[#ff6600]/30 flex items-center justify-center">
            <RadarIcon className="h-5 w-5 text-[#ff6600]" />
          </div>
          <h3 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
            Bias-Analyse nach Perspektive
          </h3>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={biasData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="rgba(0,240,255,0.15)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            />

            {activePerspectives.map((perspective) => (
              <Radar
                key={perspective}
                name={PERSPECTIVE_LABELS[perspective] || perspective}
                dataKey={perspective}
                stroke={PERSPECTIVE_COLORS[perspective]}
                fill={PERSPECTIVE_COLORS[perspective]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}

            <Legend
              wrapperStyle={{ paddingTop: 20, fontFamily: 'JetBrains Mono', fontSize: '10px' }}
              formatter={(value) => (
                <span className="text-gray-300">{value}</span>
              )}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 14, 26, 0.95)',
                border: '1px solid rgba(0,240,255,0.3)',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
              }}
              labelStyle={{ color: '#00f0ff' }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Legend with counts */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {activePerspectives.map((perspective) => {
            const count = articles.filter((a) => a.perspective === perspective).length;
            return (
              <div
                key={perspective}
                className="flex items-center gap-2 rounded-lg bg-[#0a0e1a] border border-gray-700/50 px-3 py-2"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: PERSPECTIVE_COLORS[perspective],
                    boxShadow: `0 0 6px ${PERSPECTIVE_COLORS[perspective]}`,
                  }}
                />
                <span className="text-[10px] font-mono text-gray-300">
                  {PERSPECTIVE_LABELS[perspective]}
                </span>
                <span className="ml-auto text-[10px] font-mono text-[#00f0ff]">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
