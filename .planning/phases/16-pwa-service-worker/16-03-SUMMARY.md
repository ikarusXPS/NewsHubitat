---
phase: 16-pwa-service-worker
plan: 03
subsystem: offline-sync
tags: [pwa, background-sync, indexeddb, offline]
dependency_graph:
  requires: []
  provides: [syncService, offline-queue]
  affects: []
tech_stack:
  added:
    - IndexedDB sync-queue object store
    - Background Sync API (Chromium)
    - Polling fallback (Safari)
  patterns:
    - Singleton service pattern
    - IndexedDB transaction pattern
    - Browser API feature detection
    - Graceful degradation
key_files:
  created:
    - src/services/syncService.ts
  modified: []
decisions:
  - Use Background Sync API for Chromium browsers, polling for Safari
  - Queue actions in IndexedDB with timestamp index
  - Singleton pattern following cacheService.ts
  - Send actions to /api/bookmarks and /api/history endpoints
metrics:
  duration_minutes: 3.4
  tasks_completed: 1
  files_created: 1
  files_modified: 0
  commits: 1
  completed_date: "2026-04-22"
---

# Phase 16 Plan 03: Background Sync Service Summary

**One-liner:** IndexedDB-backed sync queue with Background Sync API (Chromium) and polling fallback (Safari) for offline bookmark/history actions

## What Was Built

Created `syncService` singleton that enables offline bookmark and reading history tracking with automatic sync when connection is restored.

**Core capabilities:**
- Queue offline actions in IndexedDB `sync-queue` object store
- Register Background Sync API for Chromium browsers (Chrome, Edge, Opera)
- Fall back to `window.addEventListener('online')` polling for Safari
- Replay queued actions to `/api/bookmarks` and `/api/history` endpoints
- Error handling with retry (leave failed actions in queue)

**Architecture pattern:**
- Follows `cacheService.ts` IndexedDB singleton pattern
- Feature detection for Background Sync API availability
- Graceful degradation for unsupported browsers
- Separation of concerns: queueAction() → registerBackgroundSync() || setupReconnectListener()

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create syncService with IndexedDB queue | 5f6f879 | src/services/syncService.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Notes

### IndexedDB Schema
```typescript
Database: 'newshub-sync' (version 1)
Object Store: 'sync-queue'
  - keyPath: 'id'
  - Index: 'timestamp' (non-unique)

SyncAction interface:
  - id: string
  - type: 'bookmark' | 'history'
  - payload: unknown
  - timestamp: number
```

### Background Sync Fallback Strategy
1. **Try Background Sync API** (Chromium only)
   - Feature detect: `'sync' in ServiceWorkerRegistration.prototype`
   - Register: `registration.sync.register('sync-queue')`
   - Service worker will handle replay (future plan)

2. **Fallback to polling** (Safari, Firefox)
   - Listen to `window.addEventListener('online')`
   - Call `replayQueue()` on reconnect
   - One-time listener attachment (tracked via flag)

### Error Handling
- Failed sync attempts log error but leave action in queue
- Next `online` event or Background Sync trigger will retry
- No automatic retry limit (user can manually trigger via reconnect)

## Integration Points

**Next plan (16-04):**
- Create `/api/bookmarks` POST endpoint
- Create `/api/history` POST endpoint
- Integrate `syncService.queueAction()` into bookmark/history UI actions

**Service Worker (future):**
- Add `sync` event handler to replay queue when Background Sync API fires

## Verification

**TypeScript:** ✅ `npm run typecheck` passes with 0 errors

**Manual verification steps:**
```javascript
// DevTools Console
import { syncService } from './services/syncService';

// Queue test action
await syncService.queueAction({
  id: 'test-1',
  type: 'bookmark',
  payload: { articleId: '123' },
  timestamp: Date.now()
});

// Check IndexedDB
// Application → IndexedDB → newshub-sync → sync-queue
// Should show 1 entry with id 'test-1'

// Trigger replay (will fail with 404 until endpoints created)
await syncService.replayQueue();
```

## Self-Check

### Created Files Exist
```
✅ src/services/syncService.ts exists
```

### Commits Exist
```
✅ 5f6f879: feat(16-03): create syncService with IndexedDB queue and Background Sync
```

### Required Exports
```
✅ export const syncService
✅ queueAction(action: SyncAction)
✅ replayQueue()
✅ registerBackgroundSync() (private)
✅ setupReconnectListener() (private)
✅ sendToServer(action: SyncAction) (private)
```

## Self-Check: PASSED

---

**Plan:** 16-03
**Completed:** 2026-04-22
**Duration:** 3.4 minutes
