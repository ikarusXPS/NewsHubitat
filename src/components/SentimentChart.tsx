import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TrendingUp, Clock, X, ExternalLink } from 'lucide-react';
import { getRegionLabel, cn } from '../lib/utils';
import type { PerspectiveRegion, SentimentData } from '../types';

type TimeFilter = '24h' | '7d' | '30d' | 'all';

async function fetchSentimentData(timeFilter: TimeFilter): Promise<Record<PerspectiveRegion, SentimentData>> {
  // In a real app, the API would filter by time
  const response = await fetch(`/api/news/sentiment?timeRange=${timeFilter}`);
  if (!response.ok) throw new Error('Failed to fetch sentiment data');
  const result = await response.json();
  return result.data;
}

interface ClickedBar {
  region: string;
  sentiment: 'Positiv' | 'Negativ' | 'Neutral';
  count: number;
}

export function SentimentChart() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [clickedBar, setClickedBar] = useState<ClickedBar | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sentiment', timeFilter],
    queryFn: () => fetchSentimentData(timeFilter),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center glass-panel rounded-xl border border-[#00f0ff]/20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
          <span className="text-sm font-mono text-[#00f0ff]/70 uppercase tracking-wider">
            Loading data...
          </span>
        </div>
      </div>
    );
  }

  const chartData = data
    ? Object.entries(data).map(([region, stats]) => ({
        region: getRegionLabel(region),
        Positiv: stats.positive,
        Negativ: stats.negative,
        Neutral: stats.neutral,
      }))
    : [];

  if (!data || chartData.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-[#00f0ff]" />
          </div>
          <h2 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
            Sentiment nach Perspektive
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <TrendingUp className="h-12 w-12 text-gray-600 mb-3" />
          <p className="text-sm font-mono text-gray-400">Keine Sentiment-Daten verfügbar</p>
          <p className="text-xs font-mono text-gray-500 mt-1">
            Warte auf Artikel mit Sentiment-Analyse
          </p>
        </div>
      </div>
    );
  }

  const handleBarClick = (data: Record<string, unknown>, sentimentType: 'Positiv' | 'Negativ' | 'Neutral') => {
    setClickedBar({
      region: data.region as string,
      sentiment: sentimentType,
      count: data[sentimentType] as number,
    });
  };

  const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
    { id: '24h', label: '24h' },
    { id: '7d', label: '7 Tage' },
    { id: '30d', label: '30 Tage' },
    { id: 'all', label: 'Alle' },
  ];

  return (
    <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-[#00f0ff]" />
          </div>
          <h2 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
            Sentiment nach Perspektive
          </h2>
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-800/50">
          <Clock className="h-3 w-3 text-gray-500 ml-1" />
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTimeFilter(filter.id)}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-mono transition-all',
                timeFilter === filter.id
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                  : 'text-gray-500 hover:text-white'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.1)" />
          <XAxis
            dataKey="region"
            tick={{ fill: '#9CA3AF', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: 'rgba(0,240,255,0.2)' }}
            angle={-35}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: 'rgba(0,240,255,0.2)' }}
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
            itemStyle={{ color: '#fff' }}
            cursor={{ fill: 'rgba(0,240,255,0.1)' }}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'JetBrains Mono',
              fontSize: '10px',
            }}
          />
          <Bar
            dataKey="Positiv"
            fill="#00ff88"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(data) => handleBarClick(data, 'Positiv')}
          />
          <Bar
            dataKey="Negativ"
            fill="#ff0044"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(data) => handleBarClick(data, 'Negativ')}
          />
          <Bar
            dataKey="Neutral"
            fill="#6B7280"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(data) => handleBarClick(data, 'Neutral')}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Click hint */}
      <p className="text-[10px] font-mono text-gray-500 text-center mt-2">
        Klicken Sie auf einen Balken, um Artikel anzuzeigen
      </p>

      {/* Clicked Bar Detail Panel */}
      <AnimatePresence>
        {clickedBar && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-4 rounded-lg border border-[#00f0ff]/20 bg-[#0a0e1a]/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      clickedBar.sentiment === 'Positiv'
                        ? '#00ff88'
                        : clickedBar.sentiment === 'Negativ'
                          ? '#ff0044'
                          : '#6B7280',
                  }}
                />
                <span className="text-sm font-mono text-white">
                  {clickedBar.region} - {clickedBar.sentiment}
                </span>
                <span className="text-xs font-mono text-gray-500">
                  ({clickedBar.count} Artikel)
                </span>
              </div>
              <button
                onClick={() => setClickedBar(null)}
                className="p-1 rounded hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {/* Mock articles - in a real app, these would be fetched */}
              {[1, 2, 3].map((i) => (
                <a
                  key={i}
                  href="#"
                  className="flex items-center justify-between p-2 rounded-md bg-gray-800/50 hover:bg-gray-800 transition-colors group"
                >
                  <span className="text-xs font-mono text-gray-300 truncate">
                    Beispielartikel {i} aus {clickedBar.region}
                  </span>
                  <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-[#00f0ff] transition-colors" />
                </a>
              ))}
            </div>
            <p className="text-[10px] font-mono text-gray-500 mt-3 text-center">
              In der vollständigen Version werden hier echte Artikel angezeigt
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
