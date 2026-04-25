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

    const current = focusedIndex ?? -1;
    let newIndex: number | null = null;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // Move down by columns (next row, same column)
        newIndex = Math.min(current + columns, articles.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Move up by columns (previous row, same column)
        newIndex = Math.max(current - columns, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = Math.min(current + 1, articles.length - 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = Math.max(current - 1, 0);
        break;
      default:
        return;
    }

    if (newIndex !== null && newIndex >= 0) {
      setFocusedIndex(newIndex);
      // Scroll to the row containing this index
      const rowIndex = Math.floor(newIndex / columns);
      virtualizer.scrollToIndex(rowIndex, { align: 'auto' });
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
              data-row-index={virtualRow.index}
              ref={(el) => {
                if (el) virtualizer.measureElement(el);
              }}
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
