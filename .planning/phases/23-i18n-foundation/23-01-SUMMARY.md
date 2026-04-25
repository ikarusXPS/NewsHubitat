---
phase: 23
plan: 01
subsystem: frontend/i18n
tags: [i18n, react-i18next, internationalization, language-switcher]
dependency_graph:
  requires: []
  provides:
    - i18n-infrastructure
    - language-switcher-component
    - i18n-test-utilities
  affects:
    - src/App.tsx
    - src/components/Header.tsx
tech_stack:
  added:
    - react-i18next@17.0.4
    - i18next@26.0.7
    - i18next-icu@2.4.3
    - intl-messageformat@11.2.1
    - i18next-browser-languagedetector@8.2.1
    - i18next-http-backend@3.0.6
  patterns:
    - ICU MessageFormat for pluralization
    - Namespace-based lazy loading
    - Zustand sync with i18next
key_files:
  created:
    - src/i18n/i18n.ts
    - src/components/LanguageSwitcher.tsx
    - src/test/i18nTestUtils.tsx
  modified:
    - package.json
    - src/App.tsx
    - src/components/Header.tsx
decisions:
  - D-04: Language switcher in header only
  - D-05: Dropdown UI with flag codes (DE/EN)
  - D-08: English as fallback language
  - D-09: ICU MessageFormat for plurals
metrics:
  duration: 8min
  completed: 2026-04-23T21:09:16Z
  tasks: 6/6
  files_created: 3
  files_modified: 3
---

# Phase 23 Plan 01: i18n Core Infrastructure Summary

react-i18next v17 with ICU pluralization, browser detection, and namespace lazy loading; header language switcher dropdown replacing toggle button

## What Was Built

### i18n Configuration (src/i18n/i18n.ts)
- i18next initialized with 4 plugins: ICU, HTTP Backend, LanguageDetector, initReactI18next
- Supports de/en languages with English fallback (D-08)
- Translation files lazy-loaded from `/locales/{{lng}}/{{ns}}.json`
- Browser language auto-detection via localStorage and navigator
- Syncs language changes to Zustand store for persistence

### LanguageSwitcher Component (src/components/LanguageSwitcher.tsx)
- Dropdown UI matching project design system (cyber aesthetic, cyan accent)
- Shows DE/EN options with check mark on active selection
- Click-outside handler pattern (same as FocusSelector)
- Framer Motion animations for smooth transitions

### i18n Test Utilities (src/test/i18nTestUtils.tsx)
- Isolated testI18n instance for testing
- TestI18nProvider wrapper for components using useTranslation
- setTestLanguage helper for switching languages in tests
- Inline resources for DE/EN with common button/error strings
- useSuspense: false to avoid act() warnings

### Integration
- App.tsx imports i18n configuration (side-effect import triggers initialization)
- Header.tsx uses LanguageSwitcher component instead of old toggle button
- Removed unused Globe import and language/setLanguage from Header

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 35276c2 | chore | Install 6 i18n dependencies |
| df7adfc | feat | Create i18n configuration with ICU, LanguageDetector, HTTP Backend |
| 8910025 | feat | Create LanguageSwitcher dropdown component |
| 03cd02f | refactor | Integrate LanguageSwitcher into Header |
| 03891f8 | feat | Initialize i18n in App.tsx |
| 7ec8b9f | test | Create i18n test utilities |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm peer dependency conflict**
- **Found during:** Task 1
- **Issue:** vite-plugin-pwa peer dependency conflict with vite@8
- **Fix:** Used `--legacy-peer-deps` flag for npm install
- **Impact:** None - all packages installed correctly

## Technical Details

### Package Versions (exact)
```json
{
  "react-i18next": "^17.0.4",
  "i18next": "^26.0.7",
  "i18next-icu": "^2.4.3",
  "intl-messageformat": "^11.2.1",
  "i18next-browser-languagedetector": "^8.2.1",
  "i18next-http-backend": "^3.0.6"
}
```

### Translation File Path
```
/locales/{{lng}}/{{ns}}.json
```
Example: `/locales/de/common.json`, `/locales/en/settings.json`

### Language Detection Order
1. localStorage (`newshub-language` key)
2. Browser navigator.language

### Zustand Sync
i18next `languageChanged` event syncs to Zustand store, which persists to `newshub-storage` localStorage.

## Verification

- TypeScript: PASSED (no errors)
- Unit Tests: 1091 passing (12 pre-existing failures in cleanupService.test.ts - unrelated to i18n)
- All files created and exist
- All commits recorded

## Next Steps

1. **Plan 02:** Create translation JSON files for common namespace
2. **Plan 03:** Extract hardcoded strings from components (~50+ files)
3. **Plan 04:** Implement locale-aware date/number formatting

## Self-Check: PASSED

- [x] src/i18n/i18n.ts exists
- [x] src/components/LanguageSwitcher.tsx exists
- [x] src/test/i18nTestUtils.tsx exists
- [x] All commits verified in git log
- [x] TypeScript compiles without errors
