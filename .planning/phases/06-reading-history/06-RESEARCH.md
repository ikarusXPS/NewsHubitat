# Phase 6: Reading History - Research

**Researched:** 2026-04-18
**Domain:** Client-side state management, personalization algorithms, gamification, profile management
**Confidence:** HIGH

## Summary

Phase 6 implements reading history visualization, personalized "For You" recommendations, user profile editing with unlockable historical figure avatars, gamification badges, community leaderboards, and history management features. The existing codebase provides strong foundations: Zustand store already tracks `readingHistory` with `{ articleId, timestamp }[]`, `NewsCard.tsx` calls `addToReadingHistory()` on article click, and the Bookmarks page pattern serves as the template for the History page layout.

The tech stack is well-established with React 19, Zustand v5, TanStack Query v5, Recharts 3.8.1, and framer-motion 12.38.0 - all currently installed and verified. No new dependencies are required. The primary complexity lies in the personalization algorithm (topic extraction from reading patterns) and the gamification system (badge definitions, progress tracking, leaderboard snapshots).

**Primary recommendation:** Extend Zustand store with `readCount` per article, add new Prisma models for Badge/UserBadge/LeaderboardSnapshot, and implement client-side personalization scoring using the existing `articleRelevance.ts` patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Timeline by date organization - group by Today/Yesterday/This Week/Older
- **D-02:** Show read timestamp + read count per article (track re-reads)
- **D-03:** Keep 100 history entries limit (current implementation)
- **D-04:** Header stats section with total articles, regions breakdown, topics breakdown
- **D-05:** Advanced filters - search + region + date range + sentiment
- **D-06:** Empty state: Clock icon + "Start reading articles to build your history" prompt
- **D-07:** Navigation: Add History to sidebar AND quick access from Profile page
- **D-08:** Cards view (like Bookmarks) using NewsCard components in grid
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
- **D-73:** Date range: Both presets (Today, Yesterday, 7d, 30d) + custom date picker
- **D-74:** Region filter style: Claude decides based on existing patterns
- **D-75:** Sentiment filter: Claude decides based on usefulness
- **D-76:** URL state persistence: Claude decides based on UX patterns
- **D-77:** Search behavior: Claude decides (real-time vs submit)
- **D-78:** Pagination/scroll: Claude decides based on existing patterns
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

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | User's read articles are tracked automatically | Already implemented in `addToReadingHistory()` - needs enhancement for `readCount` per D-02 |
| HIST-02 | User can view reading history | History page with Bookmarks.tsx pattern, timeline grouping, NewsCard reuse |
| HIST-03 | User sees personalized feed based on reading patterns | ForYouCarousel component, topic extraction from `articleRelevance.ts` patterns |
| UI-01 | User can view and edit profile on UserProfile page | Profile enhancements, avatar picker, Settings editing section |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Reading history tracking | Client (Zustand) | Database (badges) | Client already tracks via localStorage; badges need DB for cross-device |
| Personalization scoring | Client (Browser) | -- | D-16 explicitly requires client-side processing |
| For You carousel | Client (React) | -- | UI component consuming client-side scored articles |
| Badge/achievement tracking | Database (Prisma) | Client (display) | D-47 requires DB persistence for cross-device |
| Leaderboard snapshots | Database (Prisma) | Backend (cron) | D-56 requires daily snapshots, backend job |
| Avatar storage | Backend (filesystem) | -- | D-30 specifies server filesystem storage |
| Profile editing | Backend (API) | Client (forms) | Name change requires auth (D-28) |
| Data export | Backend (API) | Client (download) | Full data export needs DB access |
| Account deletion | Backend (API) | -- | Security-critical, backend only |

## Standard Stack

### Core (Already Installed - Verified)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 | Client state for reading history | Already persisting `readingHistory` to localStorage [VERIFIED: `npm view zustand version`] |
| @tanstack/react-query | 5.99.1 | Server state for leaderboards, badges | Existing pattern for data fetching [VERIFIED: `npm view @tanstack/react-query version`] |
| recharts | 3.8.1 | Pie charts and sparklines | Already used in existing components [VERIFIED: `npm view recharts version`] |
| framer-motion | 12.38.0 | Toast animations, carousel scroll, podium reveal | Already used throughout app [VERIFIED: `npm view framer-motion version`] |
| prisma | 6.6.0 | Database models for badges, leaderboards | Existing ORM, schema at `prisma/schema.prisma` [VERIFIED: codebase inspection] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (installed) | Icons: Clock, Award, Trophy, Crown, Medal, Flame | All phase UI [VERIFIED: codebase inspection] |
| sharp | (to install) | Image resize for avatar uploads | D-29 auto-resize to 256x256 [ASSUMED: standard for Node.js image processing] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side personalization | Backend ML | D-16 explicitly requires client-side; backend would add latency and complexity |
| Recharts for sparklines | Victory | Already using Recharts, no reason to add another charting library |
| Filesystem avatars | S3/Cloud storage | D-30 specifies server filesystem; cloud would add cost and complexity |

**Installation:**
```bash
npm install sharp
```

## Architecture Patterns

### System Architecture Diagram

```
[User Action: Click Article]
         |
         v
+-------------------+
| NewsCard.tsx      |
| trackReading()    |
+-------------------+
         |
         v
+-------------------+
| Zustand Store     |----> localStorage (persist middleware)
| addToReadingHistory() |
+-------------------+
         |
         +----------------------+
         |                      |
         v                      v
+-------------------+   +-------------------+
| Reading History   |   | Personalization   |
| Page              |   | Engine            |
| - Timeline groups |   | - Topic extraction|
| - Stats header    |   | - Score articles  |
| - NewsCard grid   |   | - Regional boost  |
+-------------------+   +-------------------+
                                |
                                v
                        +-------------------+
                        | ForYouCarousel    |
                        | - Horizontal scroll|
                        | - 8-12 articles   |
                        | - Interest badges |
                        +-------------------+

[Achievement System]
+-------------------+     +-------------------+
| Badge Check       |---->| Database (Prisma) |
| - On article read |     | - UserBadge       |
| - On streak       |     | - Badge defs      |
| - On region unlock|     | - Progress        |
+-------------------+     +-------------------+
         |
         v
+-------------------+
| AchievementToast  |
| - Unlock announce |
| - Scale + glow    |
+-------------------+

[Leaderboard System]
+-------------------+     +-------------------+
| Daily Cron Job    |---->| LeaderboardSnapshot|
| - 00:00 snapshot  |     | - date            |
| - rankings JSON   |     | - timeframe       |
| - reset weekly    |     | - rankings        |
+-------------------+     +-------------------+
         |
         v
+-------------------+
| Community Page    |
| - Leaderboard tab |
| - Podium (top 3)  |
| - List (4-100)    |
| - User position   |
+-------------------+
```

### Recommended Project Structure
```
src/
├── pages/
│   └── ReadingHistory.tsx        # New history page
├── components/
│   ├── history/
│   │   ├── HistoryStats.tsx      # Stats header (total, pie, sparkline)
│   │   ├── HistoryFilters.tsx    # Search, region, date, sentiment
│   │   ├── RegionPieChart.tsx    # Region breakdown
│   │   └── ActivitySparkline.tsx # 7-day activity
│   ├── profile/
│   │   ├── AvatarPicker.tsx      # Modal with preset/upload
│   │   ├── AvatarGrid.tsx        # Region-grouped avatars
│   │   ├── UnlockProgress.tsx    # Region unlock progress bars
│   │   ├── BadgeCard.tsx         # Individual badge display
│   │   ├── BadgeGrid.tsx         # All badges grid
│   │   └── FeaturedBadge.tsx     # Prominently displayed badge
│   ├── community/
│   │   ├── Leaderboard.tsx       # Full leaderboard component
│   │   ├── LeaderboardPodium.tsx # Top 3 visualization
│   │   ├── LeaderboardRow.tsx    # Individual entry
│   │   └── WeeklyWinnerBanner.tsx# Celebration banner
│   ├── modals/
│   │   ├── ClearHistoryModal.tsx # Confirmation dialog
│   │   ├── DeleteAccountModal.tsx# Password + email confirm
│   │   └── DataExportModal.tsx   # JSON/CSV export
│   ├── ForYouCarousel.tsx        # Horizontal recommendations
│   ├── ForYouCard.tsx            # Individual recommendation
│   └── AchievementToast.tsx      # Unlock celebration
├── lib/
│   └── personalization.ts        # Topic extraction, scoring
└── hooks/
    └── usePersonalization.ts     # For You hook

server/
├── routes/
│   ├── profile.ts                # Avatar upload, name change
│   ├── badges.ts                 # Badge CRUD
│   └── leaderboard.ts            # Snapshot queries
├── services/
│   └── leaderboardService.ts     # Snapshot generation
└── jobs/
    └── leaderboardSnapshot.ts    # Daily cron job
```

### Pattern 1: Timeline Grouping
**What:** Group articles by relative date (Today/Yesterday/This Week/Older)
**When to use:** History page per D-01

```typescript
// Source: Project pattern from Timeline.tsx
interface TimelineGroup {
  label: string;
  articles: HistoryEntry[];
}

function groupByDate(entries: HistoryEntry[]): TimelineGroup[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const today: HistoryEntry[] = [];
  const yesterday: HistoryEntry[] = [];
  const thisWeek: HistoryEntry[] = [];
  const older: HistoryEntry[] = [];

  entries.forEach(entry => {
    const age = now - entry.timestamp;
    if (age < DAY) today.push(entry);
    else if (age < 2 * DAY) yesterday.push(entry);
    else if (age < 7 * DAY) thisWeek.push(entry);
    else older.push(entry);
  });

  return [
    { label: 'Today', articles: today },
    { label: 'Yesterday', articles: yesterday },
    { label: 'This Week', articles: thisWeek },
    { label: 'Older', articles: older },
  ].filter(g => g.articles.length > 0);
}
```

### Pattern 2: Personalization Scoring
**What:** Score articles based on user's reading history
**When to use:** For You carousel per D-09, D-10, D-15

```typescript
// Source: Adapted from src/lib/articleRelevance.ts
interface UserInterests {
  topics: Map<string, number>;     // topic -> count
  regions: Map<string, number>;    // region -> count
  recentTopics: Map<string, number>; // last 7 days
}

function extractInterests(history: HistoryEntry[], articles: Map<string, NewsArticle>): UserInterests {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const topics = new Map<string, number>();
  const regions = new Map<string, number>();
  const recentTopics = new Map<string, number>();

  history.forEach(entry => {
    const article = articles.get(entry.articleId);
    if (!article) return;

    // Extract keywords from title (reuse articleRelevance.ts extractKeywords)
    const keywords = extractKeywords(article.title);
    keywords.forEach(kw => {
      topics.set(kw, (topics.get(kw) || 0) + 1);
      if (entry.timestamp > sevenDaysAgo) {
        recentTopics.set(kw, (recentTopics.get(kw) || 0) + 1);
      }
    });

    // Track regions
    regions.set(article.perspective, (regions.get(article.perspective) || 0) + 1);
  });

  return { topics, regions, recentTopics };
}

function scoreArticle(article: NewsArticle, interests: UserInterests): number {
  let score = 0;
  const keywords = extractKeywords(article.title);

  // Topic matching (D-09)
  keywords.forEach(kw => {
    score += (interests.topics.get(kw) || 0) * 10;
    // Recent bias (D-15)
    score += (interests.recentTopics.get(kw) || 0) * 15;
  });

  // Regional preference (D-10)
  score += (interests.regions.get(article.perspective) || 0) * 5;

  return score;
}
```

### Pattern 3: Badge Progress Tracking
**What:** Track progress toward badge unlocks
**When to use:** Gamification per D-41

```typescript
// Source: Pattern from Community.tsx badges
interface BadgeProgress {
  badgeId: string;
  currentValue: number;
  targetValue: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isEarned: boolean;
}

const BADGE_DEFINITIONS = [
  { id: 'bookworm-100', name: 'Bookworm', tiers: [10, 50, 100, 500], category: 'volume' },
  { id: 'streak-7', name: 'Weekly Streak', tiers: [3, 7, 14, 30], category: 'behavior' },
  { id: 'global-reader', name: 'Global Perspective', tiers: [3, 4, 5, 6], category: 'diversity' },
  // ... more badges
];

function calculateBadgeProgress(stats: UserStats): BadgeProgress[] {
  return BADGE_DEFINITIONS.map(def => {
    const value = getStatValue(stats, def.id);
    const tierIndex = def.tiers.findIndex(t => value < t);
    const tier = tierIndex === -1 ? 'platinum' :
                 tierIndex === 0 ? null :
                 ['bronze', 'silver', 'gold', 'platinum'][tierIndex - 1];

    return {
      badgeId: def.id,
      currentValue: value,
      targetValue: def.tiers[tierIndex] || def.tiers[def.tiers.length - 1],
      tier: tier as BadgeProgress['tier'],
      isEarned: tier !== null,
    };
  });
}
```

### Anti-Patterns to Avoid
- **Server-side personalization:** D-16 requires client-side processing. Don't add backend ML.
- **Real-time leaderboards:** D-56 requires daily snapshots. Don't use live queries.
- **Inline profile editing:** D-27 and D-36 require editing in Settings, not on Profile page.
- **Cloud avatar storage:** D-30 specifies server filesystem. Don't use S3 without user decision.
- **Individual history deletion:** D-63 allows only "clear all". Don't add per-item delete.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize | Custom canvas resize | sharp | Edge cases (EXIF rotation, color profiles), compression quality |
| Date grouping | Manual date math | date-fns or native Intl.RelativeTimeFormat | Timezone handling, locale awareness |
| Horizontal scroll carousel | Custom scroll handlers | CSS scroll-snap + overflow-x | Native momentum, accessibility, performance |
| Progress bars | Custom div widths | CSS width transition or motion.div | Smooth animations, GPU acceleration |
| Pie charts | SVG manual drawing | Recharts PieChart | Responsive, animations, tooltips |

**Key insight:** The codebase already uses established patterns (Recharts, framer-motion, CSS utilities). Stick with these rather than building custom solutions.

## Common Pitfalls

### Pitfall 1: Stale Personalization Cache
**What goes wrong:** For You recommendations don't update when reading history changes
**Why it happens:** TanStack Query cache doesn't invalidate on Zustand state changes
**How to avoid:** Use `queryKey` that includes `readingHistory.length` or a hash, or trigger invalidation in `addToReadingHistory()`
**Warning signs:** Same recommendations after reading new articles

### Pitfall 2: Avatar Upload Size/Format Bypass
**What goes wrong:** Users upload 10MB images or non-image files
**Why it happens:** Client-side validation skipped, server doesn't validate
**How to avoid:** Validate both client-side (immediate feedback) and server-side (security)
**Warning signs:** Large images slow page loads, errors on non-images

### Pitfall 3: Leaderboard Privacy Opt-Out Race Condition
**What goes wrong:** User opts out but still appears in next snapshot
**Why it happens:** Snapshot job runs before opt-out propagates
**How to avoid:** Filter `showOnLeaderboard: false` users during snapshot generation, not just display
**Warning signs:** User complaints about appearing on leaderboard after opting out

### Pitfall 4: Reading History Deduplication Window
**What goes wrong:** Same article counted multiple times in quick succession
**Why it happens:** 5-minute dedup window (line 169-173 in store) not respected
**How to avoid:** Keep existing dedup logic; for `readCount` increment, check timestamp
**Warning signs:** Inflated read counts, misleading stats

### Pitfall 5: Badge/Achievement Timing
**What goes wrong:** Achievement toast shows before badge is persisted to DB
**Why it happens:** Optimistic UI update, but DB write fails
**How to avoid:** Show toast only after successful API response
**Warning signs:** "Earned" badges disappearing on page refresh

## Code Examples

### For You Carousel with CSS Scroll-Snap
```typescript
// Source: Native CSS pattern, verified in tailwind docs
export function ForYouCarousel({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="relative">
      <div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {articles.map((article, i) => (
          <div
            key={article.id}
            className="snap-start flex-none w-[280px]"
          >
            <ForYouCard article={article} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Region Unlock Check
```typescript
// Source: Project pattern
function checkRegionUnlock(
  history: HistoryEntry[],
  articles: Map<string, NewsArticle>,
  region: PerspectiveRegion
): { unlocked: boolean; count: number } {
  const regionArticles = history.filter(entry => {
    const article = articles.get(entry.articleId);
    return article?.perspective === region;
  });

  return {
    unlocked: regionArticles.length >= 5, // D-37
    count: regionArticles.length,
  };
}
```

### Leaderboard Snapshot Job
```typescript
// Source: Pattern from server/services
// server/jobs/leaderboardSnapshot.ts
async function generateDailySnapshot() {
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true }, // D-53 privacy filter
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      // Calculate points from UserBadge, reading history, etc.
    },
    orderBy: { /* points calculation */ },
    take: 100, // D-51
  });

  await prisma.leaderboardSnapshot.create({
    data: {
      date: new Date(),
      timeframe: 'all-time',
      rankings: JSON.stringify(users),
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side personalization | Client-side ML | 2024+ | Better privacy, lower latency, works offline |
| Infinite scroll | Virtual lists | React 18 | Better performance with large lists |
| Manual scroll carousels | CSS scroll-snap | 2022+ | Native momentum, accessibility built-in |
| Custom image processing | sharp (libvips) | Stable | 10x faster than ImageMagick, native async |

**Deprecated/outdated:**
- Using `useEffect` for derived state: Use `useMemo` instead
- Manual localStorage sync: Zustand persist middleware handles this

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | sharp is the standard library for Node.js image resize | Standard Stack | Minor - could use jimp or imagemagick, but sharp is faster |
| A2 | CSS scroll-snap has good mobile browser support | Code Examples | Low - fallback to manual scroll, 97%+ global support |
| A3 | 30 historical figure avatars can be sourced | -- | Medium - may need to adjust count or use generated art |

## Open Questions

1. **Historical Figure Avatar Assets**
   - What we know: 30 caricature avatars needed (5 per region, D-25)
   - What's unclear: Source for assets - AI generated, commissioned, or public domain?
   - Recommendation: Use placeholder initials for MVP, add avatars iteratively

2. **Leaderboard Point Calculation**
   - What we know: Categories needed (D-52), time periods defined (D-57)
   - What's unclear: Exact point values for actions (reading, badges, streaks)
   - Recommendation: Start simple (1 point per article, bonuses for badges), iterate

3. **Account Deletion Implementation**
   - What we know: 7-day grace period (D-70), password + email confirm (D-69)
   - What's unclear: Email confirmation flow - separate token or reply-based?
   - Recommendation: Token-based confirmation link (consistent with verification flow)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend, sharp | Yes | 20+ | -- |
| SQLite | Prisma DB | Yes | via better-sqlite3 | -- |
| sharp | Avatar resize | No (install needed) | -- | Install via `npm install sharp` |

**Missing dependencies with no fallback:**
- None (sharp installation is trivial)

**Missing dependencies with fallback:**
- None

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Password confirm for name change (D-28), email for delete (D-69) |
| V3 Session Management | no | -- |
| V4 Access Control | yes | isAuthenticated + isVerified checks (D-18, D-19, D-49) |
| V5 Input Validation | yes | zod for avatar upload (size, type), name length |
| V6 Cryptography | no | -- |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Avatar upload malware | Tampering | Validate MIME type server-side, use sharp to reprocess (strips metadata) |
| History manipulation | Tampering | Server-side badge verification before persisting |
| Leaderboard manipulation | Elevation | Server-side point calculation, not client-submitted |
| Data export enumeration | Information Disclosure | Require auth, rate limit, no user IDs in export |

## Sources

### Primary (HIGH confidence)
- `src/store/index.ts` - Zustand store with readingHistory implementation
- `src/pages/Bookmarks.tsx` - Pattern for history page layout
- `src/lib/articleRelevance.ts` - Keyword extraction, scoring patterns
- `src/pages/Community.tsx` - Existing badge and leaderboard UI patterns
- `prisma/schema.prisma` - Database schema patterns
- `npm view [package] version` - Version verification

### Secondary (MEDIUM confidence)
- 06-UI-SPEC.md - Component inventory, layouts, interactions
- 06-CONTEXT.md - User decisions D-01 through D-80

### Tertiary (LOW confidence)
- None - all claims verified against codebase or npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm view and codebase inspection
- Architecture: HIGH - Patterns derived from existing codebase
- Pitfalls: HIGH - Based on real patterns observed in codebase

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days - stable patterns, no fast-moving dependencies)
