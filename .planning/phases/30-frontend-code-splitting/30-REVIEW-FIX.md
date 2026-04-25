---
phase: 30-frontend-code-splitting
fixed_at: 2026-04-25T20:04:19+02:00
review_path: .planning/phases/30-frontend-code-splitting/30-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 30: Code Review Fix Report

**Fixed at:** 2026-04-25T20:04:19+02:00
**Source review:** .planning/phases/30-frontend-code-splitting/30-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Memory Leak in BottomNav Scroll Event Listener

**Files modified:** `src/components/mobile/BottomNav.tsx`
**Commit:** 3705af2
**Applied fix:** Replaced `useMemo` with `useEffect` for the scroll event listener. `useMemo` is designed for memoizing values, not for side effects - the cleanup function returned inside useMemo was being ignored (useMemo returns the last expression value, not a cleanup function), causing event listeners to accumulate on each render.

### WR-02: Unchecked Navigator.share API Usage

**Files modified:** `src/components/NewsCardPremium.tsx`
**Commit:** edd5d41
**Applied fix:** Added proper error handling and clipboard fallback for browsers that don't support the Web Share API. The fix: (1) checks if navigator.share is available, (2) wraps the share call in try/catch, (3) ignores AbortError (user cancellation), (4) falls back to clipboard copy for errors or unsupported browsers. Added `title="Share"` attribute for accessibility.

### WR-03: Inconsistent Query Keys Between Sidebar and EventMap

**Files modified:** `src/components/Sidebar.tsx`
**Commit:** 29a307c
**Applied fix:** Changed queryKey from `['geo-events-stats']` to `['geo-events']` to match EventMap and BottomNav components. Per CLAUDE.md, components sharing the same data MUST use identical queryKey values to share the React Query cache. This prevents duplicate API calls and ensures consistent event data across components.

### WR-04: Hardcoded Retry Button Text Not Localized

**Files modified:** `src/i18n/criticalStrings.ts`, `src/components/ChunkErrorBoundary.tsx`
**Commit:** 1bc6a5f
**Applied fix:** Added `retry` key to CRITICAL_I18N for all supported languages (en: "Retry", de: "Erneut versuchen", fr: "Reessayer") and updated the retry button in ChunkErrorBoundary to use `getCriticalString(this.props.lang || 'en', 'retry')` instead of the hardcoded English "Retry" text. This ensures consistent UX for non-English users.

## Skipped Issues

None - all findings were successfully fixed.

---

_Fixed: 2026-04-25T20:04:19+02:00_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
