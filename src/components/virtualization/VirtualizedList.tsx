import { useRef, useCallback, useState, useEffect } from 'react';
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
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

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

  // Reset focus when articles change
  useEffect(() => {
    setFocusedIndex(null);
  }, [articles]);

  // D-19, D-20: Arrow key navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't handle if typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const current = focusedIndex ?? -1;
    let newIndex: number | null = null;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(current + 1, articles.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(current - 1, 0);
        break;
      default:
        return;
    }

    if (newIndex !== null && newIndex >= 0) {
      setFocusedIndex(newIndex);
      virtualizer.scrollToIndex(newIndex, { align: 'auto' });
    }
  }, [focusedIndex, articles.length, virtualizer]);

  return (
    <div
      ref={parentRef}
      role="list"
      aria-label="News articles"
      className="max-w-3xl"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
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
              tabIndex={focusedIndex === virtualItem.index ? 0 : -1}
              ref={(el) => {
                if (el) virtualizer.measureElement(el);
                // Auto-focus when this item becomes focused
                if (el && focusedIndex === virtualItem.index) {
                  el.focus({ preventScroll: true });
                }
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
