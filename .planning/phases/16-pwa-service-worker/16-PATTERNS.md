# Phase 16: PWA / Service Worker - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 9 files (3 new, 6 modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `public/offline.html` | static-page | fallback | `src/components/OfflineBanner.tsx` | design-match |
| `src/components/InstallPromptBanner.tsx` | component | event-driven | `src/components/VerificationBanner.tsx` | exact |
| `src/hooks/useServiceWorker.ts` | hook | event-driven | `src/hooks/useBackendStatus.ts` | role-match |
| `src/hooks/useInstallPrompt.ts` | hook | event-driven | `src/hooks/useKeyboardShortcuts.ts` | role-match |
| `src/services/syncService.ts` | service | queue-replay | `src/services/cacheService.ts` | exact |
| `src/components/CacheAgeBadge.tsx` | component | display | `src/components/CacheIndicator.tsx` | exact |
| `vite.config.ts` | config | build | `vite.config.ts` (extend) | self |
| `src/components/Layout.tsx` | component | layout | `src/components/Layout.tsx` (extend) | self |
| `src/main.tsx` | bootstrap | initialization | `src/main.tsx` (extend) | self |

## Pattern Assignments

### `public/offline.html` (static-page, fallback)

**Analog:** `src/components/OfflineBanner.tsx`

**Design aesthetic** (lines 1-55):
```tsx
// NewsHub cyber aesthetic colors and fonts
// Background: #0a0e1a (dark cyber)
// Accent: #00f0ff (cyan)
// Alert: #ff0044 (red)
// Fonts: 'JetBrains Mono' (headers/mono), 'Inter' (body)

// Example from OfflineBanner.tsx:
<div className="bg-gradient-to-r from-[#ff0044]/20 via-[#ff0044]/10 to-[#ff0044]/20 backdrop-blur-sm">
  <div className="flex items-center gap-3">
    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#ff0044]/20 border border-[#ff0044]/40">
      <WifiOff className="h-4 w-4 text-[#ff0044]" />
    </div>
    <span className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
      Backend Offline
    </span>
  </div>
</div>
```

**Button pattern with animation** (lines 39-48):
```tsx
<button
  onClick={retry}
  disabled={isChecking}
  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff0044]/20 border border-[#ff0044]/40 text-white hover:bg-[#ff0044]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
  <span className="text-xs font-mono uppercase tracking-wider">
    {isChecking ? 'Checking...' : 'Retry'}
  </span>
</button>
```

**Layout structure** (lines 16-50):
```tsx
// Framer Motion animation + glass panel aesthetic
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.3 }}
  className="overflow-hidden border-b border-[#ff0044]/30"
>
  {/* Gradient background with backdrop blur */}
  <div className="bg-gradient-to-r from-[#ff0044]/20 via-[#ff0044]/10 to-[#ff0044]/20 backdrop-blur-sm">
    {/* Content */}
  </div>
</motion.div>
```

---

### `src/components/InstallPromptBanner.tsx` (component, event-driven)

**Analog:** `src/components/VerificationBanner.tsx`

**Imports pattern** (lines 1-12):
```tsx
import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
```

**State management pattern** (lines 37-72):
```tsx
export function VerificationBanner() {
  const { user, isLoading, isVerified, resendVerification } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendResult, setResendResult] = useState<'success' | 'rate-limited' | null>(null);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  // Don't show while loading, if not logged in, if verified, or if dismissed
  if (isLoading || !user || isVerified || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    setResendResult(null);

    try {
      const result = await resendVerification();

      if (result.rateLimited) {
        setResendResult('rate-limited');
        setMinutesRemaining(result.minutesRemaining ?? null);
      } else if (result.success) {
        setResendResult('success');
      }
    } catch {
      // Silently fail - user can try again
    } finally {
      setIsResending(false);
    }
  };
```

**Framer Motion animation wrapper** (lines 74-87):
```tsx
<AnimatePresence>
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    className={cn(
      'border-b',
      urgencyLevel === 'critical' && 'border-red-500/30',
      urgencyLevel === 'high' && 'border-orange-500/30',
      urgencyLevel === 'medium' && 'border-yellow-500/30',
      urgencyLevel === 'low' && 'border-cyan-500/30',
    )}
    style={{ backgroundColor: `${urgencyColor}10` }}
  >
```

**Banner layout structure** (lines 88-150):
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
    {/* Left: Icon + Message */}
    <div className="flex items-center gap-3">
      <Mail className="h-5 w-5 shrink-0" style={{ color: urgencyColor }} />
      <div className="text-sm">
        <span className="text-white font-mono">
          Verify your email to unlock all features
        </span>
      </div>
    </div>

    {/* Right: Action Button + Dismiss */}
    <div className="flex items-center gap-3">
      <button
        onClick={handleResend}
        disabled={isResending}
        className={cn(
          'px-4 py-1.5 rounded text-sm font-mono font-semibold transition-colors',
          isResending
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'text-black hover:opacity-90'
        )}
        style={{ backgroundColor: isResending ? undefined : urgencyColor }}
      >
        {isResending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sending...
          </span>
        ) : (
          'Resend Email'
        )}
      </button>

      <button
        onClick={() => setIsDismissed(true)}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>
</div>
```

**Conditional rendering with loading states** (lines 109-140):
```tsx
{resendResult === 'success' ? (
  <span className="text-sm text-green-400 font-mono">
    Email sent!
  </span>
) : resendResult === 'rate-limited' ? (
  <span className="text-sm text-yellow-400 font-mono">
    Try again in {minutesRemaining}m
  </span>
) : (
  <button>...</button>
)}
```

---

### `src/hooks/useServiceWorker.ts` (hook, event-driven)

**Analog:** `src/hooks/useBackendStatus.ts`

**Imports pattern** (lines 1-2):
```typescript
import { useState, useEffect, useCallback } from 'react';
```

**State interface pattern** (lines 3-8):
```typescript
interface BackendStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  error: string | null;
}
```

**Hook structure with state and async check** (lines 13-59):
```typescript
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(HEALTH_ENDPOINT, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setStatus({
          isOnline: true,
          isChecking: false,
          lastCheck: new Date(),
          error: null,
        });
      } else {
        setStatus({
          isOnline: false,
          isChecking: false,
          lastCheck: new Date(),
          error: `Backend returned ${response.status}`,
        });
      }
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
```

**Initial check on mount** (lines 61-65):
```typescript
// Initial check on mount
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Health check on mount is standard pattern
  checkHealth();
}, [checkHealth]);
```

**Periodic interval pattern** (lines 67-71):
```typescript
// Periodic health checks
useEffect(() => {
  const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
  return () => clearInterval(interval);
}, [checkHealth]);
```

**Return value pattern** (lines 73-77):
```typescript
return {
  ...status,
  retry: checkHealth,
};
```

---

### `src/hooks/useInstallPrompt.ts` (hook, event-driven)

**Analog:** `src/hooks/useKeyboardShortcuts.ts`

**Imports pattern** (lines 1-2):
```typescript
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
```

**Event handler with useCallback** (lines 19-151):
```typescript
const handleKeyDown = useCallback(
  (event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to close modals even when in input
      if (event.key !== 'Escape') {
        return;
      }
    }

    // Don't trigger if disabled
    if (!enabled) return;

    // Prevent triggering when using modifier keys for other purposes
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

    switch (event.key) {
      case '1':
        if (!hasModifier) {
          event.preventDefault();
          navigate('/');
        }
        break;
      // ... more cases
    }
  },
  [navigate, enabled, options]
);
```

**Event listener registration** (lines 153-156):
```typescript
useEffect(() => {
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [handleKeyDown]);
```

**Browser API event pattern with type guard**:
```typescript
// Type guard for browser API events
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const handleBeforeInstall = (e: Event) => {
  e.preventDefault();
  const promptEvent = e as BeforeInstallPromptEvent;
  // ... use promptEvent
};

window.addEventListener('beforeinstallprompt', handleBeforeInstall);
```

---

### `src/services/syncService.ts` (service, queue-replay)

**Analog:** `src/services/cacheService.ts`

**Imports pattern** (lines 1-1):
```typescript
import type { NewsArticle } from '../types';
```

**Service constants** (lines 3-6):
```typescript
const DB_NAME = 'newshub-cache';
const DB_VERSION = 1;
const ARTICLE_STORE = 'articles';
const METADATA_STORE = 'metadata';
```

**Interface definitions** (lines 8-12):
```typescript
interface CacheMetadata {
  key: string;
  timestamp: number;
  expiresAt: number;
}
```

**Singleton service class** (lines 14-180):
```typescript
class CacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Articles store
        if (!db.objectStoreNames.contains(ARTICLE_STORE)) {
          db.createObjectStore(ARTICLE_STORE, { keyPath: 'id' });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metaStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
          metaStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }
```

**IndexedDB write pattern** (lines 50-75):
```typescript
async setArticles(key: string, articles: NewsArticle[], ttlMs: number = 5 * 60 * 1000): Promise<void> {
  await this.init();
  if (!this.db) throw new Error('Database not initialized');

  const transaction = this.db.transaction([ARTICLE_STORE, METADATA_STORE], 'readwrite');
  const articleStore = transaction.objectStore(ARTICLE_STORE);
  const metaStore = transaction.objectStore(METADATA_STORE);

  // Store articles
  for (const article of articles) {
    articleStore.put(article);
  }

  // Store metadata
  const metadata: CacheMetadata = {
    key,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };
  metaStore.put(metadata);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
```

**IndexedDB read pattern** (lines 77-100):
```typescript
async getArticles(key: string): Promise<NewsArticle[] | null> {
  await this.init();
  if (!this.db) return null;

  // Check metadata first
  const metadata = await this.getMetadata(key);
  if (!metadata) return null;

  // Check if expired
  if (Date.now() > metadata.expiresAt) {
    await this.delete(key);
    return null;
  }

  // Get all articles
  const transaction = this.db.transaction([ARTICLE_STORE], 'readonly');
  const articleStore = transaction.objectStore(ARTICLE_STORE);
  const request = articleStore.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

**IndexedDB cursor pattern for cleanup** (lines 129-151):
```typescript
async clearExpired(): Promise<void> {
  await this.init();
  if (!this.db) return;

  const now = Date.now();
  const transaction = this.db.transaction([METADATA_STORE], 'readwrite');
  const metaStore = transaction.objectStore(METADATA_STORE);
  const index = metaStore.index('expiresAt');
  const request = index.openCursor(IDBKeyRange.upperBound(now));

  request.onsuccess = (event) => {
    const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
```

**Singleton export pattern** (lines 180-180):
```typescript
export const cacheService = new CacheService();
```

---

### `src/components/CacheAgeBadge.tsx` (component, display)

**Analog:** `src/components/CacheIndicator.tsx`

**Imports pattern** (lines 1-2):
```tsx
import { Database, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
```

**Component props interface** (lines 4-8):
```tsx
interface CacheIndicatorProps {
  isFromCache: boolean;
  cacheAge: number | null;
  className?: string;
}
```

**Utility function for formatting** (lines 10-21):
```tsx
function formatCacheAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return 'Just now';
}
```

**Early return pattern** (lines 23-24):
```tsx
export function CacheIndicator({ isFromCache, cacheAge, className }: CacheIndicatorProps) {
  if (!isFromCache) return null;
```

**Badge layout with icons** (lines 26-52):
```tsx
return (
  <div
    className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      'bg-[#ffcc00]/10 border border-[#ffcc00]/30',
      'backdrop-blur-sm',
      className
    )}
  >
    <Database className="h-4 w-4 text-[#ffcc00]" />
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-[#ffcc00] uppercase tracking-wider">
        Cached Data
      </span>
      {cacheAge !== null && (
        <>
          <span className="text-gray-600">•</span>
          <div className="flex items-center gap-1 text-xs font-mono text-gray-400">
            <Clock className="h-3 w-3" />
            {formatCacheAge(cacheAge)}
          </div>
        </>
      )}
    </div>
  </div>
);
```

---

### `vite.config.ts` (config, build)

**Analog:** `vite.config.ts` (self — extend existing)

**VitePWA plugin configuration** (lines 24-97):
```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'robots.txt'],
  manifest: {
    name: 'NewsHub - Multi-Perspective News',
    short_name: 'NewsHub',
    description: 'Multi-perspective global news analysis platform',
    theme_color: '#0a0e1a',
    background_color: '#0a0e1a',
    display: 'standalone',
    icons: [
      {
        src: '/pwa-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/pwa-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/pwa-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  },
  workbox: {
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
    runtimeCaching: [
      {
        // Static assets - CacheFirst
        urlPattern: /\.(js|css|woff2?|ttf|otf|eot)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        // Images - CacheFirst with expiration
        urlPattern: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
      {
        // API routes - NetworkFirst with fallback
        urlPattern: /^\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 5, // 5 minutes
          },
        },
      },
    ],
  },
})
```

**Extension points for Phase 16**:
```typescript
// Add to includeAssets array:
includeAssets: ['favicon.ico', 'robots.txt', 'offline.html'],

// Add to workbox config:
workbox: {
  navigateFallback: '/offline.html',
  navigateFallbackDenylist: [/^\/api/],  // Don't intercept API calls
  // ... existing runtimeCaching
}
```

---

### `src/components/Layout.tsx` (component, layout)

**Analog:** `src/components/Layout.tsx` (self — extend existing)

**Imports pattern** (lines 1-10):
```tsx
import { useRef, useState, useCallback, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { ReadingProgressBar } from './ReadingProgressBar';
import { OfflineBanner } from './OfflineBanner';
import { BreakingNewsTicker } from './BreakingNewsTicker';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
```

**Banner placement pattern** (lines 47-50):
```tsx
<div className="flex flex-1 flex-col overflow-hidden relative z-10">
  <Header onMenuClick={() => setSidebarOpen(true)} />
  <BreakingNewsTicker />
  <OfflineBanner />
  {/* Add InstallPromptBanner here */}
```

**Component integration pattern**:
```tsx
// At top level imports:
import { InstallPromptBanner } from './InstallPromptBanner';

// In JSX after existing banners:
<Header onMenuClick={() => setSidebarOpen(true)} />
<BreakingNewsTicker />
<OfflineBanner />
<InstallPromptBanner />
<main ref={mainRef} className="flex-1 overflow-y-auto p-6 relative">
```

---

### `src/main.tsx` (bootstrap, initialization)

**Analog:** `src/main.tsx` (self — extend existing)

**Current bootstrap pattern** (lines 1-10):
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Extension point for SW registration**:
```typescript
// Add after imports, before createRoot
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('workbox-window').then(({ Workbox }) => {
    const wb = new Workbox('/sw.js');

    wb.addEventListener('waiting', () => {
      if (confirm('New version available! Reload to update?')) {
        wb.messageSkipWaiting();
        window.location.reload();
      }
    });

    wb.register();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## Shared Patterns

### Framer Motion Animations
**Source:** `src/components/OfflineBanner.tsx` (lines 1, 9-15)
**Apply to:** InstallPromptBanner, any dismissible UI components

```tsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {showBanner && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Content */}
    </motion.div>
  )}
</AnimatePresence>
```

### LocalStorage Persistence
**Source:** `src/store/index.ts` (line 93-94 — zustand persist middleware)
**Apply to:** Install prompt dismissal tracking, engagement counters

```typescript
// Zustand pattern (for store state):
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({ /* state and actions */ }),
    {
      name: 'newshub-storage',
    }
  )
);

// Direct localStorage pattern (for non-store data):
const visitCount = Number(localStorage.getItem('visitCount') || 0) + 1;
localStorage.setItem('visitCount', String(visitCount));

const lastDismissed = localStorage.getItem('installPromptDismissed');
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
if (!lastDismissed || Number(lastDismissed) < sevenDaysAgo) {
  // Show banner
}
```

### Conditional Rendering with Early Returns
**Source:** `src/components/CacheIndicator.tsx` (lines 23-24), `src/components/VerificationBanner.tsx` (lines 44-47)
**Apply to:** All display components with visibility conditions

```tsx
export function ComponentName({ prop }: Props) {
  // Early returns for invisible states
  if (!prop) return null;
  if (condition) return null;

  // Main render
  return (
    <div>...</div>
  );
}
```

### Error Handling in Async Functions
**Source:** `src/hooks/useBackendStatus.ts` (lines 50-57)
**Apply to:** All service worker and sync queue operations

```typescript
try {
  // Async operation
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  // Handle error with typed message
}
```

### Button Disabled State Pattern
**Source:** `src/components/OfflineBanner.tsx` (lines 39-48)
**Apply to:** Install prompt action buttons, sync queue retry buttons

```tsx
<button
  onClick={handleAction}
  disabled={isLoading}
  className={cn(
    'px-4 py-2 rounded transition-colors',
    isLoading
      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
      : 'bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30'
  )}
>
  {isLoading ? (
    <span className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading...
    </span>
  ) : (
    'Action'
  )}
</button>
```

### Feature Detection Pattern
**Source:** RESEARCH.md Pattern 2 (lines 189-192)
**Apply to:** Background Sync API, Service Worker registration

```typescript
// Check feature availability before using
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Use Service Worker
}

if ('sync' in ServiceWorkerRegistration.prototype) {
  // Use Background Sync
} else {
  // Fallback to polling
}
```

---

## No Analog Found

All files have close analogs in the codebase. No greenfield patterns required.

---

## Notes

### Bookmark/History Sync Endpoints Missing
**Finding:** Grep search for bookmark/history POST endpoints returned no results.
**Implication:** Backend endpoints `/api/bookmarks` and `/api/history` do not exist yet.
**Recommendation:** Create these endpoints as part of Phase 16, or make sync queue client-only (localStorage sync without backend persistence). Store already tracks `bookmarkedArticles` and `readingHistory` in localStorage via Zustand persist middleware.

### Engagement Tracking
**Finding:** No existing analytics or visit tracking found in codebase.
**Recommendation:** Use simple localStorage counters for install prompt engagement threshold (3+ visits or 5+ articles read). Pattern:
```typescript
const visitCount = Number(localStorage.getItem('visitCount') || 0) + 1;
localStorage.setItem('visitCount', String(visitCount));

const articlesRead = Number(localStorage.getItem('articlesRead') || 0);
```

### Safari Background Sync Fallback
**Finding:** Background Sync API is Chromium-only (40%+ users on Safari).
**Recommendation:** Implement polling fallback using `window.addEventListener('online')` event. Pattern from RESEARCH.md lines 199-203.

### Offline.html Cache Count
**Finding:** RESEARCH.md example (lines 582-591) shows cache count via Cache API.
**Pattern:**
```javascript
if ('caches' in window) {
  caches.open('api-cache').then(cache => {
    cache.keys().then(keys => {
      const count = keys.filter(req => req.url.includes('/api/news')).length;
      document.getElementById('cache-info').textContent =
        count > 0 ? `${count} articles available offline` : 'No cached articles';
    });
  });
}
```

---

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`, `src/services/`, `vite.config.ts`, `src/main.tsx`
**Files scanned:** 80+ components, 10+ hooks, 1 service, 2 config files
**Pattern extraction date:** 2026-04-22
