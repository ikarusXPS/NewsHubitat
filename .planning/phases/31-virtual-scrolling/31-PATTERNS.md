# Phase 31: Virtual Scrolling - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 7 (4 new, 3 modified)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/virtualization/VirtualizedGrid.tsx` | component | transform | `src/components/NewsFeed.tsx` | role-match |
| `src/components/virtualization/VirtualizedList.tsx` | component | transform | `src/components/NewsFeed.tsx` | role-match |
| `src/components/virtualization/PaginatedFeed.tsx` | component | request-response | `src/components/InfiniteScroll.tsx` | exact |
| `src/components/virtualization/useAccessibilityFallback.ts` | hook | event-driven | `src/hooks/useMediaQuery.ts` | exact |
| `src/components/NewsFeed.tsx` | component | request-response | N/A (self) | self-modify |
| `src/components/SignalCard.tsx` | component | transform | N/A (self) | self-modify |
| `src/index.css` | config | N/A | N/A (self) | self-modify |

## Pattern Assignments

### `src/components/virtualization/VirtualizedGrid.tsx` (component, transform)

**Analog:** `src/components/NewsFeed.tsx`

**Imports pattern** (lines 1-19):
```typescript
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
```

**New component imports pattern** (derived for VirtualizedGrid):
```typescript
import { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SignalCard } from '../SignalCard';
import { cn } from '../../lib/utils';
import type { NewsArticle } from '../../types';
```

**Grid rendering pattern** (lines 394-413):
```typescript
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
```

**Component props interface pattern** (derived from NewsFeed conventions):
```typescript
interface VirtualizedGridProps {
  articles: NewsArticle[];
  columns: number;
  isBookmarked: (id: string) => boolean;
  onBookmark: (id: string) => void;
  isRead: (id: string) => boolean;
  onToggleRead: (id: string) => void;
  onScrollToTop?: () => void;
}
```

---

### `src/components/virtualization/VirtualizedList.tsx` (component, transform)

**Analog:** `src/components/NewsFeed.tsx`

**Same patterns as VirtualizedGrid with single-column configuration.**

**List-specific rendering pattern** (lines 396-399):
```typescript
className={cn(
  'grid gap-6',
  'grid-cols-1 max-w-3xl'
)}
```

---

### `src/components/virtualization/PaginatedFeed.tsx` (component, request-response)

**Analog:** `src/components/InfiniteScroll.tsx`

**Imports pattern** (lines 1-6):
```typescript
/* eslint-disable react-refresh/only-export-components -- Exports component and hook */
import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
```

**Component interface pattern** (lines 8-13):
```typescript
interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  children: React.ReactNode;
}
```

**Button styling pattern** (lines 54-58):
```typescript
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="text-center"
>
  <div className="inline-flex items-center gap-2 rounded-full bg-gray-800/50 px-4 py-2 text-sm text-gray-400">
```

**New PaginatedFeed derived pattern:**
```typescript
interface PaginatedFeedProps {
  articles: NewsArticle[];
  pageSize?: number;
  isBookmarked: (id: string) => boolean;
  onBookmark: (id: string) => void;
  isRead: (id: string) => boolean;
  onToggleRead: (id: string) => void;
}

// Button styling from project convention
<button
  onClick={() => setVisibleCount((c) => c + pageSize)}
  className="btn-cyber w-full py-3 mt-4"
  aria-label={`Load ${Math.min(pageSize, articles.length - visibleCount)} more articles`}
>
```

---

### `src/components/virtualization/useAccessibilityFallback.ts` (hook, event-driven)

**Analog:** `src/hooks/useMediaQuery.ts`

**Imports pattern** (lines 1-1):
```typescript
import { useState, useEffect, useCallback } from 'react';
```

**Hook structure pattern** (lines 17-62):
```typescript
/**
 * useMediaQuery hook - SSR-safe media query detection
 *
 * Returns whether the viewport matches a given media query string.
 * Falls back to safe defaults during SSR (no window).
 *
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean - true if viewport matches the query
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe: default to false when window is not available
  const getMatches = useCallback((): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // Set initial value (in case it changed between render and effect)
    setMatches(mediaQueryList.matches);

    // Handler for media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers use addEventListener, older use addListener
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers (Safari < 14)
      mediaQueryList.addListener(handleChange);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}
```

**New useAccessibilityFallback derived pattern:**
```typescript
import { useState, useEffect } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * useAccessibilityFallback - Detect when to use paginated fallback
 *
 * Returns true if user prefers reduced motion or screen reader is detected.
 * Used to switch from virtualized scrolling to paginated "Load More" mode.
 *
 * @returns { shouldUseFallback: boolean }
 */
export function useAccessibilityFallback(): { shouldUseFallback: boolean } {
  // D-18: Detect reduced motion preference using existing hook
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Screen reader detection heuristic
  const [screenReaderDetected, setScreenReaderDetected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Heuristic: Check for common assistive technology indicators
    const isScreenReader =
      window.navigator.userAgent.includes('NVDA') ||
      window.navigator.userAgent.includes('JAWS') ||
      document.querySelector('[aria-live="polite"]') !== null;

    setScreenReaderDetected(isScreenReader);
  }, []);

  return {
    shouldUseFallback: prefersReducedMotion || screenReaderDetected,
  };
}
```

---

### `src/components/NewsFeed.tsx` (component, request-response) - MODIFICATION

**Self-reference:** Current implementation to be modified.

**Current rendering section to replace** (lines 386-414):
```typescript
{isLoading ? (
  <div className="flex items-center justify-center py-16">
    {/* ... loading state ... */}
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
```

**New conditional virtualization pattern:**
```typescript
import { VirtualizedGrid } from './virtualization/VirtualizedGrid';
import { VirtualizedList } from './virtualization/VirtualizedList';
import { PaginatedFeed } from './virtualization/PaginatedFeed';
import { useAccessibilityFallback } from './virtualization/useAccessibilityFallback';

// Inside component:
const { shouldUseFallback } = useAccessibilityFallback();

// In render:
{isLoading ? (
  /* ... loading state ... */
) : shouldUseFallback ? (
  <PaginatedFeed
    articles={filteredArticles}
    isBookmarked={(id) => bookmarkedIds.has(id)}
    onBookmark={handleBookmark}
    isRead={isArticleRead}
    onToggleRead={handleToggleRead}
  />
) : viewMode === 'grid' ? (
  <VirtualizedGrid
    articles={filteredArticles}
    columns={3}
    isBookmarked={(id) => bookmarkedIds.has(id)}
    onBookmark={handleBookmark}
    isRead={isArticleRead}
    onToggleRead={handleToggleRead}
  />
) : (
  <VirtualizedList
    articles={filteredArticles}
    isBookmarked={(id) => bookmarkedIds.has(id)}
    onBookmark={handleBookmark}
    isRead={isArticleRead}
    onToggleRead={handleToggleRead}
  />
)}
```

**Scroll reset on filter change pattern** (derived from NewsFeed filter dependencies, lines 185):
```typescript
// Current dependency array for filteredArticles useMemo:
[articles, trendFilter, feedState.enabledSources, feedState.activeSourceFilter, readState.hideReadArticles, readState.readArticles]

// New useEffect for scroll reset:
const virtualizerRef = useRef<ReturnType<typeof useVirtualizer> | null>(null);

useEffect(() => {
  virtualizerRef.current?.scrollToIndex(0, { align: 'start' });
}, [filters.regions, filters.searchQuery, viewMode, trendFilter, feedState.activeSourceFilter]);
```

---

### `src/components/SignalCard.tsx` (component, transform) - MODIFICATION

**Self-reference:** Current implementation to be modified.

**Current framer-motion animation to remove** (lines 112-116):
```typescript
<motion.article
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
  onMouseEnter={() => setIsHovered(true)}
```

**New CSS-based animation pattern:**
```typescript
// Remove motion import or keep for other uses
// Change motion.article to article with CSS class

<article
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
  className={cn(
    'signal-card group animate-fade-in',
    severity === 'critical' && 'signal-card-critical',
    isRead && 'opacity-55 hover:opacity-80'
  )}
>
```

**Note:** The `index` prop is no longer needed for stagger animation but may be kept for other purposes or removed.

---

### `src/index.css` (config) - MODIFICATION

**Self-reference:** Add new CSS animation.

**Existing animation patterns** (lines 43-48, 287-300):
```css
/* Animation keyframes */
--animate-pulse-glow: pulse-glow 2s ease-in-out infinite;
--animate-scan-line: scan-line 4s linear infinite;
--animate-flicker: flicker 0.15s infinite;
--animate-data-stream: data-stream 20s linear infinite;

@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 10px currentColor;
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
    box-shadow: 0 0 20px currentColor;
  }
}
```

**New fade-in animation to add:**
```css
/* ============================================
   CARD FADE-IN ANIMATION
   Per Phase 31: Replace framer-motion stagger with CSS
   ============================================ */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 200ms ease-out forwards;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in {
    animation: none;
    opacity: 1;
  }
}
```

---

## Shared Patterns

### Keyboard Navigation
**Source:** `src/hooks/useKeyboardShortcuts.ts`
**Apply to:** VirtualizedGrid, VirtualizedList

```typescript
// Event filtering pattern (lines 21-32):
const handleKeyDown = useCallback(
  (event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      if (event.key !== 'Escape') {
        return;
      }
    }

// Article navigation pattern (lines 115-144):
case 'j':
  if (!hasModifier) {
    event.preventDefault();
    options?.onNextArticle?.();
  }
  break;
case 'k':
  if (!hasModifier) {
    event.preventDefault();
    options?.onPrevArticle?.();
  }
  break;
```

**New Arrow key navigation for virtualized list:**
```typescript
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  const current = focusedIndex ?? 0;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      const nextIndex = Math.min(current + 1, items.length - 1);
      setFocusedIndex(nextIndex);
      virtualizer.scrollToIndex(nextIndex, { align: 'auto' });
      break;
    case 'ArrowUp':
      e.preventDefault();
      const prevIndex = Math.max(current - 1, 0);
      setFocusedIndex(prevIndex);
      virtualizer.scrollToIndex(prevIndex, { align: 'auto' });
      break;
  }
}, [focusedIndex, items.length, virtualizer]);
```

### Window Scroll Handling
**Source:** `src/components/mobile/ScrollToTopFAB.tsx`
**Apply to:** VirtualizedGrid, VirtualizedList (window scroll mode)

```typescript
// Window scroll listener pattern (lines 17-25):
useEffect(() => {
  const handleScroll = () => {
    // D-32: 500px threshold
    setIsVisible(window.scrollY > 500);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// Scroll to top pattern (lines 27-30):
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lightTap();
};
```

### ARIA Accessibility
**Source:** Project convention (no existing role="list" usage found)
**Apply to:** VirtualizedGrid, VirtualizedList, PaginatedFeed

```typescript
// D-21: Ensure role="list" and role="listitem" for screen readers
<div role="list" aria-label="News articles">
  {virtualItems.map((virtualItem) => (
    <div
      key={virtualItem.key}
      role="listitem"
      tabIndex={focusedIndex === virtualItem.index ? 0 : -1}
      aria-label={`Article: ${articles[virtualItem.index].title}`}
    >
      <SignalCard ... />
    </div>
  ))}
</div>
```

### Focus Indicator Styling
**Source:** `src/index.css` (cyber theme colors)
**Apply to:** SignalCard focus state

```css
/* D-22: Focus indicator visible on active card */
/* Use cyan accent color from theme */
.signal-card:focus-visible {
  outline: 2px solid var(--color-cyber-blue);
  outline-offset: 2px;
  border-color: var(--color-cyber-blue);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
}
```

---

## No Analog Found

All files have analogs or are self-modifications. No files lack a close match.

---

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`
**Files scanned:** 25
**Pattern extraction date:** 2026-04-25

### Key Insights

1. **Window scrolling preferred:** PullToRefresh and ScrollToTopFAB both use `window.scrollY` and `window.scrollTo()`. The virtualization should use window scrolling (`getScrollElement: () => document.documentElement`) rather than a contained scroll area to maintain compatibility.

2. **Existing keyboard shortcuts hook:** `useKeyboardShortcuts.ts` already has j/k navigation patterns. The virtualization can integrate with this or provide its own ArrowUp/ArrowDown handlers.

3. **CSS animation pattern:** Project uses `@keyframes` in `index.css` with `.animate-*` utility classes. The fade-in animation follows this convention.

4. **No existing role="list" usage:** This will be the first component using ARIA list semantics. Follow MDN ARIA feed role guidelines.

5. **Motion preferences:** Project has `framer-motion` MotionConfig available, but CSS `@media (prefers-reduced-motion)` is more direct and doesn't require additional wrapper.
