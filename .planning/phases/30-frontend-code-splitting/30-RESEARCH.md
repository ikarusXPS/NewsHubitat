# Phase 30: Frontend Code Splitting - Research

**Researched:** 2026-04-25
**Domain:** React code splitting, dynamic imports, bundle optimization
**Confidence:** HIGH

## Summary

This phase implements route-based code splitting to reduce initial JavaScript bundle size from ~800KB to under 250KB. The project already has React.lazy() in place for 14 routes in App.tsx, but Dashboard loads synchronously. Heavy dependencies (globe.gl ~2.5MB, Recharts, Leaflet) are already split via manualChunks in vite.config.ts, but component-level dynamic imports are needed for pages that use these libraries.

Key implementation areas: (1) custom lazy wrapper with retry logic and preload API per D-05, (2) Dashboard critical CSS + lazy component pattern per D-06/D-07/D-08, (3) component-level dynamic imports for GlobeView/Charts per D-10/D-11, (4) hover prefetch for nav links per D-03/D-04, (5) image lazy loading audit per D-18/D-19, (6) chunk error handling with toast and auto-retry per D-13/D-14/D-15.

**Primary recommendation:** Build a custom `lazyWithRetry()` wrapper exposing `.preload()` method, apply it to all route imports, add hover prefetch to Sidebar and BottomNav links, and audit image components for consistent loading="lazy" usage.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Keep existing Radio spinner PageLoader -- no changes needed
- **D-02:** Inline critical i18n translations (~1KB) for loading states in initial chunk
- **D-03:** Enable hover prefetch for nav links -- preload chunks when users hover
- **D-04:** Use 150ms hover delay to filter accidental hovers while feeling instant
- **D-05:** Build custom wrapper around React.lazy with retry logic and preload API
- **D-06:** Dashboard uses critical CSS inline + lazy load pattern
- **D-07:** Inline critical CSS for Dashboard shell (above-fold layout)
- **D-08:** Lazy load full Dashboard component after shell renders
- **D-09:** Critical CSS extraction tool: Claude decides based on bundle analysis
- **D-10:** Component-level dynamic imports for globe.gl and Recharts
- **D-11:** Even within Globe/Map pages, lazy-load the actual visualization component
- **D-12:** Route shell loads fast, heavy visualization loads after
- **D-13:** Show toast notification on chunk load failure
- **D-14:** Auto-retry 2-3 times before showing error UI
- **D-15:** After retries exhausted, show ErrorBoundary with retry button
- **D-16:** CI warns on bundle size >250KB but does not block PRs
- **D-17:** Team reviews warnings and decides on trade-offs
- **D-18:** Audit all image components for consistent loading="lazy" usage
- **D-19:** Fix any gaps found in audit
- **D-20:** Existing lazy loading in SignalCard, ForYouCard, ResponsiveImage is good
- **D-21:** Lighthouse 10-point improvement measured against staging baseline
- **D-22:** Compare Phase 29 staging metrics to Phase 30 staging metrics

### Claude's Discretion
- Which components beyond routes warrant splitting (based on bundle stats)
- Critical CSS extraction tool selection
- Exact retry timing and backoff strategy for chunk loading
- Custom lazy wrapper implementation details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FRON-01 | Route-based code splitting for Dashboard, Analysis, Monitor, Timeline, EventMap pages | Custom lazyWithRetry wrapper + preload API; Dashboard currently loads sync, others already lazy |
| FRON-03 | Lazy image loading enabled for article thumbnails (native loading="lazy") | Audit shows NewsCardPremium missing loading="lazy"; SignalCard, ForYouCard, ResponsiveImage already have it |
| FRON-04 | Initial JS bundle reduced to < 250KB (from ~800KB estimated) | manualChunks already splits vendors; component-level imports for heavy deps + Dashboard lazy loading needed |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Code splitting / chunk management | Build Tool (Vite/Rollup) | -- | manualChunks config determines chunk boundaries |
| Dynamic imports | Browser / Client | -- | React.lazy() + Suspense execute at runtime |
| Critical CSS extraction | Build Tool | -- | Generated at build time, inlined in HTML |
| Hover prefetch | Browser / Client | -- | Event handlers on NavLink trigger preload |
| Image lazy loading | Browser / Client | -- | Native loading="lazy" attribute on img |
| Retry logic | Browser / Client | -- | Wrapper catches import errors, retries |
| Error boundaries | Browser / Client | -- | React ErrorBoundary displays fallback UI |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 [VERIFIED: package.json] | Component framework with Suspense + lazy | Already in project; native lazy() support |
| Vite | 8.0.8 [VERIFIED: package.json] | Build tool with Rollup for production | Already configured with manualChunks |
| react-router-dom | 7.13.1 [VERIFIED: package.json] | Routing with NavLink | Built-in prefetch support not needed (custom hover) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| critters | 0.0.25 [VERIFIED: npm] | Critical CSS extraction | For Dashboard critical CSS per D-09 |
| @fatso83/retry-dynamic-import | 2.2.0 [VERIFIED: npm] | Optional: pre-built retry wrapper | If custom wrapper not preferred |
| sonner | 2.0.7 [VERIFIED: package.json] | Toast notifications | For chunk load error toasts per D-13 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| critters | rollup-plugin-critical | rollup-plugin-critical uses headless browser (slower, more accurate above-fold detection); critters is faster but inlines all used CSS |
| critters | beasties (fork) | beasties is maintained fork, same API; use if critters has issues |
| critters | Manual critical CSS | Most control, but labor-intensive; only for very specific above-fold needs |
| Custom retry wrapper | @fatso83/retry-dynamic-import | Pre-built, tested; but less control over preload API and retry timing |

**Installation:**
```bash
npm install critters --save-dev
```

**Version verification:**
- critters: 0.0.25 [VERIFIED: npm view critters version]
- @fatso83/retry-dynamic-import: 2.2.0 [VERIFIED: npm view]

## Architecture Patterns

### System Architecture Diagram

```
User Request
     |
     v
+------------------+     +--------------------+
|    index.html    |---->|  Critical CSS      |
| (inlined styles) |     | (above-fold only)  |
+------------------+     +--------------------+
     |
     v
+------------------+     +--------------------+
| react-vendor.js  |---->|  Main App Shell    |
| (React, Router)  |     | (Layout, Header)   |
+------------------+     +--------------------+
     |
     v
+------------------+  Lazy Load   +-------------------+
| Route Chunk      |<------------>| lazyWithRetry()   |
| (e.g., Analysis) |    Retry     | wrapper           |
+------------------+  on failure  +-------------------+
     |                                    |
     v                                    v
+------------------+              +-------------------+
| Component Chunk  |              | Error Boundary    |
| (GlobeView,      |              | (toast + retry)   |
| SentimentChart)  |              +-------------------+
+------------------+
     |
     v
+------------------+
| Vendor Chunks    |
| globe-vendor     |
| chart-vendor     |
| map-vendor       |
+------------------+
```

**Data Flow:**
1. Browser requests index.html with inlined critical CSS
2. react-vendor.js loads (React, Router, state libraries)
3. App shell renders immediately (Layout, Header, Sidebar skeleton)
4. Route chunk loads via lazyWithRetry() when user navigates
5. On hover (150ms delay), target chunk preloads via .preload() API
6. If chunk fails, retry 2-3 times with exponential backoff
7. After retries, show toast + ErrorBoundary with manual retry button
8. Heavy visualization components (Globe, Charts) lazy-load within route

### Recommended Project Structure
```
src/
├── utils/
│   └── lazyWithRetry.ts    # Custom lazy wrapper with retry + preload
├── components/
│   ├── ChunkErrorBoundary.tsx  # Error boundary for chunk failures
│   └── NavLinkPrefetch.tsx     # NavLink wrapper with hover prefetch
├── pages/
│   └── Dashboard.tsx           # Shell + lazy-loaded content
└── App.tsx                     # Uses lazyWithRetry for all routes
```

### Pattern 1: Custom lazyWithRetry Wrapper
**What:** Wraps React.lazy() with retry logic and exposes .preload() for hover prefetching
**When to use:** All lazy-loaded routes and components
**Example:**
```typescript
// Source: [CITED: https://medium.com/@alonmiz1234/retry-dynamic-imports-with-react-lazy-c7755a7d557a]
// Pattern adapted for preload API

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

interface LazyWithRetry<T extends ComponentType<unknown>> extends LazyExoticComponent<T> {
  preload: () => Promise<{ default: T }>;
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): LazyWithRetry<T> {
  let importPromise: Promise<{ default: T }> | null = null;

  const retryImport = async (
    retriesLeft: number,
    currentDelay: number
  ): Promise<{ default: T }> => {
    try {
      // Use cache-busting query param for retry attempts
      const timestamp = retriesLeft < retries ? `?t=${Date.now()}` : '';
      // Note: This won't work directly with importFn - need module-level handling
      return await importFn();
    } catch (error) {
      if (retriesLeft === 0) {
        throw error;
      }
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      return retryImport(retriesLeft - 1, currentDelay * 2);
    }
  };

  const load = () => {
    if (!importPromise) {
      importPromise = retryImport(retries, delay);
    }
    return importPromise;
  };

  const LazyComponent = lazy(load) as LazyWithRetry<T>;

  // Expose preload method for hover prefetching
  LazyComponent.preload = load;

  return LazyComponent;
}
```

### Pattern 2: Hover Prefetch NavLink
**What:** Wrapper around NavLink that preloads route chunk on hover after 150ms delay
**When to use:** Sidebar and BottomNav navigation links
**Example:**
```typescript
// Source: [ASSUMED] - standard React pattern

import { NavLink, type NavLinkProps } from 'react-router-dom';
import { useRef, useCallback } from 'react';
import { routePreloaders } from '../routes'; // Map of route path -> preload function

interface NavLinkPrefetchProps extends NavLinkProps {
  prefetchDelay?: number;
}

export function NavLinkPrefetch({
  to,
  prefetchDelay = 150,
  onMouseEnter,
  ...props
}: NavLinkPrefetchProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const path = typeof to === 'string' ? to : to.pathname;
    const preloader = path ? routePreloaders[path] : undefined;

    if (preloader) {
      timerRef.current = setTimeout(() => {
        preloader();
      }, prefetchDelay);
    }

    onMouseEnter?.(e);
  }, [to, prefetchDelay, onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <NavLink
      to={to}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    />
  );
}
```

### Pattern 3: Dashboard Shell + Lazy Content
**What:** Render layout shell immediately with critical CSS, lazy-load actual content
**When to use:** Dashboard (landing page) to optimize LCP
**Example:**
```typescript
// Source: [ASSUMED] - standard React pattern

import { Suspense, lazy } from 'react';

// Lazy load the actual NewsFeed content
const NewsFeedContent = lazy(() => import('../components/NewsFeed'));

export function Dashboard() {
  return (
    <div className="dashboard-shell">
      {/* Shell renders immediately with critical CSS */}
      <div className="dashboard-header">
        {/* Header placeholder or actual header */}
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <NewsFeedContent />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 rounded-lg bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}
```

### Pattern 4: ChunkErrorBoundary with Toast
**What:** Error boundary that catches chunk load errors, shows toast, and provides retry button
**When to use:** Wrap Suspense fallback or as parent of lazy components
**Example:**
```typescript
// Source: [CITED: https://dev.to/devin-rosario/fix-react-chunk-load-errors-fast-2025-guide-2j52]

import { Component, type ReactNode } from 'react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Check if it's a chunk load error
    if (
      error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module')
    ) {
      toast.error('Connection issue. Retrying...', {
        duration: 3000,
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-gray-400">Failed to load. Please try again.</p>
          <button
            onClick={this.handleRetry}
            className="btn-cyber px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Anti-Patterns to Avoid
- **Importing heavy libraries at top level:** Don't `import Globe from 'globe.gl'` in a route file; use dynamic import
- **No retry mechanism:** Chunk failures are common after deployments; always wrap with retry logic
- **Single massive vendor chunk:** Already avoided via manualChunks, but verify new deps are categorized
- **Blocking on non-critical CSS:** Dashboard should render shell immediately, not wait for full CSS
- **Retry without cache-busting:** Failed imports can be cached; use timestamp query param on retry [CITED: fatso83/retry-dynamic-import]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Critical CSS extraction | Manual CSS copy-paste | critters or rollup-plugin-critical | Extraction logic is complex; automatic updates on CSS changes |
| Import retry with caching | Simple retry loop | Pattern with cache-busting + backoff | Browser caches failed imports; naive retry won't work |
| Bundle size visualization | Manual file size checks | rollup-plugin-visualizer (already installed) | Already configured at dist/stats.html |

**Key insight:** Browser import caching is the main pitfall -- failed dynamic imports are cached, so retries must bust the cache via timestamp query params or page reload.

## Common Pitfalls

### Pitfall 1: Cached Failed Imports
**What goes wrong:** Retry logic attempts the same import, gets cached failure
**Why it happens:** Browsers cache module resolution, including failures
**How to avoid:** Use cache-busting query params on retry, or trigger page reload after N retries [CITED: github.com/fatso83/retry-dynamic-import]
**Warning signs:** Retries complete instantly without network request

### Pitfall 2: Chunk Name Hash Mismatch After Deploy
**What goes wrong:** Users have old code requesting chunks with old hashes that no longer exist
**Why it happens:** Deployment replaces chunks with new hashes; cached index.html references old ones
**How to avoid:** (1) Configure index.html with no-cache headers, (2) implement retry that triggers reload
**Warning signs:** ChunkLoadError immediately after deployment

### Pitfall 3: Critical CSS Too Large
**What goes wrong:** Inlining too much CSS increases HTML payload, hurting LCP
**Why it happens:** critters inlines ALL used CSS by default, not just above-fold
**How to avoid:** Use `data-critters-container` to mark above-fold content, keep critical CSS < 14KB [CITED: github.com/GoogleChromeLabs/critters]
**Warning signs:** index.html > 50KB, large style blocks in HTML

### Pitfall 4: Preload Triggers Too Early
**What goes wrong:** Every mouse movement triggers preloads, wasting bandwidth
**Why it happens:** No debounce/delay on hover prefetch
**How to avoid:** 150ms delay per D-04 filters accidental hovers
**Warning signs:** Network waterfall shows many cancelled chunk requests

### Pitfall 5: Route Shell Flash of Content
**What goes wrong:** Shell renders, then shifts when lazy content loads
**Why it happens:** Shell has different dimensions than final content
**How to avoid:** Use skeleton loaders that match final content dimensions
**Warning signs:** CLS (Cumulative Layout Shift) increases

## Code Examples

Verified patterns from official sources:

### Critical CSS with critters (Build-Time)
```typescript
// vite.config.ts addition
// Source: [CITED: github.com/GoogleChromeLabs/critters]
import critters from 'critters';

// Post-build script or plugin
async function inlineCriticalCSS() {
  const crittersInstance = new critters({
    path: 'dist',
    publicPath: '/',
    // Only inline CSS used by elements with this attribute
    containerId: 'data-critters-container',
    // Don't inline fonts
    inlineFonts: false,
    // Preload non-critical CSS
    preload: 'swap',
  });

  const html = await fs.readFile('dist/index.html', 'utf8');
  const inlined = await crittersInstance.process(html);
  await fs.writeFile('dist/index.html', inlined);
}
```

### Route Map with Preloaders
```typescript
// src/routes.ts
// Source: [ASSUMED] - standard React pattern

import { lazyWithRetry } from './utils/lazyWithRetry';

export const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
export const Analysis = lazyWithRetry(() => import('./pages/Analysis').then(m => ({ default: m.Analysis })));
export const Monitor = lazyWithRetry(() => import('./pages/Monitor').then(m => ({ default: m.Monitor })));
export const Timeline = lazyWithRetry(() => import('./pages/Timeline').then(m => ({ default: m.Timeline })));
export const EventMap = lazyWithRetry(() => import('./pages/EventMap').then(m => ({ default: m.EventMap })));
export const Globe = lazyWithRetry(() => import('./pages/Globe').then(m => ({ default: m.Globe })));

// Preloader map for hover prefetch
export const routePreloaders: Record<string, () => void> = {
  '/': () => Dashboard.preload(),
  '/analysis': () => Analysis.preload(),
  '/monitor': () => Monitor.preload(),
  '/timeline': () => Timeline.preload(),
  '/events': () => EventMap.preload(),
  '/globe': () => Globe.preload(),
};
```

### Inline Critical i18n Translations
```typescript
// src/i18n/criticalStrings.ts
// Source: [ASSUMED] - per D-02

// ~1KB of critical loading state translations
// Loaded synchronously in initial bundle
export const CRITICAL_I18N = {
  en: {
    loading: 'Loading...',
    retrying: 'Retrying...',
    failed: 'Failed to load. Tap to retry.',
  },
  de: {
    loading: 'Laden...',
    retrying: 'Wird erneut versucht...',
    failed: 'Laden fehlgeschlagen. Tippen zum Wiederholen.',
  },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| webpack code splitting | Vite/Rollup code splitting | Vite 2.0+ (2021) | Faster builds, ESM-native |
| React.lazy without retry | lazyWithRetry pattern | Common since 2022 | 92% fewer blank screens [CITED: monterail.com] |
| CSS-in-JS for critical CSS | critters + static extraction | critters 0.0.20+ (2022) | Faster LCP, no FOUC |
| Manual chunk configuration | manualChunks function | Rollup 2.0+ | Automatic vendor splitting |

**Deprecated/outdated:**
- `react-loadable`: Replaced by React.lazy + Suspense (React 16.6+)
- `@loadable/component`: Still works, but React.lazy is now sufficient for most cases
- CSS code splitting in `<style>` tags via JS: Vite extracts CSS to files automatically

## Image Lazy Loading Audit

### Components Using `loading="lazy"` (GOOD - D-20)
| Component | Location | Implementation |
|-----------|----------|----------------|
| SignalCard | src/components/SignalCard.tsx:148,152,284 | `loading="lazy"` on img tags |
| ForYouCard | src/components/ForYouCard.tsx:64 | `loading="lazy"` on img |
| ResponsiveImage | src/components/ResponsiveImage.tsx:117 | Conditional `loading={priority ? 'eager' : 'lazy'}` |

### Components MISSING `loading="lazy"` (D-18/D-19 FIX NEEDED)
| Component | Location | Issue | Fix |
|-----------|----------|-------|-----|
| NewsCardPremium | src/components/NewsCardPremium.tsx:190 | `<motion.img>` has no loading attribute | Add `loading="lazy"` |

### Components Using ResponsiveImage (Already Handled)
| Component | Uses ResponsiveImage |
|-----------|---------------------|
| NewsCard | Yes - line 177-182 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 150ms hover delay is optimal for filtering accidental hovers | Pattern 2: Hover Prefetch | Minor UX impact - can adjust based on testing |
| A2 | critters is better than rollup-plugin-critical for this project | Standard Stack | Medium - rollup-plugin-critical may give better above-fold accuracy |
| A3 | Dashboard shell + lazy content pattern will improve LCP | Pattern 3 | High if Dashboard content is actually small enough to load sync |

## Open Questions

1. **Exact retry timing**
   - What we know: 2-3 retries with exponential backoff is standard
   - What's unclear: Initial delay (500ms vs 1000ms) and max backoff
   - Recommendation: Start with 1000ms, 2000ms, 4000ms (3 retries)

2. **Critical CSS tool selection (Claude's discretion per D-09)**
   - What we know: critters is fast but may inline too much; rollup-plugin-critical is more accurate but slower
   - What's unclear: Actual bundle stats for Dashboard
   - Recommendation: Use critters with `data-critters-container` to limit scope; if critical CSS > 14KB, consider manual extraction

3. **Which additional components to split (Claude's discretion)**
   - What we know: GlobeView and Charts already split; Monitor.tsx already uses lazy() for GlobeView
   - What's unclear: Whether FramingComparison, BiasRadarChart, etc. in Analysis warrant splitting
   - Recommendation: Check Phase 29 bundle stats; split if component contributes > 50KB to chunk

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| critters | Critical CSS extraction | Install needed | 0.0.25 | Manual extraction or rollup-plugin-critical |
| rollup-plugin-visualizer | Bundle analysis | Yes | 7.0.1 | -- |
| sonner | Toast notifications | Yes | 2.0.7 | -- |
| Vite | Build tool | Yes | 8.0.8 | -- |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- critters (needs install) - can use manual critical CSS if needed

## Sources

### Primary (HIGH confidence)
- [VERIFIED: package.json] - Current project dependencies and versions
- [VERIFIED: npm registry] - critters 0.0.25, @fatso83/retry-dynamic-import 2.2.0
- [VERIFIED: src/App.tsx] - Current lazy() usage pattern for 14 routes
- [VERIFIED: vite.config.ts] - manualChunks configuration already in place

### Secondary (MEDIUM confidence)
- [CITED: github.com/GoogleChromeLabs/critters] - Critical CSS extraction documentation
- [CITED: medium.com/@alonmiz1234/retry-dynamic-imports-with-react-lazy] - Retry pattern
- [CITED: dev.to/devin-rosario/fix-react-chunk-load-errors-fast-2025-guide] - ChunkLoadError handling
- [CITED: github.com/fatso83/retry-dynamic-import] - Browser caching of failed imports

### Tertiary (LOW confidence)
- WebSearch results for "React Router prefetch" - React Router v7 has limited built-in prefetch; custom implementation needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - critters well-documented, project deps verified
- Architecture: HIGH - patterns well-established in React ecosystem
- Pitfalls: HIGH - browser caching issue well-documented in multiple sources

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days - stable patterns)
