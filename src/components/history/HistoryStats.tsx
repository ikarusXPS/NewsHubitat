import { BarChart3, Globe2, TrendingUp, Clock } from 'lucide-react';
import { RegionPieChart } from './RegionPieChart';
import { ActivitySparkline } from './ActivitySparkline';
import type { PerspectiveRegion, NewsArticle } from '../../types';

interface HistoryEntry {
  articleId: string;
  timestamp: number;
  readCount?: number;
}

interface HistoryStatsProps {
  history: HistoryEntry[];
  articles: Map<string, NewsArticle>;
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

export function HistoryStats({ history, articles }: HistoryStatsProps) {
  // Calculate total articles
  const totalArticles = history.length;

  // Calculate region breakdown
  const regionCounts = new Map<PerspectiveRegion, number>();
  history.forEach((entry) => {
    const article = articles.get(entry.articleId);
    if (article) {
      const region = article.perspective;
      regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
    }
  });

  const regionData = Array.from(regionCounts.entries())
    .map(([region, count]) => ({
      region,
      count,
      label: REGION_LABELS[region] || region,
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate top topics (from article topics)
  const topicCounts = new Map<string, number>();
  history.forEach((entry) => {
    const article = articles.get(entry.articleId);
    if (article && article.topics) {
      const topics = Array.isArray(article.topics) ? article.topics : [];
      topics.forEach((topic) => {
        if (typeof topic === 'string') {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        }
      });
    }
  });

  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Calculate 7-day activity
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const activityData = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = now - (i + 1) * DAY;
    const dayEnd = now - i * DAY;
    const count = history.filter(
      (entry) => entry.timestamp >= dayStart && entry.timestamp < dayEnd
    ).length;
    const date = new Date(dayEnd);
    activityData.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count,
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Articles */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-[#00f0ff]" />
          <span className="text-xs font-mono text-gray-500 uppercase">Total</span>
        </div>
        <div className="text-2xl font-bold text-white font-mono">{totalArticles}</div>
        <div className="text-xs text-gray-500">Articles</div>
      </div>

      {/* Region Breakdown */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe2 className="h-4 w-4 text-[#00f0ff]" />
          <span className="text-xs font-mono text-gray-500 uppercase">Regions</span>
        </div>
        <RegionPieChart data={regionData} />
      </div>

      {/* Top Topics */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-[#00f0ff]" />
          <span className="text-xs font-mono text-gray-500 uppercase">Top Topics</span>
        </div>
        <div className="space-y-1">
          {topTopics.length > 0 ? (
            topTopics.map(([topic, count]) => (
              <div key={topic} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate">{topic}</span>
                <span className="text-gray-500 font-mono text-xs">{count}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-500 text-xs">No topics yet</span>
          )}
        </div>
      </div>

      {/* Activity Sparkline */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-[#00f0ff]" />
          <span className="text-xs font-mono text-gray-500 uppercase">7 Days</span>
        </div>
        <ActivitySparkline data={activityData} />
      </div>
    </div>
  );
}
