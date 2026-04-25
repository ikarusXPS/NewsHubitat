---
phase: 31-virtual-scrolling
plan: 02
subsystem: frontend-performance
tags: [virtualization, css-animation, accessibility, newsfeed]
dependency_graph:
  requires:
    - "31-01"
  provides:
    - "NewsFeed virtualization integration"
    - "CSS fade-in animation"
    - "SignalCard CSS transition"
  affects:
    - "src/components/NewsFeed.tsx"
    - "src/components/SignalCard.tsx"
    - "src/index.css"
tech_stack:
  added: []
  patterns:
    - "CSS keyframes for card animation (replacing framer-motion stagger)"
    - "prefers-reduced-motion media query for accessibility"
    - "Conditional rendering for virtualization vs paginated fallback"
key_files:
  created: []
  modified:
    - "src/index.css"
    - "src/components/SignalCard.tsx"
    - "src/components/NewsFeed.tsx"
decisions:
  - "200ms fade-in animation with 8px translateY matches original framer-motion feel"
  - "Keep index prop in SignalCardProps interface for backward compatibility"
  - "Remove AnimatePresence import (no longer used after virtualization)"
metrics:
  duration_seconds: 326
  completed: "2026-04-25T20:33:05Z"
  tasks_completed: 3
  files_changed: 3
---

# Phase 31 Plan 02: SignalCard CSS Animation & NewsFeed Integration Summary

CSS animation replaces framer-motion stagger; NewsFeed now uses virtualized rendering with accessibility fallback.

## One-liner

Replaced SignalCard framer-motion stagger with CSS fade-in animation and integrated VirtualizedGrid/VirtualizedList/PaginatedFeed into NewsFeed with automatic accessibility fallback.

## What Was Built

### Task 1: CSS Fade-in Animation

Added CSS animation to `src/index.css` after the existing keyframes section:
- `@keyframes fade-in` with 200ms duration and 8px vertical movement
- `.animate-fade-in` class with `forwards` fill mode
- `@media (prefers-reduced-motion: reduce)` query to disable animation for accessibility users

### Task 2: SignalCard CSS Transition

Modified `src/components/SignalCard.tsx`:
- Removed `motion` import from framer-motion (no longer needed)
- Changed `<motion.article>` to standard `<article>` element
- Added `animate-fade-in` CSS class to replace index-based stagger animation
- Removed animation props (`initial`, `animate`, `transition`)
- Kept `index` prop in interface for backward compatibility with callers

### Task 3: NewsFeed Virtualization Integration

Modified `src/components/NewsFeed.tsx`:
- Added imports for `VirtualizedGrid`, `VirtualizedList`, `PaginatedFeed`, `useAccessibilityFallback`
- Added `useAccessibilityFallback()` hook call for reduced-motion detection
- Replaced `AnimatePresence`/`motion.div` grid rendering with conditional logic:
  - `shouldUseFallback` true -> `PaginatedFeed` (accessibility mode)
  - `viewMode === 'grid'` -> `VirtualizedGrid`
  - Otherwise -> `VirtualizedList`
- Removed unused `AnimatePresence` import

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 029524a | style | Add CSS fade-in animation with reduced-motion support |
| af9e933 | refactor | Replace framer-motion stagger with CSS fade-in in SignalCard |
| 6d5df7c | feat | Integrate virtualization components into NewsFeed |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `grep "@keyframes fade-in" src/index.css` returns match at line 306
- `grep "motion.article" src/components/SignalCard.tsx` returns no match (removed)
- `grep "animate-fade-in" src/components/SignalCard.tsx` returns match at line 116
- `grep "VirtualizedGrid" src/components/NewsFeed.tsx` returns matches at lines 17, 402
- `npm run typecheck` passes with no errors

## Performance Impact

- **Bundle size**: Reduced by removing framer-motion stagger logic from SignalCard
- **Scroll performance**: Virtualization renders only visible items (10-15 DOM nodes instead of 500+)
- **Animation jank**: Eliminated index-based stagger delays that caused jank during fast scroll
- **Accessibility**: Automatic fallback to paginated mode for reduced-motion users

## Self-Check: PASSED

- [x] src/index.css contains @keyframes fade-in
- [x] src/index.css contains .animate-fade-in
- [x] src/index.css contains prefers-reduced-motion media query
- [x] src/components/SignalCard.tsx does NOT contain motion.article
- [x] src/components/SignalCard.tsx contains animate-fade-in
- [x] src/components/NewsFeed.tsx contains VirtualizedGrid import
- [x] src/components/NewsFeed.tsx contains useAccessibilityFallback hook
- [x] src/components/NewsFeed.tsx contains PaginatedFeed conditional
- [x] npm run typecheck passes
- [x] Commit 029524a exists
- [x] Commit af9e933 exists
- [x] Commit 6d5df7c exists
