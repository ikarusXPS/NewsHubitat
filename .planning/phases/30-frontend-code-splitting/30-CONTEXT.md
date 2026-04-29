# Phase 30: Frontend Code Splitting - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users experience faster initial page loads through reduced JavaScript bundle. This phase implements FRON-01, FRON-03, FRON-04 from v1.5 requirements.

**Delivers:**
- Route-based code splitting for Dashboard, Analysis, Monitor, Timeline, EventMap pages
- Native lazy loading for all article thumbnails (audit and fix gaps)
- Initial JavaScript bundle under 250KB
- Heavy dependencies (globe.gl, Recharts) load only when route is accessed
- Lighthouse Performance score improvement of at least 10 points

**Principle:** Build on Phase 29 measurement foundation — use bundle stats to guide splitting decisions.

</domain>

<decisions>
## Implementation Decisions

### Loading Indicators
- **D-01:** Keep existing Radio spinner PageLoader — no changes needed
- **D-02:** Inline critical i18n translations (~1KB) for loading states ("Loading...", "Laden...", "Chargement...", etc.) in initial chunk

### Route Prefetching
- **D-03:** Enable hover prefetch for nav links — preload chunks when users hover
- **D-04:** Use 150ms hover delay to filter accidental hovers while feeling instant
- **D-05:** Build custom wrapper around React.lazy with retry logic and preload API

### Dashboard Strategy
- **D-06:** Dashboard uses critical CSS inline + lazy load pattern
- **D-07:** Inline critical CSS for Dashboard shell (above-fold layout)
- **D-08:** Lazy load full Dashboard component after shell renders
- **D-09:** Critical CSS extraction tool: Claude decides based on bundle analysis (critters vs vite-plugin-critical vs manual)

### Heavy Dependencies
- **D-10:** Component-level dynamic imports for globe.gl and Recharts
- **D-11:** Even within Globe/Map pages, lazy-load the actual visualization component
- **D-12:** Route shell loads fast, heavy visualization loads after

### Error Handling
- **D-13:** Show toast notification on chunk load failure
- **D-14:** Auto-retry 2-3 times before showing error UI
- **D-15:** After retries exhausted, show ErrorBoundary with retry button

### Bundle Threshold
- **D-16:** CI warns on bundle size >250KB but does not block PRs
- **D-17:** Team reviews warnings and decides on trade-offs

### Image Lazy Loading
- **D-18:** Audit all image components for consistent loading="lazy" usage
- **D-19:** Fix any gaps found in audit (NewsCard, NewsCardPremium, etc.)
- **D-20:** Existing lazy loading in SignalCard, ForYouCard, ResponsiveImage is good

### Measurement
- **D-21:** Lighthouse 10-point improvement measured against staging baseline
- **D-22:** Compare Phase 29 staging metrics to Phase 30 staging metrics

### Claude's Discretion
- Which components beyond routes warrant splitting (based on bundle stats)
- Critical CSS extraction tool selection
- Exact retry timing and backoff strategy for chunk loading
- Custom lazy wrapper implementation details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Decisions
- `.planning/phases/29-measurement-foundation/29-CONTEXT.md` — Bundle visualizer setup, Lighthouse CI thresholds
- `.planning/phases/23-i18n-foundation/23-CONTEXT.md` — i18n setup with react-i18next, namespace loading
- `.planning/phases/24-mobile-responsive/24-CONTEXT.md` — Mobile-first patterns, md: breakpoint

### Existing Code
- `src/App.tsx` — Current lazy() usage for routes, PageLoader component
- `vite.config.ts` — manualChunks configuration, visualizer plugin
- `src/components/ResponsiveImage.tsx` — Priority loading pattern (fetchpriority)
- `src/components/SignalCard.tsx` — Image lazy loading pattern
- `src/i18n/i18n.ts` — i18n initialization

### Requirements
- `.planning/REQUIREMENTS.md` — FRON-01, FRON-03, FRON-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PageLoader` component in App.tsx: Radio spinner with "Loading..." text
- `React.lazy()` already used for 14 routes (Analysis, Timeline, Monitor, etc.)
- `manualChunks` in vite.config.ts: react-vendor, state-vendor, ui-vendor, map-vendor, globe-vendor, chart-vendor
- `ResponsiveImage.tsx`: Has priority prop for eager/lazy and fetchpriority hints
- `ErrorBoundary` component: Can be extended for chunk loading errors

### Established Patterns
- Lazy import pattern: `lazy(() => import('./pages/X').then(m => ({ default: m.X })))`
- Suspense fallback: `<Suspense fallback={<PageLoader />}>`
- Environment gating: `import.meta.env.DEV` / `import.meta.env.PROD`
- Toast notifications via existing toast system

### Integration Points
- `src/App.tsx`: Add custom lazy wrapper, modify Dashboard import
- `vite.config.ts`: May need adjustments for critical CSS extraction
- `src/components/Layout.tsx` or nav links: Add prefetch on hover
- `src/i18n/locales/*/common.json`: Add loading state translations

</code_context>

<specifics>
## Specific Ideas

- Custom lazy wrapper should expose `.preload()` method for hover prefetching
- Toast for chunk errors: "Connection issue. Retrying..." with subtle styling
- Critical i18n strings: "Loading...", "Retrying...", "Failed to load. Tap to retry."
- Dashboard shell should show header, sidebar outline, main content placeholder
- 150ms hover delay matches common UX patterns (similar to tooltip delays)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-frontend-code-splitting*
*Context gathered: 2026-04-25*
