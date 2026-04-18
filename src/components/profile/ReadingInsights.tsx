import { useMemo } from 'react';
import { Flame, Calendar, TrendingUp, Globe2 } from 'lucide-react';
import { useAppStore } from '../../store';
import type { NewsArticle, PerspectiveRegion } from '../../types';

interface ReadingInsightsProps {
  articles: Map<string, NewsArticle>;
}

const REGION_COLORS: Record<PerspectiveRegion, string> = {
  western: '#00f0ff',
  'middle-east': '#ff6600',
  turkish: '#ff0044',
  russian: '#bf00ff',
  chinese: '#ffee00',
  alternative: '#00ff88',
};

export function ReadingInsights({ articles }: ReadingInsightsProps) {
  const { readingHistory, language } = useAppStore();

  // Calculate daily streak per D-33
  const { dailyStreak, weeklyActivity, totalArticles } = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Group by day
    const dayMap = new Map<string, number>();
    readingHistory.forEach((entry) => {
      const day = new Date(entry.timestamp).toDateString();
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });

    // Calculate streak
    let streak = 0;
    let checkDate = new Date();
    while (true) {
      const dayStr = checkDate.toDateString();
      if (dayMap.has(dayStr)) {
        streak++;
        checkDate = new Date(checkDate.getTime() - DAY);
      } else if (streak === 0) {
        // Check yesterday if today has no reads yet
        checkDate = new Date(checkDate.getTime() - DAY);
        if (!dayMap.has(checkDate.toDateString())) break;
      } else {
        break;
      }
    }

    // Weekly activity (last 7 days)
    const weeklyActivity: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * DAY);
      const dayStr = date.toDateString();
      weeklyActivity.push(dayMap.get(dayStr) || 0);
    }

    return { dailyStreak: streak, weeklyActivity, totalArticles: readingHistory.length };
  }, [readingHistory]);

  // Calculate favorite regions
  const favoriteRegions = useMemo(() => {
    const regionCounts = new Map<PerspectiveRegion, number>();
    readingHistory.forEach((entry) => {
      const article = articles.get(entry.articleId);
      if (article) {
        const region = article.perspective as PerspectiveRegion;
        regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
      }
    });
    return Array.from(regionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [readingHistory, articles]);

  // Calculate top topics
  const topTopics = useMemo(() => {
    const topicCounts = new Map<string, number>();
    readingHistory.forEach((entry) => {
      const article = articles.get(entry.articleId);
      if (article) {
        try {
          const topics = JSON.parse(article.topics || '[]') as string[];
          topics.forEach((topic) => {
            topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
          });
        } catch {
          // Ignore
        }
      }
    });
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [readingHistory, articles]);

  const maxWeekly = Math.max(...weeklyActivity, 1);

  return (
    <div className="space-y-6">
      {/* Reading Stats Grid per D-31, D-33 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Daily Streak */}
        <div className="glass-panel rounded-xl p-4 text-center">
          <Flame className="h-6 w-6 text-[#ff6600] mx-auto mb-2" />
          <div className="text-2xl font-bold text-white font-mono">{dailyStreak}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            {language === 'de' ? 'Tage Streak' : 'Day Streak'}
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="glass-panel rounded-xl p-4">
          <Calendar className="h-4 w-4 text-[#00f0ff] mx-auto mb-2" />
          <div className="flex items-end justify-center gap-1 h-8 mb-2">
            {weeklyActivity.map((count, i) => (
              <div
                key={i}
                className="w-3 rounded-t bg-[#00f0ff]"
                style={{
                  height: `${(count / maxWeekly) * 100}%`,
                  opacity: count > 0 ? 1 : 0.2,
                  minHeight: '2px',
                }}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider text-center">
            {language === 'de' ? 'Woche' : 'Week'}
          </div>
        </div>

        {/* Total Articles */}
        <div className="glass-panel rounded-xl p-4 text-center">
          <TrendingUp className="h-6 w-6 text-[#00ff88] mx-auto mb-2" />
          <div className="text-2xl font-bold text-white font-mono">{totalArticles}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            {language === 'de' ? 'Artikel' : 'Articles'}
          </div>
        </div>
      </div>

      {/* Favorite Regions & Topics */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Favorite Regions */}
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe2 className="h-4 w-4 text-[#00f0ff]" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
              {language === 'de' ? 'Lieblingsregionen' : 'Favorite Regions'}
            </span>
          </div>
          <div className="space-y-2">
            {favoriteRegions.length > 0 ? (
              favoriteRegions.map(([region, count], i) => (
                <div key={region} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{i + 1}.</span>
                    <span
                      className="text-sm"
                      style={{ color: REGION_COLORS[region] }}
                    >
                      {region.charAt(0).toUpperCase() + region.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-gray-500">{count}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-500 text-sm">
                {language === 'de' ? 'Noch keine Daten' : 'No data yet'}
              </span>
            )}
          </div>
        </div>

        {/* Top Topics */}
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-[#bf00ff]" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
              {language === 'de' ? 'Top Themen' : 'Top Topics'}
            </span>
          </div>
          <div className="space-y-2">
            {topTopics.length > 0 ? (
              topTopics.map(([topic, count], i) => (
                <div key={topic} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{i + 1}.</span>
                    <span className="text-sm text-white truncate">{topic}</span>
                  </div>
                  <span className="text-xs font-mono text-gray-500">{count}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-500 text-sm">
                {language === 'de' ? 'Noch keine Daten' : 'No data yet'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
