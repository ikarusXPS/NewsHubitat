import { useRef, useCallback, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SignalCard } from '../SignalCard';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { NewsArticle } from '../../types';

interface VirtualizedGridProps {
  articles: NewsArticle[];
  isBookmarked: (id: string) => boolean;
  onBookmark: (id: string) => void;
  isRead: (id: string) => boolean;
  onToggleRead: (id: string) => void;
}

/**
 * VirtualizedGrid - Multi-column virtualized article grid
 *
 * Renders 3 columns on desktop, 2 on tablet, 1 on mobile.
 * Uses row-based virtualization with column calculation.
 */
export function VirtualizedGrid({
  articles,
  isBookmarked,
  onBookmark,
  isRead,
  onToggleRead,
}: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Responsive column count matching Tailwind breakpoints
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px)');
  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  const rowCount = Math.ceil(articles.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: useCallback(
      () => (typeof window !== 'undefined' ? document.documentElement : null),
      []
    ),
    estimateSize: useCallback(() => 400, []), // D-12: ~400px estimate
    overscan: 5, // D-23: 5 rows before/after
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Get articles for a specific row
  const getRowArticles = useCallback(
    (rowIndex: number) => {
      const startIndex = rowIndex * columns;
      return articles.slice(startIndex, startIndex + columns);
    },
    [articles, columns]
  );

  // Reset focus when articles change
  useEffect(() => {
    setFocusedIndex(null);
  }, [articles]);

  // D-19: Arrow key navigation (4-directional for grid)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        // Start at first item when no selection exists
        const downIndex = focusedIndex === null ? 0 : Math.min(focusedIndex + columns, articles.length - 1);
        setFocusedIndex(downIndex);
        virtualizer.scrollToIndex(Math.floor(downIndex / columns), { align: 'auto' });
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        // Do nothing if no selection
        if (focusedIndex === null) return;
        // Move up by columns (previous row, same column)
        const upIndex = Math.max(focusedIndex - columns, 0);
        setFocusedIndex(upIndex);
        virtualizer.scrollToIndex(Math.floor(upIndex / columns), { align: 'auto' });
        return;
      }
      case 'ArrowRight': {
        e.preventDefault();
        const rightIndex = focusedIndex === null ? 0 : Math.min(focusedIndex + 1, articles.length - 1);
        setFocusedIndex(rightIndex);
        virtualizer.scrollToIndex(Math.floor(rightIndex / columns), { align: 'auto' });
        return;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        // Do nothing if no selection
        if (focusedIndex === null) return;
        const leftIndex = Math.max(focusedIndex - 1, 0);
        setFocusedIndex(leftIndex);
        virtualizer.scrollToIndex(Math.floor(leftIndex / columns), { align: 'auto' });
        return;
      }
      default:
        return;
    }
  }, [focusedIndex, articles.length, columns, virtualizer]);

  return (
    <div
      ref={parentRef}
      role="list"
      aria-label="News articles"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const rowArticles = getRowArticles(virtualRow.index);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-6">
                {rowArticles.map((article, colIndex) => {
                  const globalIndex = virtualRow.index * columns + colIndex;
                  return (
                    <div
                      key={article.id}
                      role="listitem"
                      tabIndex={focusedIndex === globalIndex ? 0 : -1}
                      ref={(el) => {
                        if (el && focusedIndex === globalIndex) {
                          el.focus({ preventScroll: true });
                        }
                      }}
                    >
                      <SignalCard
                        article={article}
                        isBookmarked={isBookmarked(article.id)}
                        onBookmark={onBookmark}
                        isRead={isRead(article.id)}
                        onToggleRead={onToggleRead}
                        index={globalIndex}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
