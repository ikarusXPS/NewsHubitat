---
phase: 40-content-expansion
plan: 10
subsystem: frontend/i18n
tags: [gap-closure, react, i18n, phase-40-uat, language-switcher]
dependency_graph:
  requires: []
  provides: [FR language option in header dropdown]
  affects: [apps/web/src/components/LanguageSwitcher.tsx]
tech_stack:
  added: []
  patterns: [as const array literal, i18next changeLanguage delegation]
key_files:
  created:
    - .planning/todos/pending/40-10-fr-namespace-backfill.md
  modified:
    - apps/web/src/components/LanguageSwitcher.tsx
decisions:
  - "Add FR entry directly to hardcoded languages array; no plumbing changes needed — i18next + Zustand pipeline already supports 'fr'"
  - "Defer share.json + teams.json namespace backfill to a low-priority follow-up todo (404s are harmless with fallbackLng: 'en')"
metrics:
  duration: 10m
  completed: 2026-05-05
  tasks_completed: 2
  tasks_total: 2
---

# Phase 40 Plan 10: Add FR to LanguageSwitcher Dropdown Summary

One-liner: Added `{ code: 'fr', label: 'Français', flag: 'FR' }` to the LanguageSwitcher languages array to close UAT Test 10 gap — FR is now selectable alongside DE and EN.

## What Was Built

The LanguageSwitcher component had a hardcoded `languages` array containing only DE and EN. Despite the rest of the i18n pipeline being fully FR-capable (i18next `supportedLngs: ['de','en','fr']`, Zustand store accepting 'fr', 6 FR locale JSON files under `public/locales/fr/`), the UI never surfaced the French option. This was a pure UI-list omission confirmed by `git log` — the string 'fr' / 'Français' had never been in LanguageSwitcher.tsx.

The fix is a single array entry insertion. The component's `languages.map(...)` render block automatically picks up the third option; the click handler delegates to `i18n.changeLanguage(lang.code)` which already accepts 'fr'.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add FR entry to the languages array | 3dc11da | apps/web/src/components/LanguageSwitcher.tsx |
| 2 | File follow-up todo for FR namespace backfill | 20a0842 | .planning/todos/pending/40-10-fr-namespace-backfill.md |

## Verification

- `npx tsc --noEmit` exits 0 (TypeScript check passes — the `as const` literal type correctly widens to include `'fr'`)
- Component renders 3 dropdown options: Deutsch (DE), English (EN), Français (FR)
- Clicking Français calls `i18n.changeLanguage('fr')` → i18next lazy-loads 6 FR locale files → Zustand store sync propagates → UI re-renders in French
- Language persists on reload (Zustand subscribe re-hydrates from localStorage `newshub-storage`)

## Deviations from Plan

None — plan executed exactly as written. Single array entry inserted, no other changes.

## Known Stubs

None. The FR locale files (`common`, `credibility`, `factcheck`, `podcasts`, `pricing`, `videos`) contain real French translations. The 2 missing namespaces (`share.json`, `teams.json`) are tracked in the backfill todo and fall back gracefully to English — this is not a stub, it is documented partial coverage.

## Debug Session Cross-Link

- `.planning/debug/language-switcher-missing-fr.md` — status updated from `diagnosed` → `resolved`; `fix_commit: 3dc11da` populated; `files_changed` populated

## Follow-up Tracked

- `.planning/todos/pending/40-10-fr-namespace-backfill.md` — low-priority; backfill `share.json` and `teams.json` for FR to eliminate harmless DevTools 404s

## Self-Check

- [x] `apps/web/src/components/LanguageSwitcher.tsx` modified and committed (3dc11da)
- [x] `.planning/todos/pending/40-10-fr-namespace-backfill.md` created and committed (20a0842)
- [x] Debug session file updated to resolved
- [x] TypeScript check passed
- [x] No other files modified
