# Phase 24: Mobile Responsive - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users have optimized experience on mobile devices with touch-friendly navigation, responsive layouts, and optimized images. This phase covers mobile navigation (bottom nav + drawer), responsive layout adaptations, touch interactions (gestures, pull-to-refresh, swipe actions), and image optimization (srcSet, WebP, lazy loading).

</domain>

<decisions>
## Implementation Decisions

### Navigation Pattern
- **D-01:** Bottom nav bar for mobile (<768px) with 5 items: Dashboard, Monitor, Events, Bookmarks, Profile
- **D-02:** Hamburger menu in header opens left-slide drawer with full navigation (all items including bottom 5)
- **D-03:** Bottom nav auto-hides on scroll down, reappears on scroll up
- **D-04:** Active nav item: filled icon + label; inactive: outline icon only; cyan glow on active
- **D-05:** Drawer includes user info section at top (avatar, name if logged in)
- **D-06:** Drawer shows all nav items (full duplication with bottom nav)
- **D-07:** Event count badge on Events nav item
- **D-08:** Double-tap Dashboard icon scrolls to top
- **D-09:** Breakpoint: 768px (md:) - mobile below, desktop/tablet above
- **D-10:** Migrate existing lg: breakpoints to md: throughout codebase
- **D-11:** Bottom nav height: 56px + safe area inset
- **D-12:** Translucent glass effect with blur on bottom nav
- **D-13:** Subtle cyan top border on bottom nav (rgba(0,240,255,0.2))
- **D-14:** Light haptic feedback on nav tap (Vibration API)
- **D-15:** Tablets (>=768px) show sidebar, not bottom nav

### Mobile Header
- **D-16:** Fixed header (always visible), same height as desktop (56px/h-14)
- **D-17:** Mobile header: hamburger + Radio icon logo + search icon + user avatar
- **D-18:** Radio icon taps navigate to Dashboard
- **D-19:** Search collapses to icon, expands full-width on tap
- **D-20:** FocusSelector, FeedManager, LanguageSwitcher move to drawer on mobile
- **D-21:** Keyboard shortcut hints hidden on mobile
- **D-22:** Command palette disabled on mobile

### Drawer Behavior
- **D-23:** Left slide-in drawer (keep existing pattern)
- **D-24:** Edge swipe from left (first 20px) opens drawer
- **D-25:** Swipe right on drawer content closes it
- **D-26:** Back button closes drawer if open (prevents accidental navigation)
- **D-27:** Drawer does NOT include event stats panel (navigation focus only)

### Safe Areas & Positioning
- **D-28:** Handle safe area insets for notched devices (env(safe-area-inset-*))
- **D-29:** Toast notifications: top-center on mobile, bottom-right on desktop
- **D-30:** InstallPromptBanner and OfflineBanner positioned above bottom nav
- **D-31:** Scroll-to-top FAB: bottom-right, above bottom nav (bottom: 72px + safe area)
- **D-32:** FAB appears after 500px scroll

### Other Navigation
- **D-33:** BreakingNewsTicker visible on mobile below header
- **D-34:** Settings stays as modal overlay (not bottom sheet)
- **D-35:** Support both portrait and landscape, same layout
- **D-36:** Lucide icons for bottom nav (same as rest of app)
- **D-37:** No long-press preview on nav items
- **D-38:** Subtle scale + spring animation on active nav icon (Framer Motion)

### Layout Density
- **D-39:** News cards: single column, full-width on mobile
- **D-40:** Large hero images (16:9 aspect ratio) on cards
- **D-41:** Content padding: p-4 (16px) on mobile, p-6 (24px) on desktop
- **D-42:** HeroSection: stack stats 2x2, hide markets panel on mobile
- **D-43:** Region filter pills: horizontal scroll (no wrapping)
- **D-44:** ForYou carousel: full-width, one card visible per swipe
- **D-45:** EventMap: full-screen map with collapsible bottom sheet for event list
- **D-46:** 2D map only on mobile (no 3D globe - performance)
- **D-47:** Analysis charts: full-width, stacked vertically
- **D-48:** Profile page: single column, sections stacked
- **D-49:** Badge grid: 3 columns on mobile
- **D-50:** Timeline: full-width, vertical scroll
- **D-51:** Reading history: compact list (thumbnail + title + date)
- **D-52:** Bookmarks: full cards (intentionally saved content)
- **D-53:** Monitor page: single column source cards
- **D-54:** Community page: stack sections (leaderboard then activity)
- **D-55:** Card actions: bookmark visible, translate/analyze behind "..." menu
- **D-56:** Modals (Settings, AuthModal): full-screen on mobile
- **D-57:** Propaganda analysis: bottom sheet UI
- **D-58:** Keep cyber aesthetic styling (borders, shadows) on mobile
- **D-59:** Rely on system font size settings (rem/em units)

### Touch Interactions
- **D-60:** Pull-to-refresh on news feed with custom cyber indicator
- **D-61:** Swipe right on card to bookmark (spring animation reveal)
- **D-62:** No swipe-left action
- **D-63:** Minimum tap target: 44x44px
- **D-64:** Pinch-to-zoom on article images (full-screen lightbox)
- **D-65:** Subtle highlight feedback on touch
- **D-66:** Native scroll (-webkit-overflow-scrolling: touch)
- **D-67:** Standard map gestures (pinch zoom, pan)
- **D-68:** Auto-focus form inputs when search/auth opens
- **D-69:** Swipe down to dismiss bottom sheets
- **D-70:** Scroll position restoration on back navigation
- **D-71:** touch-action: manipulation (eliminate 300ms delay)
- **D-72:** overscroll-behavior: contain (prevent iOS rubber-band)

### Image Optimization
- **D-73:** srcSet with sizes: 320w, 640w, 960w, 1280w
- **D-74:** Cloudinary for image transformations
- **D-75:** WebP/AVIF with JPEG fallback (<picture> element)
- **D-76:** Blur-up placeholder with 300ms fade transition
- **D-77:** First 3 cards: priority loading (no lazy-load)
- **D-78:** fetchpriority='high' on first card image
- **D-79:** decoding='async' on all images
- **D-80:** Native loading='lazy' for rest
- **D-81:** Create ResponsiveImage component
- **D-82:** Use existing PWA cache strategy (7-day TTL)

### Claude's Discretion
- Exact scroll threshold for bottom nav auto-hide
- Swipe-to-bookmark threshold distance
- Pull-to-refresh indicator animation details
- Blur placeholder generation method (tiny image vs blurhash)
- FAB icon choice (arrow-up vs chevron-up)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Components
- `src/components/Layout.tsx` - Main layout wrapper, sidebar state
- `src/components/Sidebar.tsx` - Existing sidebar with mobile slide-in (refactor for drawer)
- `src/components/Header.tsx` - Current header with hamburger button
- `src/components/NewsCard.tsx` - Card component with image handling

### Design System
- `src/index.css` - Cyber aesthetic styles, glass-panel, colors
- Tailwind CSS v4 responsive utilities

### PWA Infrastructure
- `vite.config.ts` - VitePWA config with cache strategies
- Phase 16 CONTEXT.md for PWA decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Sidebar.tsx**: Already has mobile backdrop and slide-in animation - refactor for drawer role
- **Header.tsx**: Has hamburger button (`lg:hidden`) - migrate to md: breakpoint
- **Framer Motion**: Available for spring animations on nav and swipe gestures
- **useBackendStatus.ts**: Online/offline detection for pull-to-refresh awareness
- **Lucide icons**: Activity, Globe2, MapPin, Bookmark, User already in use

### Established Patterns
- Tailwind responsive: `sm:`, `md:`, `lg:` breakpoints
- Framer Motion for animations (AnimatePresence, motion.div)
- Glass-panel aesthetic with cyan accent (#00f0ff)
- TanStack Query for data fetching and caching

### Integration Points
- Layout.tsx: Add BottomNav component for mobile
- Header.tsx: Responsive search, hide controls on mobile
- All page components: Add responsive grid classes
- NewsCard.tsx: Add swipe gesture handling
- New ResponsiveImage.tsx component

</code_context>

<specifics>
## Specific Ideas

- Bottom nav matches cyber aesthetic: translucent glass with cyan border
- Pull-to-refresh indicator: spinning Radio icon (matches logo)
- Swipe-to-bookmark reveals cyan bookmark icon sliding in from right
- FAB uses same glass styling as other floating elements

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 24-mobile-responsive*
*Context gathered: 2026-04-24*
