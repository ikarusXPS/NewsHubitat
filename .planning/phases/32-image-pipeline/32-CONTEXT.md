# Phase 32: Image Pipeline - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize image delivery across the application by migrating all article card components to use the existing ResponsiveImage component, which provides AVIF/WebP/JPEG fallback, responsive srcSet, Cloudinary integration, and progressive loading. Goal: 50% reduction in image payload.

</domain>

<decisions>
## Implementation Decisions

### Migration Scope
- **D-01:** Migrate ALL three image-displaying card components to ResponsiveImage: SignalCard, NewsCardPremium, ForYouCard
- **D-02:** SignalCard is highest priority (main news feed, most traffic)
- **D-03:** NewsCardPremium and ForYouCard follow for full consistency

### Cloudinary Configuration
- **D-04:** Cloudinary is ready — user will set VITE_CLOUDINARY_CLOUD_NAME in .env
- **D-05:** Graceful fallback already exists in cloudinary.ts (returns original URL if not configured)
- **D-06:** No changes needed to cloudinary.ts — it's complete

### Priority Loading Strategy
- **D-07:** First 6 cards get priority=true (eager loading, fetchPriority=high)
- **D-08:** Change from current 3 to 6 for better wide-screen experience (3 columns visible)
- **D-09:** Cards 7+ use lazy loading via IntersectionObserver (already in ResponsiveImage)

### Measurement & Validation
- **D-10:** Use BOTH Lighthouse CI and manual DevTools validation
- **D-11:** Lighthouse CI already integrated (Phase 29) — compare LCP and image weight before/after
- **D-12:** Manual spot-check via Network tab for visual confidence
- **D-13:** Target: 50% reduction in total image payload per page

### Claude's Discretion
- Image aspect ratio per component (16:9, 4:3, or 1:1 based on current design)
- Sizes attribute values (responsive breakpoints)
- Error handling patterns (ImageOff fallback already in ResponsiveImage)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Implementation
- `src/components/ResponsiveImage.tsx` — The component to use (already complete)
- `src/lib/cloudinary.ts` — URL builder for Cloudinary fetch mode (already complete)

### Components to Migrate
- `src/components/SignalCard.tsx` — Main news feed card (lines 146-160 have image rendering)
- `src/components/NewsCardPremium.tsx` — Premium card variant (lines 188-200 have image)
- `src/components/ForYouCard.tsx` — Personalization carousel (lines 58-66 have image)

### Prior Phase Decisions
- STATE.md decisions D-73 through D-78 — srcSet widths, format fallback, blur-up, priority loading

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ResponsiveImage` component: Full implementation with AVIF/WebP/JPEG, srcSet 320w/640w/960w/1280w, lazy loading via IntersectionObserver, priority prop, blur-up placeholder
- `buildCloudinaryUrl()`: URL builder supporting avif/webp/jpg formats and width resizing
- `react-intersection-observer`: Already installed and used in ResponsiveImage

### Established Patterns
- Aspect ratio via padding-bottom trick (16:9 = 56.25%)
- Error state with ImageOff icon from lucide-react
- Conditional priority loading based on index prop

### Integration Points
- SignalCard receives `index` prop — can use for priority calculation
- NewsCardPremium uses motion.img — need to ensure ResponsiveImage works with framer-motion hover effects
- ForYouCard has no index prop — may need to add or use fixed priority

</code_context>

<specifics>
## Specific Ideas

- SignalCard currently has perspective-colored fallback placeholder when no image — preserve this design in ResponsiveImage integration
- NewsCardPremium uses motion.img with scale animation on hover — test that ResponsiveImage wrapper doesn't break this
- First 6 cards eager loading covers typical 3-column desktop grid above the fold

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-image-pipeline*
*Context gathered: 2026-04-25*
