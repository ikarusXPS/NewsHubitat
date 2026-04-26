import { useState } from 'react';
import { SignalCard } from '../SignalCard';
import type { NewsArticle } from '../../types';

interface PaginatedFeedProps {
  articles: NewsArticle[];
  pageSize?: number;
  isBookmarked: (id: string) => boolean;
  onBookmark: (id: string) => void;
  isRead: (id: string) => boolean;
  onToggleRead: (id: string) => void;
}

/**
 * PaginatedFeed - Accessible fallback for virtualization
 *
 * Renders 20 articles at a time with a Load More button.
 * Used when user prefers reduced motion or screen reader is detected.
 */
export function PaginatedFeed({
  articles,
  pageSize = 20,
  isBookmarked,
  onBookmark,
  isRead,
  onToggleRead,
}: PaginatedFeedProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;
  const remaining = articles.length - visibleCount;

  return (
    <div role="list" aria-label="News articles" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {visibleArticles.map((article, index) => (
        <div key={article.id} role="listitem">
          <SignalCard
            article={article}
            isBookmarked={isBookmarked(article.id)}
            onBookmark={onBookmark}
            isRead={isRead(article.id)}
            onToggleRead={onToggleRead}
            index={index}
          />
        </div>
      ))}

      {hasMore && (
        <div className="col-span-full flex justify-center pt-4">
          <button
            onClick={() => setVisibleCount((c) => c + pageSize)}
            className="btn-cyber w-full max-w-md py-3"
            aria-label={`Load ${Math.min(pageSize, remaining)} more articles`}
          >
            Load More ({remaining} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
