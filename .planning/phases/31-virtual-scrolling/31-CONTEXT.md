# Phase 31: Virtual Scrolling - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can scroll through hundreds of articles without performance degradation. This phase implements FRON-02 from v1.5 requirements.

**Delivers:**
- NewsFeed with 500+ articles renders only visible items (10-15 DOM nodes)
- Scrolling maintains 60fps with 1000+ articles loaded
- Keyboard navigation and screen reader accessibility preserved
- "Load More" button available as accessible fallback
- Memory usage remains stable over extended scrolling sessions

**Principle:** Build on Phase 30's lazy loading and code splitting patterns. Virtualization is the final piece for large-list performance.

</domain>

<decisions>
## Implementation Decisions

### Library Choice
- **D-01:** Use @tanstack/react-virtual (headless, ~3KB, already using TanStack Query)
- **D-02:** Supports both grid and list layouts with same API

### View Modes
- **D-03:** Keep both grid (3-column) and list view modes with virtualization
- **D-04:** Grid uses `useVirtualizer` with multi-column lane calculation
- **D-05:** List uses single-column `useVirtualizer`

### Card Animations
- **D-06:** Remove stagger animation (`delay: 0.1 + index * 0.05`) to prevent jank on fast scroll
- **D-07:** Keep simple opacity fade-in transition for polish without performance impact
- **D-08:** Update SignalCard to use CSS transitions instead of framer-motion stagger

### NewsFeed Integration
- **D-09:** Implement virtualization inside NewsFeed.tsx (not a separate component)
- **D-10:** Create VirtualizedGrid component to replace direct map() rendering
- **D-11:** NewsFeed remains the orchestrator (filters, state, data fetching)

### Dynamic Heights
- **D-12:** Use estimated height (~400px) with `measureElement` for actual measurement
- **D-13:** Allow cards to have variable heights based on content (summary length, topics)
- **D-14:** `useVirtualizer` handles height recalculation automatically

### Accessibility Fallback
- **D-15:** Detect `prefers-reduced-motion` OR screen reader presence
- **D-16:** Auto-switch to paginated "Load More" mode for accessibility users
- **D-17:** Paginated mode renders 20 articles at a time, button loads more
- **D-18:** Use `useMediaQuery('(prefers-reduced-motion: reduce)')` for motion detection

### Keyboard Navigation
- **D-19:** Arrow keys (Up/Down) move focus through visible cards
- **D-20:** Tab key moves between interactive elements within a card
- **D-21:** Ensure `role="list"` and `role="listitem"` for screen readers
- **D-22:** Focus indicator visible on active card

### Memory & Performance
- **D-23:** Overscan 5 items before and after viewport
- **D-24:** Reset scroll position to top when filters or view mode change
- **D-25:** Always use virtualization regardless of list size (consistent behavior)
- **D-26:** Card images already have `loading="lazy"` (from Phase 30)

### Claude's Discretion
- Exact estimated row height based on testing (starting at ~400px)
- Whether to create VirtualizedGrid as separate file or inline in NewsFeed
- Screen reader detection method (aria-live region vs focus detection)
- CSS transition timing for card fade-in

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Decisions
- `.planning/phases/30-frontend-code-splitting/30-CONTEXT.md` — Lazy loading patterns, image loading="lazy", lazyWithRetry
- `.planning/phases/24-mobile-responsive/24-CONTEXT.md` — Mobile-first patterns, useMediaQuery hook

### Existing Code
- `src/components/NewsFeed.tsx` — Current article grid rendering, filters, view modes
- `src/components/SignalCard.tsx` — Card component with framer-motion animations
- `src/components/InfiniteScroll.tsx` — Intersection Observer pagination (reference, not reused)
- `src/hooks/useCachedQuery.ts` — Data fetching pattern for articles

### Requirements
- `.planning/REQUIREMENTS.md` — FRON-02 (virtual scrolling requirement)

### TanStack Virtual
- Official docs: https://tanstack.com/virtual/latest — API reference for useVirtualizer

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useMediaQuery` hook: Already exists for responsive detection, reuse for reduced-motion
- `SignalCard` component: Render-ready, needs animation simplification
- `useCachedQuery` hook: Data fetching pattern already handles article loading
- `InfiniteScroll` component: Not reused but shows Intersection Observer pattern

### Established Patterns
- View mode toggle: `viewMode === 'grid' ? '3-col' : '1-col'` pattern in NewsFeed
- Filter application: `useMemo` for filtered articles before rendering
- Mobile-first: `md:grid-cols-2 md:grid-cols-3` responsive grid

### Integration Points
- `NewsFeed.tsx` lines 386-413: Replace AnimatePresence/motion.div grid with virtualized version
- `SignalCard.tsx` lines 112-116: Remove framer-motion stagger, use CSS transition
- Store: `useAppStore` provides filter state that triggers scroll reset

</code_context>

<specifics>
## Specific Ideas

- VirtualizedGrid should feel seamless — users shouldn't notice any difference in behavior
- Keep pull-to-refresh working with virtualized list (PullToRefresh wrapper stays)
- ScrollToTopFAB should work with virtualized scroll container
- Card focus outline: Same cyan accent color as hover states (`#00f0ff`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-virtual-scrolling*
*Context gathered: 2026-04-25*
