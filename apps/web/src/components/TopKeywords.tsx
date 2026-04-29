import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Hash, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';
import type { NewsArticle } from '../types';

interface KeywordCount {
  keyword: string;
  count: number;
  trend?: 'up' | 'down' | 'stable';
}

async function fetchArticles(): Promise<NewsArticle[]> {
  const response = await fetch('/api/news?limit=200');
  if (!response.ok) throw new Error('Failed to fetch articles');
  const result = await response.json();
  return result.data;
}

function analyzeKeywords(articles: NewsArticle[]): KeywordCount[] {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Filter last 24h articles
  const recentArticles = articles.filter(
    (a) => now - new Date(a.publishedAt).getTime() < oneDayMs
  );

  // Count entities and topics
  const counts = new Map<string, number>();

  for (const article of recentArticles) {
    // Count entities (higher weight)
    for (const entity of article.entities) {
      counts.set(entity, (counts.get(entity) || 0) + 2);
    }

    // Count topics (lower weight)
    for (const topic of article.topics) {
      const capitalized = topic.charAt(0).toUpperCase() + topic.slice(1);
      counts.set(capitalized, (counts.get(capitalized) || 0) + 1);
    }
  }

  // Convert to array and sort
  const keywords = Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return keywords;
}

export function TopKeywords() {
  const { setSearchQuery } = useAppStore();

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles-keywords'],
    queryFn: fetchArticles,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading || !articles) {
    return (
      <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-32 bg-gray-700 rounded" />
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-7 w-20 bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const keywords = analyzeKeywords(articles);

  if (keywords.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-[#00f0ff]" />
        </div>
        <div>
          <h3 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
            Top Keywords
          </h3>
          <p className="text-xs font-mono text-gray-500">Last 24 Hours</p>
        </div>
      </div>

      {/* Keywords Grid */}
      <div className="flex flex-wrap gap-2">
        {keywords.map((item, index) => (
          <motion.button
            key={item.keyword}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => setSearchQuery(item.keyword)}
            className={cn(
              'group relative px-3 py-1.5 rounded-lg',
              'bg-gradient-to-br from-[#00f0ff]/10 to-[#bf00ff]/10',
              'border border-[#00f0ff]/20',
              'hover:border-[#00f0ff]/60 hover:from-[#00f0ff]/20 hover:to-[#bf00ff]/20',
              'transition-all duration-200',
              'cursor-pointer'
            )}
          >
            <div className="flex items-center gap-2">
              <Hash className="h-3 w-3 text-[#00f0ff]/50 group-hover:text-[#00f0ff]" />
              <span className="text-xs font-mono text-white group-hover:text-[#00f0ff]">
                {item.keyword}
              </span>
              <span
                className={cn(
                  'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded',
                  index < 3
                    ? 'bg-[#ff0044]/20 text-[#ff0044]'
                    : index < 6
                      ? 'bg-[#ffcc00]/20 text-[#ffcc00]'
                      : 'bg-gray-700/50 text-gray-400'
                )}
              >
                {item.count}×
              </span>
            </div>

            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#00f0ff]/0 via-[#00f0ff]/5 to-[#bf00ff]/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.button>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs font-mono text-gray-600 mt-4 text-center">
        Click keyword to search • Updated every 5 minutes
      </p>
    </motion.div>
  );
}
