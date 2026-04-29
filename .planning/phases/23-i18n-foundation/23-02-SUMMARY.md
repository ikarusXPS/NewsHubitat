---
phase: 23
plan: 02
subsystem: frontend/i18n
tags: [i18n, translations, json, localization, icu-plurals]
dependency_graph:
  requires:
    - i18n-infrastructure
  provides:
    - common-namespace-translations
    - settings-namespace-translations
    - auth-namespace-translations
    - bookmarks-namespace-translations
    - dashboard-namespace-translations
  affects:
    - public/locales/en/
    - public/locales/de/
tech_stack:
  added: []
  patterns:
    - ICU MessageFormat pluralization
    - Namespace-based translation files
    - Nested key organization (D-01)
    - camelCase key naming (D-03)
key_files:
  created:
    - public/locales/en/common.json
    - public/locales/de/common.json
    - public/locales/en/settings.json
    - public/locales/de/settings.json
    - public/locales/en/auth.json
    - public/locales/de/auth.json
    - public/locales/en/bookmarks.json
    - public/locales/de/bookmarks.json
    - public/locales/en/dashboard.json
    - public/locales/de/dashboard.json
  modified: []
decisions:
  - D-01: Keys nested by feature (navigation.dashboard, buttons.save)
  - D-02: Namespace split per feature (common, settings, auth, etc.)
  - D-03: camelCase key naming
  - D-08: English fallback language
  - D-09: ICU MessageFormat for plurals
metrics:
  duration: 4min
  completed: 2026-04-23T21:16:56Z
  tasks: 5/5
  files_created: 10
  files_modified: 0
---

# Phase 23 Plan 02: Translation Files Summary

10 translation JSON files created for 5 namespaces (common, settings, auth, bookmarks, dashboard) in DE and EN with ICU pluralization syntax

## What Was Built

### Common Namespace (public/locales/{en,de}/common.json)
- Shared UI strings: buttons (save, cancel, delete, etc.), errors, status messages
- Time formatting with ICU plurals: minutesAgo, hoursAgo, daysAgo
- Article count with ICU plural including =0 case
- Navigation labels for all pages
- Region names in both languages (USA, Europe, etc.)

### Settings Namespace (public/locales/{en,de}/settings.json)
- Account section: login prompts, logout, reading history
- Profile editing: change avatar, change name, password confirm
- Reading & personalization: recommendations toggle, history pause
- Appearance: dark/light mode
- Sorting: date, relevance, newest/oldest
- Perspectives: default selection with ICU plural
- Filter presets: create, load, delete
- Focus management, reset filters, command palette
- API configuration: DeepL key settings
- Data & cache: export/import settings, clear cache

### Auth Namespace (public/locales/{en,de}/auth.json)
- Login form: title, email, password, submit, forgot password
- Register form: name, email, password, confirm, submit
- Forgot password flow: title, description, submit, success message
- Reset password: new password, confirm, success/error messages
- Email verification: verifying, success, failed, expired states
- Validation errors: required, email format, password mismatch
- Interpolation for min/max length validation

### Bookmarks Namespace (public/locales/{en,de}/bookmarks.json)
- Page title and description
- Empty state with instructions
- Error state for load failures
- Actions: clear all
- Status: available count with interpolation, unavailable message

### Dashboard Namespace (public/locales/{en,de}/dashboard.json)
- Hero section: title, subtitle with source/region count interpolation
- Stats labels: articles, sources, regions, last update
- Feed: title, empty state, load more, refresh, filters
- Sentiment labels: positive, negative, neutral
- Article actions: read more, translate, bookmark, share
- Clusters: title with ICU plural for perspectives and articles
- Focus suggestions: title, apply, dismiss

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 12ddf01 | feat | Create common namespace translations (EN/DE) |
| 8a689a6 | feat | Create settings namespace translations (EN/DE) |
| 83ff82f | feat | Create auth namespace translations (EN/DE) |
| 329495e | feat | Create bookmarks namespace translations (EN/DE) |
| 9509355 | feat | Create dashboard namespace translations (EN/DE) |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### ICU Pluralization Examples

English:
```json
"minutesAgo": "{count, plural, one {# minute ago} other {# minutes ago}}"
"count": "{count, plural, =0 {No articles} one {# article} other {# articles}}"
```

German:
```json
"minutesAgo": "{count, plural, one {vor # Minute} other {vor # Minuten}}"
"count": "{count, plural, =0 {Keine Artikel} one {# Artikel} other {# Artikel}}"
```

### Interpolation Examples

```json
"available": "{count} of {total} articles available"
"subtitle": "Multi-perspective news analysis from {sourceCount} sources across {regionCount} regions"
"minLength": "Must be at least {min} characters"
```

### Key Structure (per D-01)

Nested by feature for autocomplete-friendly organization:
- `buttons.save`, `buttons.cancel`
- `errors.generic`, `errors.network`
- `navigation.dashboard`, `navigation.settings`
- `account.title`, `account.logout`
- `profile.changeAvatar`, `profile.changeName`

### File Locations

```
public/locales/
  en/
    common.json     (68 keys)
    settings.json   (103 keys)
    auth.json       (57 keys)
    bookmarks.json  (18 keys)
    dashboard.json  (47 keys)
  de/
    common.json     (68 keys)
    settings.json   (103 keys)
    auth.json       (57 keys)
    bookmarks.json  (18 keys)
    dashboard.json  (47 keys)
```

## Verification

- All 10 JSON files parse correctly: PASSED
- EN and DE have matching top-level keys: PASSED
- ICU plural syntax present where expected: PASSED
- Interpolation placeholders used correctly: PASSED

## Next Steps

1. **Plan 03:** Create locale-aware formatters (date, number) and Zustand sync
2. **Plan 04:** Refactor components to use useTranslation hook

## Self-Check: PASSED

- [x] public/locales/en/common.json exists
- [x] public/locales/de/common.json exists
- [x] public/locales/en/settings.json exists
- [x] public/locales/de/settings.json exists
- [x] public/locales/en/auth.json exists
- [x] public/locales/de/auth.json exists
- [x] public/locales/en/bookmarks.json exists
- [x] public/locales/de/bookmarks.json exists
- [x] public/locales/en/dashboard.json exists
- [x] public/locales/de/dashboard.json exists
- [x] All 5 commits verified in git log
