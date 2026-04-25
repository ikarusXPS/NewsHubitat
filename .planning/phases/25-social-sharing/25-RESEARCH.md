# Phase 25: Social Sharing - Research

**Researched:** 2026-04-24
**Domain:** Social sharing UI, Open Graph meta tags, Web Share API
**Confidence:** HIGH

## Summary

Phase 25 implements social sharing functionality for NewsHub, enabling users to share articles to Twitter, LinkedIn, WhatsApp, and Facebook with rich previews. The backend infrastructure is already complete (`sharingService.ts`, `/api/share/*` routes, Prisma models), so this phase focuses on: (1) frontend share button UI in article detail views, (2) server-rendered Open Graph pages for bot crawlers, (3) Web Share API integration for mobile devices, and (4) "My Shares" analytics section in the Profile page.

The SPA architecture presents a key challenge: social media crawlers (Twitterbot, facebookexternalhit, LinkedInBot) cannot execute JavaScript and need server-rendered HTML with OG meta tags. The solution is user-agent based bot detection at the `/s/:code` route -- serving static HTML with OG tags to crawlers while redirecting human users to the SPA.

**Primary recommendation:** Implement bot-detection middleware for `/s/:code` route that serves minimal HTML with Open Graph tags to crawlers, while redirecting human visitors to the full SPA. Use Web Share API as primary mobile share mechanism with fallback to platform icon row.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Share buttons appear in article detail view only (not on cards) -- keeps cards clean, encourages sharing after reading
- **D-02:** Platforms: Twitter, LinkedIn, WhatsApp, Facebook (matches SHARE-01 requirements)
- **D-03:** Display as horizontal row of platform icons with brand colors (Twitter blue, LinkedIn blue, WhatsApp green, Facebook blue)
- **D-04:** Server-rendered share pages at `/s/:code` -- Express serves HTML with OG tags, then JS hydrates SPA
- **D-05:** User-agent based bot detection -- detect Twitter/Facebook/LinkedIn crawlers -> serve OG HTML; humans -> redirect to SPA
- **D-06:** Use existing `sharingService.getOpenGraphTags()` method for tag generation
- **D-07:** Web Share API is primary on mobile -- single 'Share' button opens native share sheet
- **D-08:** Fallback to icon row if Web Share API unavailable (Safari PWA, older browsers)
- **D-09:** Share data: title + URL only -- clean, platform handles formatting
- **D-10:** No public share counts on articles -- avoids cold start problem with 0-share articles
- **D-11:** User can see analytics for their own shares in Profile page "My Shares" section
- **D-12:** Analytics show view counts and click breakdown by platform (uses existing `sharingService.getAnalytics()`)

### Claude's Discretion
- Share icon choice (Lucide has Share, Share2 options)
- Animation/feedback on share button click
- Whether "Copy Link" is separate or part of icon row
- Mobile share button placement in article detail view
- My Shares section layout in Profile page

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHARE-01 | User kann Artikel via Share-Buttons teilen (Twitter, LinkedIn, WhatsApp, Facebook) | Share button component with platform URLs from `sharingService.getShareUrls()`, Web Share API for mobile |
| SHARE-02 | Geteilte Links zeigen Rich Previews mit OpenGraph Meta-Tags | Bot-detection middleware at `/s/:code` serving HTML with OG tags from `sharingService.getOpenGraphTags()` |
| SHARE-03 | Share-Klicks werden getrackt fur Analytics | `POST /api/share/:code/click` already exists; frontend tracks before redirect; My Shares in Profile shows analytics |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Share button UI | Browser/Client | -- | Pure UI component, click handlers |
| Web Share API | Browser/Client | -- | Browser API, no server involvement |
| Platform share URLs | API/Backend | -- | `sharingService.getShareUrls()` generates URL strings |
| Open Graph HTML | Frontend Server (Express) | -- | Bot crawlers need server-rendered HTML |
| Bot detection | Frontend Server (Express) | -- | User-agent inspection before SPA fallback |
| Click tracking | API/Backend | Browser/Client | Client sends event, backend stores |
| Share analytics | API/Backend | Browser/Client | Backend aggregates, client displays |
| SharedContent creation | API/Backend | -- | `POST /api/share/article` creates DB record |

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | 1.9.0 | Share icons (Share2, Twitter, Linkedin, etc.) | Already used throughout project [VERIFIED: package.json] |
| framer-motion | 12.38.0 | Button feedback animations | Already installed for UI animations [VERIFIED: package.json] |
| @tanstack/react-query | 5.100.1 | Data fetching for user shares | Already used for all API calls [VERIFIED: package.json] |
| nanoid | 5.1.9 | Share code generation (backend) | Already used in sharingService [VERIFIED: package.json] |
| react-i18next | 17.0.4 | Translations for share UI | Already used for i18n [VERIFIED: package.json] |

### Supporting (No Additional Packages Needed)
All required functionality can be achieved with existing dependencies. No new packages required.

**Installation:**
```bash
# No additional packages needed - all dependencies already installed
```

**Version verification:** All versions confirmed against project's package.json [VERIFIED: npm view + package.json inspection].

## Architecture Patterns

### System Architecture Diagram

```
                                  ┌─────────────────────────────────────────────┐
                                  │            Express Server                    │
                                  │                                              │
User clicks "Share" button        │  ┌────────────────────────────────────────┐ │
         │                        │  │      /s/:code Route Handler            │ │
         v                        │  │                                        │ │
┌─────────────────┐               │  │  1. Extract shareCode from URL         │ │
│  ShareButtons   │               │  │  2. Check User-Agent                   │ │
│   Component     │               │  │         │                              │ │
│                 │               │  │         ├── Bot? ──────────────────┐   │ │
│ - Web Share API │               │  │         │                          │   │ │
│   (mobile)      │               │  │         v                          v   │ │
│ - Platform URLs │               │  │  ┌────────────┐        ┌─────────────┐ │ │
│   (desktop)     │               │  │  │ Human      │        │ Bot HTML    │ │ │
└────────┬────────┘               │  │  │ Redirect   │        │ with OG     │ │ │
         │                        │  │  │ to SPA     │        │ meta tags   │ │ │
         v                        │  │  └────────────┘        └─────────────┘ │ │
┌─────────────────┐               │  └────────────────────────────────────────┘ │
│ POST /api/share │               │                                              │
│ /article        │──────────────>│  ┌────────────────────────────────────────┐ │
│ (track click)   │               │  │      SharingService                    │ │
└────────┬────────┘               │  │                                        │ │
         │                        │  │  - createShare()                       │ │
         v                        │  │  - getShareUrls()                      │ │
Platform opens in                 │  │  - getOpenGraphTags()                  │ │
new tab with                      │  │  - trackClick()                        │ │
shared URL                        │  │  - getAnalytics()                      │ │
         │                        │  └────────────────────────────────────────┘ │
         v                        │                                              │
┌─────────────────┐               │  ┌────────────────────────────────────────┐ │
│ Social Platform │               │  │      Prisma Database                   │ │
│ Crawler fetches │               │  │                                        │ │
│ /s/:code URL    │──────────────>│  │  - SharedContent                       │ │
└─────────────────┘               │  │  - ShareClick                          │ │
                                  │  └────────────────────────────────────────┘ │
                                  └─────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── components/
│   ├── sharing/
│   │   ├── ShareButtons.tsx           # Main share button row component
│   │   ├── ShareButton.tsx            # Individual platform button
│   │   └── NativeShareButton.tsx      # Web Share API wrapper
│   └── profile/
│       └── MyShares.tsx               # Share analytics section
├── hooks/
│   └── useShare.ts                    # Share mutation hook
└── ...

server/
├── routes/
│   └── sharing.ts                     # (existing) API routes
├── services/
│   └── sharingService.ts              # (existing) Business logic
└── middleware/
    └── botDetection.ts                # New: bot detection for /s/:code
```

### Pattern 1: Bot Detection Middleware

**What:** User-agent inspection to serve different content to crawlers vs humans
**When to use:** `/s/:code` share routes where bots need OG meta tags

```typescript
// Source: CONTEXT.md D-05, verified against industry patterns
const BOT_USER_AGENTS = [
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

function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return BOT_USER_AGENTS.some(bot =>
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );
}

// In Express route handler
app.get('/s/:code', async (req, res) => {
  const userAgent = req.get('User-Agent');

  if (isBot(userAgent)) {
    // Serve static HTML with OG tags
    const shared = await sharingService.getByCode(req.params.code);
    if (!shared) {
      return res.status(404).send('Share not found');
    }
    const ogTags = sharingService.getOpenGraphTags(shared);
    return res.send(generateOGHtml(ogTags));
  }

  // Human: redirect to SPA (or let SPA fallback handle it)
  res.redirect(`/?share=${req.params.code}`);
});
```

### Pattern 2: Web Share API with Fallback

**What:** Use native share sheet on supported devices, fall back to platform buttons
**When to use:** Mobile share functionality (per D-07, D-08)

```typescript
// Source: MDN Web Docs navigator.share()
interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

async function nativeShare(data: ShareData): Promise<boolean> {
  // Check availability (must be secure context)
  if (navigator.share && navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      return true; // Shared successfully
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled - not an error
        return false;
      }
      throw err;
    }
  }
  return false; // Web Share API not available
}

// Usage in component
const handleShare = async () => {
  const shareData = {
    title: article.title,
    url: `${APP_URL}/s/${shareCode}`
  };

  // Try native share first (mobile)
  const shared = await nativeShare(shareData);
  if (!shared) {
    // Fall back to showing platform buttons
    setShowPlatformButtons(true);
  }
};
```

### Pattern 3: Share Button Component with Click Tracking

**What:** Track share clicks before redirecting to platform
**When to use:** All share button clicks (per SHARE-03)

```typescript
// Source: Existing API pattern in project
import { useMutation } from '@tanstack/react-query';

function useShareClick() {
  return useMutation({
    mutationFn: async ({ shareCode, platform }: {
      shareCode: string;
      platform: Platform
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

// In component
const trackClick = useShareClick();

const handlePlatformClick = (platform: Platform, url: string) => {
  // Track asynchronously (fire and forget)
  trackClick.mutate({ shareCode, platform });

  // Open platform URL immediately
  window.open(url, '_blank', 'noopener,noreferrer');
};
```

### Anti-Patterns to Avoid

- **Blocking on tracking:** Never wait for tracking API call before opening share URL. Track asynchronously.
- **Hardcoding share URLs:** Use `sharingService.getShareUrls()` which handles URL encoding correctly.
- **Client-side OG tags:** Social media crawlers don't execute JavaScript. OG tags MUST be server-rendered.
- **Showing share counts:** Per D-10, avoid displaying "0 shares" on new articles (cold start problem).
- **Web Share API without fallback:** Not all browsers/contexts support it. Always have platform buttons ready.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Share URL construction | Manual URL building | `sharingService.getShareUrls()` | URL encoding edge cases, platform-specific formats [VERIFIED: existing service] |
| Short code generation | Custom random strings | `nanoid(8)` via service | Collision-resistant, URL-safe [VERIFIED: existing pattern] |
| OG tag formatting | Manual meta string building | `sharingService.getOpenGraphTags()` | Consistent format, image fallbacks [VERIFIED: existing service] |
| User-agent parsing | Regex matching | Substring check array | Platform-specific user agents vary; list-based check is maintainable |
| Platform icons | Custom SVGs | lucide-react icons | Consistent style, tree-shaking [VERIFIED: already installed] |

**Key insight:** The backend sharing infrastructure is already complete. Frontend should call existing service methods rather than reimplementing any share URL logic.

## Common Pitfalls

### Pitfall 1: OG Tags Not Rendered for Crawlers
**What goes wrong:** Social media platforms show generic preview (no title/image) when links are shared
**Why it happens:** SPA renders OG tags client-side; crawlers don't execute JavaScript
**How to avoid:** Server-render OG HTML for bot user-agents at `/s/:code` route
**Warning signs:** Testing with Twitter Card Validator / Facebook Debugger shows missing metadata

### Pitfall 2: Web Share API Requires User Gesture
**What goes wrong:** `navigator.share()` fails with "NotAllowedError"
**Why it happens:** API requires transient user activation (direct response to user click)
**How to avoid:** Call share() directly in button click handler, not in async callback chain
**Warning signs:** Share works in some browsers but fails in others

### Pitfall 3: Share Tracking Blocks UX
**What goes wrong:** Delay before platform URL opens while waiting for tracking API
**Why it happens:** Awaiting POST /api/share/:code/click before window.open()
**How to avoid:** Fire-and-forget tracking (mutate without await), open URL immediately
**Warning signs:** Users complain about slow share buttons

### Pitfall 4: Missing Image in OG Preview
**What goes wrong:** Social previews show placeholder image or nothing
**Why it happens:** `og:image` URL is relative, not absolute; or image server blocks crawlers
**How to avoid:** Use absolute URLs; ensure `/og-image.png` fallback exists; verify crawler access
**Warning signs:** Facebook/Twitter debugger shows image error

### Pitfall 5: WhatsApp Requires Different Format
**What goes wrong:** WhatsApp share shows URL without title/context
**Why it happens:** WhatsApp desktop vs mobile have different behaviors; message format matters
**How to avoid:** Use WhatsApp API format: `https://wa.me/?text={TITLE}%20{URL}` [VERIFIED: existing service uses this]
**Warning signs:** WhatsApp shows raw URL instead of formatted message

## Code Examples

### Example 1: ShareButtons Component

```typescript
// Source: Project patterns + D-02, D-03
import { Share2, Twitter, Linkedin, Facebook, MessageCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { cn } from '../lib/utils';

interface ShareButtonsProps {
  shareCode: string;
  title: string;
  urls: {
    twitter: string;
    linkedin: string;
    facebook: string;
    whatsapp: string;
    direct: string;
  };
  onTrack: (platform: string) => void;
}

// Platform colors per D-03
const PLATFORM_CONFIG = {
  twitter: { icon: Twitter, color: 'hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]' },
  linkedin: { icon: Linkedin, color: 'hover:bg-[#0A66C2]/20 hover:text-[#0A66C2]' },
  facebook: { icon: Facebook, color: 'hover:bg-[#1877F2]/20 hover:text-[#1877F2]' },
  whatsapp: { icon: MessageCircle, color: 'hover:bg-[#25D366]/20 hover:text-[#25D366]' },
};

export function ShareButtons({ shareCode, title, urls, onTrack }: ShareButtonsProps) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);

  // Try native share on mobile (D-07)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: urls.direct });
        onTrack('native');
      } catch (err) {
        // User cancelled or API failed - show fallback
      }
    }
  };

  const handlePlatformClick = (platform: keyof typeof PLATFORM_CONFIG) => {
    onTrack(platform);
    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(urls.direct);
    setCopied(true);
    onTrack('copy');
    setTimeout(() => setCopied(false), 2000);
  };

  // Mobile: single share button (D-07)
  if (isMobile && navigator.share) {
    return (
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 rounded-lg bg-gray-700/50 px-4 py-2 text-gray-300 hover:bg-gray-600/50"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>
    );
  }

  // Desktop or mobile fallback: icon row (D-03, D-08)
  return (
    <div className="flex items-center gap-2">
      {Object.entries(PLATFORM_CONFIG).map(([platform, { icon: Icon, color }]) => (
        <button
          key={platform}
          onClick={() => handlePlatformClick(platform as keyof typeof PLATFORM_CONFIG)}
          className={cn(
            'rounded-lg p-2 text-gray-400 transition-all',
            color
          )}
          title={`Share on ${platform}`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <button
        onClick={handleCopyLink}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all"
        title="Copy link"
      >
        {copied ? <Check className="h-4 w-4 text-[#00ff88]" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
```

### Example 2: Bot Detection Middleware

```typescript
// Source: Verified against social media crawler documentation
// server/middleware/botDetection.ts

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
  'iframely',
  'Quora Link Preview',
  'Rogerbot',
  'Applebot',
];

export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SOCIAL_BOTS.some(bot => ua.includes(bot.toLowerCase()));
}

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

### Example 3: Server Route for /s/:code

```typescript
// Source: D-04, D-05, existing Express patterns
// In server/index.ts, BEFORE the SPA fallback

import { isBot, generateOGHtml } from './middleware/botDetection';
import { SharingService } from './services/sharingService';

const sharingService = SharingService.getInstance();

// Share page route - must be before SPA fallback
app.get('/s/:code', async (req, res) => {
  const { code } = req.params;
  const userAgent = req.get('User-Agent');

  // Fetch share data
  const shared = await sharingService.getByCode(code);

  if (!shared) {
    // Share not found or expired
    if (isBot(userAgent)) {
      return res.status(404).send('Share not found');
    }
    // Humans get redirected to home with error param
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
  // The SPA will handle rendering based on contentType
  if (shared.contentType === 'article') {
    res.redirect(`/article/${shared.contentId}`);
  } else if (shared.contentType === 'cluster') {
    res.redirect(`/analysis?cluster=${shared.contentId}`);
  } else {
    res.redirect('/');
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Twitter Cards v1 | Twitter Cards with large image | 2023 | Better previews with `twitter:card="summary_large_image"` |
| WhatsApp link preview via og:tags only | WhatsApp deep linking `wa.me/?text=` | 2022 | More reliable preview generation |
| Client-side OG tags with prerender.io | Server-side user-agent detection | Current | No third-party dependency, faster |
| Multiple share dialogs | Web Share API native sheet | 2020+ | Better mobile UX, single button |

**Deprecated/outdated:**
- Twitter API v1 share intents: v2 `intent/tweet` is current
- Facebook sharer.php will be deprecated eventually, but still works
- prerender.io/rendertron for SPA OG tags: direct bot detection is simpler

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Article detail view exists or will be created | Architecture Patterns | Share buttons have no mount point |
| A2 | `APP_URL` env var or equivalent is available for absolute URLs | Code Examples | OG image URLs will be broken |
| A3 | `/og-image.png` fallback image exists in public folder | Common Pitfalls | No fallback for articles without images |

**Notes on assumptions:**
- A1: CONTEXT.md D-01 specifies "article detail view only" -- this implies a detail view exists. NewsCard.tsx shows articles inline; may need ArticleDetailModal or similar.
- A2: `sharingService.ts` uses `process.env.APP_URL || 'http://localhost:5173'` which should be set in production [VERIFIED: line 51]
- A3: index.html references `/vite.svg` for favicon but no OG image fallback exists. Need to add `/og-image.png`.

## Open Questions

1. **Article Detail View Implementation**
   - What we know: D-01 requires share buttons in "article detail view only"
   - What's unclear: NewsCard shows articles inline with "Original" external link. Is there an internal detail view, or should we create one?
   - Recommendation: Check if there's a modal/expanded state in NewsCard, or if we need to add ShareButtons to the existing card when user clicks "read more"

2. **OG Fallback Image**
   - What we know: `sharingService.getOpenGraphTags()` falls back to `/og-image.png`
   - What's unclear: This file doesn't exist in current public folder
   - Recommendation: Create `/public/og-image.png` (1200x630px recommended for Twitter/Facebook)

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified) -- this phase is purely frontend UI + Express route changes using existing packages.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | partial | User can only see analytics for their own shares |
| V5 Input Validation | yes | ShareCode validation, HTML escaping in OG HTML |
| V6 Cryptography | no | -- |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| OG HTML injection | Tampering | HTML escape all dynamic content in generateOGHtml() |
| Share code enumeration | Information Disclosure | Rate limiting on /s/:code (already covered by newsLimiter) |
| Click tracking spam | Denial of Service | Rate limit on /api/share/:code/click |
| User-agent spoofing | Spoofing | Accept risk -- worst case is human sees OG HTML page, which redirects anyway |

## Sources

### Primary (HIGH confidence)
- Project codebase: `sharingService.ts`, `sharing.ts` routes, `prisma/schema.prisma` -- existing implementation [VERIFIED: file reads]
- Project codebase: `package.json` -- all dependencies verified installed [VERIFIED: file read]
- MDN Web Docs: [Navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) -- API specification [CITED]

### Secondary (MEDIUM confidence)
- Social bot user agents: [CrawlerCheck](https://crawlercheck.com/directory/social-bots/linkedinbot), [AICW](https://aicw.io/ai-crawler-bot/facebookexternalhit/) -- user agent patterns [CITED]
- Can I Use: [Web Share API](https://caniuse.com/web-share) -- browser compatibility [CITED]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and in use
- Architecture: HIGH -- follows existing Express + React patterns, backend already exists
- Pitfalls: HIGH -- based on documented API requirements and common SPA issues

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days -- stable domain, no fast-moving APIs)
