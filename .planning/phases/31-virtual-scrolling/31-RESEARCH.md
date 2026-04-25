# Phase 31: Virtual Scrolling - Research

**Researched:** 2026-04-25
**Domain:** Frontend performance - list virtualization
**Confidence:** HIGH

## Summary

Virtual scrolling is a performance optimization technique that renders only visible items in a list, dramatically reducing DOM node count and improving scroll performance. This phase implements FRON-02 using @tanstack/react-virtual, the library chosen in CONTEXT.md (D-01).

The current NewsFeed component renders all filtered articles via a direct `.map()` call inside an AnimatePresence wrapper (lines 401-411), creating DOM nodes for every article regardless of visibility. With 500+ articles, this causes significant layout thrashing and memory pressure. TanStack Virtual solves this by calculating which items are visible and rendering only those (plus a configurable overscan buffer).

The project already uses TanStack Query (v5) and has established patterns for responsive design (`useMediaQuery` hook) that can be extended for the accessibility fallback (D-15 to D-18). The existing `framer-motion` integration (v12) supports reduced motion via `MotionConfig` component.

**Primary recommendation:** Implement a `VirtualizedGrid` component wrapping `useVirtualizer` that replaces the current `filteredArticles.map()` rendering, with an accessibility-first fallback to paginated "Load More" mode for users with `prefers-reduced-motion` or screen readers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use @tanstack/react-virtual (headless, ~3KB, already using TanStack Query)
- **D-02:** Supports both grid and list layouts with same API
- **D-03:** Keep both grid (3-column) and list view modes with virtualization
- **D-04:** Grid uses `useVirtualizer` with multi-column lane calculation
- **D-05:** List uses single-column `useVirtualizer`
- **D-06:** Remove stagger animation (`delay: 0.1 + index * 0.05`) to prevent jank on fast scroll
- **D-07:** Keep simple opacity fade-in transition for polish without performance impact
- **D-08:** Update SignalCard to use CSS transitions instead of framer-motion stagger
- **D-09:** Implement virtualization inside NewsFeed.tsx (not a separate component)
- **D-10:** Create VirtualizedGrid component to replace direct map() rendering
- **D-11:** NewsFeed remains the orchestrator (filters, state, data fetching)
- **D-12:** Use estimated height (~400px) with `measureElement` for actual measurement
- **D-13:** Allow cards to have variable heights based on content (summary length, topics)
- **D-14:** `useVirtualizer` handles height recalculation automatically
- **D-15:** Detect `prefers-reduced-motion` OR screen reader presence
- **D-16:** Auto-switch to paginated "Load More" mode for accessibility users
- **D-17:** Paginated mode renders 20 articles at a time, button loads more
- **D-18:** Use `useMediaQuery('(prefers-reduced-motion: reduce)')` for motion detection
- **D-19:** Arrow keys (Up/Down) move focus through visible cards
- **D-20:** Tab key moves between interactive elements within a card
- **D-21:** Ensure `role="list"` and `role="listitem"` for screen readers
- **D-22:** Focus indicator visible on active card
- **D-23:** Overscan 5 items before and after viewport
- **D-24:** Reset scroll position to top when filters or view mode change
- **D-25:** Always use virtualization regardless of list size (consistent behavior)
- **D-26:** Card images already have `loading="lazy"` (from Phase 30)

### Claude's Discretion
- Exact estimated row height based on testing (starting at ~400px)
- Whether to create VirtualizedGrid as separate file or inline in NewsFeed
- Screen reader detection method (aria-live region vs focus detection)
- CSS transition timing for card fade-in

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FRON-02 | Virtual scrolling implemented for NewsFeed with @tanstack/react-virtual | `useVirtualizer` hook with `measureElement` for dynamic heights, dual virtualizer pattern for grid layout, CSS transitions for card animation |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Virtual scrolling calculation | Browser / Client | - | DOM measurement and scroll math must happen client-side |
| Item rendering | Browser / Client | - | React component rendering with position transforms |
| Accessibility fallback detection | Browser / Client | - | Media query and ARIA detection are client-only |
| Scroll container management | Browser / Client | - | Window scroll handled by useVirtualizer |
| Data fetching | API / Backend | Frontend Server | useCachedQuery already orchestrates TanStack Query |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-virtual | 3.13.24 | Virtual scrolling | [VERIFIED: npm registry 2026-04-25] Headless, ~3KB gzipped, from same team as TanStack Query |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | 12.35.0 | Motion config for reduced motion | [VERIFIED: package.json] Already installed, use MotionConfig reducedMotion="user" |
| react | 19.2.0 | React framework | [VERIFIED: package.json] Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-virtual | react-window | react-window has fixed-size bias, less flexible for variable heights |
| @tanstack/react-virtual | react-virtuoso | Heavier (~10KB vs ~3KB), more opinionated about markup |

**Installation:**
```bash
npm install @tanstack/react-virtual@^3.13.24
```

**Version verification:** [VERIFIED: npm registry] `@tanstack/react-virtual` version 3.13.24 published 2026-03-15.

## Architecture Patterns

### System Architecture Diagram

```
User Scroll Event
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  NewsFeed.tsx (Orchestrator)                                │
│  ┌────────────────┐    ┌────────────────┐                   │
│  │ useCachedQuery │───>│ filteredArticles│                  │
│  │ (data fetch)   │    │ (useMemo)       │                  │
│  └────────────────┘    └───────┬─────────┘                  │
│                                │                             │
│                                ▼                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ useAccessibilityFallback()                          │   │
│  │   - useMediaQuery('prefers-reduced-motion: reduce') │   │
│  │   - Screen reader detection                         │   │
│  │   Returns: { shouldUseFallback: boolean }           │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                   │
│            ┌─────────────┴──────────────┐                   │
│            ▼                            ▼                    │
│  shouldUseFallback=true     shouldUseFallback=false         │
│            │                            │                    │
│            ▼                            ▼                    │
│  ┌─────────────────┐      ┌────────────────────────────┐   │
│  │ PaginatedFeed   │      │ VirtualizedGrid/List       │   │
│  │ (20 items/page) │      │  ├─ useVirtualizer (rows)  │   │
│  │ Load More btn   │      │  ├─ useVirtualizer (cols)  │   │
│  │ role="list"     │      │  └─ measureElement         │   │
│  └─────────────────┘      └────────────┬───────────────┘   │
│                                         │                    │
│                                         ▼                    │
│                           ┌────────────────────────────┐    │
│                           │ getVirtualItems()          │    │
│                           │   → Only visible items     │    │
│                           │   → Plus overscan (5)      │    │
│                           └────────────┬───────────────┘    │
│                                         │                    │
│                                         ▼                    │
│                           ┌────────────────────────────┐    │
│                           │ SignalCard (CSS transition)│    │
│                           │   data-index={virtualItem} │    │
│                           │   ref={measureElement}     │    │
│                           │   transform: translateY()  │    │
│                           └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── components/
│   ├── NewsFeed.tsx              # Orchestrator (modified)
│   ├── SignalCard.tsx            # Card component (animation simplified)
│   └── virtualization/           # New directory
│       ├── VirtualizedGrid.tsx   # Grid layout with dual virtualizer
│       ├── VirtualizedList.tsx   # Single-column list layout
│       ├── PaginatedFeed.tsx     # Accessibility fallback
│       └── useAccessibilityFallback.ts  # Hook for a11y detection
├── hooks/
│   └── useMediaQuery.ts          # Existing (reuse for reduced motion)
```

### Pattern 1: useVirtualizer Basic Setup
**What:** Core virtualization hook configuration
**When to use:** Any list requiring virtualization
**Example:**
```typescript
// Source: https://tanstack.com/virtual/latest/docs/api/virtualizer [VERIFIED]
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

function VirtualizedList({ items }: { items: Article[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // D-12: ~400px estimated height
    overscan: 5, // D-23: 5 items before/after
    measureElement: (element) => element.getBoundingClientRect().height, // D-12
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <SignalCard article={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Pattern 2: Responsive Grid with Dual Virtualizers
**What:** Grid layout using row + column virtualizers
**When to use:** Multi-column grid views (D-03, D-04)
**Example:**
```typescript
// Source: https://dev.to/dango0812/building-a-responsive-virtualized-grid-with-tanstack-virtual-37nn [CITED]
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedGrid({ items, columns }: { items: Article[]; columns: number }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Card height estimate
    overscan: 5,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns,
    getScrollElement: () => parentRef.current,
    estimateSize: () => parentRef.current
      ? parentRef.current.offsetWidth / columns
      : 300,
    overscan: 2,
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) =>
          columnVirtualizer.getVirtualItems().map((virtualColumn) => {
            const itemIndex = virtualRow.index * columns + virtualColumn.index;
            if (itemIndex >= items.length) return null;

            return (
              <div
                key={`${virtualRow.index}-${virtualColumn.index}`}
                data-index={itemIndex}
                style={{
                  position: 'absolute',
                  transform: `translateX(${virtualColumn.start}px) translateY(${virtualRow.start}px)`,
                  width: `${virtualColumn.size}px`,
                  padding: '12px',
                }}
              >
                <SignalCard article={items[itemIndex]} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

### Pattern 3: Accessibility Fallback Detection
**What:** Detect when to use paginated fallback instead of virtualization
**When to use:** For D-15 to D-18 accessibility requirements
**Example:**
```typescript
// Source: https://www.joshwcomeau.com/react/prefers-reduced-motion/ [CITED]
import { useMediaQuery } from '../hooks/useMediaQuery';

function useAccessibilityFallback(): { shouldUseFallback: boolean } {
  // D-18: Detect reduced motion preference
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Screen reader detection heuristic (aria-live observer or focus-based)
  // Note: No reliable method exists; reduced motion is the primary signal
  const [screenReaderDetected, setScreenReaderDetected] = useState(false);

  useEffect(() => {
    // Heuristic: Check for assistive technology indicators
    // This is imperfect but covers common cases
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

### Pattern 4: CSS Transition for Cards (replacing framer-motion stagger)
**What:** Simple CSS opacity transition replacing index-based stagger animation
**When to use:** D-06, D-07, D-08 animation simplification
**Example:**
```typescript
// BEFORE (SignalCard.tsx line 113-116):
<motion.article
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
>

// AFTER:
<article
  className={cn(
    'signal-card group opacity-0 animate-fade-in',
    // ... existing classes
  )}
  style={{ animationDelay: '50ms' }} // Fixed, not index-based
>

// CSS (add to index.css):
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 200ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .animate-fade-in {
    animation: none;
    opacity: 1;
  }
}
```

### Pattern 5: Scroll Position Reset on Filter Change
**What:** Reset virtualizer scroll to top when filters change
**When to use:** D-24 scroll reset requirement
**Example:**
```typescript
// Inside NewsFeed.tsx
const virtualizer = useVirtualizer({ ... });

// Watch for filter/view mode changes
useEffect(() => {
  virtualizer.scrollToIndex(0, { align: 'start' });
}, [filters.regions, filters.searchQuery, viewMode, trendFilter, feedState.activeSourceFilter]);
```

### Anti-Patterns to Avoid
- **Index-based stagger animation:** Causes jank during fast scroll when items mount/unmount rapidly (D-06)
- **Using scrollToIndex with smooth behavior on dynamic heights:** Known issue causes incorrect positioning [CITED: GitHub TanStack/virtual #536]
- **Relying on virtualization for accessibility users:** Screen readers expect stable DOM; use paginated fallback (D-16)
- **Rendering without position: absolute and transform:** Will cause layout thrashing instead of smooth virtualization

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll position calculation | Custom scroll listener + visibility math | @tanstack/react-virtual `useVirtualizer` | Complex edge cases: variable heights, overscan, resize handling |
| Dynamic height measurement | Manual getBoundingClientRect calls | `measureElement` option | Auto-integrates with virtualizer recalculation |
| Keyboard navigation for lists | Custom arrow key handlers | Standard `role="list"` + roving tabindex | ARIA specification already defines behavior |
| Reduced motion detection | Custom window.matchMedia wrapper | Existing `useMediaQuery` hook | Already SSR-safe and event-listener clean |

**Key insight:** TanStack Virtual handles the hard math (item positioning, scroll offset, measurement caching) while remaining headless, giving full control over rendering. Hand-rolling virtualization math inevitably misses edge cases like rapid scroll direction changes and resize events.

## Common Pitfalls

### Pitfall 1: Smooth Scroll with Dynamic Heights
**What goes wrong:** `scrollToIndex({ behavior: 'smooth' })` combined with `measureElement` dynamic heights causes items to land at wrong positions after animation completes.
**Why it happens:** Smooth scroll animates toward estimated position, but actual measured heights differ from estimates.
**How to avoid:** Use instant scroll (default) for `scrollToIndex` calls; only use smooth scroll for fixed-height scenarios.
**Warning signs:** Items partially obscured after filter change or scroll-to-top.

### Pitfall 2: Stale Height Cache After Content Change
**What goes wrong:** Card heights change (e.g., image loads, content expands) but virtualizer doesn't recalculate.
**Why it happens:** `measureElement` only measures on mount unless explicitly triggered.
**How to avoid:** Call `virtualizer.measure()` after content that affects height changes; images have `loading="lazy"` so measure after load.
**Warning signs:** Overlapping cards, gaps between cards.

### Pitfall 3: Memory Leak from Scroll Event Listeners
**What goes wrong:** Memory grows over time as component remounts without cleanup.
**Why it happens:** Scroll listeners attached but not removed.
**How to avoid:** Use `useVirtualizer` which handles cleanup internally; if adding custom scroll handlers, always return cleanup function from `useEffect`.
**Warning signs:** Growing heap in DevTools memory profiler.

### Pitfall 4: Losing Focus During Fast Scroll
**What goes wrong:** Focused card is unmounted during scroll, focus moves to body.
**Why it happens:** Virtualization removes DOM nodes that exit viewport.
**How to avoid:** Track focused index in state, restore focus when item re-enters viewport; use overscan of 5+ (D-23).
**Warning signs:** Tab key jumps to page header unexpectedly during scroll.

### Pitfall 5: Accessibility Fallback Not Triggering
**What goes wrong:** Users with screen readers get virtualized list, causing confusion.
**Why it happens:** Screen reader detection is imperfect; only reduced motion is reliable.
**How to avoid:** Default to virtualization but prominently offer "Load More" toggle in settings; trust `prefers-reduced-motion` as primary signal.
**Warning signs:** User reports about confusing behavior with NVDA/VoiceOver.

## Code Examples

Verified patterns from official sources:

### Window Scroller (using document scroll)
```typescript
// Source: TanStack Virtual docs - window scrolling [CITED]
// When NewsFeed is part of the page scroll, not a contained scroll area
import { useVirtualizer } from '@tanstack/react-virtual';

function WindowVirtualizedList({ items }: { items: Article[] }) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => window.document.documentElement,
    estimateSize: () => 400,
    overscan: 5,
  });

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => (
        <div
          key={virtualItem.key}
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
          <SignalCard article={items[virtualItem.index]} />
        </div>
      ))}
    </div>
  );
}
```

### Keyboard Navigation Implementation
```typescript
// D-19, D-20, D-21, D-22: Keyboard navigation pattern
import { useState, useCallback } from 'react';

function useKeyboardNavigation(
  items: Article[],
  virtualizer: ReturnType<typeof useVirtualizer>
) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

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

  return { focusedIndex, setFocusedIndex, handleKeyDown };
}
```

### PaginatedFeed Fallback
```typescript
// D-16, D-17: Paginated "Load More" fallback
import { useState } from 'react';

interface PaginatedFeedProps {
  articles: Article[];
  pageSize?: number;
}

function PaginatedFeed({ articles, pageSize = 20 }: PaginatedFeedProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  return (
    <div role="list" aria-label="News articles">
      {visibleArticles.map((article) => (
        <div key={article.id} role="listitem">
          <SignalCard article={article} />
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + pageSize)}
          className="btn-cyber w-full py-3 mt-4"
          aria-label={`Load ${Math.min(pageSize, articles.length - visibleCount)} more articles`}
        >
          Load More ({articles.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-virtualized | @tanstack/react-virtual | 2022 | Smaller bundle, TypeScript-first, framework agnostic |
| Fixed row heights only | Dynamic measureElement | TanStack Virtual 3.x | Variable height items work correctly |
| framer-motion for item animation | CSS transitions | Best practice 2024+ | Avoids stagger jank during scroll |

**Deprecated/outdated:**
- `react-virtualized`: Maintenance mode, superseded by TanStack Virtual
- `react-window`: Still maintained but less flexible than TanStack Virtual for variable heights
- Index-based stagger animations in virtualized lists: Causes performance issues, replace with CSS

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ~400px is a reasonable estimated card height | Patterns | If significantly wrong, initial render will have visible layout shifts; mitigated by measureElement |
| A2 | 5 items overscan is sufficient for smooth scroll | Patterns | If too low, users may see blank areas during fast scroll; easily adjustable |
| A3 | Screen reader detection via user agent is reliable | Patterns | If wrong, some screen reader users get virtualized list; mitigated by reduced-motion being primary signal |

## Open Questions

1. **Exact card height estimate**
   - What we know: Cards contain image (160px), title, summary, metadata; total varies by content
   - What's unclear: Actual average height across real article data
   - Recommendation: Start with 400px estimate, measure with real data, adjust if layout shifts are visible

2. **Window vs container scrolling**
   - What we know: NewsFeed is wrapped in PullToRefresh, uses document scroll
   - What's unclear: Whether PullToRefresh wrapper requires special scroll container handling
   - Recommendation: Test with existing PullToRefresh; may need to adjust getScrollElement

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @tanstack/react-virtual | Virtual scrolling | To be installed | 3.13.24 | - |
| framer-motion | MotionConfig reducedMotion | Yes | 12.35.0 | CSS @media prefers-reduced-motion |
| useMediaQuery hook | Reduced motion detection | Yes | Custom | - |

**Missing dependencies with no fallback:**
- @tanstack/react-virtual must be installed

**Missing dependencies with fallback:**
- None

## Security Domain

> Note: `security_enforcement` not explicitly disabled in config, including security section.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | - |
| V3 Session Management | No | - |
| V4 Access Control | No | - |
| V5 Input Validation | No | No user input in this phase |
| V6 Cryptography | No | - |

### Known Threat Patterns for Virtual Scrolling

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| None identified | - | Pure frontend rendering optimization with no security surface |

This phase is a pure frontend rendering optimization with no data input, network requests, or security-sensitive operations beyond what already exists in the article rendering path.

## Sources

### Primary (HIGH confidence)
- [TanStack Virtual - Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer) - Core API options and methods
- [npm registry - @tanstack/react-virtual](https://www.npmjs.com/package/@tanstack/react-virtual) - Version 3.13.24 verified

### Secondary (MEDIUM confidence)
- [Building Responsive Virtualized Grid with TanStack Virtual](https://dev.to/dango0812/building-a-responsive-virtualized-grid-with-tanstack-virtual-37nn) - Grid layout pattern
- [LogRocket - Speed up long lists with TanStack Virtual](https://blog.logrocket.com/speed-up-long-lists-tanstack-virtual/) - Dynamic height measurement pattern
- [Josh W. Comeau - Accessible Animations with prefers-reduced-motion](https://www.joshwcomeau.com/react/prefers-reduced-motion/) - Reduced motion hook pattern
- [DigitalA11Y - Infinite Scroll & Accessibility](https://www.digitala11y.com/infinite-scroll-accessibility-is-it-any-good/) - Paginated fallback rationale
- [MDN - ARIA feed role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/feed_role) - ARIA semantics for feeds

### Tertiary (LOW confidence)
- [GitHub TanStack/virtual #536](https://github.com/TanStack/virtual/discussions/536) - Smooth scroll + dynamic heights issue (community report)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official TanStack Virtual library, verified on npm, matches CONTEXT.md decision
- Architecture: HIGH - Patterns verified against official docs and community examples
- Pitfalls: MEDIUM - Based on community issues and best practice articles

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days - stable library)

---

*Phase: 31-virtual-scrolling*
*Research completed: 2026-04-25*
