---
phase: "06"
plan: "01"
subsystem: "gamification-foundation"
tags: [prisma, zustand, types, gamification, badges, leaderboard, avatars]
dependency_graph:
  requires: []
  provides:
    - Badge model
    - UserBadge model
    - LeaderboardSnapshot model
    - User profile fields
    - ReadingHistoryEntry type
    - isHistoryPaused state
    - BADGE_DEFINITIONS constant
    - AVATAR_PRESETS constant
  affects:
    - prisma/schema.prisma
    - src/store/index.ts
    - src/types/feeds.ts
    - src/types/gamification.ts
tech_stack:
  added: []
  patterns:
    - Zustand readCount tracking for re-reads
    - History pause/resume toggles
    - 4-tier badge system (bronze/silver/gold/platinum)
    - Region-based avatar unlock system
key_files:
  created:
    - src/types/gamification.ts
  modified:
    - prisma/schema.prisma
    - src/store/index.ts
    - src/types/feeds.ts
decisions:
  - "D-02: readCount field tracks article re-reads"
  - "D-03: 100 entry limit maintained in history"
  - "D-41: 10 badges with 4 tiers defined"
  - "D-25: 30 avatar presets (5 per region)"
  - "D-65/D-66: History pause implemented"
metrics:
  duration_minutes: 5
  completed: "2026-04-18T20:35:00Z"
---

# Phase 6 Plan 1: Database Schema and Store Extensions Summary

Extended database schema and Zustand store with gamification models, badge definitions, avatar presets, and enhanced reading history with readCount tracking.

## What Changed

### Task 1: Prisma Schema Extension (4f25357)

Added new models and User fields for Phase 6 gamification:

**User Model Extensions:**
- `avatarUrl` - Custom uploaded avatar
- `selectedPresetAvatar` - Selected historical figure avatar
- `featuredBadgeId` - User's chosen display badge
- `showOnLeaderboard` - Privacy opt-out for leaderboard
- `isHistoryPaused` - History tracking toggle
- `deletionRequestedAt` / `deletionConfirmToken` - Account deletion support
- `badges` relation to UserBadge

**New Models:**
- `Badge` - Badge definitions with tier, category, iconType, threshold
- `UserBadge` - User badge progress with earnedAt and progress
- `LeaderboardSnapshot` - Daily ranking snapshots with timeframe

### Task 2: Gamification Types (f33e0ec)

Created `src/types/gamification.ts` with:

**Types:**
- `BadgeTier` - bronze/silver/gold/platinum
- `BadgeCategory` - volume/diversity/behavior
- `Badge`, `UserBadge`, `BadgeProgress` interfaces
- `LeaderboardEntry`, `LeaderboardSnapshot` for rankings
- `AvatarPreset`, `RegionUnlockStatus` for avatar system
- `AchievementUnlock` for toast notifications

**Constants:**
- `BADGE_RARITY_COLORS` - UI theme colors per tier
- `BADGE_DEFINITIONS` - 10 badges across 3 categories:
  - Volume: Bookworm, Scholar
  - Diversity: Global Perspective Reader
  - Behavior: Streak Master, Curator, AI Explorer, Fact Checker, Early Bird, Night Owl, Weekly Champion
- `AVATAR_PRESETS` - 30 historical figures (5 per region):
  - Western: Lincoln, Einstein, Churchill, Curie, Shakespeare
  - Middle East: Saladin, Avicenna, Cleopatra, Rumi, Nefertiti
  - Turkish: Ataturk, Suleiman, Mehmed, Halide Edib, Mimar Sinan
  - Russian: Peter the Great, Tolstoy, Catherine, Gagarin, Tchaikovsky
  - Chinese: Confucius, Sun Tzu, Wu Zetian, Qin Shi Huang, Laozi
  - Alternative: Mandela, Gandhi, Bolivar, MLK, Frida Kahlo

### Task 3: Zustand Store Extension (cb24c03)

Enhanced reading history with readCount and pause functionality:

**New Interface (`ReadingHistoryEntry`):**
```typescript
interface ReadingHistoryEntry {
  articleId: string;
  timestamp: number;
  readCount: number;  // Track re-reads
}
```

**New State:**
- `isHistoryPaused: boolean` - Toggle for history tracking
- `pauseHistory()` / `resumeHistory()` - Actions

**Updated Logic:**
- `addToReadingHistory` respects pause state (D-65, D-66)
- Increments `readCount` on re-reads after 5-minute dedup window
- Maintains 100 entry limit (D-03)
- Persists `isHistoryPaused` to localStorage

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Prisma validate: PASSED
- TypeScript compile: PASSED
- All acceptance criteria met

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 4f25357 | Prisma schema with Badge, UserBadge, LeaderboardSnapshot models |
| 2 | f33e0ec | Gamification types with badge definitions and avatar presets |
| 3 | cb24c03 | Zustand store with readCount and history pause |

## Self-Check: PASSED

- [x] prisma/schema.prisma contains `model Badge {`
- [x] prisma/schema.prisma contains `model UserBadge {`
- [x] prisma/schema.prisma contains `model LeaderboardSnapshot {`
- [x] src/types/gamification.ts exists with 10 badge definitions
- [x] src/types/gamification.ts contains 30 avatar presets
- [x] src/types/feeds.ts contains ReadingHistoryEntry with readCount
- [x] src/store/index.ts contains isHistoryPaused and pause/resume actions
- [x] All commits exist in git log
