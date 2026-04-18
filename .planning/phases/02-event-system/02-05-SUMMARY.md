---
phase: 02-event-system
plan: 05
subsystem: frontend
tags: [websocket, real-time, components, live-indicator]
dependency_graph:
  requires: [useEventSocket-hook]
  provides: [LiveBadge-component, timeline-websocket]
  affects: [EventMap.tsx, Timeline.tsx]
tech_stack:
  added: []
  patterns: [reusable-components, query-invalidation]
key_files:
  created:
    - src/components/LiveBadge.tsx
  modified:
    - src/pages/EventMap.tsx
    - src/pages/Timeline.tsx
decisions:
  - Consolidated LIVE badge styling into reusable LiveBadge component
  - Timeline uses same WebSocket pattern as EventMap for consistency
  - Last update timestamp shown in Timeline header for user awareness
metrics:
  duration: ~4min
  completed: 2026-04-18
  tasks: 3/3
  files: 3
---

# Phase 02 Plan 05: LiveBadge Component + Timeline Integration Summary

Reusable LiveBadge component for WebSocket connection status, with Timeline page real-time updates integration.

## One-Liner

LiveBadge component with animate-ping pulse effect, refactored EventMap to use it, and Timeline WebSocket integration with query invalidation.

## Changes Made

### Task 1: LiveBadge Component

Created `src/components/LiveBadge.tsx`:
- Reusable connection status indicator component
- LIVE state: green (#00ff88) with pulsing dot animation (animate-ping)
- OFFLINE state: gray (gray-500) static display
- JetBrains Mono font, 10px uppercase with tracking-wider
- Props: `isConnected`, `className`, `showLabel`
- Matches UI-SPEC.md visual contract exactly

**Commit:** 56feacc

### Task 2: EventMap LiveBadge Refactor

Updated `src/pages/EventMap.tsx`:
- Replaced inline LIVE/OFFLINE indicator with LiveBadge component
- Removed 13 lines of inline styling
- Added LiveBadge import
- Maintains same visual appearance and bottom-left positioning

**Commit:** 98361c8

### Task 3: Timeline WebSocket Integration

Updated `src/pages/Timeline.tsx`:
- Added useEventSocket hook integration
- Query invalidation on new WebSocket event
- LiveBadge in header shows real-time connection status
- Event count display in header
- Last update timestamp display (German locale)

**Commit:** 7a97946

## Key Files

| File | Change | Purpose |
|------|--------|---------|
| `src/components/LiveBadge.tsx` | Created | Reusable LIVE/OFFLINE status badge |
| `src/pages/EventMap.tsx` | Modified | Use LiveBadge instead of inline styles |
| `src/pages/Timeline.tsx` | Modified | WebSocket integration + LiveBadge |

## Verification

- TypeScript compilation: PASSED (all 3 tasks)
- LiveBadge component exports correctly
- EventMap uses LiveBadge component
- Timeline integrates useEventSocket with query invalidation
- Timeline shows LiveBadge in header

## Deviations from Plan

None - plan executed exactly as written.

## Threat Model Compliance

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-02-08 (DoS) | Accept | Query invalidation rate limited by WebSocket server event frequency |

## Self-Check: PASSED

- [x] src/components/LiveBadge.tsx exists
- [x] src/pages/EventMap.tsx contains `<LiveBadge isConnected=`
- [x] src/pages/Timeline.tsx contains useEventSocket
- [x] Commit 56feacc exists
- [x] Commit 98361c8 exists
- [x] Commit 7a97946 exists
