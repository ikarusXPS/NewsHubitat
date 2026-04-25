# Phase 30: Frontend Code Splitting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 30-frontend-code-splitting
**Areas discussed:** Loading indicators, Route prefetching, Dashboard strategy, Bundle threshold, Component splitting, Image audit, Heavy libs, Error handling, Measurement, Library choice, Critical CSS, i18n loading

---

## Loading Indicators

| Option | Description | Selected |
|--------|-------------|----------|
| Radio spinner (current) | Keeps existing PageLoader with Radio icon + "Loading..." text. Consistent, minimal effort. | ✓ |
| Skeleton screens | Show placeholder shapes matching page layout. Feels faster but requires per-page skeletons. | |
| Progress bar | Top-of-screen linear progress. Clear visual but may feel slower on fast connections. | |

**User's choice:** Radio spinner (current)
**Notes:** Keep existing PageLoader, minimal effort required.

---

## Route Prefetching

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, hover prefetch | Preload chunks on link hover. Better perceived performance but adds complexity and bandwidth. | ✓ |
| No prefetching | Load chunks only on navigation. Simpler, users on slow connections won't waste bandwidth. | |
| Viewport-based prefetch | Prefetch chunks for visible nav links (Intersection Observer). Middle ground. | |

**User's choice:** Yes, hover prefetch
**Notes:** Will preload chunks when users hover nav links for snappier navigation.

---

## Dashboard Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep eager (current) | Dashboard is home page — users hit it first. Eager loading means no spinner on first visit. | |
| Make lazy | Reduces initial bundle but shows spinner on first Dashboard visit. Trade-off for smaller bundle. | |
| Critical CSS inline + lazy | Inline critical CSS for Dashboard shell, lazy load the full component. Complex but best of both. | ✓ |

**User's choice:** Critical CSS inline + lazy
**Notes:** Complex but provides best UX — fast shell appearance with lazy-loaded content.

---

## Bundle Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Warn only (Recommended) | CI logs a warning but doesn't block PRs. Team reviews and decides on trade-offs. | ✓ |
| Fail builds | Strict enforcement — PRs blocked until bundle is under 250KB. | |
| Staged: warn now, fail later | Start with warnings, switch to fail after Phase 30 completes and baseline is established. | |

**User's choice:** Warn only
**Notes:** CI logs warnings but doesn't block PRs. Team reviews and decides.

---

## Component Splitting

| Option | Description | Selected |
|--------|-------------|----------|
| Routes only | Keep it simple — split at route level only. Components within pages load with the route. | |
| Heavy components too | Also lazy-load Comments, ShareButtons, FocusSuggestions. More work but smaller route chunks. | |
| Claude decides per case | Let planning phase analyze bundle stats and decide which components warrant splitting. | ✓ |

**User's choice:** Claude decides per case
**Notes:** Planner will analyze bundle stats and decide which components warrant splitting.

---

## Image Audit

| Option | Description | Selected |
|--------|-------------|----------|
| No changes needed | Lazy loading already in place (SignalCard, ForYouCard, ResponsiveImage). Mark FRON-03 as done. | |
| Audit coverage | Check all image components to ensure consistent lazy loading. Fix any gaps. | ✓ |
| Add fetchpriority hints | Beyond lazy, add fetchpriority="high" for above-fold images. Already in ResponsiveImage. | |

**User's choice:** Audit coverage
**Notes:** Will check all image components for consistent lazy loading and fix any gaps.

---

## Heavy Libraries (globe.gl, Recharts)

| Option | Description | Selected |
|--------|-------------|----------|
| Route-level only (current) | Globe/Map pages already lazy-loaded. Their vendor chunks load with the route. | |
| Component-level dynamic | Even within Globe page, lazy-load the actual Globe component. Faster route shell. | ✓ |
| Conditional loading | Only load Globe/Charts if user has visited those pages before (localStorage check). | |

**User's choice:** Component-level dynamic
**Notes:** Even within Globe page, lazy-load the actual Globe component for faster route shell.

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| ErrorBoundary fallback | Show existing ErrorBoundary UI with retry button. User can retry loading. | |
| Toast + auto-retry | Show toast notification, automatically retry 2-3 times before showing error. | ✓ |
| Offline fallback | If PWA, show offline page. Otherwise show ErrorBoundary. | |

**User's choice:** Toast + auto-retry
**Notes:** Show toast notification, automatically retry 2-3 times before showing error.

---

## Measurement Environment

| Option | Description | Selected |
|--------|-------------|----------|
| Staging (Recommended) | Compare Phase 29 staging baseline to Phase 30 staging. Controlled environment. | ✓ |
| Production | Measure real-world impact. Needs production deploy first. | |
| Both | Track staging for CI gates, production for validation. More comprehensive. | |

**User's choice:** Staging
**Notes:** Compare Phase 29 staging baseline to Phase 30 staging. Controlled environment.

---

## Library Choice

| Option | Description | Selected |
|--------|-------------|----------|
| React.lazy (current) | Already using React.lazy. Native, simple, no extra dependency. | |
| @loadable/component | Adds SSR support, named exports, preload API. More features but extra dependency. | |
| Custom wrapper | Build a thin wrapper around React.lazy with retry logic and preload. | ✓ |

**User's choice:** Custom wrapper
**Notes:** Build a thin wrapper around React.lazy with retry logic and preload capabilities.

---

## Prefetch Delay

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate (0ms) | Prefetch as soon as mouse enters link. Most aggressive, may waste bandwidth. | |
| 150ms delay | Short delay filters out accidental hovers while still feeling instant. | ✓ |
| 300ms delay | More conservative, only prefetch for intentional hovers. | |

**User's choice:** 150ms delay
**Notes:** Short delay filters out accidental hovers while still feeling instant.

---

## Critical CSS Extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Manual extraction | Hand-pick essential styles for Dashboard shell. Simple but maintenance burden. | |
| Build-time tool | Use critters or vite-plugin-critical to auto-extract critical CSS during build. | |
| Claude decides | Let the planner choose the appropriate tool based on bundle analysis. | ✓ |

**User's choice:** Claude decides
**Notes:** Planner will choose the appropriate tool based on bundle analysis.

---

## i18n for Loading States

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode in detected language | Use browser language detection to show "Loading..." / "Laden..." without i18n system. | |
| Icon only, no text | Remove "Loading..." text, show only the Radio spinner. Universal, no translation needed. | |
| Inline critical i18n | Bundle minimal loading translations in the initial chunk. Adds ~1KB but proper i18n. | ✓ |

**User's choice:** Inline critical i18n
**Notes:** Bundle minimal loading translations in the initial chunk. Adds ~1KB but provides proper i18n from the start.

---

## Claude's Discretion

- Which components beyond routes warrant splitting (based on bundle stats)
- Critical CSS extraction tool selection
- Exact retry timing and backoff strategy for chunk loading
- Custom lazy wrapper implementation details

## Deferred Ideas

None — discussion stayed within phase scope
