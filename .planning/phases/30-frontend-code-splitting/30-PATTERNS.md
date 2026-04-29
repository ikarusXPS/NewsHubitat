# Phase 30: Frontend Code Splitting - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 11 new/modified files
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/lazyWithRetry.ts` | utility | transform | `src/utils/mapCentering.ts` | role-match |
| `src/components/ChunkErrorBoundary.tsx` | component | event-driven | `src/components/ErrorBoundary.tsx` | exact |
| `src/components/NavLinkPrefetch.tsx` | component | event-driven | `src/components/mobile/BottomNav.tsx` | exact |
| `src/routes.ts` | config | request-response | `src/App.tsx` (lazy imports) | exact |
| `src/i18n/criticalStrings.ts` | config | static | `src/i18n/i18n.ts` | role-match |
| `src/App.tsx` (modify) | route-config | request-response | self | exact |
| `src/pages/Dashboard.tsx` (modify) | page | request-response | `src/pages/Monitor.tsx` | exact |
| `src/components/NewsCardPremium.tsx` (modify) | component | render | `src/components/SignalCard.tsx` | exact |
| `vite.config.ts` (modify) | config | build-time | self | exact |
| `src/components/Sidebar.tsx` (modify) | component | event-driven | self | exact |
| `src/components/mobile/BottomNav.tsx` (modify) | component | event-driven | self | exact |

## Pattern Assignments

### `src/utils/lazyWithRetry.ts` (utility, transform)

**Analog:** `src/utils/mapCentering.ts`

**Imports pattern** (lines 1-4):
```typescript
import type { PerspectiveRegion } from '../types';
import type { MapCenter } from '../types/focus';
import { REGION_GEO_METADATA } from '../config/regionMetadata';
```
Note: Use same import style - types first, then imports. For lazyWithRetry, import from React:
```typescript
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
```

**JSDoc pattern** (lines 6-13):
```typescript
/**
 * Calculate optimal map center and zoom for selected regions
 *
 * Algorithm:
 * - Single region: use region's center
 * - Multiple regions: calculate bounding box midpoint
 * - Empty: global view
 * - Zoom: based on geographic span
 */
```
Apply same JSDoc style to lazyWithRetry documenting the retry algorithm.

**Export pattern** (lines 14-43):
```typescript
export function calculateOptimalMapView(
  selectedRegions: PerspectiveRegion[]
): MapCenter {
  // Implementation
}
```
Export named function with typed parameters and return type.

---

### `src/components/ChunkErrorBoundary.tsx` (component, event-driven)

**Analog:** `src/components/ErrorBoundary.tsx`

**Imports pattern** (lines 1-4):
```typescript
import { Component, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
```
For ChunkErrorBoundary, replace Sentry with toast from sonner:
```typescript
import { Component, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertCircle, RefreshCw, Wifi } from 'lucide-react';
```

**Interface pattern** (lines 6-14):
```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}
```

**Class component pattern** (lines 16-52):
```typescript
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    // Report to Sentry
    Sentry.captureReactException(error, errorInfo);
    this.setState({
      error,
      errorInfo: errorInfo.componentStack || error.stack || null,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };
```

**Error UI pattern** (lines 60-125):
```typescript
return (
  <div className="flex min-h-screen items-center justify-center bg-gray-950 p-8">
    <div className="max-w-2xl w-full">
      <div className="glass-panel rounded-xl p-8 border-2 border-[#ff0044]/30">
        {/* Error Icon */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            <AlertCircle className="h-12 w-12 text-[#ff0044]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-mono text-[#ff0044]">
              RENDER ERROR
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-1">
              A critical error occurred while rendering this component
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={this.handleReset}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#ff0044] hover:bg-[#cc0036] text-white font-mono rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            RELOAD PAGE
          </button>
        </div>
      </div>
    </div>
  </div>
);
```

---

### `src/components/NavLinkPrefetch.tsx` (component, event-driven)

**Analog:** `src/components/mobile/BottomNav.tsx`

**Imports pattern** (lines 1-16):
```typescript
import { useMemo, useState, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
```

**Event handler with ref pattern** (lines 48-49, 84-97):
```typescript
// Double-tap detection for Dashboard
const lastTapRef = useRef<number>(0);

// Handle nav item click with haptic feedback and double-tap detection
const handleNavClick = useCallback((to: string, e: React.MouseEvent) => {
  lightTap();

  // Double-tap Dashboard to scroll to top (D-08)
  if (to === '/' && location.pathname === '/') {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      successPattern();
    }
    lastTapRef.current = now;
  }
}, [lightTap, successPattern, location.pathname]);
```

For NavLinkPrefetch, adapt this to 150ms hover delay:
```typescript
const timerRef = useRef<NodeJS.Timeout | null>(null);

const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
  timerRef.current = setTimeout(() => {
    // preload logic
  }, prefetchDelay);
  onMouseEnter?.(e);
}, [prefetchDelay, onMouseEnter]);

const handleMouseLeave = useCallback(() => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}, []);
```

**NavLink wrapper pattern** (lines 117-172):
```typescript
<NavLink
  key={item.to}
  to={item.to}
  onClick={(e) => handleNavClick(item.to, e)}
  className={cn(
    'flex flex-col items-center justify-center',
    'min-w-[44px] min-h-[44px] py-1.5 px-2 rounded-lg',
    'transition-colors touch-target',
    isActive
      ? 'text-[#00f0ff]'
      : 'text-gray-400 hover:text-gray-300'
  )}
>
```

---

### `src/routes.ts` (config, request-response)

**Analog:** `src/App.tsx` (lines 47-72)

**Lazy import pattern**:
```typescript
// Lazy load heavy pages
const Analysis = lazy(() => import('./pages/Analysis').then(m => ({ default: m.Analysis })));
const Timeline = lazy(() => import('./pages/Timeline').then(m => ({ default: m.Timeline })));
const MapView = lazy(() => import('./pages/MapView').then(m => ({ default: m.MapView })));
const Globe = lazy(() => import('./pages/Globe').then(m => ({ default: m.Globe })));
const Monitor = lazy(() => import('./pages/Monitor').then(m => ({ default: m.Monitor })));
const Bookmarks = lazy(() => import('./pages/Bookmarks').then(m => ({ default: m.Bookmarks })));
const ReadingHistory = lazy(() => import('./pages/ReadingHistory').then(m => ({ default: m.ReadingHistory })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const EventMap = lazy(() => import('./pages/EventMap').then(m => ({ default: m.EventMap })));
const Community = lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Article = lazy(() => import('./pages/Article').then(m => ({ default: m.Article })));

// Auth pages (public - no auth required)
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Legal pages
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));

// Team pages
const TeamDashboard = lazy(() => import('./pages/TeamDashboard').then(m => ({ default: m.TeamDashboard })));
const TeamInviteAccept = lazy(() => import('./pages/TeamInviteAccept').then(m => ({ default: m.TeamInviteAccept })));
```

Replace `lazy()` with `lazyWithRetry()` and export preloaders map:
```typescript
import { lazyWithRetry } from './utils/lazyWithRetry';

export const Dashboard = lazyWithRetry(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
export const Analysis = lazyWithRetry(() => import('./pages/Analysis').then(m => ({ default: m.Analysis })));
// ... etc

export const routePreloaders: Record<string, () => void> = {
  '/': () => Dashboard.preload(),
  '/analysis': () => Analysis.preload(),
  '/monitor': () => Monitor.preload(),
  // ... etc
};
```

---

### `src/i18n/criticalStrings.ts` (config, static)

**Analog:** `src/i18n/i18n.ts`

**Module structure pattern** (lines 1-6):
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { useAppStore } from '../store';
```

For criticalStrings.ts, keep it minimal with no external imports (loaded sync):
```typescript
// Critical i18n strings loaded synchronously (~1KB)
// Used for loading states before i18n backend loads

export const CRITICAL_I18N = {
  en: {
    loading: 'Loading...',
    retrying: 'Retrying...',
    failed: 'Failed to load. Tap to retry.',
    connectionIssue: 'Connection issue. Retrying...',
  },
  de: {
    loading: 'Laden...',
    retrying: 'Wird erneut versucht...',
    failed: 'Laden fehlgeschlagen. Tippen zum Wiederholen.',
    connectionIssue: 'Verbindungsproblem. Wird erneut versucht...',
  },
} as const;

export type CriticalLang = keyof typeof CRITICAL_I18N;
```

---

### `src/pages/Dashboard.tsx` (modify: page, request-response)

**Analog:** `src/pages/Monitor.tsx` (lines 21-24, 358-416)

**Lazy load heavy components pattern** (lines 21-24):
```typescript
// Lazy load heavy components
import { lazy, Suspense } from 'react';
const GlobeView = lazy(() => import('../components/GlobeView').then(m => ({ default: m.GlobeView })));
const EventsMapEmbed = lazy(() => import('../components/EventsMapEmbed').then(m => ({ default: m.EventsMapEmbed })));
```

**Suspense with fallback pattern** (lines 369-386):
```typescript
<Suspense
  fallback={
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Globe2 className="h-12 w-12 text-[#00f0ff] animate-pulse mx-auto mb-4" />
        <p className="text-sm font-mono text-gray-500">Loading 3D Globe...</p>
      </div>
    </div>
  }
>
  <GlobeView
    points={filteredEvents}
    isLoading={isLoading}
    focusEventId={focusEventId}
    onPointClick={(event) => setFocusEventId(event.id)}
  />
</Suspense>
```

For Dashboard, apply shell + lazy content pattern:
```typescript
import { Suspense, lazy } from 'react';

const NewsFeedContent = lazy(() => import('../components/NewsFeed').then(m => ({ default: m.NewsFeed })));

export function Dashboard() {
  return (
    <div className="dashboard-shell">
      {/* Shell renders immediately */}
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

---

### `src/components/NewsCardPremium.tsx` (modify: component, render)

**Analog:** `src/components/SignalCard.tsx` (lines 148-162)

**Image lazy loading pattern** (lines 148-162):
```typescript
<img
  src={article.imageUrl}
  alt={article.title}
  loading="lazy"
  decoding="async"
  className={cn(
    'h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
    imageLoading ? 'opacity-0' : 'opacity-100'
  )}
  onLoad={() => setImageLoading(false)}
  onError={() => {
    setImageError(true);
    setImageLoading(false);
  }}
/>
```

For NewsCardPremium, add `loading="lazy"` to the motion.img (line 190):
```typescript
<motion.img
  src={article.imageUrl}
  alt=""
  loading="lazy"           // ADD THIS
  decoding="async"         // ADD THIS
  onError={() => setImageError(true)}
  className="h-full w-full object-cover"
  animate={{ scale: isHovered ? 1.05 : 1 }}
  transition={{ duration: 0.5 }}
/>
```

**Additional: ForYouCard pattern** (lines 63-66):
```typescript
<img
  src={article.imageUrl}
  alt=""
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
  loading="lazy"
/>
```

**Additional: ResponsiveImage pattern** (lines 117):
```typescript
loading={priority ? 'eager' : 'lazy'}
```

---

### `vite.config.ts` (modify: config, build-time)

**Analog:** Self (current config)

**Plugin array pattern** (lines 10-129):
```typescript
plugins: [
  react(),
  tailwindcss(),
  // Gzip compression for production builds
  viteCompression({...}),
  // Brotli compression
  viteCompression({...}),
  // PWA with Service Worker
  VitePWA({...}),
  // Sentry plugin (conditional)
  ...(process.env.SENTRY_AUTH_TOKEN ? [...] : []),
  // Bundle visualizer
  visualizer({...}) as PluginOption,
],
```

Add critters for critical CSS extraction after build:
```typescript
// Post-build critters can be added via custom plugin or npm script
// Example custom plugin:
{
  name: 'critters-inline',
  apply: 'build',
  closeBundle: async () => {
    const critters = await import('critters');
    const crittersInstance = new critters.default({
      path: 'dist',
      publicPath: '/',
      inlineFonts: false,
      preload: 'swap',
    });
    // Process index.html
  }
}
```

**manualChunks pattern** (lines 148-175):
```typescript
manualChunks(id: string) {
  if (id.includes('node_modules')) {
    if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('/react/')) {
      return 'react-vendor';
    }
    if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
      return 'state-vendor';
    }
    if (id.includes('lucide-react')) {
      return 'ui-vendor';
    }
    if (id.includes('framer-motion')) {
      return 'animation-vendor';
    }
    if (id.includes('leaflet') || id.includes('react-leaflet')) {
      return 'map-vendor';
    }
    if (id.includes('globe.gl') || id.includes('three')) {
      return 'globe-vendor';
    }
    if (id.includes('recharts')) {
      return 'chart-vendor';
    }
    if (id.includes('cmdk') || id.includes('@radix-ui/react-dialog')) {
      return 'cmdk-vendor';
    }
  }
},
```

---

### `src/components/Sidebar.tsx` (modify: component, event-driven)

**Analog:** Self (lines 208-239)

**NavLink pattern** (lines 208-239):
```typescript
{navItems.map((item) => (
  <NavLink
    key={item.to}
    to={item.to}
    className={({ isActive }) =>
      cn(
        'sidebar-link rounded-lg',
        isActive && 'active'
      )
    }
  >
    <item.icon className="h-4 w-4" />
    <span className="flex-1">{item.label}</span>
    {/* badges... */}
  </NavLink>
))}
```

Replace with NavLinkPrefetch:
```typescript
import { NavLinkPrefetch } from './NavLinkPrefetch';

{navItems.map((item) => (
  <NavLinkPrefetch
    key={item.to}
    to={item.to}
    className={({ isActive }) =>
      cn(
        'sidebar-link rounded-lg',
        isActive && 'active'
      )
    }
  >
    {/* same children */}
  </NavLinkPrefetch>
))}
```

---

### `src/components/mobile/BottomNav.tsx` (modify: component, event-driven)

**Analog:** Self (lines 117-172)

Same NavLink pattern as Sidebar. Replace with NavLinkPrefetch for mobile prefetch on touch.

---

## Shared Patterns

### Authentication
**Source:** Not applicable (no auth changes in this phase)

### Error Handling
**Source:** `src/components/ErrorBoundary.tsx`
**Apply to:** ChunkErrorBoundary.tsx, App.tsx Suspense boundaries
```typescript
// Check if it's a chunk load error
if (
  error.name === 'ChunkLoadError' ||
  error.message.includes('Loading chunk') ||
  error.message.includes('Failed to fetch dynamically imported module')
) {
  toast.error('Connection issue. Retrying...', { duration: 3000 });
}
```

### Toast Notifications
**Source:** `src/components/Toast.tsx`, project uses `sonner` (2.0.7)
**Apply to:** ChunkErrorBoundary for chunk load errors
```typescript
import { toast } from 'sonner';

// Error toast pattern
toast.error('Connection issue. Retrying...', {
  duration: 3000,
});
```

### Loading Fallback
**Source:** `src/App.tsx` (lines 74-90)
**Apply to:** All Suspense boundaries
```typescript
function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block">
          <Radio className="h-10 w-10 text-[#00f0ff]" />
          <div className="absolute inset-0 animate-ping">
            <Radio className="h-10 w-10 text-[#00f0ff] opacity-30" />
          </div>
        </div>
        <p className="mt-4 text-sm font-mono text-[#00f0ff]/50 uppercase tracking-widest">
          Loading...
        </p>
      </div>
    </div>
  );
}
```

### Image Lazy Loading
**Source:** `src/components/SignalCard.tsx` (lines 148-152)
**Apply to:** NewsCardPremium.tsx, any img tags missing loading="lazy"
```typescript
loading="lazy"
decoding="async"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None | -- | -- | All files have analogs in the codebase |

---

## Metadata

**Analog search scope:** `src/`, `vite.config.ts`
**Files scanned:** 25+
**Pattern extraction date:** 2026-04-25

---

## Summary

Key patterns identified:

1. **Lazy import pattern:** All routes use `lazy(() => import('./pages/X').then(m => ({ default: m.X })))` - replace with `lazyWithRetry()` wrapper
2. **Error boundary pattern:** Class component with `getDerivedStateFromError`, `componentDidCatch`, and handleReset - extend for chunk errors
3. **NavLink with event handlers:** Use `useCallback` + `useRef` for hover delay/timing - adapt for prefetch
4. **Image lazy loading:** `loading="lazy" decoding="async"` - apply to NewsCardPremium
5. **Suspense fallback:** PageLoader with Radio icon animation - reuse for all lazy routes
6. **Toast notifications:** sonner `toast.error()` - use for chunk load errors
