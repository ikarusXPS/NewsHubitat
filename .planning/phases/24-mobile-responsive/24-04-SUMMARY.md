---
phase: 24
plan: 04
subsystem: frontend/mobile-touch
tags: [mobile, touch, gestures, swipe, pull-to-refresh, fab]
dependency_graph:
  requires: [useMediaQuery-hook, useHapticFeedback-hook, safe-area-css-vars]
  provides: [SwipeableCard-component, PullToRefresh-component, ScrollToTopFAB-component]
  affects: [NewsCard.tsx, NewsFeed.tsx]
tech_stack:
  added: [react-simple-pull-to-refresh]
  patterns: [framer-motion-drag, spring-animations, haptic-feedback, intersection-observer]
key_files:
  created:
    - src/components/mobile/SwipeableCard.tsx
    - src/components/mobile/PullToRefresh.tsx
    - src/components/mobile/ScrollToTopFAB.tsx
  modified:
    - src/components/NewsCard.tsx
    - src/components/NewsFeed.tsx
    - package.json
    - package-lock.json
decisions:
  - "SwipeableCard uses 80px threshold for bookmark action (Claude's discretion from RESEARCH.md)"
  - "Spring animation with damping: 20, stiffness: 180 for natural gesture feel"
  - "PullToRefresh uses Radio icon (matches NewsHub logo) per CONTEXT.md Specific Ideas"
  - "ScrollToTopFAB positioned using CSS variable --bottom-nav-height + 16px gap (D-31)"
  - "NewsCard conditionally wraps with SwipeableCard on mobile using useIsMobile hook"
  - "react-simple-pull-to-refresh installed with --legacy-peer-deps due to vite version conflict"
metrics:
  duration: "5 minutes"
  completed: "2026-04-24T12:30:06Z"
  tasks_completed: 5
  files_modified: 5
  files_created: 3
---

# Phase 24 Plan 04: Touch Interactions Summary

Mobile touch interaction components with swipe gestures, pull-to-refresh, and scroll-to-top FAB.

## One-liner

SwipeableCard with 80px drag threshold for bookmarking, PullToRefresh with spinning Radio icon indicator, ScrollToTopFAB appearing after 500px scroll, all with haptic feedback.

## Completed Tasks

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 1 | Create SwipeableCard component | 6c97a78 | src/components/mobile/SwipeableCard.tsx |
| 2 | Create PullToRefresh component | 07ad655 | src/components/mobile/PullToRefresh.tsx, package.json |
| 3 | Create ScrollToTopFAB component | 1f521ef | src/components/mobile/ScrollToTopFAB.tsx |
| 4 | Wrap NewsCard with SwipeableCard | ff5a743 | src/components/NewsCard.tsx |
| 5 | Wrap NewsFeed with PullToRefresh | 6d73a44 | src/components/NewsFeed.tsx |

## Technical Implementation

### SwipeableCard Component (`src/components/mobile/SwipeableCard.tsx`)

Swipe-to-bookmark gesture wrapper using Framer Motion drag:

**Key features:**
- `drag="x"` with constraints `{ left: 0, right: 150 }`
- 80px threshold for bookmark action (per RESEARCH.md)
- Spring animation with `damping: 20, stiffness: 180`
- Cyan bookmark icon reveal background (#00f0ff/10)
- `reducedMotion: 'user'` for accessibility
- Haptic feedback via `useHapticFeedback().lightTap()`
- Snaps back to position after drag (`x.set(0)`)
- Only triggers bookmark if not already bookmarked

**Props interface:**
```typescript
interface SwipeableCardProps {
  children: React.ReactNode;
  onBookmark: () => void;
  isBookmarked: boolean;
}
```

### PullToRefresh Component (`src/components/mobile/PullToRefresh.tsx`)

Pull-to-refresh wrapper using react-simple-pull-to-refresh:

**Key features:**
- Custom Radio icon indicator (matches NewsHub logo)
- Pulling state: `animate-pulse` animation
- Refreshing state: `animate-spin` animation
- Cyan color (#00f0ff) matches cyber aesthetic
- `pullDownThreshold: 80` (reasonable pull distance)
- `maxPullDownDistance: 120` (prevents over-pull)
- `resistance: 2` (prevents excessive pull)

**Package note:** Installed with `--legacy-peer-deps` due to vite@8 peer dependency conflict with vite-plugin-pwa.

### ScrollToTopFAB Component (`src/components/mobile/ScrollToTopFAB.tsx`)

Floating action button with scroll detection:

**Key features:**
- Appears after 500px scroll (D-32)
- Positioned above bottom nav: `bottom: calc(var(--bottom-nav-height) + 16px)` (D-31)
- Glass panel styling with cyan border (#00f0ff/20)
- ArrowUp icon from lucide-react
- `md:hidden` for mobile-only display
- AnimatePresence for smooth mount/unmount animation
- Smooth scroll behavior (`behavior: 'smooth'`)
- Haptic feedback on tap
- Passive scroll event listener for performance

### NewsCard Integration

Conditional SwipeableCard wrapper on mobile:

- Uses `useIsMobile()` hook from Plan 01
- Wraps `cardContent` with SwipeableCard when viewport < 768px
- Desktop renders card without wrapper
- `onBookmark` uses existing `toggleBookmark` from store
- `isBookmarked` prop prevents duplicate bookmarks

### NewsFeed Integration

Full PullToRefresh wrapper with ScrollToTopFAB:

- `handleRefresh` function calls `refetch()` from TanStack Query
- Entire feed content wrapped in PullToRefresh
- ScrollToTopFAB rendered after content
- Pull-to-refresh triggers fresh data fetch

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript: PASS (no type errors)
- Build: PASS (frontend and server build successful)
- File count: 3 created, 5 modified (matches plan)

## Haptic Feedback Support

Haptic feedback is provided via the Vibration API:
- **Supported:** Android Chrome, most mobile browsers
- **Not supported:** iOS Safari (navigator.vibrate undefined)
- **Graceful degradation:** Feature detection prevents errors on unsupported platforms

Usage in this plan:
- SwipeableCard: `lightTap()` on successful bookmark
- ScrollToTopFAB: `lightTap()` on button tap

## Spring Animation Quality

All gestures use Framer Motion spring animations:
- SwipeableCard: `damping: 20, stiffness: 180` - smooth, natural bounce
- ScrollToTopFAB: `duration: 0.2` with scale animation
- All animations respect `prefers-reduced-motion` via `reducedMotion: 'user'`

## Dependencies Provided

This plan provides foundation for:
- Plan 05: Page Layout Adjustments (touch interactions available for other pages)
- Future plans can reuse SwipeableCard pattern for other swipe actions

## Self-Check: PASSED

- [x] src/components/mobile/SwipeableCard.tsx exists and exports SwipeableCard
- [x] src/components/mobile/PullToRefresh.tsx exists with Radio icon
- [x] src/components/mobile/ScrollToTopFAB.tsx exists with 500px threshold
- [x] NewsCard.tsx imports and uses SwipeableCard on mobile
- [x] NewsFeed.tsx imports and uses PullToRefresh and ScrollToTopFAB
- [x] react-simple-pull-to-refresh in package.json
- [x] All 5 commits verified in git log
- [x] TypeScript compilation passes
- [x] Build completes successfully
