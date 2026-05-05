---
status: diagnosed
trigger: "On the Dashboard (`/`) the NewsCard items in the 3-column grid overlap vertically — the bottom of each card (containing the READ MORE CTA) is covered by the top of the card in the row below."
created: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "VirtualizedGrid passes a wrong attribute name (`data-row-index`) to the absolutely-positioned row wrapper. @tanstack/react-virtual v3 requires `data-index` for `virtualizer.measureElement()` to map a measured DOM node back to its row. With the wrong attribute, dynamic measurement is silently dropped, so every row stays at the constant `estimateSize: 400`. When an actual SignalCard row exceeds 400px (image + content + topics + actions in the inner `pb-6` grid), the next row's `transform: translateY(start)` places it ON TOP of the still-rendering tail of the previous row → vertical overlap."
  confirming_evidence:
    - "VirtualizedGrid.tsx line 130 sets `data-row-index={virtualRow.index}` (wrong)."
    - "VirtualizedList.tsx line 99 sets `data-index={virtualItem.index}` (correct) on the same library version — list view does not exhibit the bug."
    - "TanStack Virtual v3 docs (Discussion #617) state the attribute MUST be `data-index` and any other name silently breaks dynamic measurement, falling back to estimate-only."
    - "Estimate is `estimateSize: useCallback(() => 400)` (line 44). SignalCard intrinsic height: `h-40` image (160px) + `p-4 space-y-3` content with title/summary/topics/actions + outer `pb-6` (24px). Real-world cards exceed 400px easily for cards with longer titles or many topic chips, making overlap visible across most rows."
    - "Bug exists since commit 4551cd4 (Phase 35-01, 2026-04-26) — predates Phase 40-04/40-05 entirely. SignalCard does NOT render RelatedPodcasts/RelatedVideos. Phase 40 added those slots only to NewsCard.tsx, which is used by /bookmarks and /reading-history, not Dashboard."
  falsification_test: "Change `data-row-index` to `data-index` in VirtualizedGrid.tsx line 130 (no other change). The overlap should disappear because `measureElement` will now correctly remeasure each row's actual height and recompute downstream `virtualRow.start` offsets. If overlap persists after that change, hypothesis is wrong."
  fix_rationale: "Fix targets the exact mechanism (broken contract between `measureElement` and React-Virtual's lookup map). It addresses the root cause — failed dynamic measurement — not a symptom. It does not change layout, estimate, or styling, only the attribute name React-Virtual reads."
  blind_spots: "I did not run the dev server to visually confirm the fix. I did not check whether other consumers (e.g., a future row-index usage in CSS/JS) rely on the `data-row-index` attribute name. I did not verify whether the inline `ref={(el) => { if (el) virtualizer.measureElement(el); }}` callback creates double-invocation issues independent of the attribute (likely not — but worth noting that passing `virtualizer.measureElement` directly as the ref, like VirtualizedList does on line 102, is preferred since v3.0 because it is a stable bound function)."

## Symptoms

expected: NewsCard 3-column grid renders with each card fully visible, READ MORE button reachable, gap between rows. No vertical overlap.
actual: Cards visually clip into the row below them. READ MORE button is half-hidden under the next-row card. Multiple rows affected.
errors: No console errors. Pure layout / virtualization positioning bug.
reproduction: Open `http://localhost:5177/` (Dashboard). Grid view (default). Scroll. Observe row-to-row overlap.
started: Discovered during /gsd-verify-work 40 UAT (Test 5). Predates Phase 40 — present since Phase 35-01 commit `4551cd4`.

## Eliminated

- hypothesis: "Phase 40-04/40-05 added RelatedPodcasts/RelatedVideos to NewsCard, pushing card height past a fixed-row CSS grid."
  evidence: "Dashboard renders SignalCard via VirtualizedGrid, NOT NewsCard. SignalCard contains no Phase-40 additions. NewsCard is only used in /bookmarks and /reading-history."
  timestamp: 2026-05-05T00:00:00Z

- hypothesis: "Grid container uses fixed `auto-rows-[Xrem]` Tailwind class."
  evidence: "Inner grid is `grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-6` (no fixed row height). Outer wrapper is virtualized via `@tanstack/react-virtual`, not CSS Grid for vertical layout."
  timestamp: 2026-05-05T00:00:00Z

## Evidence

- timestamp: 2026-05-05T00:00:00Z
  checked: branch base
  found: HEAD set to f825c13 as required
  implication: Investigation is on the correct base.

- timestamp: 2026-05-05T00:00:00Z
  checked: NewsCard.tsx lines 487-490
  found: RelatedPodcasts and RelatedVideos render inside `<article>` of NewsCard
  implication: Confirmed the Phase 40 additions exist as objective described — but only in NewsCard.

- timestamp: 2026-05-05T00:00:00Z
  checked: which pages use NewsCard
  found: Bookmarks.tsx (line 132) and ReadingHistory.tsx (line 272). Dashboard does NOT use NewsCard.
  implication: Phase 40-04/40-05 cannot be the cause of a Dashboard bug. Hypothesis from objective is wrong.

- timestamp: 2026-05-05T00:00:00Z
  checked: Dashboard.tsx → NewsFeed.tsx → VirtualizedGrid.tsx
  found: Dashboard renders SignalCard via VirtualizedGrid (grid view) and VirtualizedList (list view), both backed by `@tanstack/react-virtual` `useVirtualizer` with absolute-positioned rows + dynamic `measureElement`.
  implication: Bug is in the virtualization layer, not the card or the CSS grid.

- timestamp: 2026-05-05T00:00:00Z
  checked: VirtualizedGrid.tsx line 130
  found: `data-row-index={virtualRow.index}` — wrong attribute name.
  implication: `@tanstack/react-virtual` requires `data-index` to associate a measured DOM node with its row. Without it, `measureElement(el)` cannot identify the row and silently drops the measurement.

- timestamp: 2026-05-05T00:00:00Z
  checked: VirtualizedList.tsx line 99
  found: `data-index={virtualItem.index}` — correct.
  implication: List view is unaffected. Confirms the attribute typo is specific to VirtualizedGrid.

- timestamp: 2026-05-05T00:00:00Z
  checked: TanStack Virtual v3 docs (Discussion #617)
  found: "appending an attribute `data-index` to the DOM node ... reading the size of element when scrolling is expensive, and with not stale refs there would be extra calls."
  implication: The library uses `data-index` (literal) to map DOM → row. Other names = no measurement.

- timestamp: 2026-05-05T00:00:00Z
  checked: estimateSize and SignalCard height
  found: `estimateSize: 400` (line 44). SignalCard ≈ 160 (image) + ~150-180 (content+topics+actions) = 310-340 base, plus longer titles/topics push past 400 easily. `pb-6` (24px) on the inner grid wrapper adds to measured row height too.
  implication: The estimate is too small for some rows. Without dynamic remeasurement, those rows' `virtualRow.start` for the next row places it inside the previous row's content area → overlap.

- timestamp: 2026-05-05T00:00:00Z
  checked: git blame VirtualizedGrid lines 125-145
  found: All from commit `4551cd45` (Phase 35-01, 2026-04-26 — apps/web monorepo move).
  implication: Bug predates Phase 40 by ~9 days. Just first surfaced during 40-UAT.

## Resolution

root_cause: |
  `apps/web/src/components/virtualization/VirtualizedGrid.tsx` line 130 sets the attribute
  `data-row-index={virtualRow.index}` on the absolutely-positioned row wrapper. `@tanstack/react-virtual` v3
  requires this attribute to be literally `data-index` so `virtualizer.measureElement()` can map the measured
  DOM node back to its row. With the wrong attribute name, dynamic remeasurement is silently dropped and every
  row keeps the constant `estimateSize: 400` (line 44). Real SignalCard rows often exceed 400px (image 160px +
  padded content + topic chips + actions + `pb-6`), so the next row's `transform: translateY(virtualRow.start)`
  positions it ON TOP of the still-rendered tail of the previous row → the READ MORE CTA gets covered.
  VirtualizedList.tsx line 99 uses the correct `data-index`, which is why list view shows no overlap.

fix:
verification:
files_changed: []
