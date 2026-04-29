import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { getRecommendations, type Recommendation } from '../lib/personalization';
import type { NewsArticle, ApiResponse } from '../types';

interface UsePersonalizationOptions {
  enabled?: boolean;
}

interface UsePersonalizationResult {
  recommendations: Recommendation[];
  isLoading: boolean;
  isEligible: boolean;
  readCount: number;
  requiredCount: number;
}

async function fetchAllNews(): Promise<NewsArticle[]> {
  const response = await fetch('/api/news?limit=100');
  if (!response.ok) throw new Error('Failed to fetch news');
  const data: ApiResponse<NewsArticle[]> = await response.json();
  return data.data || [];
}

async function fetchHistoryArticles(ids: string[]): Promise<Map<string, NewsArticle>> {
  const map = new Map<string, NewsArticle>();
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await fetch(`/api/news/${id}`);
        if (response.ok) {
          const data = await response.json();
          return data.data as NewsArticle | null;
        }
      } catch {
        // Ignore
      }
      return null;
    })
  );
  results.forEach((article, i) => {
    if (article) map.set(ids[i], article);
  });
  return map;
}

export function usePersonalization(options: UsePersonalizationOptions = {}): UsePersonalizationResult {
  const { user, isAuthenticated } = useAuth();
  const { readingHistory } = useAppStore();

  const REQUIRED_READ_COUNT = 10; // Per D-13
  const readCount = readingHistory.length;
  const isVerified = user?.emailVerified === true;

  // Check eligibility per D-13, D-18, D-19
  const isEligible =
    options.enabled !== false &&
    isAuthenticated &&
    isVerified &&
    readCount >= REQUIRED_READ_COUNT;

  // Fetch all news articles for scoring
  const { data: allArticles, isLoading: isLoadingArticles } = useQuery({
    queryKey: ['news-for-personalization'],
    queryFn: fetchAllNews,
    enabled: isEligible,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch history articles for interest extraction
  const historyIds = useMemo(
    () => readingHistory.map((e) => e.articleId),
    [readingHistory]
  );

  const { data: historyArticles, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['history-articles-for-personalization', historyIds.slice(0, 20)],
    queryFn: () => fetchHistoryArticles(historyIds.slice(0, 20)), // Limit to recent 20 for perf
    enabled: isEligible && historyIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate recommendations
  const recommendations = useMemo(() => {
    if (!isEligible || !allArticles || !historyArticles) {
      return [];
    }
    return getRecommendations(allArticles, readingHistory, historyArticles, 12);
  }, [isEligible, allArticles, historyArticles, readingHistory]);

  return {
    recommendations,
    isLoading: isLoadingArticles || isLoadingHistory,
    isEligible,
    readCount,
    requiredCount: REQUIRED_READ_COUNT,
  };
}
