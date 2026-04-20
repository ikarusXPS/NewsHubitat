# Phase 2: Event System - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Link timeline events to articles and add historical database. Users can click events to see related articles, browse 100+ historical events, see clustered markers in dense regions, and receive real-time updates on globe/map.

</domain>

<decisions>
## Implementation Decisions

### Article Linking (EVT-01)
- **D-01:** Inline preview within event panel — no page navigation
- **D-02:** Compact preview format: title, source, timestamp, perspective region
- **D-03:** External link icon opens original article URL in new tab
- **D-04:** Backend `/events/:id` already returns related articles — extend frontend to display them

### Historical Database (EVT-02)
- **D-05:** Global expansion scope — not limited to Middle East
- **D-06:** Era range: 20th century (1900+) to present — includes WWI/WWII, Cold War, modern conflicts
- **D-07:** Bilingual DE/EN — store both languages, show based on user language setting
- **D-08:** Target: 100+ events covering major geopolitical milestones worldwide
- **D-09:** Keep existing `server/data/historicalEvents.ts` structure, add i18n fields

### Map Clustering (EVT-03)
- **D-10:** Improve location extraction in AI — geocode more events from article text (addresses B6 bug)
- **D-11:** Keep current cluster visualization: count + max severity color
- **D-12:** Current settings work: `maxClusterRadius={60}`, `disableClusteringAtZoom={12}`
- **D-13:** Cluster breakpoint tuning left to Claude's discretion based on testing

### Real-time Updates (EVT-04)
- **D-14:** Globe shows same events as EventMap — sync via shared queryKey `['geo-events']`
- **D-15:** LIVE badge + pulse animation for recent events (<30 min)
- **D-16:** Hybrid update approach: WebSocket push for critical events (severity 8-10), polling for rest
- **D-17:** Use existing Socket.IO infrastructure (`server/services/websocketService.ts`)
- **D-18:** Keep 2-minute polling interval for non-critical events

### Claude's Discretion
- Exact historical events to include (within global scope, 1900+)
- Geocoding approach for location extraction improvement
- LIVE badge styling and positioning
- WebSocket event format for critical events

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Event System
- `src/pages/Timeline.tsx` — Timeline page with filters, event cards, detail panel
- `src/pages/EventMap.tsx` — Map with Leaflet, clustering, real-time events
- `src/components/GlobeView.tsx` — 3D globe (needs event integration)
- `server/routes/events.ts` — All event API endpoints
- `server/data/historicalEvents.ts` — Historical events data file

### Types
- `src/types/index.ts` — `TimelineEvent`, `GeoEvent`, `EventCategory`, `EventSeverity` types

### WebSocket
- `server/services/websocketService.ts` — Socket.IO setup for real-time push

### Bug Reference
- B6: Map point density too low (30 events from 510 signals) — addressed by D-10

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EventDetailPanel` in Timeline.tsx — extend for article previews
- `MarkerClusterGroup` in EventMap.tsx — already configured, works
- `websocketService.ts` — Socket.IO server ready for event broadcasting
- `HISTORICAL_EVENTS` array structure — extend with i18n fields

### Established Patterns
- TanStack Query with shared queryKeys across pages (Monitor, EventMap)
- German language UI labels (Schweregrad, Quellen, Ereignis-Timeline)
- Severity colors: critical=#ff0044, high=#ff6600, medium=#ffee00, low=#00ff88
- Glass panel styling (`glass-panel` class)

### Integration Points
- `/events/:id` returns `articles` array — frontend needs to render them
- `GlobeView.tsx` needs to fetch and display `geo-events`
- WebSocket `event:new` channel exists — extend for critical event push
- User language from Zustand store (`language: 'de' | 'en'`) for bilingual content

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for historical event curation and geocoding.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-event-system*
*Context gathered: 2026-04-18*
