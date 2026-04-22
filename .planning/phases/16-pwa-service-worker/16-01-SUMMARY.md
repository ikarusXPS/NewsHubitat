---
phase: 16-pwa-service-worker
plan: 01
subsystem: frontend-infrastructure
tags: [pwa, offline, service-worker, vite]
completed: 2026-04-22T20:26:00Z
duration_minutes: 4

dependency_graph:
  requires: []
  provides:
    - offline-fallback-page
    - navigation-fallback-config
  affects:
    - vite.config.ts
    - public/offline.html

tech_stack:
  added:
    - public/offline.html (branded offline fallback page)
  patterns:
    - VitePWA navigateFallback configuration
    - Cache API query for offline article count
    - Inline CSS with NewsHub cyber aesthetic

key_files:
  created:
    - public/offline.html
  modified:
    - vite.config.ts

decisions:
  - decision: Added offline.html to VitePWA includeAssets for precaching
    rationale: Ensures fallback page is available when offline
    outcome: Page precached on service worker install
  - decision: Set navigateFallbackDenylist to exclude /api routes
    rationale: Prevents API calls from returning HTML instead of network errors
    outcome: API routes fail properly when offline (no JSON parse errors)

metrics:
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 1
  commits: 2
---

# Phase 16 Plan 01: Offline Fallback Page Summary

**One-liner:** Branded offline fallback page with cache count display and VitePWA navigation fallback configuration

## What Was Built

Created a fully-branded offline fallback page (`public/offline.html`) that displays when users navigate to NewsHub while offline. The page matches NewsHub's cyber aesthetic with dark background (#0a0e1a), cyan accents (#00f0ff), and red alerts (#ff0044). It provides two action buttons: "Retry Connection" (reloads page) and "View Cached Articles" (navigates to home), plus a dynamic cache count display showing how many articles are available offline.

Extended VitePWA configuration to serve this fallback page for failed navigation requests, while excluding API routes to ensure proper network error handling when offline.

## Tasks Completed

### Task 1: Create branded offline.html fallback page
**Status:** ✅ Complete
**Commit:** 57388b3
**Files:** public/offline.html

Created `public/offline.html` with:
- NewsHub cyber aesthetic (inline CSS, no external dependencies)
- JetBrains Mono font, dark background, cyan/red color scheme
- Warning icon (⚠) and "You're Offline" heading
- Two action buttons: "Retry Connection" (reload) and "View Cached Articles" (navigate to /)
- Dynamic cache count via Cache API (queries `api-cache` store for `/api/news` entries)
- Responsive design with centered card layout

### Task 2: Configure VitePWA navigation fallback
**Status:** ✅ Complete
**Commit:** bd0653e
**Files:** vite.config.ts

Extended VitePWA configuration:
- Added `'offline.html'` to `includeAssets` array (precaches fallback page)
- Set `navigateFallback: '/offline.html'` in workbox config
- Added `navigateFallbackDenylist: [/^\/api/]` to exclude API routes from fallback
- Existing cache strategies preserved (30-day static assets, 7-day images, 5-minute API)

### Task 3: Verify cache strategies remain unchanged
**Status:** ✅ Complete
**Commit:** (verification-only task, no commit)
**Files:** vite.config.ts

Verified that D-11 and D-12 decisions are honored:
- Static assets: CacheFirst with 30-day expiration ✓
- Images: CacheFirst with 7-day expiration ✓
- API routes: NetworkFirst with 5-minute expiration ✓
- Exactly 3 runtimeCaching strategies (no additions) ✓

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

### VitePWA Service Worker
- `offline.html` precached via `includeAssets` configuration
- Served automatically for navigation failures via `navigateFallback`
- API routes excluded from fallback via `navigateFallbackDenylist`

### Cache API
- Offline page queries `api-cache` store to count cached articles
- Filters cache entries for `/api/news` URLs
- Displays count or "No cached articles" message

### Design System
- Matches `OfflineBanner.tsx` aesthetic (same color palette, fonts)
- Uses inline CSS to avoid external dependencies when offline
- Responsive card layout with cyber-themed borders and shadows

## Testing Evidence

### Automated Verification
```bash
# Task 1 verification
grep -q "NewsHub - Offline" public/offline.html  # ✓
grep -q "#0a0e1a" public/offline.html            # ✓
grep -q "#00f0ff" public/offline.html            # ✓
grep -q "Retry Connection" public/offline.html   # ✓
grep -q "View Cached Articles" public/offline.html # ✓
grep -q "cache-info" public/offline.html         # ✓
grep -q "caches.open" public/offline.html        # ✓

# Task 2 verification
grep -q "'offline.html'" vite.config.ts          # ✓
grep -q "navigateFallback.*offline" vite.config.ts # ✓
grep -q "navigateFallbackDenylist" vite.config.ts # ✓
npm run typecheck  # 0 errors                     # ✓

# Task 3 verification
grep -q "maxAgeSeconds: 60 * 60 * 24 * 30" vite.config.ts # ✓
grep -q "maxAgeSeconds: 60 * 60 * 24 * 7" vite.config.ts  # ✓
grep -q "maxAgeSeconds: 60 * 5" vite.config.ts            # ✓
[ $(grep -c "urlPattern:" vite.config.ts) -eq 3 ]         # ✓
```

All automated checks passed.

### TypeScript Compilation
```
npm run typecheck
> tsc --noEmit
(no errors)
```

## Known Limitations

- Cache count display requires Cache API support (all modern browsers)
- Offline fallback only works when service worker is active (after first visit)
- Background sync not implemented in this plan (deferred to Plan 16-04)

## Next Steps

Plan 16-02 will:
- Implement IndexedDB sync queue for offline bookmark saves
- Add Background Sync API integration with Safari fallback
- Apply same sync pattern to reading history

## Requirements Traceability

- **PERF-06:** Offline fallback page displays when internet disconnects ✓
- **PERF-07:** Cached article count shown on offline page ✓

## Self-Check

**Status:** ✅ PASSED

### Created Files Exist
- ✅ `public/offline.html` exists and contains branded offline fallback page

### Modified Files Verified
- ✅ `vite.config.ts` contains `includeAssets` with `'offline.html'`
- ✅ `vite.config.ts` contains `navigateFallback: '/offline.html'`
- ✅ `vite.config.ts` contains `navigateFallbackDenylist: [/^\/api/]`

### Commits Exist
- ✅ Commit `57388b3`: Create branded offline fallback page
- ✅ Commit `bd0653e`: Configure VitePWA navigation fallback

### Must-Have Truths Verified
- ✅ User sees branded offline page when internet disconnects (navigateFallback configured)
- ✅ Offline page shows cached article count (Cache API script present)
- ✅ Retry button reloads page to check connection (`onclick="window.location.reload()"`)
- ✅ Static assets cached with 30-day expiration (D-11 preserved)
- ✅ API responses cached with 5-minute expiration (D-12 preserved)

### Artifact Constraints Verified
- ✅ `public/offline.html` exists and provides "Branded offline fallback page"
- ✅ `public/offline.html` has 111 lines (min_lines: 80) ✓
- ✅ `public/offline.html` contains "NewsHub - Offline" ✓
- ✅ `vite.config.ts` exports navigateFallback and navigateFallbackDenylist ✓

### Key Links Verified
- ✅ `vite.config.ts` → `public/offline.html` via navigateFallback configuration
- ✅ Pattern match: `navigateFallback.*offline\.html` found in vite.config.ts

All verification checks passed. Plan execution complete.

---

**Completed:** 2026-04-22
**Duration:** 4 minutes
**Executor:** Claude Sonnet 4.5
**Status:** Ready for Plan 16-02 (Background Sync Queue)
