# Phase 6: Reading History - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Track reading history and personalize news feed. Users can view their reading history, see personalized recommendations based on reading patterns, edit their profile, earn achievements/badges, and participate in community leaderboards.

**Note:** HIST-01 (automatic tracking) is already implemented in Zustand store with `addToReadingHistory()` called in NewsCard.tsx.

</domain>

<decisions>
## Implementation Decisions

### History Page Layout (HIST-02)
- **D-01:** Timeline by date organization - group by Today/Yesterday/This Week/Older
- **D-02:** Show read timestamp + read count per article (track re-reads)
- **D-03:** Keep 100 history entries limit (current implementation)
- **D-04:** Header stats section with total articles, regions breakdown, topics breakdown
- **D-05:** Advanced filters - search + region + date range + sentiment
- **D-06:** Empty state: Clock icon + "Start reading articles to build your history" prompt
- **D-07:** Navigation: Add History to sidebar AND quick access from Profile page
- **D-08:** Cards view (like Bookmarks) using NewsCard components in grid

### Personalization Logic (HIST-03)
- **D-09:** Topic weighting - boost articles matching topics from reading history
- **D-10:** Extract both keywords from titles AND regional preferences
- **D-11:** "For You" section as horizontal carousel (8-12 articles) + invisible boost in main feed
- **D-12:** Show "Based on your interest in {topic}" badge on For You articles
- **D-13:** Require 10+ articles read before showing For You section
- **D-14:** Settings toggle to disable personalization
- **D-15:** Recent bias - weight recent reads (last 7 days) higher than older
- **D-16:** Client-side processing using existing reading history (no backend changes)
- **D-17:** For You carousel above main feed, after HeroSection
- **D-18:** Require login - For You only shows for authenticated users
- **D-19:** Verified users only - reading history tracking requires email verification
- **D-20:** Auto-refresh recommendations when main feed updates
- **D-21:** Exclude already-read articles from For You recommendations
- **D-22:** Hide For You section entirely if no recommendations available

### Profile Editing (UI-01)
- **D-23:** Editable fields: Name + Avatar
- **D-24:** Avatar options: Upload custom image OR choose from preset historical figures
- **D-25:** Preset avatars: 30 total (5 per region, mix of men/women, historical figures as caricatures)
- **D-26:** Preset categories: Famous leaders + thinkers from Western, Middle East, Turkish, Russian, Chinese, Alternative perspectives
- **D-27:** Profile editing in Settings page (not inline on Profile)
- **D-28:** Name changes require password confirmation
- **D-29:** Upload limits: Max 2MB, JPEG/PNG only, auto-resize to 256x256
- **D-30:** Storage: Server filesystem (/public/avatars/)
- **D-31:** Profile page shows reading insights: favorite regions, top topics, reading streak
- **D-32:** Unauthenticated users redirect /profile to /settings#login
- **D-33:** Show both daily streak AND weekly activity metrics
- **D-34:** Avatar selection grouped by region with tooltips (name + era, e.g., "Cleopatra (69-30 BC)")
- **D-35:** Only show unlocked avatars (hide locked ones, don't show greyscale)
- **D-36:** Profile page links to Settings for editing (not inline edit)

### Gamification System
- **D-37:** Avatar unlock system: Read 5+ articles from a region to unlock its historical figure avatars
- **D-38:** Celebration toast when region avatars unlock
- **D-39:** Achievement progress bars showing unlock progress per region
- **D-40:** Progress shown on Profile page AND in avatar picker modal
- **D-41:** 10-15 badges with 4 tiers (bronze, silver, gold, platinum)
- **D-42:** Badge categories: Reading volume + diversity + behavior (streaks, bookmarking, AI usage)
- **D-43:** Featured badge slot - user picks one badge to display prominently
- **D-44:** Badges publicly displayed on profile
- **D-45:** Descriptive badge names (e.g., "Global Perspective Reader", "Weekly Streak Master")
- **D-46:** English only for badge names (no i18n)
- **D-47:** Badges stored in database (not localStorage) for persistence across devices
- **D-48:** Weekly winner badge for #1 on weekly leaderboard
- **D-49:** Custom avatar upload requires email verification

### Leaderboard System
- **D-50:** Public leaderboard on Community page
- **D-51:** Top 100 users displayed
- **D-52:** Multiple categories (Claude decides appropriate number based on features)
- **D-53:** Privacy opt-out option in Settings
- **D-54:** Don't show user's position if outside top 100
- **D-55:** No linking to user profiles from leaderboard
- **D-56:** Daily snapshot updates (not real-time)
- **D-57:** Three time periods: All-time + This Week + This Month
- **D-58:** Calendar reset for weekly/monthly (Monday 00:00, 1st of month)
- **D-59:** Weekly winners celebration banner on Community page
- **D-60:** Podium + list format: Top 3 as featured podium, rest as list below
- **D-61:** No historical leaderboard archives

### History Management
- **D-62:** Clear all button with confirmation modal
- **D-63:** No individual item removal (clear all only)
- **D-64:** Clearing history does NOT affect achievements/badges
- **D-65:** Pause history tracking toggle in Settings
- **D-66:** When paused: no tracking, For You uses existing history
- **D-67:** Export data: JSON and CSV options
- **D-68:** Full data export (history + bookmarks + preferences + achievements) in Settings
- **D-69:** Account deletion with password + email confirmation
- **D-70:** 7-day grace period for account deletion
- **D-71:** Cancel deletion by logging in during grace period
- **D-72:** Keep anonymized stats after account deletion (for analytics)

### Filtering (History Page)
- **D-73:** Date range: Both presets (Today, Yesterday, 7d, 30d) + custom date picker
- **D-74:** Region filter style: Claude decides based on existing patterns
- **D-75:** Sentiment filter: Claude decides based on usefulness
- **D-76:** URL state persistence: Claude decides based on UX patterns
- **D-77:** Search behavior: Claude decides (real-time vs submit)
- **D-78:** Pagination/scroll: Claude decides based on existing patterns

### Stats Visualization
- **D-79:** Numbers + mini charts in header
- **D-80:** Region pie chart + 7-day activity sparkline

### Claude's Discretion
- Avatar image format (SVG vs PNG)
- Reset avatar to initials option
- Profile change audit logging
- Leaderboard categories count and names
- Badge icon style (emoji vs SVG)
- Podium animation effects
- Re-registration blocking after deletion
- History page pagination vs infinite scroll
- Search debounce timing
- URL state for filters
- Sentiment filter inclusion

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Implementation
- `src/store/index.ts` - Zustand store with readingHistory, addToReadingHistory(), clearReadingHistory()
- `src/components/NewsCard.tsx:31` - trackReading() calls addToReadingHistory on article click
- `src/pages/Bookmarks.tsx` - Pattern reference for history page layout
- `src/pages/Profile.tsx` - Existing Profile page, shows readingHistory.length

### Personalization
- `src/lib/articleRelevance.ts` - Existing keyword scoring and diversity logic
- `src/lib/historySummarizer.ts` - Topic extraction patterns

### Related Pages
- `src/pages/Settings.tsx` - Profile editing section to be added here
- `src/pages/Community.tsx` - Leaderboard to be added here
- `src/pages/Dashboard.tsx` - For You carousel to be added here

### Types
- `src/types/feeds.ts` - ReadState type definitions

### Prior Phase Decisions
- Phase 3 D-04: Unverified users are read-only (no AI, bookmarks, preferences)
- Phase 3 D-05: Verification prompt via persistent top banner

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `readingHistory` array in Zustand store - already tracking {articleId, timestamp}
- `NewsCard` component - reuse for history list display
- `Bookmarks.tsx` pattern - fetchArticleById, grid layout, empty state
- `MarkerClusterGroup` Recharts components - for pie chart and sparkline
- `glass-panel` styling - for cards and sections
- Toast component - for achievement unlock notifications

### Established Patterns
- Zustand persist middleware for localStorage
- TanStack Query for data fetching
- Grid layout with responsive columns (md:grid-cols-2 lg:grid-cols-3)
- German language labels with bilingual support
- Dark cyber theme with cyan accent (#00f0ff)
- Region colors: Western (blue), Middle East (green), Turkish (red), Russian (purple), Chinese (yellow), Alternative (cyan)

### Integration Points
- Add History to Sidebar navigation
- Add For You carousel to Dashboard.tsx after HeroSection
- Add profile editing section to Settings.tsx
- Add leaderboard section to Community.tsx
- Extend User model in Prisma schema for badges, achievements, avatar
- Add achievement checking logic after article read

</code_context>

<specifics>
## Specific Ideas

- Preset avatars are caricatures of historical figures from the same regions as news perspectives
- Mix of leaders and thinkers (politicians, military, scientists, philosophers, artists)
- 5 figures per region with gender diversity
- Gamified unlock: Read 5 articles from a region to unlock its avatars
- Celebration toast with confetti-style notification on unlock
- Weekly leaderboard winners get special badge + banner announcement

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 06-reading-history*
*Context gathered: 2026-04-18*
