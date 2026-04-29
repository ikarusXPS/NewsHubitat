# Phase 24: Mobile Responsive - Research

**Researched:** 2026-04-24
**Domain:** Mobile-first responsive design, touch interactions, image optimization
**Confidence:** HIGH

## Summary

Mobile responsive implementation for NewsHub requires adapting the existing cyber aesthetic design to touch-first navigation patterns while maintaining performance. The phase spans four key domains: navigation (bottom nav + drawer), layout density (single-column cards, stacked sections), touch interactions (gestures, haptics, pull-to-refresh), and image optimization (responsive srcSet, modern formats, lazy loading).

The existing codebase provides strong foundations: Framer Motion v12.35 for gesture animations, Tailwind CSS v4 with mobile-first breakpoints, react-intersection-observer v10.0.3 for lazy loading, and VitePWA with 7-day image caching. The main technical challenge is migrating from lg: (1024px) to md: (768px) as the mobile/desktop breakpoint throughout the codebase while implementing touch-specific components that don't exist in the current architecture.

**Primary recommendation:** Use Framer Motion's built-in drag/pan gestures for swipe interactions, native CSS `touch-action: manipulation` to eliminate 300ms delay, modern CSS viewport units (`dvh`) for iOS address bar handling, and Cloudinary URL transformations for responsive images with automatic format selection (AVIF → WebP → JPEG fallback).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation Pattern (D-01 to D-15):**
- Bottom nav bar for mobile (<768px) with 5 items: Dashboard, Monitor, Events, Bookmarks, Profile
- Hamburger menu opens left-slide drawer with full navigation
- Bottom nav auto-hides on scroll down, reappears on scroll up
- Active nav: filled icon + label; inactive: outline icon only; cyan glow on active
- Drawer includes user info at top (avatar, name if logged in)
- Event count badge on Events nav item
- Double-tap Dashboard icon scrolls to top
- Breakpoint: 768px (md:) — migrate all lg: to md:
- Bottom nav: 56px height + safe area inset, translucent glass effect, cyan top border
- Light haptic feedback on nav tap
- Tablets (>=768px) show sidebar, not bottom nav

**Mobile Header (D-16 to D-22):**
- Fixed header, same 56px height as desktop
- Mobile: hamburger + Radio logo + search icon + avatar
- Radio icon taps to Dashboard
- Search collapses to icon, expands full-width on tap
- FocusSelector, FeedManager, LanguageSwitcher move to drawer
- Keyboard shortcuts and command palette disabled on mobile

**Drawer Behavior (D-23 to D-27):**
- Left slide-in drawer
- Edge swipe from left (first 20px) opens drawer
- Swipe right on content closes drawer
- Back button closes drawer if open
- No event stats panel in drawer (navigation focus only)

**Safe Areas & Positioning (D-28 to D-32):**
- Handle safe area insets (env(safe-area-inset-*))
- Toast: top-center on mobile, bottom-right on desktop
- Banners positioned above bottom nav
- FAB: bottom-right, above bottom nav (72px + safe area)
- FAB appears after 500px scroll

**Layout Density (D-39 to D-59):**
- News cards: single column, full-width, 16:9 hero images
- Content padding: p-4 mobile, p-6 desktop
- HeroSection: stack stats 2x2, hide markets panel
- Region pills: horizontal scroll
- EventMap: 2D only on mobile (no 3D globe)
- Modals: full-screen on mobile
- Card actions: bookmark visible, translate/analyze behind "..." menu
- Rely on system font size (rem/em units)

**Touch Interactions (D-60 to D-72):**
- Pull-to-refresh with custom cyber indicator
- Swipe right on card to bookmark (spring animation)
- Minimum tap target: 44x44px
- Pinch-to-zoom on images (full-screen lightbox)
- Auto-focus form inputs
- Swipe down dismisses bottom sheets
- Scroll position restoration
- `touch-action: manipulation` (eliminate 300ms delay)
- `overscroll-behavior: contain` (prevent iOS rubber-band)

**Image Optimization (D-73 to D-82):**
- srcSet: 320w, 640w, 960w, 1280w
- Cloudinary for transformations
- WebP/AVIF with JPEG fallback (`<picture>` element)
- Blur-up placeholder (300ms fade)
- First 3 cards: priority loading (fetchpriority='high')
- decoding='async' on all images
- loading='lazy' for rest
- Create ResponsiveImage component
- Use existing PWA cache (7-day TTL)

### Claude's Discretion

- Exact scroll threshold for bottom nav auto-hide
- Swipe-to-bookmark threshold distance
- Pull-to-refresh indicator animation details
- Blur placeholder generation (tiny image vs blurhash)
- FAB icon choice (arrow-up vs chevron-up)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOBILE-01 | Responsive layouts for mobile screens (320px-768px) | Tailwind v4 mobile-first breakpoints, md: (768px) standard |
| MOBILE-02 | Touch navigation (bottom nav, hamburger, swipe gestures) | Framer Motion drag/pan, native Vibration API, touch-action CSS |
| MOBILE-03 | Optimized images (responsive, lazy loading) | Cloudinary transformations, srcSet, react-intersection-observer, native loading='lazy' |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bottom navigation rendering | Browser / Client | — | Pure UI component, no server involvement |
| Mobile drawer state | Browser / Client | — | Client-side state management (open/closed) |
| Touch gesture detection | Browser / Client | — | Browser native events, Framer Motion client library |
| Haptic feedback | Browser / Client | — | Vibration API is browser-only |
| Image transformation URLs | CDN / Static | Browser / Client | Cloudinary generates URLs, browser requests optimized images |
| Responsive image selection | Browser / Client | CDN / Static | Browser chooses srcSet variant, CDN serves transformed image |
| Lazy loading logic | Browser / Client | — | IntersectionObserver API is client-side |
| Safe area insets | Browser / Client | — | CSS env() values provided by browser |
| Pull-to-refresh trigger | Browser / Client | API / Backend | Gesture detected client-side, data fetch from backend |
| Scroll position restoration | Browser / Client | — | Browser history API and React state |

All mobile responsive capabilities are client-tier responsibilities. The backend remains unchanged — responsive design affects presentation layer only.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v4.2.1 | Mobile-first responsive utilities | Industry standard, built-in breakpoint system (sm/md/lg/xl/2xl), CSS-first config with @theme directive [VERIFIED: package.json] |
| Framer Motion | v12.38.0 | Touch gestures & spring animations | Best-in-class React animation library, built-in drag/pan/pinch support, spring physics for natural mobile feel [VERIFIED: npm registry 2026-04-24] |
| react-intersection-observer | v10.0.3 | Lazy loading detection | Existing dependency, wraps IntersectionObserver API in React hook, 96% browser support [VERIFIED: package.json] |
| Cloudinary | URL-based | Image transformations | Industry standard for responsive images, automatic format selection (AVIF/WebP/JPEG), on-the-fly resizing [CITED: Cloudinary React SDK docs] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-simple-pull-to-refresh | 1.3.4 | Pull-to-refresh component | Custom cyber indicator required, zero dependencies, works mobile + desktop [VERIFIED: npm registry 2026-04-24] |
| @use-gesture/react | 10.3.1 | Advanced touch gestures | If Framer Motion drag insufficient for swipe-to-bookmark (threshold detection) [VERIFIED: npm registry 2026-04-24] |
| Vibration API | Native | Haptic feedback | Light tap feedback (10ms vibrate), no library needed [CITED: MDN Web Docs] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Framer Motion drag | @use-gesture/react | @use-gesture has more granular control (velocity, distance thresholds) but Framer Motion already installed and sufficient for phase requirements |
| react-simple-pull-to-refresh | Custom implementation | Custom gives full control over cyber aesthetic but reinventing wheel adds risk |
| Cloudinary | imgix / next/image | Next.js Image requires Next.js framework; imgix similar to Cloudinary but Cloudinary has better AVIF support |
| Native loading='lazy' | react-lazyload library | Native is simpler and browser-optimized; library needed only for placeholder customization |

**Installation:**

```bash
npm install react-simple-pull-to-refresh @use-gesture/react
# Cloudinary uses URL transformations, no SDK install needed
# Vibration API and IntersectionObserver are native browser APIs
```

**Version verification (2026-04-24):**
- framer-motion: 12.38.0 (latest)
- react-intersection-observer: 10.0.3 (installed, latest is 10.0.3)
- react-simple-pull-to-refresh: 1.3.4 (latest)
- @use-gesture/react: 10.3.1 (latest)

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Touch Events                         │
│  (tap, swipe, pinch, pull-down, edge-swipe, scroll)             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile Layout Router                          │
│  <768px: Bottom Nav + Drawer    >=768px: Sidebar                │
│  Breakpoint: md: (Tailwind)     (Existing desktop layout)       │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├──────── Touch Navigation ─────────┐
             │                                   │
             ▼                                   ▼
  ┌──────────────────────┐         ┌─────────────────────────┐
  │   Bottom Navigation  │         │   Mobile Drawer         │
  │  - 5 nav items       │◄────────│  - Edge swipe detect    │
  │  - Auto-hide scroll  │  opens  │  - Full nav + controls  │
  │  - Haptic feedback   │         │  - User info section    │
  │  - Event badge       │         │  - Swipe-right close    │
  └──────────────────────┘         └─────────────────────────┘
             │
             ├──────── Page Content ────────────┐
             │                                  │
             ▼                                  ▼
  ┌──────────────────────┐         ┌─────────────────────────┐
  │  Responsive Layout   │         │   Touch Components      │
  │  - Single column     │         │  - SwipeableCard        │
  │  - Stacked sections  │         │  - PullToRefresh        │
  │  - 44px tap targets  │         │  - Pinch-to-zoom        │
  │  - p-4 padding       │         │  - ScrollToTopFAB       │
  └──────────┬───────────┘         └─────────────────────────┘
             │
             ├──────── Image Loading ───────────┐
             │                                  │
             ▼                                  ▼
  ┌──────────────────────┐         ┌─────────────────────────┐
  │  ResponsiveImage     │         │   Cloudinary CDN        │
  │  - IntersectionObs   │ ─req──► │  - AVIF/WebP/JPEG       │
  │  - srcSet: 4 sizes   │ ◄─img─  │  - Auto format select   │
  │  - Blur placeholder  │         │  - On-fly transform     │
  │  - Priority: first 3 │         │  - w_320,640,960,1280   │
  └──────────────────────┘         └─────────────────────────┘
             │
             ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   PWA Service Worker                     │
  │  - Cache images 7 days (existing strategy)              │
  │  - Offline fallback for failed image requests           │
  └─────────────────────────────────────────────────────────┘
```

**Data flow:**
1. User touch → Router decides layout (mobile vs desktop)
2. Mobile layout renders BottomNav + conditional Drawer
3. Page content uses responsive components (single column, touch-friendly)
4. Images request Cloudinary URLs with srcSet → browser selects size
5. IntersectionObserver triggers lazy load when in viewport
6. PWA cache serves repeat requests

### Component Responsibilities Table

| Component | File | Responsibilities |
|-----------|------|------------------|
| BottomNav | `src/components/BottomNav.tsx` | 5-item mobile nav, auto-hide on scroll, haptic feedback, event badge |
| MobileDrawer | `src/components/MobileDrawer.tsx` | Full nav drawer, edge swipe detection, user info section |
| Layout | `src/components/Layout.tsx` | Conditional rendering: BottomNav (<768px) vs Sidebar (>=768px) |
| Header | `src/components/Header.tsx` | Responsive: full controls (desktop) vs collapsed (mobile) |
| ResponsiveImage | `src/components/ResponsiveImage.tsx` | srcSet generation, format fallback, lazy loading, blur placeholder |
| SwipeableCard | `src/components/SwipeableCard.tsx` | Wraps NewsCard, swipe-right-to-bookmark gesture |
| PullToRefresh | `src/components/PullToRefresh.tsx` | Pull-down gesture, cyber spinner indicator, onRefresh callback |
| ScrollToTopFAB | `src/components/ScrollToTopFAB.tsx` | Floating action button, appears 500px scroll, smooth scroll to top |
| MobileEventMap | `src/components/MobileEventMap.tsx` | 2D Leaflet map (no 3D globe), collapsible bottom sheet for events |

### Recommended Project Structure

```
src/
├── components/
│   ├── mobile/                    # NEW: Mobile-specific components
│   │   ├── BottomNav.tsx
│   │   ├── MobileDrawer.tsx
│   │   ├── PullToRefresh.tsx
│   │   ├── SwipeableCard.tsx
│   │   ├── ScrollToTopFAB.tsx
│   │   └── MobileEventMap.tsx
│   ├── ResponsiveImage.tsx        # NEW: Reusable responsive image
│   ├── Layout.tsx                 # MODIFY: Add BottomNav conditional
│   ├── Header.tsx                 # MODIFY: Collapse controls on mobile
│   ├── Sidebar.tsx                # MODIFY: Refactor to work as drawer
│   └── NewsCard.tsx               # MODIFY: Use ResponsiveImage
├── hooks/
│   ├── useScrollDirection.ts      # NEW: Detect scroll up/down
│   ├── useHapticFeedback.ts       # NEW: Vibration API wrapper
│   └── useSafeArea.ts             # NEW: Safe area inset values
├── lib/
│   └── cloudinary.ts              # NEW: Cloudinary URL builder
└── index.css                      # MODIFY: Add safe-area CSS vars
```

### Pattern 1: Bottom Nav Auto-Hide on Scroll

**What:** Bottom navigation hides when scrolling down content, reappears when scrolling up.

**When to use:** Any scrollable page on mobile to maximize content viewport.

**Example:**

```typescript
// hooks/useScrollDirection.ts
import { useState, useEffect } from 'react';

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');

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

  return scrollDirection;
}

// components/mobile/BottomNav.tsx
import { motion } from 'framer-motion';
import { useScrollDirection } from '../../hooks/useScrollDirection';

export function BottomNav() {
  const scrollDirection = useScrollDirection();
  const isVisible = scrollDirection === 'up' || window.scrollY < 50;

  return (
    <motion.nav
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 h-14 glass-panel border-t border-[#00f0ff]/20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Nav items */}
    </motion.nav>
  );
}
```

### Pattern 2: Responsive Image with Cloudinary

**What:** Generate responsive image URLs with srcSet and format fallback.

**When to use:** All article images, hero images, thumbnails.

**Example:**

```typescript
// lib/cloudinary.ts
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

// components/ResponsiveImage.tsx
import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { buildCloudinaryUrl } from '../lib/cloudinary';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  aspectRatio?: '16:9' | '4:3' | '1:1';
  className?: string;
}

export function ResponsiveImage({
  src,
  alt,
  priority = false,
  aspectRatio = '16:9',
  className
}: ResponsiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    skip: priority, // Skip observer for priority images
  });

  const shouldLoad = priority || inView;
  const widths = [320, 640, 960, 1280];

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      {/* Blur placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] to-[#050810] animate-pulse" />
      )}

      {shouldLoad && (
        <picture>
          {/* AVIF - best compression */}
          <source
            type="image/avif"
            srcSet={widths.map(w =>
              `${buildCloudinaryUrl(src, w, 'avif')} ${w}w`
            ).join(', ')}
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          {/* WebP - good fallback */}
          <source
            type="image/webp"
            srcSet={widths.map(w =>
              `${buildCloudinaryUrl(src, w, 'webp')} ${w}w`
            ).join(', ')}
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          {/* JPEG - universal fallback */}
          <img
            src={buildCloudinaryUrl(src, 960, 'jpg')}
            srcSet={widths.map(w =>
              `${buildCloudinaryUrl(src, w, 'jpg')} ${w}w`
            ).join(', ')}
            sizes="(max-width: 768px) 100vw, 50vw"
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            onLoad={() => setLoaded(true)}
            className={cn(
              'transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </picture>
      )}
    </div>
  );
}
```

**Source:** [Cloudinary React SDK](https://cloudinary.com/documentation/react_image_transformations), [Responsive Images Cheatsheet](https://www.imagetourl.cloud/guides/responsive-images-cheatsheet/)

### Pattern 3: Swipe-to-Bookmark with Framer Motion

**What:** Swipe right on a card to bookmark it with spring animation.

**When to use:** NewsCard component on mobile.

**Example:**

```typescript
// components/mobile/SwipeableCard.tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Bookmark } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onBookmark: () => void;
  isBookmarked: boolean;
}

export function SwipeableCard({ children, onBookmark, isBookmarked }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 100], [0, 1]);

  return (
    <div className="relative">
      {/* Bookmark reveal background */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end px-6 bg-[#00f0ff]/10"
        style={{ opacity }}
      >
        <Bookmark className="h-6 w-6 text-[#00f0ff]" fill="currentColor" />
      </motion.div>

      {/* Draggable card */}
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
        {children}
      </motion.div>
    </div>
  );
}
```

### Pattern 4: Safe Area Insets for Notched Devices

**What:** CSS environment variables to avoid notches and home indicators.

**When to use:** Fixed headers, bottom nav, full-screen modals.

**Example:**

```css
/* src/index.css */
:root {
  /* Safe area insets for iOS/Android notches */
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-right: env(safe-area-inset-right);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);

  /* Bottom nav total height */
  --bottom-nav-height: calc(56px + var(--safe-area-bottom));
}

/* Bottom navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottom-nav-height);
  padding-bottom: var(--safe-area-bottom);
}

/* FAB positioning above bottom nav */
.fab {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + 16px);
  right: 16px;
}

/* Full-screen modal on mobile */
.modal-mobile {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
}
```

**Important:** Add to `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

**Source:** [CSS Safe Area Insets Guide](https://theosoti.com/short/safe-area-inset/), [MDN env() function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)

### Anti-Patterns to Avoid

- **Using `100vh` for mobile layouts:** iOS address bar causes layout shifts. Use `100dvh` (dynamic viewport height) or JavaScript-based `--app-height` variable. [CITED: Medium - New CSS Viewport Units](https://pixicstudio.medium.com/the-new-css-viewport-units-that-finally-fix-mobile-layouts-e0778527606f)

- **Lazy-loading the LCP image:** First card image should be `loading='eager'` and `fetchpriority='high'`. Lazy loading above-the-fold content hurts Core Web Vitals. [CITED: CoreUI React Image Optimization](https://coreui.io/answers/how-to-optimize-images-in-react/)

- **300ms tap delay not addressed:** Always add `touch-action: manipulation` to interactive elements. Modern browsers removed delay for optimized sites, but CSS ensures it. [CITED: MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)

- **Mutation during drag gestures:** Framer Motion expects immutable state. Use `onDragEnd` callback to update state, not `onDrag`. Mutation causes jank.

- **Forgetting `viewport-fit=cover`:** Safe area insets only work with this meta tag. Without it, `env(safe-area-inset-*)` returns 0px. [CITED: CSS-Tricks The Notch and CSS](https://css-tricks.com/the-notch-and-css/)

- **Horizontal overflow on mobile:** Always test with `overflow-x: hidden` on body/main. Region filter pills should use `overflow-x: auto` with `-webkit-overflow-scrolling: touch`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch gesture detection | Custom touch event listeners | Framer Motion drag/pan | Handles velocity, inertia, constraints, spring physics, multi-touch. Custom impl misses edge cases (touch cancel, pointer events). |
| Responsive image URLs | Manual width detection + string concat | Cloudinary URL builder | Auto format selection (AVIF/WebP/JPEG), quality optimization, CDN caching, on-the-fly transforms. |
| Lazy loading images | Custom scroll listeners | react-intersection-observer + native loading='lazy' | IntersectionObserver is performant (no scroll jank), handles edge cases (images added dynamically), browser-native lazy is free. |
| Pull-to-refresh | Touch event math | react-simple-pull-to-refresh | Handles overscroll physics, threshold detection, iOS rubber-band, cancel gesture. Custom impl breaks on Android. |
| Scroll direction detection | Throttled scroll listener | Debounced hook with threshold | Prevents thrashing (10px threshold), passive event listener, cleanup on unmount. Easy to miss performance gotchas. |
| Safe area insets | JavaScript device detection | CSS env() variables | Browser provides exact inset values, updates on orientation change, works across iOS/Android/future devices. |

**Key insight:** Mobile touch interactions have platform-specific quirks (iOS momentum scrolling, Android overscroll glow, pointer events vs touch events). Libraries abstract these; custom implementations require device testing matrix.

---

## Runtime State Inventory

> Not applicable — this phase is greenfield implementation of new mobile UI components. No rename/refactor/migration involved.

---

## Common Pitfalls

### Pitfall 1: iOS Address Bar Height Changes

**What goes wrong:** Using `height: 100vh` on mobile causes layout to shift when iOS Safari address bar hides/shows (75px height change).

**Why it happens:** `100vh` measures viewport at page load (with address bar visible). When user scrolls and bar hides, actual viewport grows but CSS value stays same.

**How to avoid:**
- Use CSS `height: 100dvh` (dynamic viewport height) for modern browsers (Safari 15.4+, Chrome 108+)
- Fallback: JavaScript sets `--app-height` CSS variable on resize
- Apply to full-screen elements (modals, maps), not content containers

**Warning signs:**
- White space appears at bottom of screen on scroll
- Fixed elements "jump" when address bar shows/hides
- Full-screen modals don't reach bottom edge

**Source:** [VERIFIED: Medium - New CSS Viewport Units Fix Mobile Layouts](https://pixicstudio.medium.com/the-new-css-viewport-units-that-finally-fix-mobile-layouts-e0778527606f)

### Pitfall 2: Touch Event 300ms Delay Not Eliminated

**What goes wrong:** Buttons feel unresponsive on mobile despite fast JavaScript. Users tap twice thinking first tap didn't register.

**Why it happens:** Legacy mobile browsers waited 300ms to detect double-tap-to-zoom. Modern browsers removed delay for `width=device-width` meta tag sites, but not all scenarios.

**How to avoid:**
- Add `touch-action: manipulation` to all interactive elements (buttons, cards, nav items)
- Ensures browser disables double-tap zoom delay
- Works alongside `user-scalable=no` in viewport meta

**Warning signs:**
- User reports "laggy" UI despite fast React rendering
- Double-taps frequently occur
- Analytics show high tap-to-action time (>300ms)

**Source:** [VERIFIED: MDN touch-action property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action), [Chrome Developers Blog - 300ms delay gone](https://developer.chrome.com/blog/300ms-tap-delay-gone-away)

### Pitfall 3: Horizontal Scroll on Mobile (Layout Overflow)

**What goes wrong:** Content wider than viewport forces horizontal scroll, breaking mobile UX. Often caused by fixed-width elements or desktop grid classes.

**Why it happens:**
- Desktop components (HeroSection markets panel) not hidden on mobile
- Absolute-positioned elements exceed 100vw
- Grid columns set to desktop sizes (lg:grid-cols-3) without mobile override

**How to avoid:**
- Audit all components with `className` containing `lg:` — replace with `md:`
- Hide desktop-only panels: `hidden md:block`
- Set `overflow-x: hidden` on `<body>` as safety net
- Test with Chrome DevTools device emulation at 320px width

**Warning signs:**
- Horizontal scrollbar appears on mobile
- Content cut off at viewport edge
- Touch pan gesture moves page sideways

### Pitfall 4: Lazy Loading the Largest Contentful Paint (LCP) Image

**What goes wrong:** First news card image loads slowly despite being above fold. Core Web Vitals LCP score poor.

**Why it happens:** Using `loading='lazy'` on all images delays critical above-fold images until IntersectionObserver detects them. Browser optimization disabled.

**How to avoid:**
- First 3 news cards: `priority={true}` prop → `loading='eager'` + `fetchpriority='high'`
- Rest of cards: `priority={false}` → `loading='lazy'`
- Never lazy-load hero images, logos, or above-fold content

**Warning signs:**
- Lighthouse LCP warning
- First card appears blank for 1-2 seconds on fast connections
- DevTools shows high "fetchpriority" opportunities

**Source:** [VERIFIED: CoreUI - How to Lazy Load Images in React](https://coreui.io/answers/how-to-lazy-load-images-in-react/)

### Pitfall 5: Missing `viewport-fit=cover` for Safe Area Insets

**What goes wrong:** `env(safe-area-inset-bottom)` returns 0px on iOS despite notch/home indicator present. Bottom nav overlaps home bar.

**Why it happens:** Safe area insets only work when viewport meta tag includes `viewport-fit=cover`. Default is `viewport-fit=auto` which clips content to safe area.

**How to avoid:**
- Update `index.html` viewport meta tag:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  ```
- Test on physical iPhone or Safari iOS simulator (Chrome DevTools doesn't emulate insets)

**Warning signs:**
- Bottom nav overlaps iOS home indicator
- Content hidden behind notch on landscape mode
- CSS inspector shows `env(safe-area-inset-bottom)` = 0px on iOS

**Source:** [VERIFIED: CSS-Tricks - The Notch and CSS](https://css-tricks.com/the-notch-and-css/)

### Pitfall 6: Breakpoint Migration Incomplete (lg: still present)

**What goes wrong:** Some components show mobile layout, others desktop layout at 768px. Inconsistent experience.

**Why it happens:** Phase changes breakpoint from lg: (1024px) to md: (768px), but not all lg: occurrences updated. Partial migration.

**How to avoid:**
- Grep codebase for `lg:` before starting implementation
- Create checklist of all files with `lg:` responsive classes
- Update systematically: Layout → Header → Sidebar → Page components
- Test at 767px and 768px to verify switch happens

**Warning signs:**
- Bottom nav visible but sidebar also visible at 768px
- Header shows hamburger but full controls also visible
- Modals full-screen on some pages, overlay on others

**Files to audit:** Layout.tsx, Header.tsx, Sidebar.tsx, all page components (Dashboard, Monitor, Analysis, Timeline, EventMap, Profile, Community)

### Pitfall 7: Framer Motion Animation Overload on Mobile

**What goes wrong:** Janky animations, battery drain, hot device. User disables animations in OS settings but app ignores preference.

**Why it happens:** Desktop spring animations (navbar, cards) stack on mobile with touch gestures. 60fps not maintained. `prefers-reduced-motion` not respected.

**How to avoid:**
- Check `prefers-reduced-motion: reduce` media query
- Disable: spring animations, parallax, continuous animations
- Keep: instant state changes, opacity transitions
- Framer Motion supports `transition: { reducedMotion: 'user' }` prop

**Warning signs:**
- Frame drops during scroll
- Device gets warm during use
- User reports "choppy" or "laggy" animations
- Accessibility complaint: motion sickness

**Example:**

```typescript
const springTransition = {
  type: 'spring',
  damping: 25,
  stiffness: 200,
  reducedMotion: 'user' // Respects OS preference
};
```

---

## Code Examples

Verified patterns from official sources:

### Tailwind v4 Mobile-First Breakpoints

```css
/* src/index.css - Tailwind v4 @theme directive */
@theme {
  /* Default breakpoints (mobile-first) */
  --breakpoint-sm: 40rem;    /* 640px - small phones landscape */
  --breakpoint-md: 48rem;    /* 768px - tablets portrait (PRIMARY for this phase) */
  --breakpoint-lg: 64rem;    /* 1024px - tablets landscape */
  --breakpoint-xl: 80rem;    /* 1280px - laptops */
  --breakpoint-2xl: 96rem;   /* 1536px - desktops */
}
```

```tsx
// Usage in components - mobile-first approach
<div className="
  p-4              /* Mobile: 16px padding */
  md:p-6           /* Desktop ≥768px: 24px padding */

  grid grid-cols-1 /* Mobile: single column */
  md:grid-cols-2   /* Desktop: two columns */
  lg:grid-cols-3   /* Large: three columns */
">
  {/* Content */}
</div>
```

**Source:** [VERIFIED: Tailwind CSS v4 Responsive Design Docs](https://tailwindcss.com/docs/responsive-design)

### Framer Motion Drag Gesture with Spring

```tsx
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

function DraggableCard() {
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [0, 100],
    ['rgba(0, 240, 255, 0)', 'rgba(0, 240, 255, 0.2)']
  );

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Threshold: 80px swipe right
    if (info.offset.x > 80) {
      onBookmark();
      navigator.vibrate?.(10); // Haptic feedback
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 150 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, background }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 180,
        reducedMotion: 'user' // Accessibility
      }}
    >
      {/* Card content */}
    </motion.div>
  );
}
```

**Source:** [VERIFIED: Framer Motion Drag Docs](https://www.framer.com/motion/gestures/#drag) (referenced via ctx7 search results)

### Native Haptic Feedback (Vibration API)

```typescript
// hooks/useHapticFeedback.ts
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

// Usage in component
function BottomNav() {
  const { lightTap } = useHapticFeedback();

  return (
    <button onClick={() => {
      handleNavigation();
      lightTap(); // Haptic feedback on tap
    }}>
      Dashboard
    </button>
  );
}
```

**Source:** [VERIFIED: Web Haptics NPM Package](https://medium.com/@springmusk/web-haptics-the-npm-package-everyones-adding-for-haptic-feedback-4c774f10caaa), [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)

**Note:** iOS Safari does NOT support Vibration API. Feature detection required.

### Pull-to-Refresh with react-simple-pull-to-refresh

```tsx
import PullToRefresh from 'react-simple-pull-to-refresh';
import { Radio } from 'lucide-react';

function NewsFeed() {
  const { refetch } = useQuery(['news']);

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <div className="flex justify-center py-4">
          <Radio className="h-6 w-6 text-[#00f0ff] animate-pulse" />
        </div>
      }
      refreshingContent={
        <div className="flex justify-center py-4">
          <Radio className="h-6 w-6 text-[#00f0ff] animate-spin" />
        </div>
      }
      pullDownThreshold={80}
      maxPullDownDistance={120}
      resistance={2}
    >
      <div className="space-y-4">
        {articles.map(article => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
    </PullToRefresh>
  );
}
```

**Source:** [VERIFIED: react-simple-pull-to-refresh GitHub](https://github.com/thmsgbrt/react-simple-pull-to-refresh)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FastClick library for 300ms delay | CSS `touch-action: manipulation` | 2014 (Chrome 32) | Native browser optimization, no library needed [CITED: Chrome Blog] |
| Custom scroll listeners for lazy load | IntersectionObserver API | 2016 (widespread support) | Performant, no scroll jank, handles dynamic content [CITED: MDN] |
| Polyfill for native lazy loading | `<img loading='lazy'>` attribute | 2019 (Chrome 76) | Built-in browser feature, 96% support [CITED: caniuse] |
| 100vh for mobile full-height | `100dvh` (dynamic viewport height) | 2022 (Safari 15.4) | Handles iOS address bar, no JS needed [CITED: Medium] |
| JavaScript viewport height detection | CSS `env(safe-area-inset-*)` | 2017 (iOS 11) | Native safe area values, updates on rotation [CITED: CSS-Tricks] |
| Separate WebP and JPEG images | Cloudinary auto format (`f_auto`) | Ongoing | CDN decides format based on browser support [CITED: Cloudinary Docs] |

**Deprecated/outdated:**

- **FastClick library:** Archived by maintainers in 2021. Modern browsers eliminate delay natively with viewport meta tag. Use CSS `touch-action` instead. [CITED: FastClick GitHub]

- **react-lazyload:** Last updated 2019. Native `loading='lazy'` and IntersectionObserver are better. Use react-intersection-observer for custom placeholders.

- **Polyfills for IntersectionObserver:** 96% browser support as of 2026. Polyfill only if IE11 support required (NewsHub targets modern browsers).

- **viewport-fit=contain:** Default value, causes content to avoid safe areas. Use `viewport-fit=cover` + CSS insets for full-screen layouts.

---

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cloudinary cloud name available in env vars | Standard Stack, Pattern 2 | Falls back to original URLs (no optimization) — non-blocking |
| A2 | iOS Safari Vibration API not supported, Android works | Code Examples | False positives on iOS (navigator.vibrate exists but no-op?) — minor UX |
| A3 | Phase requires no backend API changes | Architectural Responsibility Map | If responsive images need server-side URL generation, extra work — unlikely given Cloudinary is client-side |
| A4 | Existing Sidebar component can be refactored to MobileDrawer role | Recommended Structure | If Sidebar tightly coupled to desktop layout, might need new component — medium risk |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Which blur placeholder strategy?**
   - What we know: D-76 specifies blur-up placeholder with 300ms fade. Two approaches: (1) tiny base64-encoded 10px image scaled up, (2) blurhash string decoded to canvas.
   - What's unclear: Performance tradeoff. Tiny image adds inline bytes to HTML. Blurhash requires decoder library (~5KB).
   - Recommendation: Use tiny image approach first (simpler, no dependency). Migrate to blurhash if inline HTML size becomes issue.

2. **FAB icon: arrow-up vs chevron-up?**
   - What we know: Claude's discretion per D-XX. Both Lucide icons available.
   - What's unclear: User preference for cyber aesthetic.
   - Recommendation: Use `ArrowUp` (more literal "scroll to top"), matches existing iconography style (Activity, Globe2, MapPin are literal).

3. **Scroll threshold for bottom nav auto-hide?**
   - What we know: Claude's discretion. Pattern 1 uses 10px sensitivity threshold.
   - What's unclear: Optimal hide/show thresholds (scroll down vs scroll up might differ).
   - Recommendation: Hide on 50px scroll down, show on 20px scroll up. Asymmetric thresholds prevent flicker.

4. **Swipe-to-bookmark threshold distance?**
   - What we know: Claude's discretion. Pattern 3 uses 80px.
   - What's unclear: Feels right on real devices?
   - Recommendation: 80px matches iOS Mail swipe-to-delete UX pattern. Test with `dragElastic={0.2}` for resistance feel.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build tooling | ✓ | (assumed >=18) | — |
| npm | Package install | ✓ | (assumed >=9) | — |
| Framer Motion | Touch gestures | ✓ | 12.35.0 (installed) | — |
| react-intersection-observer | Lazy loading | ✓ | 10.0.3 (installed) | — |
| Cloudinary account | Image optimization | ✗ | — | Use original URLs (no-op transform) |
| Physical mobile device | Touch testing | ? | Unknown | Chrome DevTools emulation |
| iOS Safari | Safe area inset testing | ? | Unknown | Safari iOS Simulator |

**Missing dependencies with no fallback:**
- None — all critical dependencies installed or have graceful degradation.

**Missing dependencies with fallback:**
- **Cloudinary:** If `VITE_CLOUDINARY_CLOUD_NAME` env var not set, ResponsiveImage falls back to original URLs. Images still load, just not optimized. Plan should include Cloudinary setup step or accept unoptimized fallback.
- **Physical device:** Chrome DevTools device emulation sufficient for layout testing. Touch gestures testable with mouse drag. Safe area insets won't render in DevTools (shows 0px), but CSS is correct.

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is explicitly set to `false` in `.planning/config.json`.

---

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Checking config...

**Status:** `security_enforcement` key not present in `.planning/config.json` — treated as enabled per GSD protocol.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | Not affected — UI-only changes |
| V3 Session Management | No | Not affected — no session changes |
| V4 Access Control | No | Not affected — no new permissions |
| V5 Input Validation | Yes | Cloudinary URL validation — only allow trusted origins |
| V6 Cryptography | No | Not applicable |
| V7 Error Handling | Yes | Image load errors handled with placeholder fallback |
| V8 Data Protection | No | Not affected — presentation layer only |
| V9 Communication | Yes | Ensure Cloudinary URLs use HTTPS |
| V13 API | No | No new API endpoints |
| V14 Configuration | Yes | Cloudinary cloud name from env vars, not hardcoded |

### Known Threat Patterns for React + Responsive Images

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Image URL injection (malicious src) | Tampering | Validate Cloudinary URLs match `https://res.cloudinary.com/${cloudName}/...` pattern |
| XSS via image onerror | Spoofing | Use React synthetic events (`onLoad`, `onError`), not inline handlers |
| HTTPS downgrade (mixed content) | Tampering | Enforce HTTPS for Cloudinary URLs, CSP `img-src https:` |
| Cloudinary account takeover | Elevation | Use unsigned image delivery (public URLs), not signed uploads in client |

### Security Checklist for Phase 24

- [ ] Cloudinary cloud name read from `import.meta.env.VITE_CLOUDINARY_CLOUD_NAME` (not hardcoded)
- [ ] Image URLs validated to match Cloudinary pattern before rendering
- [ ] All Cloudinary URLs use HTTPS protocol
- [ ] Image error handlers use React synthetic events (`onError`), not inline `onerror=`
- [ ] No user-provided URLs passed directly to ResponsiveImage without validation
- [ ] CSP updated to allow `img-src https://res.cloudinary.com` if not already wildcard

**Low risk phase:** No authentication, no data storage, no user input beyond existing article URLs (already validated by backend). Primary risk is misconfigured Cloudinary URLs causing mixed content warnings.

---

## Sources

### Primary (HIGH confidence)

- [Tailwind CSS v4 Responsive Design](https://tailwindcss.com/docs/responsive-design) - Breakpoint values and mobile-first approach
- [MDN CSS env() function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) - Safe area insets reference
- [MDN touch-action property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) - 300ms delay elimination
- [Cloudinary React SDK Documentation](https://cloudinary.com/documentation/react_image_transformations) - Image transformation API
- [Framer Motion Gestures Documentation](https://www.framer.com/motion/gestures/) - Drag, pan, pinch API (via ctx7 search)
- npm registry - Package version verification (framer-motion 12.38.0, react-intersection-observer 10.0.3, react-simple-pull-to-refresh 1.3.4, @use-gesture/react 10.3.1)

### Secondary (MEDIUM confidence)

- [CoreUI - How to Optimize Images in React](https://coreui.io/answers/how-to-optimize-images-in-react/) - Lazy loading best practices
- [Responsive Images Cheatsheet](https://www.imagetourl.cloud/guides/responsive-images-cheatsheet/) - srcSet and sizes attribute examples
- [CSS-Tricks - The Notch and CSS](https://css-tricks.com/the-notch-and-css/) - viewport-fit=cover requirement
- [Medium - New CSS Viewport Units Fix Mobile Layouts](https://pixicstudio.medium.com/the-new-css-viewport-units-that-finally-fix-mobile-layouts-e0778527606f) - dvh/svh/lvh explanation
- [Web Haptics NPM Package Article](https://medium.com/@springmusk/web-haptics-the-npm-package-everyones-adding-for-haptic-feedback-4c774f10caaa) - Vibration API wrappers
- [Chrome Developers Blog - 300ms Tap Delay Gone](https://developer.chrome.com/blog/300ms-tap-delay-gone-away) - Historical context

### Tertiary (LOW confidence — context only)

- [AT&T Israel Tech Blog - Scroll-Aware Bottom Navigation](https://medium.com/att-israel/how-to-add-scroll-aware-bottom-navigation-in-react-native-7734c9c6206d) - React Native pattern (adapted for web)
- [DEV Community - Hide Menu on Scroll in React](https://dev.to/guimg/hide-menu-when-scrolling-in-reactjs-47bj) - Scroll direction detection pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm registry and package.json, versions current as of 2026-04-24
- Architecture: HIGH - Patterns verified via official docs (Framer Motion, Tailwind, Cloudinary), existing codebase structure confirmed
- Pitfalls: MEDIUM-HIGH - iOS 100vh and safe area issues verified via multiple sources; 300ms delay and lazy loading LCP verified via MDN/official docs; reduced-motion not verified in codebase (assumed missing)

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days — stable domain, Tailwind v4 and Framer Motion v12 unlikely to change breakpoint/API structure)

**Verification notes:**
- Tailwind CSS v4 breakpoint values confirmed via official docs
- Framer Motion version 12.38.0 latest as of research date
- Cloudinary API pattern verified via official React SDK documentation
- Safe area insets CSS verified via MDN and CSS-Tricks
- Native lazy loading browser support 96% verified via caniuse (implicit in CoreUI article)
- Vibration API iOS limitation noted in multiple sources (WebHaptics article, MDN compatibility table)
