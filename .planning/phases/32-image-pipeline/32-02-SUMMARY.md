---
phase: 32
plan: 02
subsystem: frontend
tags: [image-optimization, framer-motion, responsive-images]
dependency_graph:
  requires:
    - 32-01-PLAN.md (ResponsiveImage component)
  provides:
    - NewsCardPremium with ResponsiveImage integration
  affects:
    - Analysis page article clusters
tech_stack:
  added: []
  patterns:
    - motion.div wrapper for animating picture elements
key_files:
  created: []
  modified:
    - src/components/NewsCardPremium.tsx
decisions:
  - motion.div wrapper for hover animation (motion cannot animate picture elements directly)
  - No priority prop for NewsCardPremium (used in Analysis page, secondary traffic)
  - aspectRatio 16:9 to match existing h-48 container proportions
metrics:
  duration: 3m
  completed: 2026-04-25T21:57:13Z
  tasks: 2/2
  files_modified: 1
---

# Phase 32 Plan 02: NewsCardPremium Image Migration Summary

NewsCardPremium migrated from motion.img to ResponsiveImage with motion.div wrapper for hover scale animation.

## What Changed

### src/components/NewsCardPremium.tsx

**Before:** Used `<motion.img>` with onError handler and imageError state for error handling.

**After:** Uses `<motion.div>` wrapper with `<ResponsiveImage>` inside:
- motion.div handles hover scale animation (1.0 to 1.05)
- ResponsiveImage handles srcSet, AVIF/WebP/JPEG fallback, lazy loading, and error state
- Removed imageError state (delegated to ResponsiveImage)
- Added aspectRatio="16:9" and responsive sizes attribute

**Why motion.div wrapper?** Framer Motion cannot directly animate `<picture>` elements. The motion.div wrapper receives the scale animation and applies it to the child ResponsiveImage.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | b402128 | feat(32-02): migrate NewsCardPremium to ResponsiveImage with motion.div |
| 2 | (verify) | Build verification - no commit needed |

## Files Modified

| File | Change |
|------|--------|
| src/components/NewsCardPremium.tsx | Replace motion.img with motion.div + ResponsiveImage |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED
- Build: PASSED
- motion.div wrapper has animate prop with scale: VERIFIED

## Self-Check: PASSED

- [x] src/components/NewsCardPremium.tsx exists
- [x] Commit b402128 exists in git history
- [x] Import for ResponsiveImage present
- [x] motion.div wrapper with animation props present
- [x] No motion.img remaining
- [x] No imageError state remaining
