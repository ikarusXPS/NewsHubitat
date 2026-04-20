# Phase 2: Event System - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 6 (5 extend, 1 new)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/data/historicalEvents.ts` | data | static | `server/data/historicalEvents.ts` (self) | exact |
| `server/services/eventsService.ts` | service | CRUD + transform | `server/services/eventsService.ts` (self) | exact |
| `src/pages/Timeline.tsx` | page component | request-response | `src/pages/Timeline.tsx` (self) | exact |
| `src/pages/EventMap.tsx` | page component | request-response + real-time | `src/pages/EventMap.tsx` (self) | exact |
| `src/components/GlobeView.tsx` | component | request-response | `src/components/GlobeView.tsx` (self) | exact |
| `src/hooks/useEventSocket.ts` | custom hook | event-driven | `src/hooks/useBackendStatus.ts` | role-match |

## Pattern Assignments

### `server/data/historicalEvents.ts` (data, static)

**Analog:** `server/data/historicalEvents.ts` (self-extension)

**Current structure** (lines 1-13):
```typescript
import type { TimelineEvent } from '../../src/types';

/**
 * Historical Events Database for Middle East Conflict
 *
 * Covers major events from 1948 to present, focusing on:
 * - Israel-Palestine conflict
 * - Regional wars and conflicts
 * - Peace negotiations and agreements
 * - Humanitarian crises
 * - Diplomatic developments
 */
export const HISTORICAL_EVENTS: Omit<TimelineEvent, 'id' | 'sources' | 'relatedArticles'>[] = [
```

**Event object pattern** (lines 14-22):
```typescript
{
  date: new Date('1948-05-14'),
  title: 'Gründung des Staates Israel',
  description: 'David Ben-Gurion proklamiert die Unabhängigkeit Israels. Beginn des arabisch-israelischen Konflikts.',
  category: 'diplomacy',
  severity: 10,
  location: { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
},
```

**Extend to bilingual i18n structure:**
```typescript
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

**Helper functions pattern** (lines 714-757):
```typescript
/**
 * Get historical events sorted by date (newest first)
 */
export function getHistoricalEvents(): TimelineEvent[] {
  return HISTORICAL_EVENTS.map((event, index) => ({
    ...event,
    id: `historical-${index}`,
    sources: [],
    relatedArticles: [],
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Search events by keyword in title or description
 */
export function searchHistoricalEvents(query: string): TimelineEvent[] {
  const lowerQuery = query.toLowerCase();
  return getHistoricalEvents().filter(
    (event) =>
      event.title.toLowerCase().includes(lowerQuery) ||
      event.description.toLowerCase().includes(lowerQuery)
  );
}
```

---

### `server/services/eventsService.ts` (service, CRUD + transform)

**Analog:** `server/services/eventsService.ts` (self-extension)

**Singleton pattern** (lines 122-134):
```typescript
export class EventsService {
  private static instance: EventsService;
  private cache: { events: TimelineEvent[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): EventsService {
    if (!EventsService.instance) {
      EventsService.instance = new EventsService();
    }
    return EventsService.instance;
  }
```

**Location extraction pattern** (lines 34-120):
```typescript
// Location extraction patterns - Expanded for better coverage
const LOCATION_PATTERNS: Array<{ pattern: RegExp; lat: number; lng: number; name: string }> = [
  // Gaza Strip
  { pattern: /\bgaza\b/i, lat: 31.5, lng: 34.47, name: 'Gaza' },
  { pattern: /\brafah\b/i, lat: 31.2765, lng: 34.2458, name: 'Rafah' },
  { pattern: /\bkhan younis\b/i, lat: 31.3444, lng: 34.3027, name: 'Khan Younis' },

  // Israel
  { pattern: /\bjerusalem\b/i, lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  { pattern: /\btel aviv\b/i, lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },

  // Europe
  { pattern: /\bkyiv\b/i, lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  { pattern: /\bberlin\b/i, lat: 52.5200, lng: 13.4050, name: 'Berlin' },

  // Asia
  { pattern: /\btokyo\b/i, lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
  { pattern: /\bseoul\b/i, lat: 37.5665, lng: 126.9780, name: 'Seoul' },
];
```

**Location extraction method** (lines 229-236):
```typescript
private extractLocation(text: string): { lat: number; lng: number; name: string } | undefined {
  for (const loc of LOCATION_PATTERNS) {
    if (loc.pattern.test(text)) {
      return { lat: loc.lat, lng: loc.lng, name: loc.name };
    }
  }
  return undefined;
}
```

**Pattern:** Add more global location patterns to improve B6 bug (map density). Keep same structure with case-insensitive regex matching.

---

### `src/pages/Timeline.tsx` (page component, request-response)

**Analog:** `src/pages/Timeline.tsx` (self-extension)

**EventDetailPanel component** (lines 217-334):
```typescript
// Event Detail Panel Component
function EventDetailPanel({
  event,
  onClose,
}: {
  event: TimelineEvent;
  onClose: () => void;
}) {
  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.other;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0a0e1a] border-l border-[#00f0ff]/20 shadow-2xl shadow-[#00f0ff]/10 z-50 overflow-y-auto"
    >
```

**Related Articles display - CURRENT (generic IDs)** (lines 310-331):
```typescript
{/* Related Articles */}
{event.relatedArticles.length > 0 && (
  <div>
    <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
      Verwandte Artikel ({event.relatedArticles.length})
    </h3>
    <div className="space-y-2">
      {event.relatedArticles.map((articleId, i) => (
        <a
          key={articleId}
          href={`/article/${articleId}`}
          className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
        >
          <span className="text-sm font-mono text-gray-300 group-hover:text-[#00f0ff] transition-colors">
            Artikel #{i + 1}
          </span>
          <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-[#00f0ff] transition-colors" />
        </a>
      ))}
    </div>
  </div>
)}
```

**Pattern to copy:** Fetch `/events/:id` to get full article data, then render article preview with title, source, timestamp, perspective (D-02). Replace generic "Artikel #1" with actual article content.

**Article preview structure (from RESEARCH.md):**
```typescript
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

**TanStack Query usage pattern** (lines 343-347):
```typescript
const { data, isLoading, error, refetch, isFetching } = useQuery({
  queryKey: ['events'],
  queryFn: () => fetchEvents(),
  staleTime: 2 * 60 * 1000,
});
```

**i18n selection pattern (from Zustand store):**
```typescript
import { useAppStore } from '../store';

const language = useAppStore(state => state.language); // 'de' | 'en'

// Use in component:
const title = event.title[language] || event.title.de; // Fallback to German
```

---

### `src/pages/EventMap.tsx` (page component, request-response + real-time)

**Analog:** `src/pages/EventMap.tsx` (self-extension)

**Shared query key pattern - CRITICAL** (lines 167-179):
```typescript
// Fetch real events from API
const { data: events, isLoading, error, refetch } = useQuery({
  queryKey: ['geo-events'], // Synchronized with Monitor
  queryFn: async (): Promise<GeoEvent[]> => {
    const response = await fetch('/api/events/geo');
    if (!response.ok) {
      throw new Error('Failed to fetch geo events');
    }
    const result = await response.json();
    return result.data || [];
  },
  staleTime: 60_000, // 1 minute (same as Monitor)
  refetchInterval: 2 * 60_000, // Auto-refetch every 2 minutes (same as Monitor)
});
```

**Pattern:** Use EXACT same queryKey, staleTime, refetchInterval across Monitor.tsx, EventMap.tsx, GlobeView.tsx to ensure cache synchronization (D-14).

**LIVE badge pattern** (lines 731-750):
```typescript
// Check if event is recent (< 30 minutes)
const eventTime = new Date(event.timestamp).getTime();
// eslint-disable-next-line react-hooks/purity -- Date.now() for time-based styling
const isRecent = Date.now() - eventTime < 30 * 60 * 1000;

return (
  <CircleMarker
    key={event.id}
    center={[event.location.lat, event.location.lng]}
    radius={isSelected ? radius + 3 : radius}
    pathOptions={{
      color: severityConfig.color,
      fillColor: severityConfig.color,
      fillOpacity: isSelected ? 0.6 : 0.4,
      weight: isSelected ? 3 : 2,
      className: cn(
        event.severity === 'critical' && 'marker-pulse',
        isRecent && 'marker-recent-pulse'
      ),
    }}
```

**LIVE badge display in popup** (lines 790-800):
```typescript
<div className="flex items-center gap-2">
  <Clock className="h-3 w-3 text-[#00f0ff]" />
  {formatTimeAgo(event.timestamp)}
  {isRecent && (
    <span className="text-[#00f0ff] font-bold animate-pulse">• LIVE</span>
  )}
</div>
```

**Pattern:** Add LIVE badge with pulse animation for events with timestamp < 30 minutes from now (D-15). Use CSS class `marker-recent-pulse` for visual effect.

**MarkerClusterGroup configuration** (lines 718-725):
```typescript
<MarkerClusterGroup
  iconCreateFunction={createClusterIcon}
  maxClusterRadius={60}
  spiderfyOnMaxZoom={true}
  showCoverageOnHover={false}
  zoomToBoundsOnClick={true}
  disableClusteringAtZoom={12}
>
```

**Pattern:** Keep existing cluster settings (D-12). Already optimized with maxClusterRadius={60} and disableClusteringAtZoom={12}.

---

### `src/components/GlobeView.tsx` (component, request-response)

**Analog:** `src/components/GlobeView.tsx` (self-extension)

**Current pattern: Props-based data** (lines 9-15):
```typescript
interface GlobeViewProps {
  points?: GeoEvent[];
  onPointClick?: (point: GeoEvent) => void;
  className?: string;
  isLoading?: boolean;
  focusEventId?: string | null; // External control to zoom to specific event
}
```

**Pattern to extend:** Add independent data fetching using TanStack Query with shared queryKey.

**TanStack Query integration pattern (from EventMap.tsx):**
```typescript
import { useQuery } from '@tanstack/react-query';

export function GlobeView({ onPointClick, className, focusEventId }: GlobeViewProps) {
  // Add independent query with shared key
  const { data: points = [], isLoading: queryLoading } = useQuery({
    queryKey: ['geo-events'], // Same as Monitor and EventMap
    queryFn: async (): Promise<GeoEvent[]> => {
      const response = await fetch('/api/events/geo');
      if (!response.ok) {
        throw new Error('Failed to fetch geo events');
      }
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 60_000, // 1 minute (synchronized)
    refetchInterval: 2 * 60_000, // 2 minutes (synchronized)
  });

  // Merge with external isLoading prop
  const isLoading = queryLoading || externalLoading;
```

**Pattern:** Remove `points` from props and fetch independently. Keep other props for compatibility. Use same queryKey for cache sharing (D-14).

---

### `src/hooks/useEventSocket.ts` (custom hook, event-driven) - NEW FILE

**Analog:** `src/hooks/useBackendStatus.ts`

**Custom hook structure pattern** (lines 1-77):
```typescript
import { useState, useEffect, useCallback } from 'react';

interface BackendStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  error: string | null;
}

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_ENDPOINT = '/api/health';

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>({
    isOnline: true,
    isChecking: false,
    lastCheck: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      // ... async operation ...
      setStatus({
        isOnline: true,
        isChecking: false,
        lastCheck: new Date(),
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setStatus({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        error: errorMessage,
      });
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Health check on mount is standard pattern
    checkHealth();
  }, [checkHealth]);

  // Periodic health checks
  useEffect(() => {
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    ...status,
    retry: checkHealth,
  };
}
```

**Socket.IO server event types** (from `server/services/websocketService.ts` lines 12-34):
```typescript
export interface ServerToClientEvents {
  // News updates
  'news:new': (article: NewsArticle) => void;
  'news:updated': (article: Partial<NewsArticle> & { id: string }) => void;
  'news:breaking': (article: NewsArticle) => void;

  // Event updates
  'event:new': (event: GeoEvent) => void;
  'event:updated': (event: Partial<GeoEvent> & { id: string }) => void;
  'event:severity-change': (data: { eventId: string; oldSeverity: string; newSeverity: string }) => void;

  // Analysis updates
  'analysis:cluster-updated': (data: { topic: string; articleCount: number }) => void;
  'analysis:tension-index': (data: { value: number; change: number }) => void;
}
```

**Pattern for useEventSocket.ts:**
```typescript
import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GeoEvent } from '../types';

// Singleton pattern - reuse socket connection
let socket: Socket | null = null;

export function useEventSocket(
  onNewEvent?: (event: GeoEvent) => void,
  onSeverityChange?: (data: { eventId: string; oldSeverity: string; newSeverity: string }) => void
) {
  // Filter: Only critical/high severity events (D-16)
  const handleNewEvent = useCallback((event: GeoEvent) => {
    if (event.severity === 'critical' || event.severity === 'high') {
      onNewEvent?.(event);
    }
  }, [onNewEvent]);

  useEffect(() => {
    // Initialize socket once (singleton)
    if (!socket) {
      socket = io({ path: '/socket.io' });
    }

    // Subscribe to event channels
    socket.on('event:new', handleNewEvent);
    if (onSeverityChange) {
      socket.on('event:severity-change', onSeverityChange);
    }

    // Cleanup: unsubscribe on unmount
    return () => {
      socket?.off('event:new', handleNewEvent);
      socket?.off('event:severity-change', onSeverityChange);
    };
  }, [handleNewEvent, onSeverityChange]);

  return socket;
}
```

**Pattern:** Follow useBackendStatus structure with useState/useEffect/useCallback. Add Socket.IO connection lifecycle management. Use singleton pattern to prevent duplicate connections. Return socket instance for optional advanced usage.

---

## Shared Patterns

### TanStack Query with Shared Cache
**Source:** `src/pages/EventMap.tsx` lines 167-179
**Apply to:** EventMap.tsx, GlobeView.tsx, Monitor.tsx

```typescript
const { data: events } = useQuery({
  queryKey: ['geo-events'], // MUST be identical
  queryFn: fetchGeoEvents,
  staleTime: 60_000, // MUST be identical
  refetchInterval: 2 * 60_000, // MUST be identical
});
```

**Critical:** Any mismatch in queryKey, staleTime, or refetchInterval breaks cache synchronization and causes different event counts across pages (Pitfall 1 from RESEARCH.md).

### Zustand Language Selection
**Source:** `src/store/index.ts`
**Apply to:** Timeline.tsx, historicalEvents.ts usage

```typescript
import { useAppStore } from '../store';

const language = useAppStore(state => state.language); // 'de' | 'en'

// In component:
const title = event.title[language] || event.title.de; // Fallback to German
```

**Pattern:** Always provide fallback to German (`.de`) for backward compatibility with existing single-language events.

### Socket.IO Cleanup Pattern
**Source:** Adapted from `useBackendStatus.ts` and WebSocket best practices
**Apply to:** useEventSocket.ts, any Socket.IO usage

```typescript
useEffect(() => {
  const socket = io();
  socket.on('event:new', handler);

  // CRITICAL: Always cleanup
  return () => {
    socket.off('event:new', handler);
    // Optional: socket.disconnect() if per-component connection
  };
}, [handler]);
```

**Pattern:** Prevent memory leaks by always cleaning up event listeners in useEffect return function.

### LIVE Badge Pattern
**Source:** `src/pages/EventMap.tsx` lines 731-750
**Apply to:** EventMap.tsx, GlobeView.tsx (popup tooltips)

```typescript
const isRecent = useMemo(() => {
  const eventTime = new Date(event.timestamp).getTime();
  return Date.now() - eventTime < 30 * 60 * 1000; // 30 minutes
}, [event.timestamp]);

{isRecent && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#ff0044]/20 text-[#ff0044] border border-[#ff0044]/50">
    <span className="h-1.5 w-1.5 rounded-full bg-[#ff0044] animate-pulse" />
    LIVE
  </span>
)}
```

**Pattern:** Use useMemo to avoid recalculating on every render (Pitfall 5 from RESEARCH.md). 30-minute threshold matches D-15.

---

## No Analog Found

All files have close analogs. The NEW hook `useEventSocket.ts` uses `useBackendStatus.ts` as analog, adapting its state management patterns to Socket.IO lifecycle.

---

## Metadata

**Analog search scope:**
- `server/data/` - Static data files
- `server/services/` - Business logic services
- `src/pages/` - Page components
- `src/components/` - Reusable components
- `src/hooks/` - Custom React hooks

**Files scanned:** 11 files read
**Pattern extraction date:** 2026-04-18

**Key insights:**
1. All 5 files to extend already exist and follow established patterns
2. One NEW file (`useEventSocket.ts`) has excellent analog in existing hook (`useBackendStatus.ts`)
3. Critical pattern: Shared queryKey synchronization across Monitor/EventMap/GlobeView
4. Critical pattern: i18n language selection via Zustand store
5. Critical pattern: Socket.IO singleton to prevent connection duplication
6. Critical pattern: LIVE badge threshold calculation in useMemo to prevent flicker
