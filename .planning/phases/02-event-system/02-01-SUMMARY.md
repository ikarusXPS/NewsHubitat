---
phase: 02-event-system
plan: 01
subsystem: data
tags: [i18n, historical-events, database]
dependency_graph:
  requires: []
  provides: [TimelineEventI18n, I18nText, getHistoricalEventsI18n]
  affects: [Timeline, EventMap]
tech_stack:
  added: []
  patterns: [i18n-text-structure, legacy-fallback]
key_files:
  created: []
  modified:
    - src/types/index.ts
    - server/data/historicalEvents.ts
decisions:
  - "Added 'economic' category to TimelineEventI18n for global events like Black Tuesday"
  - "Preserved legacy getHistoricalEvents() with German as default for backward compatibility"
metrics:
  duration: "~8 minutes"
  tasks_completed: 2
  files_modified: 2
  events_count: 111
  completed: 2026-04-18T04:40:00Z
---

# Phase 02 Plan 01: Historical Events i18n Database Summary

Bilingual DE/EN historical events database with 111 events spanning 1914-2025, covering WWI, WWII, Cold War, and modern geopolitics.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add i18n type for historical events | 09209a1 | src/types/index.ts |
| 2 | Convert existing events to i18n format and add global events | 73eddd9 | server/data/historicalEvents.ts |

## What Was Built

### Types Added (src/types/index.ts)

```typescript
export interface I18nText {
  de: string;
  en: string;
}

export interface TimelineEventI18n {
  id: string;
  date: Date;
  title: I18nText;
  description: I18nText;
  category: 'military' | 'diplomacy' | 'humanitarian' | 'protest' | 'other' | 'economic';
  severity: number;
  sources: string[];
  location?: { lat: number; lng: number; name: string };
  relatedArticles: string[];
}
```

### Historical Events Database (server/data/historicalEvents.ts)

**Total Events:** 111 (exceeds 100+ requirement)

**Coverage by Era:**
- WWI Era (1914-1918): 6 events
- Interwar Period (1919-1939): 2 events
- WWII Era (1939-1945): 6 events
- Cold War Era (1945-1991): 12 events
- Middle East (1948-2025): ~85 events

**Geographic Coverage:**
- Europe: Sarajevo, Vienna, Berlin, Moscow, Paris, Versailles, Normandy
- Americas: Washington DC, New York, Havana, Pearl Harbor, Cape Canaveral
- Asia: Beijing, Seoul, Tokyo, Hiroshima, Saigon
- Middle East: Jerusalem, Tel Aviv, Gaza, Beirut, Damascus, Tehran, Cairo

**New Functions:**
- `getHistoricalEventsI18n()` - Returns full i18n format
- `getHistoricalEvents()` - Returns legacy format (German default)

## Verification Results

- TypeScript compilation: PASSED
- Event count: 111 events
- i18n structure: All events have `title.de`, `title.en`, `description.de`, `description.en`
- Key dates present: 1914-06-28, 1939-09-01, 1989-11-09

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Added 'economic' category**: The plan included events like Black Tuesday (1929 stock crash) which don't fit existing categories. Added 'economic' to the TimelineEventI18n category union.

2. **Backward compatibility**: Preserved `getHistoricalEvents()` returning legacy `TimelineEvent` format with German text as default, ensuring existing code continues to work.

## Self-Check: PASSED

- [x] src/types/index.ts exists and contains I18nText, TimelineEventI18n
- [x] server/data/historicalEvents.ts exists and contains 111 events
- [x] Commit 09209a1 exists (i18n types)
- [x] Commit 73eddd9 exists (historical events expansion)
