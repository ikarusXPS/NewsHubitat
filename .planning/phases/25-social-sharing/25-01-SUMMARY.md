---
phase: 25-social-sharing
plan: 01
subsystem: sharing
tags: [og-meta, bot-detection, social-sharing, api]
dependency_graph:
  requires: []
  provides:
    - server/middleware/botDetection.ts
    - /s/:code route
    - /api/share/my endpoint
    - getUserShares service method
    - default OG meta tags
  affects:
    - server/index.ts
    - server/routes/sharing.ts
    - server/services/sharingService.ts
    - index.html
tech_stack:
  added: []
  patterns:
    - Bot detection via user-agent substring matching
    - Server-rendered OG HTML for social media crawlers
    - Human redirect to SPA with query params
key_files:
  created:
    - server/middleware/botDetection.ts
    - public/og-image-placeholder.md
  modified:
    - server/index.ts
    - server/routes/sharing.ts
    - server/services/sharingService.ts
    - index.html
decisions:
  - D-04: Bot detection via user-agent substring matching for 10 social crawlers
  - D-05: generateOGHtml includes meta refresh fallback for humans
metrics:
  duration: 4m
  completed: 2026-04-24
---

# Phase 25 Plan 01: Server-Side Sharing Infrastructure Summary

Bot detection middleware and /s/:code route serving OG HTML to social crawlers, redirecting humans to SPA

## What Was Built

### Task 1: Bot Detection Middleware
Created `server/middleware/botDetection.ts` with:
- `SOCIAL_BOTS` array containing 10 crawler user-agents (Twitterbot, facebookexternalhit, LinkedInBot, WhatsApp, TelegramBot, Slackbot, Discordbot, Facebot, Pinterest, Embedly)
- `isBot(userAgent)` function for user-agent detection (case-insensitive substring matching)
- `generateOGHtml(tags)` function generating DOCTYPE HTML with OG meta tags
- `escapeHtml()` helper preventing XSS in generated HTML
- Meta refresh fallback for humans who receive OG HTML

### Task 2: User Shares Endpoint
Added to `server/services/sharingService.ts`:
- `getUserShares(userId)` method returning user's non-expired shares sorted by creation date

Added to `server/routes/sharing.ts`:
- `GET /api/share/my` endpoint with authMiddleware protection
- Returns shares with analytics (views, clicks, topReferrers) for each share
- Route placed before `/:code` to avoid path conflict

### Task 3: Share Page Route
Added to `server/index.ts`:
- Import for `isBot`, `generateOGHtml` from botDetection middleware
- Import for `SharingService`
- `/s/:code` route before SPA fallback:
  - Serves OG HTML to bot crawlers (Content-Type: text/html)
  - Redirects humans to `/?article={id}` or `/analysis?cluster={id}`
  - Increments view count for analytics
  - Returns 404 for expired/missing shares

### Task 4: Default OG Meta Tags
Added to `index.html`:
- `og:title`: "NewsHub - Multi-Perspective News Analysis"
- `og:description`: "Discover global news from 130 sources across 13 regions..."
- `og:image`: "/og-image.png"
- `og:type`: "website"
- `og:site_name`: "NewsHub"
- `twitter:card`: "summary_large_image"
- `twitter:title`, `twitter:description`, `twitter:image`

Created `public/og-image-placeholder.md` documenting required image specs (1200x630px PNG).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 8ac77b2 | feat(25-01): add bot detection middleware for social sharing |
| 2 | 789b094 | feat(25-01): add getUserShares method and /api/share/my endpoint |
| 3 | 6157ada | feat(25-01): add /s/:code share route with bot detection |
| 4 | 8f1ea9f | feat(25-01): add default OG meta tags and placeholder image docs |

## Verification Results

- TypeScript compiles without errors
- Bot detection covers all major social crawlers (Twitter, Facebook, LinkedIn, WhatsApp, Telegram, Slack, Discord)
- /s/:code route positioned before SPA fallback in Express middleware chain
- OG meta tags present in index.html head section

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Description |
|------|------|-------------|
| public/og-image.png | N/A | Missing - placeholder documentation created instead; actual PNG needs design work |

The og-image.png file does not exist yet. The `og-image-placeholder.md` documents the requirements (1200x630px, dark background, cyan accent). This is an intentional stub - the image requires design work outside the scope of code implementation.

## Self-Check: PASSED

- [x] server/middleware/botDetection.ts exists and exports isBot, generateOGHtml
- [x] server/services/sharingService.ts contains getUserShares method
- [x] server/routes/sharing.ts contains /my route with authMiddleware
- [x] server/index.ts contains /s/:code route before SPA fallback
- [x] index.html contains og:title, og:image, twitter:card meta tags
- [x] public/og-image-placeholder.md exists with image specs
- [x] All commits exist in git log
