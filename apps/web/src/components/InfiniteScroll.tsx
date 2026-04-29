/* eslint-disable react-refresh/only-export-components -- Exports component and hook */
import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  children: React.ReactNode;
}

export function InfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  children,
}: Readonly<InfiniteScrollProps>) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  return (
    <div>
      {children}

      {/* Load more trigger */}
      <div ref={ref} className="py-8">
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3"
          >
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-400">Lade weitere Artikel...</p>
          </motion.div>
        )}

        {!hasMore && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-800/50 px-4 py-2 text-sm text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Alle Artikel geladen
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Hook for infinite scroll logic
export function useInfiniteScroll<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  deps: unknown[] = []
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn(page);
      setItems((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, page, isLoading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  // Reset when dependencies change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset on deps change is intentional
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is dynamic by design
  }, deps);

  return {
    items,
    hasMore,
    isLoading,
    error,
    loadMore,
    reset,
  };
}
