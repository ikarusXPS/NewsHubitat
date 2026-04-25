import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, LayoutGrid, List, Radio, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { SignalCard } from './SignalCard';
import { HeroSection } from './HeroSection';
import { SourceFilter } from './SourceFilter';
import { AskAI } from './AskAI';
import { CacheIndicator } from './CacheIndicator';
import { TopKeywords } from './TopKeywords';
import { MediaBiasBar } from './MediaBiasBar';
import { SourceFilterBanner } from './SourceFilterBanner';
import { BulkReadActions } from './BulkReadActions';
import { ForYouCarousel } from './ForYouCarousel';
import { PullToRefresh } from './mobile/PullToRefresh';
import { ScrollToTopFAB } from './mobile/ScrollToTopFAB';
import { useAppStore } from '../store';
import { useCachedQuery } from '../hooks/useCachedQuery';
import { cn } from '../lib/utils';
import type { NewsArticle, ApiResponse, NewsSource } from '../types';

// Classify article as escalation or de-escalation
function classifyTrend(article: NewsArticle): 'escalation' | 'de-escalation' | 'neutral' {
  const text = `${article.title} ${article.content}`.toLowerCase();

  // Escalation keywords
  const escalationWords = [
    'attack', 'strike', 'bomb', 'killed', 'casualties', 'war', 'conflict',
    'military', 'forces', 'invasion', 'offensive', 'violence', 'escalat',
    'tension', 'crisis', 'threaten', 'sanction', 'retaliat',
  ];

  // De-escalation keywords
  const deEscalationWords = [
    'ceasefire', 'peace', 'agreement', 'talks', 'negotiat', 'diplomat',
    'truce', 'settlement', 'resolve', 'de-escalat', 'calm', 'relief',
    'aid', 'humanitarian', 'rescue', 'hope', 'cooperation',
  ];

  const escalationCount = escalationWords.filter(w => text.includes(w)).length;
  const deEscalationCount = deEscalationWords.filter(w => text.includes(w)).length;

  // Strong sentiment bias
  if (article.sentiment === 'negative' && escalationCount > deEscalationCount + 1) {
    return 'escalation';
  }
  if (article.sentiment === 'positive' && deEscalationCount > escalationCount + 1) {
    return 'de-escalation';
  }

  // Keyword-based classification
  if (escalationCount > deEscalationCount + 2) return 'escalation';
  if (deEscalationCount > escalationCount + 2) return 'de-escalation';

  return 'neutral';
}

async function fetchNews(
  regions: string[],
  search: string,
  offset: number,
  limit: number
): Promise<ApiResponse<NewsArticle[]>> {
  const params = new URLSearchParams();
  if (regions.length) params.set('regions', regions.join(','));
  if (search) params.set('search', search);
  params.set('offset', offset.toString());
  params.set('limit', limit.toString());

  const response = await fetch(`/api/news?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch news');
  }
  return response.json();
}

type TrendFilter = 'all' | 'escalation' | 'de-escalation';

export function NewsFeed() {
  const { filters, feedState, readState, markAsRead, markAsUnread, isArticleRead, isPersonalizationEnabled } = useAppStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<NewsSource[]>([]);

  // Fetch sources for filter banner
  useEffect(() => {
    fetch('/api/news/sources')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSources(data.data);
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, []);

  // Generate cache key from filters
  const cacheKey = `news-${filters.regions.join(',')}-${filters.searchQuery}`;

  const { data, isLoading, error, refetch, isFetching, isFromCache, cacheAge } = useCachedQuery<ApiResponse<NewsArticle[]>>({
    queryKey: ['news', filters.regions, filters.searchQuery],
    queryFn: () => fetchNews(filters.regions, filters.searchQuery, 0, 50),
    cacheKey,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleBookmark = (articleId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  };

  const handleToggleRead = useCallback((articleId: string) => {
    if (isArticleRead(articleId)) {
      markAsUnread(articleId);
    } else {
      markAsRead(articleId);
    }
  }, [isArticleRead, markAsRead, markAsUnread]);

  // Handle pull-to-refresh action
  const handleRefresh = async () => {
    await refetch();
  };

  // Memoize article processing to avoid recalculating on every render
  const articles = useMemo(() => data?.data || [], [data?.data]);

  const { filteredArticles, escalationCount, deEscalationCount, criticalEvents, allArticleIds } = useMemo(() => {
    // Step 1: Filter by enabled sources
    let sourceFiltered = articles.filter((article: NewsArticle) => {
      // If enabledSources is empty, all are enabled by default
      if (Object.keys(feedState.enabledSources).length === 0) return true;
      // Check if source is explicitly disabled
      return feedState.enabledSources[article.source.id] !== false;
    });

    // Step 2: Filter by active source filter (agency filter)
    if (feedState.activeSourceFilter) {
      sourceFiltered = sourceFiltered.filter(
        (article: NewsArticle) => article.source.id === feedState.activeSourceFilter
      );
    }

    // Step 3: Filter by hide read articles
    if (readState.hideReadArticles) {
      sourceFiltered = sourceFiltered.filter(
        (article: NewsArticle) => !readState.readArticles.includes(article.id)
      );
    }

    // Classify all remaining articles
    const classified = sourceFiltered.map((article: NewsArticle) => ({
      article,
      trend: classifyTrend(article),
    }));

    // Filter by trend
    const filtered = classified
      .filter(({ trend }) => trendFilter === 'all' || trend === trendFilter)
      .map(({ article }) => article);

    // Count trends
    const escalation = classified.filter(({ trend }) => trend === 'escalation').length;
    const deEscalation = classified.filter(({ trend }) => trend === 'de-escalation').length;
    const critical = sourceFiltered.filter((a: NewsArticle) => a.sentiment === 'negative').length;

    return {
      filteredArticles: filtered,
      escalationCount: escalation,
      deEscalationCount: deEscalation,
      criticalEvents: critical,
      allArticleIds: filtered.map((a: NewsArticle) => a.id),
    };
  }, [articles, trendFilter, feedState.enabledSources, feedState.activeSourceFilter, readState.hideReadArticles, readState.readArticles]);

  // Calculate stats for hero section
  const heroStats = useMemo(() => ({
    totalArticles: data?.meta?.total || 0,
    activeRegions: filters.regions.length || 5,
    criticalEvents,
    lastUpdate: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
  }), [data?.meta?.total, filters.regions.length, criticalEvents]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="glass-panel rounded-xl p-8 text-center border border-[#ff0044]/30">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#ff0044]" />
          <p className="text-gray-300 mb-4 font-mono">Signal connection failed</p>
          <button
            onClick={() => refetch()}
            className="btn-cyber btn-cyber-primary px-6 py-2.5 rounded-lg flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3">
        {/* Hero Section */}
        <HeroSection stats={heroStats} />

      {/* For You Carousel per D-17 - after HeroSection */}
      <ForYouCarousel enabled={isPersonalizationEnabled} />

      {/* Source Filter Banner */}
      <SourceFilterBanner sources={sources} />

      {/* Top Keywords */}
      <TopKeywords />

      {/* Media Bias Distribution */}
      <MediaBiasBar articles={articles} />

      {/* Perspectives & Controls - Side by Side */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-start justify-between gap-6"
      >
        {/* Left: Perspectives */}
        <div className="flex-1">
          <SourceFilter />
        </div>

        {/* Right: View Mode + Sync + Trend Analysis (stacked) */}
        <div className="space-y-2">
          {/* View Mode + Sync */}
          <div className="flex items-center gap-3 justify-end">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 glass-panel rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-md p-2 transition-all',
                  viewMode === 'grid'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30'
                    : 'text-gray-500 hover:text-[#00f0ff]'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md p-2 transition-all',
                  viewMode === 'list'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30'
                    : 'text-gray-500 hover:text-[#00f0ff]'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className={cn(
                'btn-cyber flex items-center gap-2 rounded-lg px-4 py-2 text-xs',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>

          {/* Trend Analysis - Below Sync */}
          <div className="flex items-center gap-3 justify-end">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-[10px] font-mono uppercase tracking-wider">Trend Analysis</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTrendFilter('all')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all',
                  trendFilter === 'all'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30'
                    : 'text-gray-500 hover:text-gray-300 border border-gray-700/50'
                )}
              >
                All
              </button>
              <button
                onClick={() => setTrendFilter('escalation')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5',
                  trendFilter === 'escalation'
                    ? 'bg-[#ff0044]/20 text-[#ff0044] border border-[#ff0044]/30'
                    : 'text-gray-500 hover:text-gray-300 border border-gray-700/50'
                )}
              >
                <TrendingUp className="h-3 w-3" />
                Escalation
                <span className="ml-1 text-[9px] opacity-70">({escalationCount})</span>
              </button>
              <button
                onClick={() => setTrendFilter('de-escalation')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5',
                  trendFilter === 'de-escalation'
                    ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                    : 'text-gray-500 hover:text-gray-300 border border-gray-700/50'
                )}
              >
                <TrendingDown className="h-3 w-3" />
                De-escalation
                <span className="ml-1 text-[9px] opacity-70">({deEscalationCount})</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Signal count + Bulk Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#00f0ff]" />
            <span className="text-sm font-mono text-gray-400">
              <span className="text-[#00f0ff] font-bold">{filteredArticles.length}</span> signals detected
              {trendFilter !== 'all' && (
                <span className="text-gray-600 ml-1">
                  of {data?.meta?.total || 0}
                </span>
              )}
            </span>
          </div>
          {isFetching && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00ff88]">
              <Zap className="h-3 w-3 animate-pulse" />
              <span>LIVE</span>
            </div>
          )}
          <CacheIndicator isFromCache={isFromCache} cacheAge={cacheAge} />
        </div>

        {/* Bulk Read Actions */}
        <BulkReadActions articleIds={allArticleIds} />
      </motion.div>

      {/* Articles Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Radio className="h-10 w-10 text-[#00f0ff]" />
              <div className="absolute inset-0 animate-ping">
                <Radio className="h-10 w-10 text-[#00f0ff] opacity-30" />
              </div>
            </div>
            <p className="text-sm font-mono text-[#00f0ff]/50 uppercase tracking-widest">
              Scanning signals...
            </p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'grid gap-6',
              viewMode === 'grid'
                ? 'md:grid-cols-2 md:grid-cols-3'
                : 'grid-cols-1 max-w-3xl'
            )}
          >
            {filteredArticles.map((article: NewsArticle, index: number) => (
              <SignalCard
                key={article.id}
                article={article}
                isBookmarked={bookmarkedIds.has(article.id)}
                onBookmark={handleBookmark}
                isRead={isArticleRead(article.id)}
                onToggleRead={handleToggleRead}
                index={index}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Empty state */}
      {!isLoading && filteredArticles.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-16 text-center"
        >
          <div className="glass-panel rounded-xl p-8 max-w-md mx-auto border border-[#00f0ff]/10">
            <Radio className="h-12 w-12 text-[#00f0ff]/30 mx-auto mb-4" />
            <p className="text-gray-300 font-mono">
              {trendFilter === 'all'
                ? 'No signals detected'
                : `No ${trendFilter} signals detected`}
            </p>
            <p className="text-gray-500 text-xs mt-2 font-mono">
              {trendFilter === 'all'
                ? 'Adjust filters or wait for incoming signals.'
                : 'Try selecting a different trend filter or wait for new signals.'}
            </p>
          </div>
        </motion.div>
      )}

        {/* AI Chat Assistant */}
        <AskAI articles={data?.data || []} />
      </div>

      {/* Scroll to top FAB - mobile only */}
      <ScrollToTopFAB />
    </PullToRefresh>
  );
}
