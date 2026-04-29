import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { cacheService } from '../services/cacheService';
import { useBackendStatus } from './useBackendStatus';
import type { NewsArticle } from '../types';

interface CachedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  queryFn: () => Promise<T>;
  cacheKey: string;
  cacheTTL?: number;
}

type CachedQueryResult<T> = UseQueryResult<T> & {
  isFromCache: boolean;
  cacheAge: number | null;
};

export function useCachedQuery<T = NewsArticle[]>({
  queryFn,
  cacheKey,
  cacheTTL = 5 * 60 * 1000,
  ...queryOptions
}: CachedQueryOptions<T>): CachedQueryResult<T> {
  const { isOnline } = useBackendStatus();
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  const result = useQuery({
    ...queryOptions,
    queryFn: async () => {
      try {
        // Try network first
        const data = await queryFn();

        // Cache successful response
        if (data && Array.isArray(data)) {
          await cacheService.setArticles(cacheKey, data as NewsArticle[], cacheTTL);
        }

        setIsFromCache(false);
        setCacheAge(null);
        return data;
      } catch (error) {
        // On error, try cache
        const cached = await cacheService.getArticles(cacheKey);
        if (cached) {
          const age = await cacheService.getCacheAge(cacheKey);
          setIsFromCache(true);
          setCacheAge(age);
          return cached as T;
        }

        // No cache available, throw error
        throw error;
      }
    },
    // Reduce refetch when offline
    refetchInterval: isOnline ? queryOptions.refetchInterval : false,
    refetchOnWindowFocus: isOnline && queryOptions.refetchOnWindowFocus !== false,
  });

  // Load cache on mount if offline
  useEffect(() => {
    if (!isOnline && !result.data) {
      cacheService.getArticles(cacheKey).then((cached) => {
        if (cached) {
          cacheService.getCacheAge(cacheKey).then(setCacheAge);
          setIsFromCache(true);
        }
      });
    }
  }, [isOnline, result.data, cacheKey]);

  return {
    ...result,
    isFromCache,
    cacheAge,
  };
}
