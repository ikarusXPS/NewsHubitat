---
phase: 23
plan: 03
subsystem: frontend/i18n
tags: [i18n, formatters, date-fns, intl, locale-aware, zustand-sync]
dependency_graph:
  requires:
    - i18n-infrastructure
  provides:
    - locale-aware-formatters
    - zustand-i18next-bidirectional-sync
  affects:
    - src/lib/formatters.ts
    - src/i18n/i18n.ts
tech_stack:
  added: []
  patterns:
    - date-fns locales for i18n-aware date formatting
    - Intl.NumberFormat for locale-aware number display
    - Zustand subscribe for bidirectional state sync
key_files:
  created:
    - src/lib/formatters.ts
    - src/lib/formatters.test.ts
  modified:
    - src/i18n/i18n.ts
decisions:
  - D-06: 7-day threshold for relative vs absolute date display
  - D-07: Locale-aware numbers (DE: 1.234,56 | EN: 1,234.56)
metrics:
  duration: 4min
  completed: 2026-04-23T21:24:16Z
  tasks: 3/3
  files_created: 2
  files_modified: 1
---

# Phase 23 Plan 03: Locale-Aware Formatters Summary

date-fns locales for hybrid relative/absolute date formatting, Intl.NumberFormat for locale-aware number display, and bidirectional Zustand-i18next sync for persistent language state

## What Was Built

### Locale-Aware Formatters (src/lib/formatters.ts)
- **formatDateTime**: Hybrid relative/absolute display per D-06
  - Recent dates (< 7 days): "5 minutes ago" / "vor 5 Minuten"
  - Older dates (>= 7 days): "Apr 23, 2026" / "23. Apr. 2026"
  - Uses date-fns `formatDistance` and `format` with locale-specific patterns
  - Invalid date handling returns empty string
- **formatNumber**: Locale-aware number formatting per D-07
  - DE: 1.234,56 (period thousands, comma decimals)
  - EN: 1,234.56 (comma thousands, period decimals)
  - Uses `Intl.NumberFormat` with locale derived from i18n.language
- **formatPercent**: Percentage formatting with 0-1 decimal precision
- **formatCompactNumber**: Compact notation (1.5K, 2.5M)

### Bidirectional Zustand-i18next Sync (src/i18n/i18n.ts)
- **i18next -> Zustand**: `languageChanged` event updates store, with equality check to prevent loops
- **Zustand -> i18next**: `useAppStore.subscribe` watches language changes from persisted state
- **Initial sync**: On app load, persisted Zustand language is applied to i18next
- **Loop prevention**: Both directions check for inequality before triggering updates

### Unit Tests (src/lib/formatters.test.ts)
- 10 tests covering all formatters with mocked i18n language state
- EN/DE locale tests for formatNumber, formatDateTime
- Fake timers for consistent relative date testing
- Invalid date handling verification

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 769ae50 | feat | Create locale-aware formatters |
| dc60c17 | feat | Add bidirectional Zustand-i18next sync |
| b1f1e49 | test | Add formatters unit tests |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Date Formatting Patterns
```typescript
// German: "23. Apr. 2026"
const pattern = 'd. MMM yyyy';

// English: "Apr 23, 2026"
const pattern = 'MMM d, yyyy';
```

### 7-Day Threshold Constant
```typescript
const RELATIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 604,800,000 ms
```

### Zustand Subscribe Pattern
Using basic `subscribe` API (not selector-based) since store uses only `persist` middleware:
```typescript
let previousLanguage = useAppStore.getState().language;
useAppStore.subscribe((state) => {
  if (state.language !== previousLanguage) {
    previousLanguage = state.language;
    i18n.changeLanguage(state.language);
  }
});
```

## Verification

- TypeScript: PASSED (no errors)
- Unit Tests: 10 passing
- All acceptance criteria met

## Next Steps

1. **Plan 04+:** Refactor components to use formatDateTime/formatNumber
2. **Replace existing timeAgo/formatDate**: Components using utils.ts date functions should migrate to formatters.ts

## Self-Check: PASSED

- [x] src/lib/formatters.ts exists (96 lines)
- [x] src/lib/formatters.test.ts exists (109 lines)
- [x] src/i18n/i18n.ts modified with bidirectional sync
- [x] Commit 769ae50 verified in git log
- [x] Commit dc60c17 verified in git log
- [x] Commit b1f1e49 verified in git log
- [x] TypeScript compiles without errors
- [x] All 10 unit tests pass
