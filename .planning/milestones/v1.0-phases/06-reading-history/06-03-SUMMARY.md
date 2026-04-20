---
phase: "06"
plan: "03"
subsystem: "personalization"
tags: [personalization, for-you, carousel, recommendations, zustand]
dependency_graph:
  requires:
    - ReadingHistoryEntry type (06-01)
    - readingHistory store slice (06-01)
    - isHistoryPaused state (06-01)
  provides:
    - extractUserInterests function
    - scoreArticleForUser function
    - getRecommendations function
    - usePersonalization hook
    - ForYouCarousel component
    - ForYouCard component
    - isPersonalizationEnabled state
  affects:
    - src/store/index.ts
    - src/components/NewsFeed.tsx
    - src/pages/Settings.tsx
tech_stack:
  added: []
  patterns:
    - Topic extraction from title keywords with DE/EN stop words
    - Recency-biased scoring (7-day window weighted 2x)
    - CSS scroll-snap horizontal carousel
    - Eligibility gating (auth + verified + 10+ reads)
key_files:
  created:
    - src/lib/personalization.ts
    - src/hooks/usePersonalization.ts
    - src/components/ForYouCard.tsx
    - src/components/ForYouCarousel.tsx
  modified:
    - src/store/index.ts
    - src/components/NewsFeed.tsx
    - src/pages/Settings.tsx
decisions:
  - "D-09: Topic weighting from reading history keywords"
  - "D-10: Extract both keywords from titles AND regional preferences"
  - "D-12: Interest badge shows matched topic on For You cards"
  - "D-13: Require 10+ articles read before showing For You"
  - "D-14: Settings toggle to disable personalization"
  - "D-15: Recent reads (7 days) weighted 2x higher"
  - "D-17: For You carousel after HeroSection in NewsFeed"
  - "D-21: Already-read articles excluded from recommendations"
  - "D-22: Hide For You section if no recommendations"
metrics:
  duration_minutes: 12
  completed: "2026-04-18T20:56:41Z"
---

# Phase 6 Plan 3: Personalization Engine and For You Carousel Summary

Client-side personalization engine with topic extraction, recency-biased scoring, and a horizontal recommendation carousel for verified users with 10+ articles read.

## What Changed

### Task 1: Personalization Library (861d3b7)

Created `src/lib/personalization.ts` with client-side scoring algorithms:

**Functions:**
- `extractKeywords(text)` - Extract keywords from title, filtering DE/EN stop words
- `extractUserInterests(history, articles)` - Build topic/region interest maps from reading history
- `scoreArticleForUser(article, interests)` - Score articles with topic matching and recency bias
- `getRecommendations(articles, history, historyArticles, limit)` - Get top recommendations excluding read articles
- `formatTopicBadge(topic)` - Capitalize topic for badge display

**Key behaviors:**
- 7-day recency window: Recent reads weighted 2x higher (D-15)
- Explicit article topics weighted 1.5-3x higher than title keywords
- Regional preference bonus at 0.5x topic weight
- Fresh articles (<6h) get 1.3x score boost

### Task 2: usePersonalization Hook and ForYou Components (51cc960)

**src/hooks/usePersonalization.ts:**
- Eligibility checks: `isAuthenticated && isVerified && readCount >= 10` (D-13, D-18, D-19)
- Fetches news articles and history articles for scoring
- Returns `recommendations`, `isLoading`, `isEligible`, `readCount`, `requiredCount`

**src/components/ForYouCard.tsx:**
- Displays interest badge with matched topic (D-12)
- Region-colored source indicator
- Tracks reading on click via `addToReadingHistory`
- Bilingual support for "Based on" label

**src/components/ForYouCarousel.tsx:**
- CSS scroll-snap horizontal carousel (280px cards)
- Shows threshold message when close to eligible
- Returns null if not eligible or no recommendations (D-22)
- Loading skeleton with 4 placeholder cards
- "See All" link to /history

### Task 3: Integration and Settings (7cae0d1)

**src/store/index.ts:**
- Added `isPersonalizationEnabled: boolean` state
- Added `togglePersonalization()` action
- Added to `partialize` for localStorage persistence

**src/components/NewsFeed.tsx:**
- Imported `ForYouCarousel`
- Added to destructure: `isPersonalizationEnabled`
- Rendered `<ForYouCarousel enabled={isPersonalizationEnabled} />` after HeroSection (D-17)

**src/pages/Settings.tsx:**
- Added "Reading & Personalization" section
- Personalization toggle with cyan active color (D-14)
- History pause toggle with orange active color (D-65)
- Bilingual labels (DE/EN)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASSED
- All acceptance criteria met

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 861d3b7 | Personalization library with topic extraction and scoring |
| 2 | 51cc960 | usePersonalization hook and ForYou components |
| 3 | 7cae0d1 | Integration into NewsFeed and Settings toggles |

## Self-Check: PASSED

- [x] src/lib/personalization.ts exists with extractUserInterests, scoreArticleForUser, getRecommendations
- [x] src/hooks/usePersonalization.ts exports usePersonalization hook
- [x] src/components/ForYouCard.tsx displays interest badge
- [x] src/components/ForYouCarousel.tsx uses CSS scroll-snap
- [x] src/store/index.ts contains isPersonalizationEnabled and togglePersonalization
- [x] src/components/NewsFeed.tsx renders ForYouCarousel after HeroSection
- [x] src/pages/Settings.tsx has personalization and history pause toggles
- [x] All commits exist in git log
