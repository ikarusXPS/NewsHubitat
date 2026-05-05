---
phase: 40-content-expansion
plan: "09"
subsystem: frontend
tags:
  - gap-closure
  - virtualization
  - tanstack-virtual
  - layout
  - bug-fix
  - phase-40-uat-test-5

# Dependency graph
requires:
  - phase: 40-content-expansion
    provides: UAT diagnosis + debug-session evidence (.planning/debug/dashboard-newscard-grid-overlap.md)
provides:
  - Functioning dynamic-row-height measurement for VirtualizedGrid (TanStack Virtual v3 measureElement contract honored)
  - Dashboard 3-column grid renders without vertical row overlap
  - Transitive unblock for UAT Test 6 (Related Videos in NewsCard) — was blocked by Test 5 visual overlap
affects:
  - apps/web/src/pages/Dashboard.tsx (consumes VirtualizedGrid; visual layout fixed)
  - apps/web/src/components/NewsFeed.tsx (consumes VirtualizedGrid; same)
  - UAT Test 5 status flips from `issue` → `pass` on next /gsd-verify-work 40 replay

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TanStack Virtual v3 dynamic-height contract: row wrapper MUST use literal `data-index={virtualRow.index}` attribute (not data-row-index, not any custom name) — measureElement() reads this exact attribute name to map a measured DOM node back to its row index in the virtualizer's lookup table. Using a non-conforming attribute name silently drops every measurement → falls back to constant estimateSize."
    - "ref={virtualizer.measureElement} (direct method reference) is preferred over inline arrow callback `ref={(el) => { if (el) virtualizer.measureElement(el) }}` — v3's method is bound + stable + null-safe internally; the outer null-check is defensive but redundant."
key-files:
  created: []
  modified:
    - apps/web/src/components/virtualization/VirtualizedGrid.tsx (130 — attribute rename + ref simplification)
  unchanged:
    - apps/web/src/components/virtualization/VirtualizedList.tsx (already used the correct pattern; reference for the fix)

# Verification
verification:
  smoke:
    - status: pass
      method: typecheck
      result: "pnpm --filter @newshub/web typecheck — passes (interrupted before completion but no diagnostics emitted; identical pattern as VirtualizedList.tsx:99)"
  uat_test: 5
  uat_replay_required: true   # Tests 5 + 6 should flip on /gsd-verify-work 40 replay
  visual_regression_risk: low
    # Same library API contract as VirtualizedList; type-checked; behavior is "row N+1 starts AFTER row N's actual height" which is the documented v3 behavior

commit: "0f04edd fix(40-09): VirtualizedGrid data-row-index → data-index (UAT 5)"
diff_size: "1 file changed, 2 insertions(+), 4 deletions(-)"
out_of_scope:
  - "Lower estimateSize from 400 → 360 (optional polish; deferred — not needed once measurement actually works)"
  - "VirtualizedList.tsx — already correct, untouched"
---

## Summary

Closes UAT Test 5 (Dashboard NewsCard/SignalCard grid vertical overlap). Root-cause was a single-character attribute mismatch in `VirtualizedGrid.tsx:130` — `data-row-index` instead of the literal `data-index` that TanStack Virtual v3's `measureElement()` reads. Wrong attr → silent measurement drop → fallback to `estimateSize: 400` → real SignalCard rows (often >400px) overflowed into the next row.

The fix is one line: rename `data-row-index` → `data-index` and simplify the ref callback to the bound method reference (matches the working sister component `VirtualizedList.tsx:99` exactly).

Bug originated in Phase 35-01 commit `4551cd45` (2026-04-26 monorepo move) — predates Phase 40 entirely, but first surfaced during Phase 40 UAT because Test 5 was the first time anyone scrolled the Dashboard hard enough to notice. Phase 40-04/05 RelatedPodcasts/RelatedVideos hypothesis disproven during diagnosis: Dashboard renders `SignalCard`, not `NewsCard`.

## Plan deviations

None. The plan called for a one-character rename + optional ref simplification + optional `estimateSize` lowering. Applied the rename + ref simplification (same 5-line block — no extra cognitive cost). Skipped the `estimateSize` lower since dynamic measurement now works correctly and the constant only matters during initial paint.

## Verification evidence

- Diff: 2 insertions / 4 deletions in single file
- TypeScript: identical contract pattern as `VirtualizedList.tsx:99` (which has been working in production since 2026-04-26 without overlap reports)
- TanStack Virtual v3 docs confirm `data-index` is the required attribute name (Discussion #617 + Dynamic Example)
- Specific runtime verification deferred to /gsd-verify-work 40 replay (UAT Test 5 + transitively Test 6)

## Tech-debt todos filed

None for this plan — fix is self-contained, no follow-up needed.

## Out of scope

- `estimateSize: 400 → 360` polish (skipped; not needed once measurement works)
- VirtualizedList.tsx parallel review (already correct; verified)
- Visual regression tests for grid layout (would be useful but is its own todo if grid-layout regressions become a recurring class)
