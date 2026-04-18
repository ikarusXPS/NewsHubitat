# Phase 6: Reading History - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 26
**Analogs found:** 24 / 26

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/pages/ReadingHistory.tsx` | page | CRUD | `src/pages/Bookmarks.tsx` | exact |
| `src/components/history/HistoryStats.tsx` | component | transform | `src/pages/Community.tsx:299-382` | role-match |
| `src/components/history/HistoryFilters.tsx` | component | request-response | `src/components/SourceFilter.tsx` | role-match |
| `src/components/history/RegionPieChart.tsx` | component | transform | `src/components/monitor/MarketSparkline.tsx` | role-match |
| `src/components/history/ActivitySparkline.tsx` | component | transform | `src/components/monitor/MarketSparkline.tsx` | exact |
| `src/components/ForYouCarousel.tsx` | component | transform | `src/components/NewsFeed.tsx` | role-match |
| `src/components/ForYouCard.tsx` | component | CRUD | `src/components/NewsCard.tsx` | exact |
| `src/components/profile/AvatarPicker.tsx` | component | request-response | `src/components/community/VerifyQueue.tsx` | role-match |
| `src/components/profile/AvatarGrid.tsx` | component | transform | `src/pages/Community.tsx:514-582` | role-match |
| `src/components/profile/UnlockProgress.tsx` | component | transform | `src/pages/Community.tsx:553-568` | exact |
| `src/components/profile/BadgeCard.tsx` | component | transform | `src/pages/Community.tsx:514-580` | exact |
| `src/components/profile/BadgeGrid.tsx` | component | transform | `src/pages/Community.tsx:507-583` | exact |
| `src/components/profile/FeaturedBadge.tsx` | component | transform | `src/pages/Community.tsx:514-580` | role-match |
| `src/components/community/Leaderboard.tsx` | component | request-response | `src/pages/Community.tsx:585-816` | exact |
| `src/components/community/LeaderboardPodium.tsx` | component | transform | `src/pages/Community.tsx:622-727` | exact |
| `src/components/community/LeaderboardRow.tsx` | component | transform | `src/pages/Community.tsx:738-775` | exact |
| `src/components/community/WeeklyWinnerBanner.tsx` | component | transform | `src/pages/Community.tsx:596-618` | role-match |
| `src/components/modals/ClearHistoryModal.tsx` | component | request-response | `src/components/ConfirmDialog.tsx` | exact |
| `src/components/modals/DeleteAccountModal.tsx` | component | request-response | `src/components/ConfirmDialog.tsx` | exact |
| `src/components/modals/DataExportModal.tsx` | component | request-response | `src/components/ConfirmDialog.tsx` | role-match |
| `src/components/AchievementToast.tsx` | component | event-driven | `src/components/Toast.tsx` | exact |
| `src/lib/personalization.ts` | utility | transform | `src/lib/articleRelevance.ts` | exact |
| `src/hooks/usePersonalization.ts` | hook | transform | `src/hooks/useCachedQuery.ts` | role-match |
| `src/store/index.ts` (extend) | store | CRUD | `src/store/index.ts` | exact |
| `prisma/schema.prisma` (extend) | model | CRUD | `prisma/schema.prisma` | exact |
| `server/routes/profile.ts` | controller | request-response | `server/routes/auth.ts` | exact |
| `server/routes/badges.ts` | controller | CRUD | `server/routes/analysis.ts` | role-match |
| `server/routes/leaderboard.ts` | controller | CRUD | `server/routes/analysis.ts` | exact |
| `server/services/leaderboardService.ts` | service | batch | `server/services/aiService.ts` | role-match |

---

## Pattern Assignments

### `src/pages/ReadingHistory.tsx` (page, CRUD)

**Analog:** `src/pages/Bookmarks.tsx`

**Imports pattern** (lines 1-5):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { NewsCard } from '../components/NewsCard';
import type { NewsArticle } from '../types';
```

**Data fetching pattern** (lines 17-20):
```typescript
async function fetchBookmarkedArticles(ids: string[]): Promise<NewsArticle[]> {
  const results = await Promise.all(ids.map(fetchArticleById));
  return results.filter((article): article is NewsArticle => article !== null);
}
```

**Query with store data** (lines 42-47):
```typescript
const { data: articles, isLoading, error } = useQuery({
  queryKey: ['bookmarked-articles', bookmarkedArticles],
  queryFn: () => fetchBookmarkedArticles(bookmarkedArticles),
  enabled: bookmarkedArticles.length > 0,
  staleTime: 2 * 60 * 1000,
});
```

**Empty state pattern** (lines 65-81):
```typescript
if (bookmarkedArticles.length === 0) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Gespeicherte Artikel</h1>
      <p className="text-gray-400">
        Deine markierten Artikel zum spateren Lesen.
      </p>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bookmark className="mb-4 h-16 w-16 text-gray-500" />
        <p className="text-gray-400">Keine gespeicherten Artikel</p>
        <p className="mt-2 text-sm text-gray-500">
          Klicke auf das Lesezeichen-Symbol bei einem Artikel, um ihn zu speichern.
        </p>
      </div>
    </div>
  );
}
```

**Grid layout pattern** (lines 125-133):
```typescript
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {articles?.map((article) => (
    <NewsCard
      key={article.id}
      article={article}
      onTranslate={handleTranslate}
    />
  ))}
</div>
```

**Clear all with confirmation** (lines 61-63, 104-112):
```typescript
const handleClearAll = () => {
  bookmarkedArticles.forEach((id) => toggleBookmark(id));
};

{bookmarkedArticles.length > 0 && (
  <button
    onClick={handleClearAll}
    className="flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm text-red-400 hover:bg-red-600/30"
  >
    <Trash2 className="h-4 w-4" />
    Alle entfernen
  </button>
)}
```

---

### `src/components/history/HistoryStats.tsx` (component, transform)

**Analog:** `src/pages/Community.tsx` (User Progress Card section)

**Stats card layout pattern** (lines 299-351):
```typescript
<div className="glass-panel rounded-xl p-6">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    {/* Level & Points */}
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{userStats.level}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-mono text-gray-500">Level {userStats.level}</div>
        <div className="text-2xl font-bold text-white">{userStats.points.toLocaleString()} XP</div>
      </div>
    </div>

    {/* Progress Bar */}
    <div className="flex-1 max-w-md">
      <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${levelProgress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] to-[#bf00ff]"
        />
      </div>
    </div>
  </div>
</div>
```

---

### `src/components/ForYouCarousel.tsx` (component, transform)

**Analog:** `src/components/NewsFeed.tsx` (integration point after HeroSection)

**Integration point** (lines 211-212):
```typescript
{/* Hero Section */}
<HeroSection stats={heroStats} />

{/* ForYouCarousel will be inserted here, after HeroSection */}
```

**Grid/scroll layout pattern** (lines 376-400):
```typescript
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
        ? 'md:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 max-w-3xl'
    )}
  >
    {filteredArticles.map((article: NewsArticle, index: number) => (
      <SignalCard
        key={article.id}
        article={article}
        // ...props
      />
    ))}
  </motion.div>
</AnimatePresence>
```

**CSS scroll-snap pattern** (from 06-RESEARCH.md):
```typescript
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
```

---

### `src/components/profile/BadgeCard.tsx` (component, transform)

**Analog:** `src/pages/Community.tsx` (badges tab)

**Badge card pattern** (lines 514-580):
```typescript
{BADGES.map((badge) => {
  const rarityColor = RARITY_COLORS[badge.rarity];
  return (
    <div
      key={badge.id}
      className={cn(
        'glass-panel rounded-xl p-4 transition-all',
        badge.earned ? 'border-gray-600' : 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-3 rounded-xl',
            badge.earned ? 'bg-gradient-to-br' : 'bg-gray-800'
          )}
          style={{
            backgroundColor: badge.earned ? `${rarityColor.bg}20` : undefined,
            color: badge.earned ? rarityColor.text : '#4a5568',
          }}
        >
          {badge.icon}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-white">{badge.name}</h4>
          <span
            className="text-[10px] font-mono uppercase px-2 py-0.5 rounded"
            style={{
              backgroundColor: `${rarityColor.bg}20`,
              color: rarityColor.text,
            }}
          >
            {badge.rarity}
          </span>
          <p className="text-xs text-gray-500 mt-1">{badge.description}</p>

          {/* Progress bar */}
          {badge.progress !== undefined && !badge.earned && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(badge.progress / badge.requirement!) * 100}%`,
                    backgroundColor: rarityColor.bg,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
})}
```

**Rarity colors pattern** (lines 162-167):
```typescript
const RARITY_COLORS = {
  common: { bg: '#4a5568', border: '#718096', text: '#a0aec0' },
  rare: { bg: '#00f0ff', border: '#00f0ff', text: '#00f0ff' },
  epic: { bg: '#bf00ff', border: '#bf00ff', text: '#bf00ff' },
  legendary: { bg: '#ffee00', border: '#ffee00', text: '#ffee00' },
};
```

---

### `src/components/community/LeaderboardPodium.tsx` (component, transform)

**Analog:** `src/pages/Community.tsx` (podium section)

**Podium pattern** (lines 622-727):
```typescript
<div className="flex items-end justify-center gap-3 mb-8 px-4">
  {[filteredLeaderboard[1], filteredLeaderboard[0], filteredLeaderboard[2]].map((user, index) => {
    const podiumOrder = [2, 1, 3];
    const rank = podiumOrder[index];
    const colors = {
      1: { bg: '#ffee00', glow: 'rgba(255,238,0,0.4)', text: '#ffee00' },
      2: { bg: '#c0c0c0', glow: 'rgba(192,192,192,0.3)', text: '#c0c0c0' },
      3: { bg: '#cd7f32', glow: 'rgba(205,127,50,0.3)', text: '#cd7f32' },
    };
    const color = colors[rank as keyof typeof colors];
    const podiumHeight = rank === 1 ? 140 : rank === 2 ? 100 : 70;

    return (
      <div key={user.rank} className="flex flex-col items-center">
        {/* User Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: (rank - 1) * 0.15, duration: 0.4 }}
          className="glass-panel rounded-xl p-4 mb-3 text-center relative"
          style={{
            borderColor: `${color.bg}40`,
            boxShadow: `0 0 20px ${color.glow}`,
          }}
        >
          {/* Rank Badge */}
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full"
            style={{ backgroundColor: color.bg, color: '#000' }}
          >
            {rank}
          </div>
          <div className="text-5xl">{user.avatar}</div>
          <div className="font-bold text-white">{user.name}</div>
          <div className="font-mono font-bold" style={{ color: color.text }}>
            {user.points.toLocaleString()} XP
          </div>
        </motion.div>

        {/* Podium Base */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: podiumHeight }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          className="w-24 rounded-t-lg"
          style={{
            background: `linear-gradient(to top, ${color.bg}50, ${color.bg}20)`,
            borderTop: `3px solid ${color.bg}`,
          }}
        />
      </div>
    );
  })}
</div>
```

---

### `src/components/modals/ClearHistoryModal.tsx` (component, request-response)

**Analog:** `src/components/ConfirmDialog.tsx`

**Full modal pattern** (lines 1-119):
```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const VARIANT_COLORS = {
  danger: {
    border: 'border-[#ff0044]/30',
    bg: 'bg-[#ff0044]/10',
    text: 'text-[#ff0044]',
    button: 'bg-[#ff0044] hover:bg-[#cc0036]',
  },
  // ... other variants
};

export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, variant = 'warning' }: ConfirmDialogProps) {
  const colors = VARIANT_COLORS[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn('relative w-full max-w-sm rounded-lg border p-6', colors.border)}
            >
              {/* Icon + Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('rounded-lg p-2', colors.bg)}>
                  <AlertTriangle className={cn('h-5 w-5', colors.text)} />
                </div>
                <h3 className="text-lg font-mono font-medium text-white">{title}</h3>
              </div>

              {/* Message */}
              <p className="text-sm text-gray-400 mb-6 font-mono">{message}</p>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={onConfirm} className={cn('flex-1 rounded-lg px-4 py-2', colors.button)}>
                  {confirmText}
                </button>
                <button onClick={onCancel} className="flex-1 rounded-lg border border-gray-700 px-4 py-2">
                  {cancelText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

### `src/components/AchievementToast.tsx` (component, event-driven)

**Analog:** `src/components/Toast.tsx`

**Toast pattern** (lines 1-84):
```typescript
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

const TOAST_COLORS: Record<ToastType, { border: string; bg: string; text: string }> = {
  success: {
    border: 'border-[#00ff88]/30',
    bg: 'bg-[#00ff88]/10',
    text: 'text-[#00ff88]',
  },
  // ... other types
};

export function Toast({ message, type = 'info', isOpen, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-20 right-6 z-50 max-w-sm"
        >
          <div className={cn('flex items-center gap-3 rounded-lg border p-3', colors.border, colors.bg)}>
            <div className={colors.icon}>{TOAST_ICONS[type]}</div>
            <p className={cn('text-sm font-mono flex-1', colors.text)}>{message}</p>
            <button onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### `src/lib/personalization.ts` (utility, transform)

**Analog:** `src/lib/articleRelevance.ts`

**Keyword extraction pattern** (lines 12-28):
```typescript
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'was', 'ist', 'sind', 'der', 'die', 'das', 'ein', 'eine', 'und', 'oder',
    'in', 'im', 'an', 'auf', 'für', 'mit', 'zu', 'von', 'bei', 'nach',
    'über', 'wie', 'wer', 'wo', 'wann', 'warum', 'welche', 'welcher',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'who', 'where',
    // ... more stop words
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}
```

**Scoring pattern** (lines 34-55):
```typescript
function calculateKeywordScore(article: NewsArticle, keywords: string[]): number {
  if (keywords.length === 0) return 25;

  const titleText = (article.title + ' ' + (article.titleTranslated?.de || '')).toLowerCase();
  const summaryText = (article.summary || article.content.substring(0, 300)).toLowerCase();
  const combinedText = titleText + ' ' + summaryText;

  let matchCount = 0;
  for (const keyword of keywords) {
    if (combinedText.includes(keyword)) {
      matchCount++;
      if (titleText.includes(keyword)) {
        matchCount += 0.5; // Extra points for title matches
      }
    }
  }

  const matchRatio = matchCount / keywords.length;
  return Math.min(50, Math.round(matchRatio * 50));
}
```

**Diversity bonus pattern** (lines 79-88):
```typescript
function calculateDiversityBonus(
  article: NewsArticle,
  selectedRegions: Map<PerspectiveRegion, number>
): number {
  const regionCount = selectedRegions.get(article.perspective) || 0;
  if (regionCount < 2) return 10;
  if (regionCount < 3) return 5;
  return 0;
}
```

---

### `src/store/index.ts` (extend) (store, CRUD)

**Analog:** `src/store/index.ts` (existing)

**Reading history slice pattern** (lines 40-44, 164-183):
```typescript
// Interface definition
readingHistory: { articleId: string; timestamp: number }[];
addToReadingHistory: (articleId: string) => void;
clearReadingHistory: () => void;

// Implementation with dedup and limit
readingHistory: [],
addToReadingHistory: (articleId) =>
  set((state) => {
    // Don't add duplicates within 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentEntry = state.readingHistory.find(
      (entry) => entry.articleId === articleId && entry.timestamp > fiveMinutesAgo
    );
    if (recentEntry) return state;

    // Keep only last 100 entries
    const newHistory = [
      { articleId, timestamp: Date.now() },
      ...state.readingHistory.filter((e) => e.articleId !== articleId),
    ].slice(0, 100);

    return { readingHistory: newHistory };
  }),
clearReadingHistory: () => set({ readingHistory: [] }),
```

**Persist partialize pattern** (lines 335-349):
```typescript
persist(
  (set, get) => ({ /* ... state ... */ }),
  {
    name: 'newshub-storage',
    partialize: (state) => ({
      theme: state.theme,
      language: state.language,
      readingHistory: state.readingHistory,
      // ... other persisted fields
    }),
  }
)
```

---

### `prisma/schema.prisma` (extend) (model, CRUD)

**Analog:** `prisma/schema.prisma` (existing)

**User model extension point** (lines 66-103):
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())

  // Existing fields...

  // NEW: Phase 6 additions
  avatarUrl            String?
  selectedPresetAvatar String?
  featuredBadgeId      String?
  showOnLeaderboard    Boolean   @default(true)
  isHistoryPaused      Boolean   @default(false)

  // NEW: Relations
  badges       UserBadge[]
}
```

**New model pattern** (based on existing EmailSubscription):
```prisma
model Badge {
  id          String   @id @default(cuid())
  name        String
  description String
  tier        String   // bronze, silver, gold, platinum
  category    String   // volume, diversity, behavior
  iconType    String   // emoji identifier
  threshold   Int      // Required value to earn
  createdAt   DateTime @default(now())

  userBadges  UserBadge[]

  @@index([category])
}

model UserBadge {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  badge     Badge    @relation(fields: [badgeId], references: [id])
  badgeId   String
  earnedAt  DateTime @default(now())
  progress  Int      @default(0)

  @@unique([userId, badgeId])
  @@index([userId])
}

model LeaderboardSnapshot {
  id        String   @id @default(cuid())
  date      DateTime
  timeframe String   // all-time, monthly, weekly
  rankings  String   // JSON string of top 100 users
  createdAt DateTime @default(now())

  @@index([date, timeframe])
}
```

---

### `server/routes/profile.ts` (controller, request-response)

**Analog:** `server/routes/auth.ts`

**Route setup pattern** (lines 1-8):
```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, authMiddleware } from '../services/authService';

export const profileRoutes = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}
```

**Zod validation pattern** (lines 14-22):
```typescript
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
});
```

**Protected endpoint pattern** (lines 121-136):
```typescript
authRoutes.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await authService.getUserById(req.user!.userId);

  if (!user) {
    res.status(404).json({
      success: false,
      error: 'User not found',
    });
    return;
  }

  res.json({
    success: true,
    data: user,
  });
});
```

**Error handling pattern** (lines 59-62):
```typescript
function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}
```

---

### `server/routes/leaderboard.ts` (controller, CRUD)

**Analog:** `server/routes/analysis.ts`

**Route with caching pattern** (lines 10-38):
```typescript
analysisRoutes.get('/clusters', async (req: Request, res: Response) => {
  const includeSummaries = req.query.summaries === 'true';

  // ... business logic ...

  // Cache for 10 minutes
  res.set('Cache-Control', 'public, max-age=600');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: clusters,
    meta: {
      aiAvailable: aiService.isAvailable(),
    },
  });
});
```

---

### `src/hooks/usePersonalization.ts` (hook, transform)

**Analog:** `src/hooks/useCachedQuery.ts`

**Custom hook pattern** (lines 1-79):
```typescript
import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface CachedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  queryFn: () => Promise<T>;
  cacheKey: string;
  cacheTTL?: number;
}

export function useCachedQuery<T>({
  queryFn,
  cacheKey,
  cacheTTL = 5 * 60 * 1000,
  ...queryOptions
}: CachedQueryOptions<T>) {
  const [isFromCache, setIsFromCache] = useState(false);

  const result = useQuery({
    ...queryOptions,
    queryFn: async () => {
      try {
        const data = await queryFn();
        setIsFromCache(false);
        return data;
      } catch (error) {
        // Fallback logic
        throw error;
      }
    },
  });

  return {
    ...result,
    isFromCache,
  };
}
```

---

## Shared Patterns

### Authentication Guard
**Source:** `server/routes/auth.ts` line 121
**Apply to:** All protected API routes (profile, badges, leaderboard user position)
```typescript
authRoutes.get('/endpoint', authMiddleware, async (req: AuthRequest, res: Response) => {
  // req.user is guaranteed to exist
  const userId = req.user!.userId;
  // ...
});
```

### API Response Format
**Source:** `server/routes/auth.ts` (throughout)
**Apply to:** All new API routes
```typescript
res.json({
  success: true,
  data: result,
  meta: { /* optional metadata */ },
});

// Error response
res.status(400).json({
  success: false,
  error: 'Error message',
});
```

### Glass Panel Styling
**Source:** `src/pages/Profile.tsx` line 187
**Apply to:** All new cards and sections
```typescript
<div className="glass-panel rounded-xl p-6">
  {/* Content */}
</div>
```

### Toast Notification Usage
**Source:** `src/pages/Settings.tsx` lines 54-58, 73-75
**Apply to:** Achievement unlocks, profile updates, clear history
```typescript
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
  message: '',
  type: 'info',
  isOpen: false,
});

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  setToast({ message, type, isOpen: true });
};
```

### Confirmation Dialog Usage
**Source:** `src/pages/Settings.tsx` lines 61-71, 77-79
**Apply to:** Clear history, delete account, pause tracking
```typescript
const [confirmDialog, setConfirmDialog] = useState<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}>({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
});

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  setConfirmDialog({ isOpen: true, title, message, onConfirm });
};
```

### Zustand Store Extension
**Source:** `src/store/index.ts` lines 86-351
**Apply to:** New state slices for history pause, leaderboard prefs, profile
```typescript
// Add to interface
isHistoryPaused: boolean;
pauseHistory: () => void;
resumeHistory: () => void;

// Add to implementation
isHistoryPaused: false,
pauseHistory: () => set({ isHistoryPaused: true }),
resumeHistory: () => set({ isHistoryPaused: false }),

// Add to partialize
partialize: (state) => ({
  // ... existing
  isHistoryPaused: state.isHistoryPaused,
}),
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/jobs/leaderboardSnapshot.ts` | job | batch | No cron/scheduled job exists yet; use pattern from RESEARCH.md |

---

## Metadata

**Analog search scope:** `src/`, `server/`, `prisma/`
**Files scanned:** 45
**Pattern extraction date:** 2026-04-18
