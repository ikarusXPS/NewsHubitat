# Phase 16: PWA / Service Worker - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers offline support and background sync capabilities for NewsHub, building on the existing VitePWA/Workbox infrastructure. Users can access cached content offline, save bookmarks/history while offline (synced when online), and install the app to their home screen.

</domain>

<decisions>
## Implementation Decisions

### Offline Fallback Page
- **D-01:** Create a full branded offline.html page with NewsHub cyber aesthetic (logo, colors, fonts)
- **D-02:** Include "You're offline" message, retry button, and cached article count
- **D-03:** Add "View cached articles" button that links to cached content when available

### Background Sync
- **D-04:** Implement IndexedDB queue for offline bookmark saves
- **D-05:** Use Background Sync API to sync queued actions when online
- **D-06:** Apply same sync pattern to reading history (both bookmarks AND history sync offline)

### Install Prompt UX
- **D-07:** Capture `beforeinstallprompt` event, defer browser's default prompt
- **D-08:** Show custom install banner after engagement threshold (3+ visits or 5+ articles read)
- **D-09:** Position banner at bottom of screen (floating, fixed), matching cookie notice pattern
- **D-10:** Banner is dismissible; reappears after 7 days if dismissed

### Cache Strategy
- **D-11:** Keep current API cache TTL at 5 minutes (NetworkFirst strategy)
- **D-12:** Keep static assets at 30 days, images at 7 days (CacheFirst)
- **D-13:** Show "Cached X min ago" subtle badge when serving stale data

### Claude's Discretion
- Service Worker registration error handling
- IndexedDB schema design for sync queue
- Exact engagement tracking implementation (localStorage counters vs analytics)
- Cache size limits and eviction policies

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing PWA Configuration
- `vite.config.ts` — VitePWA plugin config with Workbox, manifest, caching strategies
- `public/pwa-192x192.svg` — App icon (192x192)
- `public/pwa-512x512.svg` — App icon (512x512, also maskable)

### Existing Offline Infrastructure
- `src/components/OfflineBanner.tsx` — Existing backend connectivity banner (design reference)
- `src/hooks/useBackendStatus.ts` — Online/offline detection hook
- `src/hooks/useCachedQuery.ts` — Network-first with cache fallback pattern
- `src/services/cacheService.ts` — IndexedDB-based article caching

### State Management
- `src/store/index.ts` — Zustand store with bookmarks and reading history slices

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **OfflineBanner.tsx**: Design pattern for connection status banners — same cyber aesthetic for install prompt
- **useCachedQuery.ts**: Network-first + cache fallback pattern — extend for sync queue
- **cacheService.ts**: IndexedDB wrapper — extend for sync queue storage
- **useBackendStatus.ts**: Online/offline detection — reuse for sync trigger

### Established Patterns
- VitePWA with Workbox: Already configured, add offline.html to precache
- Framer Motion: Use for install banner animations (consistent with OfflineBanner)
- Tailwind + cyber aesthetic: Match existing color scheme (#00f0ff accent, #ff0044 alerts)

### Integration Points
- Workbox config in vite.config.ts for offline fallback routing
- Layout.tsx for install banner placement (alongside OfflineBanner)
- Bookmark/history actions in store for queue interception

</code_context>

<specifics>
## Specific Ideas

- Install banner should match the floating cookie consent pattern — bottom-fixed with dismiss button
- "Cached X min ago" badge should be subtle (small text, muted color) — not alarming
- Retry button on offline page should animate (spin icon) during retry

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-pwa-service-worker*
*Context gathered: 2026-04-22*
