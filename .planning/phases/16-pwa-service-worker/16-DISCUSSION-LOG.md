# Phase 16: PWA / Service Worker - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 16-pwa-service-worker
**Areas discussed:** Offline fallback page, Background sync for bookmarks, Install prompt UX, Cache invalidation strategy

---

## Offline Fallback Page

| Option | Description | Selected |
|--------|-------------|----------|
| Full branded page | NewsHub-styled page with logo, 'You're offline' message, retry button, and cached article count. Matches cyber aesthetic. | ✓ |
| Minimal status page | Simple text: 'You're offline. Reconnect to continue.' No branding, fastest load. | |
| Cached content preview | Show list of cached articles available offline. More complex — needs JS to read Service Worker cache. | |

**User's choice:** Full branded page (Recommended)
**Notes:** None

### Follow-up: Cached access

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — show cached count | Display 'X articles available offline' with link to cached content. Useful when API is down but cache has data. | ✓ |
| No — retry only | Just show retry button. Simpler UX, user retries or waits for connection. | |

**User's choice:** Yes — show cached count
**Notes:** None

---

## Background Sync for Bookmarks

| Option | Description | Selected |
|--------|-------------|----------|
| Queue in IndexedDB + Background Sync API | Save to local IndexedDB immediately, register sync event. When online, sync queued actions. Full offline support. | ✓ |
| LocalStorage queue + retry on focus | Simpler: store in localStorage, retry when app regains focus. Works but no background sync if app closed. | |
| Fail gracefully — no offline queue | Show 'Bookmark failed — you're offline'. User must retry manually. Simplest but poor UX. | |

**User's choice:** Queue in IndexedDB + Background Sync API (Recommended)
**Notes:** None

### Follow-up: History sync

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — sync bookmarks AND history | Both user actions queue offline. Consistent offline-first experience across features. | ✓ |
| No — bookmarks only | Reading history is already stored locally in Zustand. Don't add sync complexity for low-priority data. | |

**User's choice:** Yes — sync bookmarks AND history
**Notes:** None

---

## Install Prompt UX

| Option | Description | Selected |
|--------|-------------|----------|
| Custom banner after engagement | Show branded banner after user has visited 3+ times or read 5+ articles. Captures beforeinstallprompt, triggers custom UI. | ✓ |
| Browser default | Let browser show its native prompt. No custom handling. Simplest, but less control over timing. | |
| Settings page option | Hide install prompt. Add 'Install App' button in Settings page. User-initiated, non-intrusive. | |

**User's choice:** Custom banner after engagement (Recommended)
**Notes:** None

### Follow-up: Banner placement

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom of screen (floating) | Fixed bottom banner like cookie notices. Dismissible, reappears after 7 days if dismissed. | ✓ |
| Top banner (below nav) | Similar to OfflineBanner position. Consistent with existing notification patterns. | |
| In-app modal | Centered modal with benefits listed. More prominent but interruptive. | |

**User's choice:** Bottom of screen (floating)
**Notes:** None

---

## Cache Invalidation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Current — 5 minutes | Existing config: NetworkFirst with 5-min cache. Balance between freshness and offline usability. | ✓ |
| Longer — 15 minutes | Reduce API calls, better offline experience, but news may feel stale. | |
| Shorter — 2 minutes | More frequent updates, but less cache benefit and more network calls. | |

**User's choice:** Current — 5 minutes (Recommended)
**Notes:** None

### Follow-up: Stale data indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — subtle badge | Show 'Cached X min ago' badge when serving stale data. Users know data may not be current. | ✓ |
| No — silent caching | Don't expose cache state. Simpler UX, but user may not realize data is old. | |

**User's choice:** Yes — subtle badge
**Notes:** None

---

## Claude's Discretion

- Service Worker registration error handling
- IndexedDB schema design for sync queue
- Exact engagement tracking implementation (localStorage counters vs analytics)
- Cache size limits and eviction policies

## Deferred Ideas

None — discussion stayed within phase scope
