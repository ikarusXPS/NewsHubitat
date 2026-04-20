---
phase: 02-event-system
plan: 04
subsystem: frontend
tags: [websocket, real-time, hooks, globe]
dependency_graph:
  requires: []
  provides: [useEventSocket-hook, globe-internal-query, live-status]
  affects: [EventMap.tsx, GlobeView.tsx]
tech_stack:
  added: [socket.io-client]
  patterns: [react-query-invalidation, connection-state-management]
key_files:
  created:
    - src/hooks/useEventSocket.ts
  modified:
    - src/components/GlobeView.tsx
    - src/pages/EventMap.tsx
decisions:
  - Use same queryKey ['geo-events'] for cache sharing across components
  - Limit socket reconnection to 5 attempts with 1s delay (T-02-06 mitigation)
  - Keep newEvents buffer at 10 items max
metrics:
  duration: ~10min
  completed: 2026-04-18
  tasks: 3/3
  files: 3
---

# Phase 02 Plan 04: WebSocket Hook + GlobeView Query Summary

WebSocket integration for real-time event updates via useEventSocket hook with automatic query invalidation and LIVE/OFFLINE status indicator.

## One-Liner

Socket.io WebSocket hook with connection state management, query invalidation on new events, and GlobeView independent data fetching option.

## Changes Made

### Task 1: useEventSocket Hook

Created `src/hooks/useEventSocket.ts`:
- Manages WebSocket connection state (isConnected, isConnecting, error)
- Buffers last 10 new events with `clearNewEvents()` callback
- Supports `onNewEvent` and `onSeverityChange` callbacks
- Mirrors server event types from `websocketService.ts`
- Reconnection limit: 5 attempts with 1s delay (T-02-06 DoS mitigation)

**Commit:** 3ddba03

### Task 2: GlobeView Internal Query

Updated `src/components/GlobeView.tsx`:
- Added `useInternalQuery` prop for independent data fetching
- Uses same `queryKey: ['geo-events']` for React Query cache sharing
- Preserves backward compatibility with external `points` prop
- Updated loading overlay to use unified `isLoading` variable

**Commit:** ff1bbd0

### Task 3: EventMap WebSocket Integration

Updated `src/pages/EventMap.tsx`:
- Integrated `useEventSocket` hook
- Auto-invalidates geo-events query when new WebSocket event arrives
- Added LIVE/OFFLINE connection status badge (bottom-left)
- Status badge uses cyber theme with pulse animation when connected

**Commit:** d7551a5

## Key Files

| File | Change | Purpose |
|------|--------|---------|
| `src/hooks/useEventSocket.ts` | Created | WebSocket hook for real-time events |
| `src/components/GlobeView.tsx` | Modified | Optional internal query for independence |
| `src/pages/EventMap.tsx` | Modified | WebSocket integration + LIVE badge |

## Verification

- TypeScript compilation: PASSED (all 3 tasks)
- useEventSocket hook exports `EventSocketState` interface
- GlobeView supports `useInternalQuery={true}` prop
- EventMap shows LIVE/OFFLINE indicator

## Deviations from Plan

None - plan executed exactly as written.

## Threat Model Compliance

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-02-05 (Spoofing) | Accept | CORS configured server-side; events read-only |
| T-02-06 (DoS) | Mitigate | reconnectionAttempts: 5, reconnectionDelay: 1000ms |
| T-02-07 (Info Disclosure) | Accept | Events are public news data, no PII |

## Self-Check: PASSED

- [x] src/hooks/useEventSocket.ts exists
- [x] src/components/GlobeView.tsx contains useInternalQuery
- [x] src/pages/EventMap.tsx contains useEventSocket import
- [x] Commit 3ddba03 exists
- [x] Commit ff1bbd0 exists
- [x] Commit d7551a5 exists
