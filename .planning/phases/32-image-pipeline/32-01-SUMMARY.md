---
phase: 32
plan: 01
subsystem: frontend
tags: [image-optimization, responsive-images, lazy-loading, performance]
dependency_graph:
  requires:
    - ResponsiveImage component (src/components/ResponsiveImage.tsx)
    - Cloudinary URL builder (src/lib/cloudinary.ts)
  provides:
    - SignalCard with optimized image delivery
  affects:
    - NewsFeed rendering performance
    - Dashboard LCP metrics
tech_stack:
  added: []
  patterns:
    - ResponsiveImage integration for AVIF/WebP/JPEG format conversion
    - Priority loading for above-fold content (first 6 cards)
    - IntersectionObserver-based lazy loading for below-fold content
key_files:
  created: []
  modified:
    - src/components/SignalCard.tsx
decisions:
  - "First 6 cards get priority=true (eager loading, fetchpriority=high) per D-07/D-08"
  - "Preserve SignalCard perspective-colored fallback placeholder (not handled by ResponsiveImage)"
  - "Remove imageError/imageLoading state (handled internally by ResponsiveImage)"
metrics:
  duration_minutes: 3
  completed: 2026-04-25T21:59:32Z
---

# Phase 32 Plan 01: SignalCard ResponsiveImage Integration Summary

SignalCard migrated to ResponsiveImage component for AVIF/WebP/JPEG format support with responsive srcSet delivery.

## One-Liner

Replaced SignalCard img tag with ResponsiveImage for modern format support (AVIF/WebP/JPEG) and priority loading for first 6 cards.

## Changes Made

### Task 1: Migrate SignalCard image rendering to ResponsiveImage

**Commit:** `7da8249`

**Changes:**
1. Added import for ResponsiveImage component
2. Removed `imageError` and `imageLoading` state variables (handled internally by ResponsiveImage)
3. Simplified `hasValidImage` calculation (removed `&& !imageError`)
4. Replaced img tag with ResponsiveImage:
   - `priority={index < 6}` - First 6 cards eager load with `fetchPriority="high"`
   - `aspectRatio="16:9"` - Matches existing h-40 container proportionally
   - `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` - Optimal srcSet selection
   - `className="group-hover:scale-105 transition-transform duration-500"` - Preserves hover effect

**Preserved:**
- Perspective-colored fallback placeholder (lines 144-202) - SignalCard-specific design
- Gradient overlay on images
- Floating severity badges on images

### Task 2: Verify SignalCard visual rendering

**Verification:**
- TypeScript compilation: PASSED
- Production build: PASSED (no errors)
- No missing imports or type mismatches

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| src/components/SignalCard.tsx | -29/+10 | Replace img with ResponsiveImage, remove internal state |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 7da8249 | feat | migrate SignalCard to ResponsiveImage component |

## Verification Results

- [x] `npm run typecheck` exits 0
- [x] `npm run build` exits 0
- [x] SignalCard contains `import { ResponsiveImage } from './ResponsiveImage';`
- [x] SignalCard contains `<ResponsiveImage`
- [x] SignalCard contains `priority={index < 6}`
- [x] SignalCard contains responsive `sizes` attribute
- [x] SignalCard does NOT contain `const [imageError, setImageError] = useState(false)`
- [x] SignalCard does NOT contain `const [imageLoading, setImageLoading] = useState(true)`
- [x] Perspective fallback placeholder preserved (`linear-gradient(135deg, ${perspective.color}20`)
- [x] Fallback Radio icon preserved (`<Radio className="h-7 w-7"`)

## Requirements Addressed

- [x] IMG-01: SignalCard displays images via ResponsiveImage component
- [x] IMG-02: First 6 SignalCards load images with priority (eager loading)
- [x] IMG-03: Cards 7+ load images lazily via IntersectionObserver

## Self-Check: PASSED

- [x] src/components/SignalCard.tsx exists and contains ResponsiveImage import
- [x] Commit 7da8249 exists in git log
