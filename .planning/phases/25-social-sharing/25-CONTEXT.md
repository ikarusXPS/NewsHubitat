# Phase 25: Social Sharing - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can share articles to social platforms with rich previews. This phase covers share button UI, Open Graph meta tags for rich previews, Web Share API integration for mobile, and share analytics display. Backend sharing infrastructure already exists (`sharingService.ts`, `/api/share/*` routes).

</domain>

<decisions>
## Implementation Decisions

### Share Button Placement
- **D-01:** Share buttons appear in article detail view only (not on cards) — keeps cards clean, encourages sharing after reading
- **D-02:** Platforms: Twitter, LinkedIn, WhatsApp, Facebook (matches SHARE-01 requirements)
- **D-03:** Display as horizontal row of platform icons with brand colors (Twitter blue, LinkedIn blue, WhatsApp green, Facebook blue)

### Open Graph Meta Tags
- **D-04:** Server-rendered share pages at `/s/:code` — Express serves HTML with OG tags, then JS hydrates SPA
- **D-05:** User-agent based bot detection — detect Twitter/Facebook/LinkedIn crawlers → serve OG HTML; humans → redirect to SPA
- **D-06:** Use existing `sharingService.getOpenGraphTags()` method for tag generation

### Web Share API (Mobile)
- **D-07:** Web Share API is primary on mobile — single 'Share' button opens native share sheet
- **D-08:** Fallback to icon row if Web Share API unavailable (Safari PWA, older browsers)
- **D-09:** Share data: title + URL only — clean, platform handles formatting

### Analytics Display
- **D-10:** No public share counts on articles — avoids cold start problem with 0-share articles
- **D-11:** User can see analytics for their own shares in Profile page "My Shares" section
- **D-12:** Analytics show view counts and click breakdown by platform (uses existing `sharingService.getAnalytics()`)

### Claude's Discretion
- Share icon choice (Lucide has Share, Share2 options)
- Animation/feedback on share button click
- Whether "Copy Link" is separate or part of icon row
- Mobile share button placement in article detail view
- My Shares section layout in Profile page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Backend Infrastructure
- `server/services/sharingService.ts` — Full sharing service with link generation, OG tags, analytics
- `server/routes/sharing.ts` — API routes: `/api/share/article`, `/api/share/:code`, `/api/share/:code/click`
- `prisma/schema.prisma` — SharedContent and ShareClick models already defined

### Frontend Components
- `src/components/NewsCard.tsx` — Article card component (do not add share here per D-01)
- `src/components/NewsCardPremium.tsx` — Premium article card (do not add share here per D-01)
- `src/pages/Profile.tsx` — User profile page (add My Shares section per D-11)

### Mobile Infrastructure (Phase 24)
- `src/hooks/useMediaQuery.ts` — useIsMobile hook for responsive behavior
- `src/components/mobile/` — Mobile-specific components

### i18n (Phase 23)
- `public/locales/en/common.json` — Add share-related translations
- `public/locales/de/common.json` — German translations for share UI

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **SharingService**: Complete backend with `shareArticle()`, `getShareUrls()`, `getOpenGraphTags()`, `trackClick()`, `getAnalytics()`
- **Prisma models**: SharedContent, ShareClick already in schema (may need migration check)
- **Lucide icons**: Share, Share2, Twitter, Linkedin, Facebook icons available
- **useIsMobile hook**: Detect mobile for Web Share API vs icon row decision

### Established Patterns
- Article detail view pattern: Modal or expanded card state in NewsCard.tsx
- TanStack Query for data fetching and mutations
- Toast notifications for success/error feedback
- Framer Motion for animations (consider for share button feedback)

### Integration Points
- Article detail view: Add share button row
- Express server: Add /s/:code route for OG-tagged HTML
- Profile page: Add "My Shares" section with analytics
- index.html: Add default OG meta tags as fallback

</code_context>

<specifics>
## Specific Ideas

- Platform icons use actual brand colors for recognition
- Web Share API check: `navigator.share !== undefined`
- Bot detection via user-agent strings: "Twitterbot", "facebookexternalhit", "LinkedInBot"
- Consider adding WhatsApp-specific formatting (text + URL works better than just URL)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-social-sharing*
*Context gathered: 2026-04-24*
