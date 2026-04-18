---
phase: 06
plan: 05
subsystem: gamification
tags:
  - badges
  - achievements
  - gamification
  - profile
dependency_graph:
  requires:
    - 06-01 (Prisma schema for Badge, UserBadge models)
    - 06-04 (Profile page, avatar system)
  provides:
    - Badge CRUD API with definitions, progress, award endpoints
    - Achievement tracking hook with milestone detection
    - Badge display components for profile page
  affects:
    - src/components/profile/
    - src/hooks/
    - server/routes/
tech_stack:
  added:
    - prisma/seed-badges.ts (badge seed data)
  patterns:
    - Milestone detection with ref-based previous state tracking
    - Category-based filtering for badges
    - Featured badge selection with API mutation
key_files:
  created:
    - server/routes/badges.ts
    - prisma/seed-badges.ts
    - src/components/AchievementToast.tsx
    - src/hooks/useAchievements.ts
    - src/components/profile/BadgeCard.tsx
    - src/components/profile/BadgeGrid.tsx
    - src/components/profile/FeaturedBadge.tsx
  modified:
    - server/index.ts
    - package.json
decisions:
  - Badge seed data uses uniqueName pattern (name-tier) for upsert
  - Achievement detection via ref-based previous stats comparison
  - 5-second debounce on achievement checking
  - Category filter includes all, volume, diversity, behavior
  - Badge groups collapse to highest earned or first unearned tier
metrics:
  duration: ~5m
  completed: 2026-04-18T21:52:30Z
---

# Phase 6 Plan 5: Gamification System Summary

Badge API, achievement tracking hook, and badge display components for profile gamification.

## One-liner

Gamification system with 40 badge definitions, achievement milestone detection, and animated unlock toasts.

## Changes

### Task 1: Badge API and seed data (commit f139edf - previous)

Created backend infrastructure for badge system:

**prisma/seed-badges.ts:**
- 40 badge definitions across 10 badge types x 4 tiers
- Categories: volume (Bookworm, Scholar), diversity (Global Perspective Reader), behavior (Weekly Streak, Curator, AI Explorer, Early Bird, Night Owl, Weekly Champion, Fact Checker)
- Uses upsert with unique name pattern for idempotent seeding

**server/routes/badges.ts:**
- GET /definitions - all badge definitions
- GET /user - user's earned badges (authenticated)
- GET /progress - badge progress by base name (authenticated)
- POST /award - award badge to user (authenticated)
- PUT /featured - set featured badge per D-43 (authenticated)

**server/index.ts:**
- Added badgeRoutes import and mount at /api/badges

**package.json:**
- Added seed:badges script

### Task 2: Achievement toast and tracking hook (commit 078d282)

Created client-side achievement detection:

**src/components/AchievementToast.tsx:**
- Animated toast with spring transition per D-38
- Three achievement types: badge, region-avatars, weekly-champion
- Glowing border with type-specific colors (purple, cyan, yellow)
- Icon pulse animation on display
- Auto-dismiss after 5 seconds

**src/hooks/useAchievements.ts:**
- Calculates stats from readingHistory: total articles, streak, early bird, night owl counts
- Milestone detection via ref-based previous state comparison
- Bookworm milestones: 10, 50, 100, 500 articles
- Curator milestones: 5, 20, 50, 100 bookmarks
- Server-side badge persistence via /api/badges/award
- 5-second debounce to prevent rapid checks

### Task 3: Badge display components (commit 76e5ad4)

Created profile badge UI:

**src/components/profile/BadgeCard.tsx:**
- Badge card with tier colors via BADGE_RARITY_COLORS
- Progress bar for unearned badges per D-39
- Earned indicator with checkmark
- Icon emoji mapping for badge types
- Selectable state for featured badge selection

**src/components/profile/FeaturedBadge.tsx:**
- Prominent badge display per D-43
- Glowing border based on tier color
- Remove button for clearing featured badge

**src/components/profile/BadgeGrid.tsx:**
- Fetches badge definitions and user badges via TanStack Query
- Category filter (all, volume, diversity, behavior) per D-42
- Groups badges by base name, shows highest earned or first unearned
- Featured badge mutation with optimistic invalidation
- Empty state with Award icon

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

- Badge uniqueName uses `{name}-{tier}` pattern for database uniqueness
- Achievement hook uses ref to track previous stats, avoiding effect dependencies
- Badge groups show the highest earned tier or first unearned tier (collapsed view)
- Featured badge ID retrieved via type-safe cast from user object

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | f139edf | feat(06-05): add badge API and seed data |
| 2 | 078d282 | feat(06-05): add achievement toast and tracking hook |
| 3 | 76e5ad4 | feat(06-05): add badge display components |

## Self-Check: PASSED

Files verified:
- FOUND: D:\NewsHub\server\routes\badges.ts
- FOUND: D:\NewsHub\prisma\seed-badges.ts
- FOUND: D:\NewsHub\src\components\AchievementToast.tsx
- FOUND: D:\NewsHub\src\hooks\useAchievements.ts
- FOUND: D:\NewsHub\src\components\profile\BadgeCard.tsx
- FOUND: D:\NewsHub\src\components\profile\BadgeGrid.tsx
- FOUND: D:\NewsHub\src\components\profile\FeaturedBadge.tsx

Commits verified:
- FOUND: f139edf
- FOUND: 078d282
- FOUND: 76e5ad4
