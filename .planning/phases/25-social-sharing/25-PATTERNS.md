# Phase 25: Social Sharing - Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 14 (9 new, 5 modified)
**Analogs found:** 12 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/sharing/ShareButtons.tsx` | component | event-driven | `src/components/BulkReadActions.tsx` | exact |
| `src/components/sharing/ShareButton.tsx` | component | event-driven | `src/components/BulkReadActions.tsx` | exact |
| `src/components/sharing/NativeShareButton.tsx` | component | request-response | `src/hooks/useMediaQuery.ts` | role-match |
| `src/components/profile/MyShares.tsx` | component | CRUD | `src/components/profile/ReadingInsights.tsx` | exact |
| `src/hooks/useShare.ts` | hook | request-response | `src/hooks/useAchievements.ts` | exact |
| `server/middleware/botDetection.ts` | middleware | request-response | `server/middleware/rateLimiter.ts` | exact |
| `public/locales/en/share.json` | config | -- | `public/locales/en/common.json` | exact |
| `public/locales/de/share.json` | config | -- | `public/locales/de/common.json` | exact |
| `public/og-image.png` | asset | -- | -- | N/A (binary) |
| `src/pages/Profile.tsx` (modify) | page | CRUD | self | exact |
| `src/components/NewsCard.tsx` (modify) | component | event-driven | self | exact |
| `server/index.ts` (modify) | route | request-response | self | exact |
| `server/routes/sharing.ts` (modify) | route | CRUD | self | exact |
| `src/i18n/i18n.ts` (modify) | config | -- | self | exact |

## Pattern Assignments

### `src/components/sharing/ShareButtons.tsx` (component, event-driven)

**Analog:** `src/components/BulkReadActions.tsx`

**Imports pattern** (lines 1-4):
```typescript
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';
```

**For ShareButtons, adapt to:**
```typescript
import { Share2, Twitter, Linkedin, Facebook, MessageCircle, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
```

**Component interface pattern** (lines 5-8):
```typescript
interface BulkReadActionsProps {
  articleIds: string[];
  className?: string;
}
```

**Button row pattern** (lines 19-75):
```typescript
return (
  <div className={cn('flex items-center gap-2', className)}>
    {/* Mark all as read */}
    <button
      onClick={() => markAllAsRead(articleIds)}
      disabled={allRead}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors',
        allRead
          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
          : 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 hover:bg-[#00ff88]/20'
      )}
      title="Mark all visible articles as read"
    >
      <Eye className="h-3.5 w-3.5" />
      Mark All Read
    </button>
    {/* ... more buttons ... */}
  </div>
);
```

**Platform colors pattern** (from CONTEXT.md D-03):
```typescript
const PLATFORM_CONFIG = {
  twitter: { icon: Twitter, color: 'hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]' },
  linkedin: { icon: Linkedin, color: 'hover:bg-[#0A66C2]/20 hover:text-[#0A66C2]' },
  facebook: { icon: Facebook, color: 'hover:bg-[#1877F2]/20 hover:text-[#1877F2]' },
  whatsapp: { icon: MessageCircle, color: 'hover:bg-[#25D366]/20 hover:text-[#25D366]' },
};
```

---

### `src/components/sharing/ShareButton.tsx` (component, event-driven)

**Analog:** `src/components/BulkReadActions.tsx`

**Individual button pattern** (lines 22-38):
```typescript
<button
  onClick={() => handlePlatformClick(platform)}
  className={cn(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors',
    'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
  )}
  title={`Share on ${platform}`}
>
  <Icon className="h-3.5 w-3.5" />
</button>
```

---

### `src/components/sharing/NativeShareButton.tsx` (component, request-response)

**Analog:** `src/hooks/useMediaQuery.ts`

**SSR-safe feature detection pattern** (lines 17-24):
```typescript
export function useMediaQuery(query: string): boolean {
  // SSR-safe: default to false when window is not available
  const getMatches = useCallback((): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);
```

**Web Share API detection pattern:**
```typescript
const canShare = typeof navigator !== 'undefined' &&
  typeof navigator.share === 'function' &&
  typeof navigator.canShare === 'function';
```

**Async API call pattern (from RESEARCH.md):**
```typescript
const handleNativeShare = async () => {
  if (!navigator.share) return false;

  try {
    await navigator.share({
      title: shareData.title,
      url: shareData.url
    });
    return true; // Shared successfully
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return false; // User cancelled - not an error
    }
    throw err;
  }
};
```

---

### `src/components/profile/MyShares.tsx` (component, CRUD)

**Analog:** `src/components/profile/ReadingInsights.tsx`

**Imports pattern** (lines 1-4):
```typescript
import { useMemo, useState } from 'react';
import { Flame, Calendar, TrendingUp, Globe2 } from 'lucide-react';
import { useAppStore } from '../../store';
import type { NewsArticle, PerspectiveRegion } from '../../types';
```

**Props interface pattern** (lines 6-8):
```typescript
interface ReadingInsightsProps {
  articles: Map<string, NewsArticle>;
}
```

**Stats grid pattern** (lines 107-147):
```typescript
<div className="space-y-6">
  {/* Reading Stats Grid per D-31, D-33 */}
  <div className="grid grid-cols-3 gap-4">
    {/* Daily Streak */}
    <div className="glass-panel rounded-xl p-4 text-center">
      <Flame className="h-6 w-6 text-[#ff6600] mx-auto mb-2" />
      <div className="text-2xl font-bold text-white font-mono">{dailyStreak}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">
        {language === 'de' ? 'Tage Streak' : 'Day Streak'}
      </div>
    </div>
    {/* ... more stats ... */}
  </div>
</div>
```

**Section with icon header pattern** (lines 152-181):
```typescript
<div className="glass-panel rounded-xl p-4">
  <div className="flex items-center gap-2 mb-3">
    <Globe2 className="h-4 w-4 text-[#00f0ff]" />
    <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
      {language === 'de' ? 'Lieblingsregionen' : 'Favorite Regions'}
    </span>
  </div>
  <div className="space-y-2">
    {favoriteRegions.length > 0 ? (
      favoriteRegions.map(([region, count], i) => (
        <div key={region} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{i + 1}.</span>
            <span className="text-sm" style={{ color: REGION_COLORS[region] }}>
              {region}
            </span>
          </div>
          <span className="text-xs font-mono text-gray-500">{count}</span>
        </div>
      ))
    ) : (
      <span className="text-gray-500 text-sm">
        {language === 'de' ? 'Noch keine Daten' : 'No data yet'}
      </span>
    )}
  </div>
</div>
```

---

### `src/hooks/useShare.ts` (hook, request-response)

**Analog:** `src/hooks/useAchievements.ts`

**Imports pattern** (lines 1-4):
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import type { AchievementUnlock } from '../types/gamification';
```

**Return interface pattern** (lines 5-9):
```typescript
interface UseAchievementsResult {
  pendingUnlock: AchievementUnlock | null;
  dismissUnlock: () => void;
  checkBadgeProgress: () => Promise<void>;
}
```

**Async mutation pattern** (lines 96-112):
```typescript
try {
  await fetch('/api/badges/award', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
    },
    body: JSON.stringify({
      badgeId: `bookworm-${tier}`,
      progress: stats.totalArticles,
    }),
  });
} catch (e) {
  console.error('Failed to award badge:', e);
}
```

**For useShare, adapt to fire-and-forget tracking:**
```typescript
import { useMutation } from '@tanstack/react-query';

export function useShareClick() {
  return useMutation({
    mutationFn: async ({ shareCode, platform }: {
      shareCode: string;
      platform: string;
    }) => {
      await fetch(`/api/share/${shareCode}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
    },
    // Fire and forget - don't block navigation
    onError: (err) => console.error('Share tracking failed:', err),
  });
}
```

---

### `server/middleware/botDetection.ts` (middleware, request-response)

**Analog:** `server/middleware/rateLimiter.ts`

**Imports pattern** (lines 6-11):
```typescript
import { rateLimit, type RateLimitRequestHandler, type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Request } from 'express';
import { CacheService } from '../services/cacheService';
import { RATE_LIMITS, type RateLimitTier } from '../config/rateLimits';
import logger from '../utils/logger';
```

**For botDetection, adapt to:**
```typescript
import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
```

**Helper function pattern** (lines 21-28):
```typescript
/**
 * Key generator for IP-based limiting
 * Uses X-Forwarded-For if behind proxy, falls back to req.ip
 */
function ipKeyGenerator(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}
```

**Bot detection adaptation:**
```typescript
const SOCIAL_BOTS = [
  'Twitterbot',
  'facebookexternalhit',
  'LinkedInBot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'Discordbot',
  'Facebot',
  'Pinterest',
  'Embedly',
];

export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SOCIAL_BOTS.some(bot => ua.includes(bot.toLowerCase()));
}
```

**HTML generation function:**
```typescript
export function generateOGHtml(tags: Record<string, string>): string {
  const metaTags = Object.entries(tags)
    .map(([property, content]) =>
      `<meta property="${property}" content="${escapeHtml(content)}" />`
    )
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${metaTags}
  <meta http-equiv="refresh" content="0;url=${tags['og:url']}">
  <title>${escapeHtml(tags['og:title'])}</title>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(tags['og:url'])}">${escapeHtml(tags['og:title'])}</a></p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

---

### `public/locales/en/share.json` (config)

**Analog:** `public/locales/en/common.json`

**JSON structure pattern** (lines 1-68):
```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "errors": {
    "generic": "Something went wrong",
    "network": "Network error. Please try again."
  },
  "status": {
    "connected": "Connected",
    "loading": "Loading..."
  },
  "time": {
    "minutesAgo": "{count, plural, one {# minute ago} other {# minutes ago}}"
  }
}
```

**For share.json, structure as:**
```json
{
  "buttons": {
    "share": "Share",
    "copyLink": "Copy link",
    "copied": "Copied!"
  },
  "platforms": {
    "twitter": "Share on Twitter",
    "linkedin": "Share on LinkedIn",
    "facebook": "Share on Facebook",
    "whatsapp": "Share on WhatsApp"
  },
  "myShares": {
    "title": "My Shares",
    "noShares": "You haven't shared anything yet",
    "views": "{count, plural, one {# view} other {# views}}",
    "clicks": "{count, plural, one {# click} other {# clicks}}"
  },
  "errors": {
    "shareFailed": "Failed to share",
    "copyFailed": "Failed to copy link"
  }
}
```

---

### `src/i18n/i18n.ts` (modify)

**Existing namespace config** (lines 13-17):
```typescript
.init({
  fallbackLng: 'en',
  supportedLngs: ['de', 'en'],
  ns: ['common'],            // Default namespace
  defaultNS: 'common',
```

**Add 'share' namespace:**
```typescript
ns: ['common', 'share'],    // Add share namespace
```

---

### `server/index.ts` (modify)

**Route registration pattern** (lines 108-138):
```typescript
// Routes with rate limiting (D-05)

// Auth endpoints - strict (5 req/min per IP) - D-05
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);

// Other routes (no rate limiting)
app.use('/api/share', sharingRoutes);
```

**SPA fallback (lines 336-348):**
```typescript
// SPA fallback - serve index.html for all non-API routes
// This enables client-side routing (React Router)
// Note: Express 5 with path-to-regexp v8 requires '{*path}' syntax
app.get('{*path}', (req, res) => {
  // Only handle non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(staticPath, 'index.html'));
  }
});
```

**For /s/:code route, add BEFORE SPA fallback (around line 335):**
```typescript
import { isBot, generateOGHtml } from './middleware/botDetection';

// Share page route - must be before SPA fallback (D-04, D-05)
app.get('/s/:code', async (req, res) => {
  const { code } = req.params;
  const userAgent = req.get('User-Agent');

  const sharingService = SharingService.getInstance();
  const shared = await sharingService.getByCode(code);

  if (!shared) {
    if (isBot(userAgent)) {
      return res.status(404).send('Share not found');
    }
    return res.redirect('/?error=share_not_found');
  }

  // Increment view count
  await sharingService.incrementViews(code);

  if (isBot(userAgent)) {
    // Serve OG HTML for crawlers
    const ogTags = sharingService.getOpenGraphTags(shared);
    res.set('Content-Type', 'text/html');
    return res.send(generateOGHtml(ogTags));
  }

  // Human visitors: redirect to article
  if (shared.contentType === 'article') {
    res.redirect(`/article/${shared.contentId}`);
  } else if (shared.contentType === 'cluster') {
    res.redirect(`/analysis?cluster=${shared.contentId}`);
  } else {
    res.redirect('/');
  }
});
```

---

### `server/routes/sharing.ts` (modify)

**Existing route pattern** (lines 159-174):
```typescript
/**
 * GET /api/share/:code/analytics
 * Get share analytics (requires ownership)
 */
router.get('/:code/analytics', async (req, res) => {
  try {
    const analytics = await sharingService.getAnalytics(req.params.code);
    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Share not found' });
    }

    res.json({ success: true, data: analytics });
  } catch (err) {
    logger.error('Error fetching analytics:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});
```

**Add new endpoint for user's shares:**
```typescript
/**
 * GET /api/share/my
 * Get current user's shares (requires auth)
 */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const shares = await sharingService.getUserShares(userId);
    res.json({ success: true, data: shares });
  } catch (err) {
    logger.error('Error fetching user shares:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch shares' });
  }
});
```

---

### `src/pages/Profile.tsx` (modify)

**Section pattern** (lines 265-273):
```typescript
{/* Reading Insights per D-31 */}
{historyArticles && historyArticles.size > 0 && (
  <div className="glass-panel rounded-xl p-6">
    <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">
      {language === 'de' ? 'Leseeinblicke' : 'Reading Insights'}
    </h3>
    <ReadingInsights articles={historyArticles} />
  </div>
)}
```

**Add MyShares section after Reading Insights:**
```typescript
{/* My Shares per D-11 */}
<div className="glass-panel rounded-xl p-6">
  <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">
    {language === 'de' ? 'Meine Shares' : 'My Shares'}
  </h3>
  <MyShares />
</div>
```

---

### `index.html` (modify)

**Current head section** (lines 3-12):
```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>NewsHub - Intelligence Dashboard</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet">
</head>
```

**Add default OG meta tags:**
```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>NewsHub - Intelligence Dashboard</title>

  <!-- Default Open Graph meta tags -->
  <meta property="og:title" content="NewsHub - Multi-Perspective News Analysis" />
  <meta property="og:description" content="Discover global news from 130 sources across 13 regions" />
  <meta property="og:image" content="/og-image.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="NewsHub" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="NewsHub - Multi-Perspective News Analysis" />
  <meta name="twitter:description" content="Discover global news from 130 sources across 13 regions" />
  <meta name="twitter:image" content="/og-image.png" />

  <!-- Google Fonts -->
  ...
</head>
```

---

## Shared Patterns

### Authentication Header
**Source:** `src/hooks/useAchievements.ts` (line 101)
**Apply to:** `useShare.ts`, API calls requiring auth

```typescript
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
}
```

### Error Handling
**Source:** `server/routes/sharing.ts` (lines 25-28, 103-105)
**Apply to:** All route handlers

```typescript
try {
  // ... operation
  res.json({ success: true, data: result });
} catch (err) {
  logger.error('Error message:', err);
  res.status(500).json({ success: false, error: 'User-friendly message' });
}
```

### TanStack Query Pattern
**Source:** `src/components/profile/BadgeGrid.tsx` (lines 69-78)
**Apply to:** MyShares component

```typescript
const { data: userBadges, isLoading: loadingUserBadges } = useQuery({
  queryKey: ['user-badges'],
  queryFn: () => fetchUserBadges(localStorage.getItem('newshub-auth-token') || ''),
  enabled: isAuthenticated,
});
```

### Responsive Mobile Detection
**Source:** `src/hooks/useMediaQuery.ts` (lines 67-69)
**Apply to:** ShareButtons (Web Share API decision)

```typescript
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
```

### Glass Panel Styling
**Source:** `src/pages/Profile.tsx` (lines 219, 240, 276)
**Apply to:** MyShares section

```typescript
className="glass-panel rounded-xl p-6"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `public/og-image.png` | asset | -- | Binary image file, no code analog needed |

**Resolution:** Create 1200x630px PNG image with NewsHub branding for social media previews. Use project design system colors (dark background `#0a0a0f`, cyan accent `#00f0ff`).

---

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`, `server/middleware/`, `server/routes/`, `public/locales/`
**Files scanned:** 95
**Pattern extraction date:** 2026-04-24
