# Phase 2: Event System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 02-event-system
**Areas discussed:** Article linking UX, Historical DB scope, Map clustering behavior, Real-time updates

---

## Article Linking UX

### Q1: What should happen when a user clicks a related article from an event?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline preview (Recommended) | Expand article summary/headline within the event panel — no page navigation | ✓ |
| Slide-over drawer | Open article details in a side drawer like the event detail panel | |
| Navigate to article | Full page navigation to a dedicated article view page | |

**User's choice:** Inline preview (Recommended)
**Notes:** Keeps user in context, no additional navigation

### Q2: What article info should the inline preview show?

| Option | Description | Selected |
|--------|-------------|----------|
| Compact (Recommended) | Title, source, timestamp, perspective region — fits in existing panel | ✓ |
| Full summary | Title, source, full summary text, sentiment badge, thumbnail if available | |
| Minimal | Just clickable title linking to original source URL | |

**User's choice:** Compact (Recommended)
**Notes:** None

### Q3: Should users be able to open the full original article from the preview?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, external link icon (Recommended) | Show small external link icon that opens original article URL in new tab | ✓ |
| No external links | Keep users within the app — no navigation to external sources | |

**User's choice:** Yes, external link icon (Recommended)
**Notes:** None

---

## Historical DB Scope

### Q1: What regional scope should the historical DB cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Middle East focus (Recommended) | Expand existing ME coverage to 100+ events — maintains coherent narrative | |
| Global expansion | Add major global geopolitical events (Cold War, EU, Asia conflicts, etc.) | ✓ |
| Multi-region balanced | Equal coverage across Middle East, Europe, Asia, Americas, Africa | |

**User's choice:** Global expansion
**Notes:** Broader scope than originally suggested

### Q2: What era range should the global historical events cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Post-WW2 to present (1945+) | Modern era focus — Cold War, decolonization, current conflicts | |
| 20th century (1900+) | Include WWI/WWII context for longer historical perspective | ✓ |
| Post-2000 only | Focus on contemporary events most relevant to current news | |

**User's choice:** 20th century (1900+)
**Notes:** Full century coverage

### Q3: Should the historical events remain in German or be bilingual?

| Option | Description | Selected |
|--------|-------------|----------|
| German only (Recommended) | Keep consistent with existing events — matches user base | |
| Bilingual DE/EN | Store both German and English, show based on user language setting | ✓ |

**User's choice:** Bilingual DE/EN
**Notes:** More work but supports language preference

---

## Map Clustering Behavior

### Q1: How should we handle the low density issue (B6)?

| Option | Description | Selected |
|--------|-------------|----------|
| Improve location extraction (Recommended) | Enhance AI extraction to geocode more events from article text | ✓ |
| Fallback to source country | Events without specific location use news source's country as fallback | |
| Accept current behavior | Only show events with explicit location data — quality over quantity | |

**User's choice:** Improve location extraction (Recommended)
**Notes:** Addresses root cause

### Q2: Should clusters show event count or aggregated severity?

| Option | Description | Selected |
|--------|-------------|----------|
| Count + severity color (current) | Keep current: number in cluster, color indicates max severity | ✓ |
| Category breakdown | Show mini pie chart or category icons inside cluster | |
| Just count | Simpler: just show event count, no severity indication until zoom | |

**User's choice:** Count + severity color (current)
**Notes:** Current behavior is good

---

## Real-time Updates

### Q1: Should the 3D Globe view also show real-time event markers?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, sync with EventMap (Recommended) | Globe shows same events as EventMap — consistent experience | ✓ |
| Globe is decorative only | Keep Globe as ambient visualization, EventMap for actual events | |
| Different data on Globe | Globe shows aggregated heatmap, EventMap shows individual markers | |

**User's choice:** Yes, sync with EventMap (Recommended)
**Notes:** None

### Q2: How should new events be indicated visually?

| Option | Description | Selected |
|--------|-------------|----------|
| Pulse animation (current) | Keep current: recent events (<30min) have pulse animation | |
| LIVE badge + pulse | Add explicit 'LIVE' text badge alongside the pulse | ✓ |
| Toast notification | Show brief toast when new critical events arrive | |

**User's choice:** LIVE badge + pulse
**Notes:** More visible indication

### Q3: Should WebSocket push be used for real-time events, or keep polling?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep polling (current) | 2-minute polling is simple and reliable — no WebSocket complexity | |
| WebSocket for critical only | Push critical/high severity events via existing Socket.IO, poll the rest | ✓ |
| Full WebSocket | All event updates pushed via WebSocket for instant updates | |

**User's choice:** Yes, hybrid approach (WebSocket for critical only)
**Notes:** User asked for recommendation; Claude suggested hybrid approach; user confirmed

---

## Claude's Discretion

- Exact historical events to include (within global scope, 1900+)
- Geocoding approach for location extraction improvement
- LIVE badge styling and positioning
- WebSocket event format for critical events
- Cluster breakpoint tuning based on testing

## Deferred Ideas

None — discussion stayed within phase scope.
