import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { TensionGauge } from './monitor/TensionGauge';
import type { NewsArticle } from '../types';

interface TensionData {
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  history: { date: string; value: number }[];
  level: 'low' | 'medium' | 'high' | 'critical';
}

async function fetchArticles(): Promise<NewsArticle[]> {
  const response = await fetch('/api/news?limit=200');
  if (!response.ok) throw new Error('Failed to fetch articles');
  const result = await response.json();
  return result.data;
}

function calculateTensionIndex(articles: NewsArticle[]): TensionData {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  // High-intensity conflict keywords that amplify tension
  const criticalKeywords = ['airstrike', 'killed', 'casualties', 'dead', 'attack', 'strike', 'bomb', 'war', 'combat', 'offensive', 'invasion'];
  const crisisKeywords = ['humanitarian', 'refugee', 'displaced', 'evacuat', 'siege', 'blockade', 'famine'];

  // Crisis entities that indicate major geopolitical tension
  const crisisEntities = ['Gaza', 'Israel', 'Hamas', 'Hezbollah', 'Iran', 'Yemen', 'Syria', 'Ukraine', 'Russia'];

  // Calculate tension score with multi-factor analysis
  const calculateScore = (article: NewsArticle): number => {
    const age = now - new Date(article.publishedAt).getTime();
    const recencyFactor = Math.max(0, 1 - age / sevenDaysMs);

    // Base sentiment score (increased from 3 to 10 for negative)
    let sentimentScore = 0;
    if (article.sentiment === 'negative') sentimentScore = 10;
    else if (article.sentiment === 'neutral') sentimentScore = 3;
    else sentimentScore = 0;

    // Keyword intensity multiplier
    const text = `${article.title} ${article.content}`.toLowerCase();
    const criticalCount = criticalKeywords.filter(kw => text.includes(kw)).length;
    const crisisCount = crisisKeywords.filter(kw => text.includes(kw)).length;
    const keywordMultiplier = 1 + (criticalCount * 0.3) + (crisisCount * 0.2);

    // Entity crisis multiplier
    const entityMatches = article.entities.filter(e => crisisEntities.includes(e)).length;
    const entityMultiplier = 1 + (entityMatches * 0.25);

    // Topic severity boost
    const severityBoost = article.topics.includes('military') ? 1.5 : 1.0;

    return sentimentScore * recencyFactor * keywordMultiplier * entityMultiplier * severityBoost;
  };

  // Get current week articles
  const currentWeekArticles = articles.filter(
    (a) => now - new Date(a.publishedAt).getTime() < sevenDaysMs
  );

  // Get previous week articles
  const previousWeekArticles = articles.filter((a) => {
    const age = now - new Date(a.publishedAt).getTime();
    return age >= sevenDaysMs && age < 2 * sevenDaysMs;
  });

  // Calculate scores with perspective diversity factor
  const currentScore = currentWeekArticles.reduce((sum, a) => sum + calculateScore(a), 0);
  const previousScore = previousWeekArticles.reduce((sum, a) => sum + calculateScore(a), 0);

  // Perspective diversity amplification (more perspectives = more significant)
  const currentPerspectives = new Set(currentWeekArticles.map(a => a.perspective)).size;
  const perspectiveFactor = Math.min(1.5, 1 + (currentPerspectives - 1) * 0.1);

  // Normalize to 0-100 scale with balanced sensitivity
  const current = Math.min(100, Math.max(0, (currentScore / Math.max(currentWeekArticles.length, 1)) * 2 * perspectiveFactor));
  const previous = Math.min(100, Math.max(0, (previousScore / Math.max(previousWeekArticles.length, 1)) * 2));

  // Calculate change percentage
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  // Determine trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(change) > 5) {
    trend = change > 0 ? 'up' : 'down';
  }

  // Generate 7-day history with recalibrated scoring
  const history = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now - i * oneDayMs);
    const dayArticles = articles.filter((a) => {
      const articleDate = new Date(a.publishedAt);
      return (
        articleDate.getDate() === date.getDate() &&
        articleDate.getMonth() === date.getMonth() &&
        articleDate.getFullYear() === date.getFullYear()
      );
    });

    const dayScore = dayArticles.reduce((sum, a) => sum + calculateScore(a), 0);
    const dayPerspectives = new Set(dayArticles.map(a => a.perspective)).size;
    const dayPerspectiveFactor = Math.min(1.5, 1 + (dayPerspectives - 1) * 0.1);
    const normalized = Math.min(100, Math.max(0, (dayScore / Math.max(dayArticles.length, 1)) * 2 * dayPerspectiveFactor));

    history.push({
      date: date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
      value: normalized,
    });
  }

  // Determine tension level
  let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (current >= 75) level = 'critical';
  else if (current >= 50) level = 'high';
  else if (current >= 25) level = 'medium';

  return { current, previous, change, trend, history, level };
}

const LEVEL_CONFIG = {
  low: {
    color: '#00ff88',
    bgColor: 'bg-[#00ff88]/10',
    borderColor: 'border-[#00ff88]/30',
    label: 'Low',
  },
  medium: {
    color: '#ffcc00',
    bgColor: 'bg-[#ffcc00]/10',
    borderColor: 'border-[#ffcc00]/30',
    label: 'Medium',
  },
  high: {
    color: '#ff6600',
    bgColor: 'bg-[#ff6600]/10',
    borderColor: 'border-[#ff6600]/30',
    label: 'High',
  },
  critical: {
    color: '#ff0044',
    bgColor: 'bg-[#ff0044]/10',
    borderColor: 'border-[#ff0044]/30',
    label: 'Critical',
  },
};

export function TensionIndex() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles-tension'],
    queryFn: fetchArticles,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading || !articles) {
    return (
      <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-700 rounded mb-4" />
          <div className="h-20 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const tension = calculateTensionIndex(articles);
  const config = LEVEL_CONFIG[tension.level];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-panel rounded-xl p-3 border', config.borderColor)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            'h-7 w-7 rounded-lg flex items-center justify-center border',
            config.bgColor,
            config.borderColor
          )}
        >
          {tension.level === 'critical' ? (
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: config.color }} />
          ) : (
            <Activity className="h-3.5 w-3.5" style={{ color: config.color }} />
          )}
        </div>
        <div>
          <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
            Tension Index
          </h3>
          <p className="text-[10px] font-mono text-gray-500">7-Day</p>
        </div>
      </div>

      {/* Tension Gauge */}
      <div className="flex items-center justify-center mb-3">
        <TensionGauge value={tension.current} level={tension.level} size="md" />
      </div>

      {/* Level Badge & Trend */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn('text-[10px] font-mono font-semibold uppercase', config.bgColor, 'px-1.5 py-0.5 rounded inline-block')} style={{ color: config.color }}>
          {config.label}
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center gap-1">
          {tension.trend === 'up' && (
            <>
              <TrendingUp className="h-3.5 w-3.5 text-[#ff0044]" />
              <span className="text-xs font-mono font-bold text-[#ff0044]">
                +{Math.abs(Math.round(tension.change))}%
              </span>
            </>
          )}
          {tension.trend === 'down' && (
            <>
              <TrendingDown className="h-3.5 w-3.5 text-[#00ff88]" />
              <span className="text-xs font-mono font-bold text-[#00ff88]">
                {Math.round(tension.change)}%
              </span>
            </>
          )}
          {tension.trend === 'stable' && (
            <span className="text-xs font-mono font-bold text-gray-500">
              {Math.round(tension.change) > 0 ? '+' : ''}
              {Math.round(tension.change)}%
            </span>
          )}
        </div>
      </div>

      {/* 7-Day Chart */}
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={tension.history}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1.5">
        {tension.history.map((item, i) => (
          <span
            key={i}
            className="text-[8px] font-mono text-gray-600"
          >
            {item.date}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
