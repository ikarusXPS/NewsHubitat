import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SignalCard } from '../SignalCard';
import type { NewsArticle } from '../../types';

interface VirtualizedListProps {
  articles: NewsArticle[];
  isBookmarked: (id: string) => boolean;
  onBookmark: (id: string) => void;
  isRead: (id: string) => boolean;
  onToggleRead: (id: string) => void;
}

/**
 * VirtualizedList - Single-column virtualized article list
 *
 * Renders only visible items using window scrolling.
 * Estimated height ~400px with measureElement for actual measurement.
 */
export function VirtualizedList({
  articles,
  isBookmarked,
  onBookmark,
  isRead,
  onToggleRead,
}: VirtualizedListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: useCallback(
      () => (typeof window !== 'undefined' ? document.documentElement : null),
      []
    ),
    estimateSize: useCallback(() => 400, []), // D-12: ~400px estimate
    overscan: 5, // D-23: 5 items before/after
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} role="list" aria-label="News articles" className="max-w-3xl">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const article = articles[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              role="listitem"
              data-index={virtualItem.index}
              ref={(el) => {
                if (el) virtualizer.measureElement(el);
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="pb-6">
                <SignalCard
                  article={article}
                  isBookmarked={isBookmarked(article.id)}
                  onBookmark={onBookmark}
                  isRead={isRead(article.id)}
                  onToggleRead={onToggleRead}
                  index={virtualItem.index}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
