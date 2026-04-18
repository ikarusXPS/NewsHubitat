# Phase 2: Event System - Research

**Researched:** 2026-04-18
**Domain:** Timeline/Map Event System with Real-time Updates
**Confidence:** HIGH

## Summary

Phase 2 extends the existing event system infrastructure to link timeline events with articles, expand the historical events database globally with bilingual support, and add real-time updates via WebSocket. The codebase already has most components in place: Timeline.tsx with EventDetailPanel, EventMap.tsx with MarkerClusterGroup, GlobeView.tsx with 3D markers, and a full WebSocket service ready for critical event broadcasting.

The key gaps are: (1) EventDetailPanel shows article IDs but not actual article content - the backend `/events/:id` already returns full articles, but frontend doesn't display them; (2) historical events are limited to Middle East with German-only text; (3) GlobeView doesn't fetch events independently - it relies on props passed from Monitor.tsx; (4) WebSocket `event:new` channel exists but isn't being consumed by frontend components.

**Primary recommendation:** Extend EventDetailPanel to render actual article previews using the existing API response, add i18n fields to historical events data structure, integrate GlobeView with geo-events query, and add Socket.IO client hooks to timeline/map components for critical event push.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Inline preview within event panel - no page navigation
- **D-02:** Compact preview format: title, source, timestamp, perspective region
- **D-03:** External link icon opens original article URL in new tab
- **D-04:** Backend `/events/:id` already returns related articles - extend frontend to display them
- **D-05:** Global expansion scope - not limited to Middle East
- **D-06:** Era range: 20th century (1900+) to present
- **D-07:** Bilingual DE/EN - store both languages, show based on user language setting
- **D-08:** Target: 100+ events covering major geopolitical milestones worldwide
- **D-09:** Keep existing `server/data/historicalEvents.ts` structure, add i18n fields
- **D-10:** Improve location extraction in AI - geocode more events (addresses B6 bug)
- **D-11:** Keep current cluster visualization: count + max severity color
- **D-12:** Current settings work: `maxClusterRadius={60}`, `disableClusteringAtZoom={12}`
- **D-13:** Cluster breakpoint tuning left to Claude's discretion based on testing
- **D-14:** Globe shows same events as EventMap - sync via shared queryKey `['geo-events']`
- **D-15:** LIVE badge + pulse animation for recent events (<30 min)
- **D-16:** Hybrid update approach: WebSocket push for critical events (severity 8-10), polling for rest
- **D-17:** Use existing Socket.IO infrastructure (`server/services/websocketService.ts`)
- **D-18:** Keep 2-minute polling interval for non-critical events

### Claude's Discretion
- Exact historical events to include (within global scope, 1900+)
- Geocoding approach for location extraction improvement
- LIVE badge styling and positioning
- WebSocket event format for critical events

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVT-01 | User can view timeline events linked to related NewsArticles | EventDetailPanel exists with article ID display; `/events/:id` returns full articles array; need frontend rendering |
| EVT-02 | User can browse historical events database (100+ key events) | `server/data/historicalEvents.ts` has ~70 Middle East events; need global expansion + i18n fields |
| EVT-03 | User sees clustered event markers in dense map regions | MarkerClusterGroup already configured; need improved location extraction for B6 fix |
| EVT-04 | User sees real-time event markers update on globe/map | WebSocket service exists with `event:new` channel; GlobeView needs query integration; need Socket.IO client hook |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Article preview in event panel | Frontend | - | Pure UI component, data already available from API |
| Historical events data | Backend | - | Static data file, no database needed |
| i18n field selection | Frontend | Backend | Backend stores both; frontend selects based on Zustand `language` |
| Location extraction improvement | Backend | - | AI service enhancement in eventsService.ts |
| Map clustering | Frontend | - | Leaflet MarkerClusterGroup handles client-side |
| Real-time critical events | Backend | Frontend | Backend pushes via Socket.IO; frontend subscribes |
| Globe event display | Frontend | - | GlobeView component, same query as EventMap |

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-leaflet | 5.0.0 | Map rendering | [VERIFIED: package.json] React bindings for Leaflet |
| react-leaflet-markercluster | 5.0.0-rc.0 | Marker clustering | [VERIFIED: package.json] Leaflet.markercluster React wrapper |
| globe.gl | 2.45.0 | 3D globe | [VERIFIED: package.json] WebGL-based globe rendering |
| socket.io | 4.8.3 | WebSocket server | [VERIFIED: package.json] Real-time bidirectional communication |
| socket.io-client | 4.8.3 | WebSocket client | [VERIFIED: npm registry] Browser client for Socket.IO |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.x | Server state | All data fetching, shared queryKey pattern |
| zustand | 5.x | Client state | Language preference for i18n selection |
| framer-motion | 11.x | Animations | LIVE badge pulse, panel transitions |

**No new dependencies required.** All infrastructure exists.

## Architecture Patterns

### System Architecture Diagram

```
User Interaction
       |
       v
+-------------------+      +-------------------+      +-------------------+
|   Timeline.tsx    |      |   EventMap.tsx    |      |   Monitor.tsx     |
|   (Event Cards)   |      |   (2D Leaflet)    |      |   (Globe/Map)     |
+--------+----------+      +--------+----------+      +--------+----------+
         |                          |                          |
         v                          v                          v
+--------+----------+      +--------+----------+      +--------+----------+
| EventDetailPanel  |      | MarkerClusterGroup|      |    GlobeView      |
| (Article Preview) |      | (Cluster markers) |      |   (3D markers)    |
+--------+----------+      +--------+----------+      +--------+----------+
         |                          |                          |
         +------------+-------------+-------------+------------+
                      |                           |
                      v                           v
         +------------+------------+   +----------+----------+
         |  useQuery(['events'])   |   | useQuery(['geo-events']) |
         |  useQuery(['events/:id'])|   |   (shared cache)        |
         +------------+------------+   +----------+----------+
                      |                           |
                      v                           v
         +------------+---------------------------+----------+
         |                    /api/events/*                  |
         |  /:id returns { ...event, articles: [...] }       |
         +------------+---------------------------+----------+
                      |                           |
                      v                           v
         +------------+----------+     +----------+----------+
         |   EventsService       |     | historicalEvents.ts |
         | (extractEventsFromArticles) | (static data)       |
         +------------+----------+     +----------+----------+
                      |
                      v
         +------------+----------+
         |    NewsAggregator     |
         |  (article source)     |
         +-----------------------+

Real-time Path (parallel):

         +------------------------+
         |  WebSocketService      |
         |  - event:new channel   |
         +------------+-----------+
                      |
         critical events (severity >= 8)
                      |
                      v
         +------------+-----------+
         |  Socket.IO Client Hook |
         |  useEventSocket()      |
         +------------+-----------+
                      |
         +------------+------------+
         |                         |
         v                         v
   Timeline.tsx              EventMap.tsx / GlobeView
   (inject new event)        (add new marker + LIVE badge)
```

### Recommended Project Structure
No new directories needed. All changes in existing files:
```
server/
  data/
    historicalEvents.ts    # Extend: add i18n fields, global events
  services/
    eventsService.ts       # Extend: improve location extraction
    websocketService.ts    # Existing: already has event:new
  routes/
    events.ts              # Existing: /:id already returns articles

src/
  pages/
    Timeline.tsx           # Extend: EventDetailPanel article rendering
    EventMap.tsx           # Extend: Socket.IO subscription, LIVE badge
  components/
    GlobeView.tsx          # Extend: integrate with geo-events query
  hooks/
    useEventSocket.ts      # NEW: Socket.IO client hook (small file)
```

### Pattern 1: Shared Query Key for Cache Synchronization
**What:** Multiple components share the same TanStack Query cache by using identical queryKey
**When to use:** Components display the same data and should stay synchronized
**Example:**
```typescript
// Source: Existing pattern in Monitor.tsx and EventMap.tsx
// Both use queryKey: ['geo-events'] with identical staleTime/refetchInterval
const { data: events } = useQuery({
  queryKey: ['geo-events'],
  queryFn: fetchGeoEvents,
  staleTime: 60_000,
  refetchInterval: 2 * 60_000,
});
```

### Pattern 2: Zustand Language-Based i18n Selection
**What:** Use Zustand store's `language` field to select localized content
**When to use:** Bilingual content display based on user preference
**Example:**
```typescript
// Source: Existing pattern in store/index.ts
const language = useAppStore(state => state.language); // 'de' | 'en'

// In component:
const title = event.title[language] || event.title.de; // Fallback to German
```

### Pattern 3: Socket.IO Event Subscription Hook
**What:** Custom hook wrapping Socket.IO client for event subscriptions
**When to use:** Real-time updates in React components
**Example:**
```typescript
// Pattern based on existing websocketService.ts interface
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export function useEventSocket(onNewEvent: (event: GeoEvent) => void) {
  useEffect(() => {
    const socket: Socket = io();
    socket.on('event:new', onNewEvent);
    return () => { socket.disconnect(); };
  }, [onNewEvent]);
}
```

### Anti-Patterns to Avoid
- **Separate queries for same data:** Don't use different queryKeys for geo-events in Monitor vs EventMap - breaks cache sharing
- **Direct Socket.IO in component body:** Always use a hook or effect to manage Socket.IO lifecycle
- **Hardcoded language strings:** Always use the i18n pattern with language selection from store

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map marker clustering | Custom clustering algorithm | react-leaflet-markercluster | Efficient spatial indexing, zoom-based clustering |
| 3D globe rendering | THREE.js from scratch | globe.gl | Optimized earth visualization, built-in interactions |
| Real-time communication | Custom WebSocket handling | Socket.IO | Auto-reconnection, room-based broadcasting, fallbacks |
| Location extraction | Full NER system | Expanded regex patterns | [ASSUMED] Regex is sufficient for known location names |

**Key insight:** The project already uses all these libraries. Focus on integration, not replacement.

## Common Pitfalls

### Pitfall 1: Query Cache Desync
**What goes wrong:** GlobeView shows different events than EventMap
**Why it happens:** Different queryKey or staleTime values
**How to avoid:** Use exact same queryKey `['geo-events']`, staleTime `60_000`, refetchInterval `2 * 60_000` across all consumers
**Warning signs:** Event counts differ between pages

### Pitfall 2: Socket.IO Memory Leak
**What goes wrong:** Multiple socket connections accumulate on navigation
**Why it happens:** Not cleaning up socket connection on component unmount
**How to avoid:** Always return cleanup function from useEffect that calls `socket.disconnect()`
**Warning signs:** Browser DevTools shows multiple WebSocket connections

### Pitfall 3: Missing Article Data in Preview
**What goes wrong:** Article preview shows "Article #1" instead of title
**Why it happens:** Using `event.relatedArticles` (IDs) instead of fetched article data
**How to avoid:** Fetch `/events/:id` which returns full `articles` array with title, source, etc.
**Warning signs:** Preview shows IDs or generic labels

### Pitfall 4: i18n Fallback Missing
**What goes wrong:** Empty strings when language field doesn't exist
**Why it happens:** Accessing `event.title.en` on old events that only have German
**How to avoid:** Always use fallback: `event.title[language] || event.title.de || event.title`
**Warning signs:** Blank titles when switching to English

### Pitfall 5: LIVE Badge Flicker
**What goes wrong:** LIVE badge appears/disappears rapidly
**Why it happens:** Recalculating "recent" status on every render
**How to avoid:** Use useMemo with timestamp dependency, not Date.now() in render
**Warning signs:** Badge flickers or causes excessive re-renders

## Code Examples

### Article Preview Component (EVT-01)
```typescript
// Source: Based on existing EventDetailPanel pattern in Timeline.tsx
interface ArticlePreviewProps {
  article: {
    id: string;
    title: string;
    source: { name: string };
    publishedAt: string;
    perspective: PerspectiveRegion;
    url: string;
  };
}

function ArticlePreview({ article }: ArticlePreviewProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-mono text-gray-300 group-hover:text-[#00f0ff] truncate">
          {article.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-500">
          <span>{article.source.name}</span>
          <span>|</span>
          <span>{formatTimeAgo(article.publishedAt)}</span>
          <span>|</span>
          <span className="uppercase">{article.perspective}</span>
        </div>
      </div>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-gray-500 hover:text-[#00f0ff]"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
```

### i18n Historical Event Structure (EVT-02)
```typescript
// Source: Extension of existing historicalEvents.ts structure
interface HistoricalEventI18n {
  date: Date;
  title: {
    de: string;
    en: string;
  };
  description: {
    de: string;
    en: string;
  };
  category: EventCategory;
  severity: number;
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
}

// Example global event:
{
  date: new Date('1914-06-28'),
  title: {
    de: 'Attentat von Sarajevo',
    en: 'Assassination of Archduke Franz Ferdinand',
  },
  description: {
    de: 'Ermordung des österreichischen Thronfolgers löst den Ersten Weltkrieg aus.',
    en: 'Assassination of Austrian heir triggers World War I.',
  },
  category: 'military',
  severity: 10,
  location: { lat: 43.8563, lng: 18.4131, name: 'Sarajevo' },
}
```

### Location Extraction Improvement (B6 Fix)
```typescript
// Source: Extension of LOCATION_PATTERNS in eventsService.ts
// Add more global location patterns to improve extraction rate

// Europe
{ pattern: /\bkyiv\b/i, lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
{ pattern: /\bkiev\b/i, lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
{ pattern: /\bbrussel[s]?\b/i, lat: 50.8503, lng: 4.3517, name: 'Brussels' },

// Asia
{ pattern: /\btokyo\b/i, lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
{ pattern: /\bseoul\b/i, lat: 37.5665, lng: 126.9780, name: 'Seoul' },
{ pattern: /\bpyongyang\b/i, lat: 39.0392, lng: 125.7625, name: 'Pyongyang' },
{ pattern: /\bnew delhi\b/i, lat: 28.6139, lng: 77.2090, name: 'New Delhi' },

// Africa
{ pattern: /\baddis ababa\b/i, lat: 9.0320, lng: 38.7469, name: 'Addis Ababa' },
{ pattern: /\bkhartoum\b/i, lat: 15.5007, lng: 32.5599, name: 'Khartoum' },

// Americas
{ pattern: /\bbogota\b/i, lat: 4.7110, lng: -74.0721, name: 'Bogota' },
{ pattern: /\bcaracas\b/i, lat: 10.4806, lng: -66.9036, name: 'Caracas' },
```

### LIVE Badge Component (EVT-04)
```typescript
// Source: Pattern from EventMap.tsx isRecent check
interface LiveBadgeProps {
  timestamp: string | Date;
  thresholdMs?: number; // Default 30 minutes
}

function LiveBadge({ timestamp, thresholdMs = 30 * 60 * 1000 }: LiveBadgeProps) {
  const isRecent = useMemo(() => {
    const eventTime = new Date(timestamp).getTime();
    return Date.now() - eventTime < thresholdMs;
  }, [timestamp, thresholdMs]);

  if (!isRecent) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#ff0044]/20 text-[#ff0044] border border-[#ff0044]/50">
      <span className="h-1.5 w-1.5 rounded-full bg-[#ff0044] animate-pulse" />
      LIVE
    </span>
  );
}
```

### Socket.IO Client Hook (EVT-04)
```typescript
// Source: Pattern based on websocketService.ts ServerToClientEvents
import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GeoEvent } from '../types';

let socket: Socket | null = null;

export function useEventSocket(
  onNewEvent?: (event: GeoEvent) => void,
  onSeverityChange?: (data: { eventId: string; oldSeverity: string; newSeverity: string }) => void
) {
  const handleNewEvent = useCallback((event: GeoEvent) => {
    // Only handle critical events (severity 8-10 = 'critical' or 'high')
    if (event.severity === 'critical' || event.severity === 'high') {
      onNewEvent?.(event);
    }
  }, [onNewEvent]);

  useEffect(() => {
    if (!socket) {
      socket = io({ path: '/socket.io' });
    }

    socket.on('event:new', handleNewEvent);
    if (onSeverityChange) {
      socket.on('event:severity-change', onSeverityChange);
    }

    return () => {
      socket?.off('event:new', handleNewEvent);
      socket?.off('event:severity-change', onSeverityChange);
    };
  }, [handleNewEvent, onSeverityChange]);

  return socket;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling only | Hybrid polling + WebSocket | 2024 | Reduced latency for critical events |
| Single language | Bilingual DE/EN | Phase 2 | Broader audience reach |
| Middle East focus | Global scope | Phase 2 | Comprehensive world coverage |

**Deprecated/outdated:**
- None - all current libraries are up-to-date

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Regex-based location extraction is sufficient for known city names | Don't Hand-Roll | May need NLP/AI-based extraction for lesser-known locations |
| A2 | 100+ historical events can be manually curated efficiently | Code Examples | May need automated data import if scope expands |
| A3 | Socket.IO client connection sharing via module singleton works | Code Examples | May need context provider if multiple components conflict |

## Open Questions

1. **Historical Events Data Source**
   - What we know: Need 100+ global events from 1900+
   - What's unclear: Manual curation vs. automated import
   - Recommendation: Manual curation for quality control; events are static and finite

2. **Socket.IO Connection in GlobeView**
   - What we know: GlobeView is lazy-loaded, may mount/unmount
   - What's unclear: Whether shared socket singleton handles this gracefully
   - Recommendation: Test with lazy loading; add connection state logging

## Sources

### Primary (HIGH confidence)
- `D:\NewsHub\src\pages\Timeline.tsx` - EventDetailPanel implementation
- `D:\NewsHub\src\pages\EventMap.tsx` - MarkerClusterGroup configuration
- `D:\NewsHub\server\services\websocketService.ts` - Socket.IO event channels
- `D:\NewsHub\server\routes\events.ts` - API endpoint returning articles
- `D:\NewsHub\server\data\historicalEvents.ts` - Current data structure

### Secondary (MEDIUM confidence)
- `D:\NewsHub\package.json` - Verified library versions
- npm registry - Current library versions

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and working
- Architecture: HIGH - Extending existing patterns, no new concepts
- Pitfalls: HIGH - Based on direct codebase analysis

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days - stable infrastructure)
