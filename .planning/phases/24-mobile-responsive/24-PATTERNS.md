# Phase 24: Mobile Responsive - Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 18 (7 new + 11 modified)
**Analogs found:** 18 / 18

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/mobile/BottomNav.tsx` | component | UI-only | `src/components/Sidebar.tsx` | role-match |
| `src/components/mobile/MobileDrawer.tsx` | component | UI-only | `src/components/Sidebar.tsx` | exact |
| `src/components/ResponsiveImage.tsx` | component | request-response | `src/components/NewsCard.tsx` | role-match |
| `src/components/mobile/SwipeableCard.tsx` | component | UI-only | `src/components/ForYouCarousel.tsx` | role-match |
| `src/components/mobile/PullToRefresh.tsx` | component | UI-only | `src/components/InfiniteScroll.tsx` | role-match |
| `src/components/mobile/ScrollToTopFAB.tsx` | component | UI-only | `src/components/OfflineBanner.tsx` | role-match |
| `src/components/mobile/MobileEventMap.tsx` | component | request-response | `src/pages/EventMap.tsx` | exact |
| `src/components/Layout.tsx` | component | UI-only | (self - modification) | exact |
| `src/components/Header.tsx` | component | UI-only | (self - modification) | exact |
| `src/components/Sidebar.tsx` | component | UI-only | (self - modification) | exact |
| `src/components/NewsCard.tsx` | component | UI-only | (self - modification) | exact |
| `src/components/HeroSection.tsx` | component | UI-only | (self - modification) | exact |
| `src/components/SettingsModal.tsx` | component | UI-only | (self - modification) | exact |
| `src/components/AuthModal.tsx` | component | UI-only | (self - modification) | exact |
| `src/hooks/useScrollDirection.ts` | hook | UI-only | `src/hooks/useBackendStatus.ts` | role-match |
| `src/hooks/useHapticFeedback.ts` | hook | UI-only | `src/hooks/useKeyboardShortcuts.ts` | role-match |
| `src/hooks/useSafeArea.ts` | hook | UI-only | `src/hooks/useBackendStatus.ts` | role-match |
| `src/lib/cloudinary.ts` | utility | transform | `src/lib/utils.ts` | role-match |

## Pattern Assignments

### `src/components/mobile/BottomNav.tsx` (component, UI-only)

**Analog:** `src/components/Sidebar.tsx`

**Imports pattern** (lines 1-23):
```typescript
import { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Bookmark,
  Clock,
  Cpu,
  Globe2,
  History,
  MapPin,
  Radio,
  Settings,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
```

**Navigation structure** (lines 78-87):
```typescript
const navItems = useMemo(() => [
  { to: '/', icon: Activity, label: t('navigation.dashboard'), badge: 'live' as const },
  { to: '/monitor', icon: Globe2, label: t('navigation.monitor'), badge: null },
  { to: '/events', icon: MapPin, label: t('navigation.events'), badge: 'events' as const },
  { to: '/community', icon: Users, label: t('navigation.community'), badge: 'new' as const },
  { to: '/analysis', icon: BarChart3, label: t('navigation.analysis') },
  { to: '/timeline', icon: Clock, label: t('navigation.timeline') },
  { to: '/history', icon: History, label: t('navigation.history') },
  { to: '/bookmarks', icon: Bookmark, label: t('navigation.bookmarks') },
], [t]);
```

**NavLink active state** (lines 212-222):
```typescript
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
```

**Event badge pattern** (lines 235-240):
```typescript
{item.badge === 'events' && eventStats && eventStats.total > 0 && (
  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#bf00ff]/20 text-[#bf00ff] border border-[#bf00ff]/30 flex items-center gap-1">
    <Cpu className="h-2.5 w-2.5" />
    {eventStats.total}
  </span>
)}
```

**Framer Motion animation** (lines 114-119):
```typescript
<motion.aside
  initial={false}
  animate={{
    x: isOpen ? 0 : -280,
  }}
  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
```

**Cyber aesthetic classes** (line 120-124):
```typescript
className={cn(
  'sidebar-cyber flex w-64 flex-col relative z-50',
  'fixed lg:relative inset-y-0 left-0',
  'lg:translate-x-0'
)}
```

---

### `src/components/mobile/MobileDrawer.tsx` (component, UI-only)

**Analog:** `src/components/Sidebar.tsx`

**Same as BottomNav above** - MobileDrawer is a refactored version of Sidebar for mobile. Use the entire Sidebar.tsx structure as reference, including:
- Backdrop pattern (lines 99-111)
- Slide-in animation (lines 114-125)
- Navigation items structure (lines 78-242)
- User info section at bottom (lines 246-306)
- Event stats panel (lines 154-206)

**Key difference:** Remove event stats panel per D-27, keep only navigation + user info.

---

### `src/components/ResponsiveImage.tsx` (component, request-response)

**Analog:** `src/components/NewsCard.tsx`

**Image loading pattern** (lines 155-173):
```typescript
{localArticle.imageUrl && (
  <div className="relative -mx-4 -mt-4 mb-4 h-40 overflow-hidden rounded-t-lg bg-gray-900">
    <img
      src={localArticle.imageUrl}
      alt={localArticle.title}
      loading="lazy"
      className={cn(
        'h-full w-full object-cover transition-opacity duration-300',
        imageError ? 'opacity-60' : 'opacity-100'
      )}
      onError={handleImageError}
    />
    {imageError && (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
        <ImageOff className="h-8 w-8 text-gray-600" />
      </div>
    )}
  </div>
)}
```

**Error handling state** (lines 43-51):
```typescript
const [imageError, setImageError] = useState(false);

// Handle image load error - swap to placeholder
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const target = e.currentTarget;
  target.onerror = null; // Prevent infinite loop if placeholder also fails
  target.src = PLACEHOLDER_IMAGE;
  setImageError(true);
};
```

**Placeholder constant** (lines 8-9):
```typescript
// Base64 SVG placeholder for failed images
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMjAwIDEyMCI+PHJlY3QgZmlsbD0iIzFmMjkzNyIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjAiLz48ZyBmaWxsPSIjNGI1NTYzIj48cmVjdCB4PSI4NSIgeT0iMzUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIyNSIgcng9IjIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI3MCIgcj0iMTUiLz48cGF0aCBkPSJNNzUgODVoNTBsLTEwLTIwLTEwIDEwLTEwLTUtMjAgMTV6Ii8+PC9nPjwvc3ZnPg==';
```

**Lazy loading with IntersectionObserver** - Use `react-intersection-observer`:
```typescript
import { useInView } from 'react-intersection-observer';

const { ref, inView } = useInView({
  triggerOnce: true,
  threshold: 0.1,
  skip: priority, // Skip observer for priority images
});
```
Reference: `src/components/InfiniteScroll.tsx` lines 20-23.

---

### `src/components/mobile/SwipeableCard.tsx` (component, UI-only)

**Analog:** `src/components/ForYouCarousel.tsx`

**Framer Motion drag gestures** - From RESEARCH.md Pattern 3, but verify with existing carousel:

**Horizontal scroll container** (lines 89-99):
```typescript
<div
  className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4"
  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
>
  {recommendations.map(({ article, matchedTopic }) => (
    <div key={article.id} className="snap-start flex-none w-[280px]">
      <ForYouCard article={article} matchedTopic={matchedTopic} />
    </div>
  ))}
</div>
```

**Motion values** - Use Framer Motion's `useMotionValue` and `useTransform`:
```typescript
import { motion, useMotionValue, useTransform } from 'framer-motion';

const x = useMotionValue(0);
const opacity = useTransform(x, [0, 100], [0, 1]);
```

**Drag constraints** - From RESEARCH.md:
```typescript
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 150 }}
  dragElastic={0.2}
  style={{ x }}
  onDragEnd={(_, info) => {
    if (info.offset.x > 80 && !isBookmarked) {
      onBookmark();
      navigator.vibrate?.(10); // Haptic feedback
    }
    x.set(0); // Snap back
  }}
>
```

---

### `src/components/mobile/PullToRefresh.tsx` (component, UI-only)

**Analog:** `src/components/InfiniteScroll.tsx`

**IntersectionObserver pattern** (lines 20-28):
```typescript
const { ref, inView } = useInView({
  threshold: 0,
  rootMargin: '100px',
});

useEffect(() => {
  if (inView && hasMore && !isLoading) {
    onLoadMore();
  }
}, [inView, hasMore, isLoading, onLoadMore]);
```

**Loading state UI** (lines 36-46):
```typescript
<div ref={ref} className="py-8">
  {isLoading && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-3"
    >
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm text-gray-400">Lade weitere Artikel...</p>
    </motion.div>
  )}
```

**Completion state** (lines 48-59):
```typescript
{!hasMore && !isLoading && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center"
  >
    <div className="inline-flex items-center gap-2 rounded-full bg-gray-800/50 px-4 py-2 text-sm text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Alle Artikel geladen
    </div>
  </motion.div>
)}
```

**Custom indicator** - Use Radio icon (matches logo) from CONTEXT.md Specific Ideas:
```typescript
import { Radio } from 'lucide-react';

<Radio className="h-6 w-6 text-[#00f0ff] animate-spin" />
```

---

### `src/components/mobile/ScrollToTopFAB.tsx` (component, UI-only)

**Analog:** `src/components/OfflineBanner.tsx` (conditional rendering) and `src/components/Sidebar.tsx` (Framer Motion)

**Conditional rendering based on state**:
```typescript
const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
  const handleScroll = () => {
    setIsVisible(window.scrollY > 500); // D-32: 500px threshold
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

**AnimatePresence for mount/unmount** (from Sidebar lines 100-111):
```typescript
<AnimatePresence>
  {isVisible && (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-[72px] right-4 z-40 glass-panel p-3 rounded-full"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ArrowUp className="h-5 w-5 text-[#00f0ff]" />
    </motion.button>
  )}
</AnimatePresence>
```

**Glass panel styling** - Reuse existing cyber aesthetic:
```css
className="glass-panel rounded-full p-3 border border-[#00f0ff]/20 shadow-lg shadow-[#00f0ff]/10"
```

---

### `src/components/mobile/MobileEventMap.tsx` (component, request-response)

**Analog:** `src/pages/EventMap.tsx`

**Copy entire EventMap structure** but adapt for mobile:
- Replace 3D globe with 2D Leaflet map only (D-46)
- Add bottom sheet UI for event list (collapsible)
- Keep same `useQuery` pattern with `['geo-events']` key

**Key patterns to extract:**
- Query configuration with staleTime and refetchInterval
- Event data transformation
- Map marker rendering
- Event severity color coding

Reference the full EventMap.tsx file as the primary pattern source.

---

### `src/components/Layout.tsx` (modification)

**Analog:** (self)

**Current structure** (lines 17-94):
```typescript
export function Layout({ children }: LayoutProps) {
  const mainRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Background layers */}
      <div className="app-background" />
      <div className="grid-pattern" />
      <div className="scan-line" />

      <ReadingProgressBar containerRef={mainRef} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <BreakingNewsTicker />
        <OfflineBanner />
        <InstallPromptBanner />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </main>
      </div>

      <CommandPalette />
      <KeyboardShortcutsHelp ... />
      <Toaster position="bottom-right" ... />
    </div>
  );
}
```

**Modification needed:**
1. Add conditional rendering for BottomNav vs Sidebar based on `md:` breakpoint
2. Adjust Toaster position: `bottom-right` on desktop, `top-center` on mobile (D-29)
3. Update main padding from `p-6` to `p-4 md:p-6` (D-41)
4. Hide CommandPalette on mobile (D-22)

**Responsive pattern:**
```typescript
{/* Sidebar - desktop only */}
<div className="hidden md:block">
  <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
</div>

{/* Mobile Drawer */}
<MobileDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

{/* Bottom Nav - mobile only */}
<div className="md:hidden">
  <BottomNav />
</div>
```

---

### `src/components/Header.tsx` (modification)

**Analog:** (self)

**Current hamburger button** (lines 45-52):
```typescript
<button
  onClick={onMenuClick}
  className="lg:hidden p-2 hover:bg-white/5 rounded-md transition-colors"
  aria-label="Open menu"
>
  <Menu className="h-5 w-5 text-[#00f0ff]" />
</button>
```

**Modification needed:**
1. Change `lg:hidden` to `md:hidden` throughout (D-10)
2. Collapse search to icon on mobile, expand on tap (D-19)
3. Hide FocusSelector, FeedManagerButton, LanguageSwitcher on mobile (move to drawer) (D-20)

**Responsive controls pattern:**
```typescript
{/* Desktop controls - hidden on mobile */}
<div className="hidden md:flex items-center gap-3">
  <FeedManagerButton />
  <FocusSelector />
  <LanguageSwitcher />
</div>
```

---

### `src/components/Sidebar.tsx` (modification)

**Analog:** (self)

**Current backdrop** (lines 100-111):
```typescript
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
    />
  )}
</AnimatePresence>
```

**Modification needed:**
1. Change all `lg:` breakpoints to `md:` (lines 108, 122-124, 146)
2. This component becomes desktop-only; MobileDrawer is the mobile equivalent

---

### `src/components/NewsCard.tsx` (modification)

**Analog:** (self)

**Current image rendering** (lines 155-173) - already shown above in ResponsiveImage pattern.

**Modification needed:**
1. Replace direct `<img>` with `<ResponsiveImage>` component
2. Pass `priority={index < 3}` for first 3 cards (D-77, D-78)
3. Add swipe gesture wrapper on mobile using SwipeableCard

**Responsive card actions** (D-55):
```typescript
{/* Desktop: show all actions */}
<div className="hidden md:flex items-center gap-2">
  <button>Analyze</button>
  <button>Translate</button>
  <a>Original</a>
</div>

{/* Mobile: show bookmark, hide others in menu */}
<div className="md:hidden flex items-center gap-2">
  <button>Bookmark</button>
  <button>...</button> {/* Menu for analyze/translate */}
  <a>Original</a>
</div>
```

---

### `src/components/HeroSection.tsx` (modification)

**Analog:** (self)

**Current stats grid** (lines 110-142):
```typescript
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.5, delay: 0.1 }}
  className="grid grid-cols-2 md:grid-cols-4 gap-2"
>
  <StatBox ... />
  <StatBox ... />
  <StatBox ... />
  <StatBox ... />
</motion.div>
```

**Current markets panel** (lines 146-178) - scrolling ticker:
```typescript
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.2 }}
  className="mt-3 pt-2 border-t border-[rgba(0,240,255,0.1)] items-center gap-3 overflow-hidden hidden md:flex"
>
```

**Modification needed:**
1. Stats grid already responsive (2x2 on mobile, 4 cols on desktop) - no change needed
2. Markets panel already hidden on mobile (`hidden md:flex`) - matches D-42
3. Change `lg:` in flex-row to `md:` (line 79)

---

### `src/components/SettingsModal.tsx` (modification)

**Analog:** (self)

**Current modal container** (lines 66-74):
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 20 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
  className="fixed inset-4 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8"
>
  <div className="relative w-full max-w-2xl">
```

**Modification needed:**
1. Full-screen on mobile (D-56)
2. Add safe area insets (D-28)

**Responsive modal pattern:**
```typescript
className={cn(
  "fixed z-50 overflow-y-auto",
  "inset-0 md:inset-4", // Full-screen mobile, overlay desktop
  "flex items-start justify-center",
  "pt-[var(--safe-area-top)] pb-[var(--safe-area-bottom)]", // Safe areas mobile
  "md:pt-8 md:pb-8" // Regular padding desktop
)}
```

---

### `src/components/AuthModal.tsx` (modification)

**Analog:** (self)

**Current modal** (lines 68-77):
```typescript
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
  <div className="relative w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-xl">
```

**Modification needed:**
1. Full-screen on mobile, overlay on desktop (D-56)
2. Add safe area insets

**Same pattern as SettingsModal above.**

---

### `src/hooks/useScrollDirection.ts` (hook, UI-only)

**Analog:** `src/hooks/useBackendStatus.ts`

**Hook structure pattern** (lines 13-77):
```typescript
export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>({
    isOnline: true,
    isChecking: false,
    lastCheck: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    // Logic here
  }, []);

  // Initial check on mount
  useEffect(() => {
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

**Event listener pattern** - Reference RESEARCH.md Pattern 1 for scroll detection:
```typescript
useEffect(() => {
  let lastScrollY = window.scrollY;

  const updateScrollDirection = () => {
    const scrollY = window.scrollY;
    const direction = scrollY > lastScrollY ? 'down' : 'up';

    if (Math.abs(scrollY - lastScrollY) > 10) { // Threshold: 10px
      setScrollDirection(direction);
    }

    lastScrollY = scrollY;
  };

  window.addEventListener('scroll', updateScrollDirection, { passive: true });
  return () => window.removeEventListener('scroll', updateScrollDirection);
}, []);
```

---

### `src/hooks/useHapticFeedback.ts` (hook, UI-only)

**Analog:** `src/hooks/useKeyboardShortcuts.ts`

**Hook return pattern** (lines 160-184):
```typescript
export function getShortcutGroups() {
  return {
    navigation: [ ... ],
    actions: [ ... ],
    feed: [ ... ],
  };
}
```

**Feature detection pattern** - From RESEARCH.md Code Examples:
```typescript
export function useHapticFeedback() {
  const lightTap = () => {
    // Check API availability (iOS Safari doesn't support)
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 10ms vibration
    }
  };

  const mediumTap = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  };

  const successPattern = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]); // Pattern: vibrate-pause-vibrate
    }
  };

  return { lightTap, mediumTap, successPattern };
}
```

---

### `src/hooks/useSafeArea.ts` (hook, UI-only)

**Analog:** `src/hooks/useBackendStatus.ts`

**State management pattern** - Same as useBackendStatus (shown above)

**CSS variable reading** - No existing analog, use standard pattern:
```typescript
export function useSafeArea() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-top') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-right') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-bottom') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-left') || '0'),
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}
```

---

### `src/lib/cloudinary.ts` (utility, transform)

**Analog:** `src/lib/utils.ts`

**Utility function pattern** - From RESEARCH.md Pattern 2:
```typescript
export function buildCloudinaryUrl(
  originalUrl: string,
  width: number,
  format: 'avif' | 'webp' | 'jpg' = 'jpg'
): string {
  // Cloudinary fetch URL pattern
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return originalUrl; // Fallback to original if no Cloudinary

  return `https://res.cloudinary.com/${cloudName}/image/fetch/f_${format},q_auto,w_${width}/${encodeURIComponent(originalUrl)}`;
}
```

**Error handling** - Graceful fallback if env var missing (same pattern as above).

---

## Shared Patterns

### Framer Motion Animations
**Source:** `src/components/Sidebar.tsx` (lines 114-119), `src/components/HeroSection.tsx` (lines 110-142)
**Apply to:** BottomNav, MobileDrawer, SwipeableCard, ScrollToTopFAB

```typescript
import { motion, AnimatePresence } from 'framer-motion';

// Slide-in animation
<motion.div
  initial={false}
  animate={{ x: isOpen ? 0 : -280 }}
  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
>

// Fade-in animation
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// Mount/unmount with AnimatePresence
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
  )}
</AnimatePresence>
```

### Cyber Aesthetic Styling
**Source:** `src/components/Sidebar.tsx`, `src/components/HeroSection.tsx`
**Apply to:** All new mobile components

```css
/* Glass panel effect */
className="glass-panel rounded-xl border border-[#00f0ff]/20"

/* Stat box */
className="stat-box" style={{ borderColor: `${color}20` }}

/* Text glow */
style={{ color: '#00f0ff', textShadow: '0 0 15px #00f0ff' }}

/* Live indicator */
<div className="live-indicator">
  <span className="live-dot" />
  <span>Live</span>
</div>
```

### IntersectionObserver for Lazy Loading
**Source:** `src/components/InfiniteScroll.tsx` (lines 20-28)
**Apply to:** ResponsiveImage, PullToRefresh

```typescript
import { useInView } from 'react-intersection-observer';

const { ref, inView } = useInView({
  triggerOnce: true,
  threshold: 0.1,
  skip: priority, // Skip observer for priority images
});

useEffect(() => {
  if (inView && shouldLoad) {
    loadContent();
  }
}, [inView, shouldLoad]);
```

### Responsive Breakpoint Migration (lg: → md:)
**Source:** All components with `lg:` classes
**Apply to:** All modified components

**Files requiring migration:**
- `src/components/Sidebar.tsx` (lines 108, 122-124, 146)
- `src/components/Header.tsx` (line 48, controls section)
- `src/components/HeroSection.tsx` (line 79)
- All page components (14 files total from Grep results)

**Pattern:**
```typescript
// BEFORE
className="lg:hidden"
className="lg:flex"
className="lg:grid-cols-3"

// AFTER
className="md:hidden"
className="md:flex"
className="md:grid-cols-3"
```

### Safe Area Insets
**Source:** RESEARCH.md Pattern 4
**Apply to:** Layout, BottomNav, ScrollToTopFAB, SettingsModal, AuthModal

```css
/* Add to src/index.css */
:root {
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-right: env(safe-area-inset-right);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);
  --bottom-nav-height: calc(56px + var(--safe-area-bottom));
}

/* Component usage */
className="pb-[var(--safe-area-bottom)]"
style={{ bottom: 'calc(var(--bottom-nav-height) + 16px)' }}
```

### Touch-Action CSS
**Source:** RESEARCH.md (D-71)
**Apply to:** All interactive elements on mobile

```css
/* Add to interactive elements */
.touch-interactive {
  touch-action: manipulation; /* Eliminate 300ms delay */
  -webkit-tap-highlight-color: transparent;
}

/* Prevent overscroll bounce */
body {
  overscroll-behavior: contain; /* D-72 */
}
```

---

## No Analog Found

**None** - All files have clear analogs in the existing codebase.

---

## Metadata

**Analog search scope:**
- `src/components/**/*.tsx` (73 files)
- `src/hooks/**/*.ts` (13 files)
- `src/pages/**/*.tsx` (10 files)

**Files scanned:** 96 total
**Pattern extraction date:** 2026-04-24

**Key findings:**
1. Sidebar.tsx is the primary analog for both BottomNav and MobileDrawer (navigation structure, icons, badges, animations)
2. NewsCard.tsx provides complete image loading pattern (error handling, placeholders, lazy loading)
3. InfiniteScroll.tsx demonstrates IntersectionObserver usage for lazy loading
4. HeroSection.tsx and Sidebar.tsx show Framer Motion animation patterns
5. All cyber aesthetic classes (glass-panel, stat-box, live-indicator) already established
6. 17 files require `lg:` → `md:` breakpoint migration

**Critical patterns to preserve:**
- Framer Motion spring animations (damping: 25, stiffness: 200)
- Cyber color palette (#00f0ff cyan, #ff0044 red, #00ff88 green, #bf00ff purple)
- Glass panel aesthetic with translucent backgrounds
- Event badge styling with count display
- NavLink active state with 'active' class
- i18n with useTranslation hook
- Safe area insets for notched devices
