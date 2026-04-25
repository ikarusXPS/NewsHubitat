---
phase: 23-i18n-foundation
plan: 04
status: complete
started: 2026-04-23T23:30:00Z
completed: 2026-04-23T23:50:00Z
commits:
  - 636bec5
  - 9b9ae53
  - 981628a
  - cb6b7ac
self_check: PASSED
---

# Plan 23-04 Summary: Refactor Components to Use i18n

## What Was Built

Refactored key components to use i18n translations instead of hardcoded strings, completing the user-facing i18n implementation.

### Components Updated

1. **Bookmarks.tsx** - Full i18n integration
   - Uses `useTranslation(['bookmarks', 'common'])`
   - Title, description, empty state, error messages translated
   - Status text with interpolation for article counts

2. **Settings.tsx** - Full i18n integration + language section removal
   - Uses `useTranslation(['settings', 'common'])`
   - All section headers translated (Account, Appearance, Sorting, etc.)
   - **Language toggle section removed** per D-04 (language switcher is header-only)
   - Added missing translation keys to settings.json files

3. **Sidebar.tsx** - Navigation labels translated
   - Uses `useTranslation('common')`
   - All navigation labels use `t('navigation.xxx')` keys
   - Labels update when language changes

4. **NewsCard.tsx** - Locale-aware timestamps
   - Uses `formatDateTime` from formatters.ts
   - Timestamps display relative time in current language
   - No longer needs language prop from store

## Key Files

### Modified
| File | Changes |
|------|---------|
| src/pages/Bookmarks.tsx | Added useTranslation, replaced hardcoded strings |
| src/pages/Settings.tsx | Added useTranslation, removed language section, replaced hardcoded strings |
| src/components/Sidebar.tsx | Added useTranslation, translated navigation labels |
| src/components/NewsCard.tsx | Import formatDateTime, replace timeAgo usage |
| public/locales/en/settings.json | Added missing keys (gdpr section) |
| public/locales/de/settings.json | Added missing keys (gdpr section) |

### Key Links Verified
- [x] Bookmarks.tsx imports useTranslation from react-i18next
- [x] Settings.tsx imports useTranslation from react-i18next
- [x] Sidebar.tsx imports useTranslation from react-i18next
- [x] NewsCard.tsx imports formatDateTime from formatters.ts

## Human Verification

**Status:** PASSED

User verified:
- Language switcher dropdown works in header
- Switching to English updates all UI text
- Switching to Deutsch shows German translations
- Timestamps display locale-aware format
- Language preference persists after refresh
- Settings page has NO language toggle section (per D-04)

## Commits

| Commit | Message |
|--------|---------|
| 636bec5 | refactor(23-04): Bookmarks.tsx to use i18n |
| 9b9ae53 | refactor(23-04): Settings.tsx to use i18n and remove language section |
| 981628a | refactor(23-04): Sidebar.tsx navigation labels translated |
| cb6b7ac | refactor(23-04): NewsCard.tsx uses formatDateTime |

## Self-Check

- [x] All 5 tasks completed (4 auto + 1 human-verify)
- [x] Each task committed individually
- [x] TypeScript compiles without errors
- [x] Human verification passed
- [x] No hardcoded German text in modified components
