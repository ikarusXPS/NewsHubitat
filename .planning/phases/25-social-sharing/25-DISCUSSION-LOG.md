# Phase 25: Social Sharing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 25-social-sharing
**Areas discussed:** Share button placement & UI, OG meta tag strategy, Web Share API on mobile, Analytics display

---

## Share Button Placement & UI

### Where should share buttons appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Article detail only (Recommended) | Share button in article expanded view/modal — keeps cards clean, shares after user reads | ✓ |
| Both card and detail | Share icon on every card plus detail view — more visible, but adds visual noise | |
| Card actions menu | Hidden behind '...' menu on cards (per Phase 24 D-55), plus detail view | |

**User's choice:** Article detail only (Recommended)
**Notes:** Clean approach that encourages sharing after reading content

### Which platforms should have share buttons?

| Option | Description | Selected |
|--------|-------------|----------|
| 4 main: Twitter, LinkedIn, WhatsApp, Facebook (Recommended) | Matches SHARE-01 requirements — covers professional, casual, and messaging use cases | ✓ |
| Expand to 6: Add Telegram + Email | Backend already supports these — Telegram popular in Europe, email for professional sharing | |
| Minimal: Twitter + Copy Link only | Simplest UI — let users paste link wherever they want | |

**User's choice:** 4 main: Twitter, LinkedIn, WhatsApp, Facebook (Recommended)
**Notes:** Matches SHARE-01 requirements exactly

### How should share buttons be displayed?

| Option | Description | Selected |
|--------|-------------|----------|
| Row of platform icons (Recommended) | Horizontal icon row with brand colors — Twitter blue, LinkedIn blue, WhatsApp green, Facebook blue | ✓ |
| Single share button → modal | One 'Share' button opens modal/bottom sheet with all platform options | |
| Platform icons + Copy Link button | Icon row plus explicit 'Copy Link' text button for non-social sharing | |

**User's choice:** Row of platform icons (Recommended)
**Notes:** Brand colors provide instant recognition

---

## OG Meta Tag Strategy

### How should dynamic OG tags be served for shared links?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-rendered share pages (Recommended) | Express serves /s/:code with HTML containing OG tags — crawlers get full meta, then JS hydrates the SPA | ✓ |
| Static fallback only | Default OG tags in index.html for NewsHub branding — shared links show generic preview, not article-specific | |
| Edge function (Vercel/Cloudflare) | Serverless function intercepts share URLs for bots only — requires deployment platform support | |

**User's choice:** Server-rendered share pages (Recommended)
**Notes:** Express-based approach works with existing deployment setup

### Should the server detect crawlers and serve different content?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, user-agent based (Recommended) | Detect Twitter/Facebook/LinkedIn bots by user-agent → serve OG HTML; humans → redirect to SPA | ✓ |
| No, always serve OG HTML first | Express serves full HTML with OG tags to everyone, then client-side hydrates — simpler, slightly slower initial load | |
| Separate /og/:code endpoint | Crawlers configured to fetch /s/:code/og for meta, humans get SPA — requires manual crawler config (not practical) | |

**User's choice:** Yes, user-agent based (Recommended)
**Notes:** Optimal UX for humans while serving bots what they need

---

## Web Share API on Mobile

### How should mobile sharing work?

| Option | Description | Selected |
|--------|-------------|----------|
| Web Share API primary, fallback to icon row (Recommended) | On mobile: single 'Share' button opens native sheet; if API unavailable: show icon row like desktop | ✓ |
| Always show icon row | Same UI on mobile and desktop — simpler implementation, but doesn't leverage native share UX | |
| Web Share API only (no fallback) | If browser doesn't support Web Share API, share button hidden — not recommended, Safari PWA may lack support | |

**User's choice:** Web Share API primary, fallback to icon row (Recommended)
**Notes:** Best native experience with graceful degradation

### What data should be shared via Web Share API?

| Option | Description | Selected |
|--------|-------------|----------|
| Title + URL (Recommended) | Article title and share link — clean, platform handles formatting | ✓ |
| Title + text excerpt + URL | Include article summary in share text — more context, but can look cluttered | |
| URL only | Just the share link — minimal, relies on OG preview for context | |

**User's choice:** Title + URL (Recommended)
**Notes:** Clean approach, OG tags provide preview context

---

## Analytics Display

### Should share counts be displayed publicly?

| Option | Description | Selected |
|--------|-------------|----------|
| No public counts (Recommended) | No share counts shown on articles — avoids 'cold start' problem where 0 shares discourages sharing | ✓ |
| Show counts after threshold | Display count only after 5+ shares — social proof without showing zeros | |
| Always show counts | Share count badge on all articles — transparent, but can feel empty on new content | |

**User's choice:** No public counts (Recommended)
**Notes:** Avoids discouraging sharing on new content

### Should users see analytics for their own shares?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, in profile (Recommended) | Profile page shows 'My Shares' section with view counts and click breakdown by platform | ✓ |
| No analytics display | Tracking happens for internal use only — simpler UI, focus on core sharing | |
| Detailed analytics dashboard | Separate analytics page with charts, top shares, trends — more work, valuable for power users | |

**User's choice:** Yes, in profile (Recommended)
**Notes:** Provides value to users who share content regularly

---

## Claude's Discretion

- Share icon choice (Lucide Share vs Share2)
- Animation/feedback on share button click
- Whether "Copy Link" is separate or part of icon row
- Mobile share button placement in article detail view
- My Shares section layout in Profile page

## Deferred Ideas

None — discussion stayed within phase scope
