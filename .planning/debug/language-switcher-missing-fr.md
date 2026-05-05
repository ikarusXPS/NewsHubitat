---
status: resolved
trigger: "Header LanguageSwitcher dropdown shows only DE + EN as selectable options. FR is missing from the UI despite (a) CLAUDE.md i18n & PWA section explicitly stating languages DE/EN/FR, (b) every Phase-40 SUMMARY documenting i18n triple-write across DE/EN/FR, (c) FR locale JSON files existing under apps/web/public/locales/fr/."
created: 2026-05-05T07:48:44Z
updated: 2026-05-05T08:00:00Z
---

## Current Focus

hypothesis: Hardcoded `languages` array in LanguageSwitcher.tsx omits FR entry — confirmed
test: Read LanguageSwitcher.tsx; grep i18n config for supportedLngs; verify FR locale dir
expecting: Array with only DE + EN; supportedLngs includes 'fr'; FR JSON files exist
next_action: Return diagnosis to caller (goal: find_root_cause_only)

## Symptoms

expected: Header LanguageSwitcher exposes DE, EN, AND FR — all three are selectable; clicking FR re-renders UI in French.
actual: Only DE and EN appear in the dropdown. FR is not selectable.
errors: None — purely missing UI option.
reproduction: Open any page; click language switcher in top-right header; observe only 2 options.
started: Discovered during /gsd-verify-work 40 UAT (Test 10).

## Eliminated

(none — first hypothesis confirmed directly)

## Evidence

- timestamp: 2026-05-05T07:48
  checked: apps/web/src/components/LanguageSwitcher.tsx (lines 7-10)
  found: Hardcoded `const languages = [{ code: 'de', label: 'Deutsch', flag: 'DE' }, { code: 'en', label: 'English', flag: 'EN' }] as const;` — FR entry missing entirely.
  implication: Direct root cause. Component iterates `languages.map(...)` so dropdown renders exactly what's in the array.

- timestamp: 2026-05-05T07:48
  checked: apps/web/src/i18n/i18n.ts (line 15)
  found: `supportedLngs: ['de', 'en', 'fr']` — i18next config explicitly includes FR. Backend lazy-loads from `/locales/{{lng}}/{{ns}}.json`.
  implication: i18n core is FR-ready. The only blocker is the UI list.

- timestamp: 2026-05-05T07:48
  checked: apps/web/src/i18n/i18n.ts (lines 39-46, 50-60, 64-67)
  found: All three sync paths (i18n→Zustand, Zustand→i18n, initial hydration) validate `'de' || 'en' || 'fr'`. `useAppStore.subscribe` will accept FR.
  implication: Setting language to 'fr' will propagate correctly through the entire state pipeline.

- timestamp: 2026-05-05T07:48
  checked: apps/web/public/locales/fr/ directory listing
  found: 6 namespace JSON files present: common.json, credibility.json, factcheck.json, podcasts.json, pricing.json, videos.json. Sampled common.json — real French translations ("Enregistrer", "Annuler", "Une erreur s'est produite").
  implication: FR translations are production-ready for the namespaces that exist.

- timestamp: 2026-05-05T07:48
  checked: apps/web/public/locales/fr/ vs i18n.ts ns array
  found: i18n.ts declares ns: ['common', 'share', 'teams', 'pricing', 'factcheck', 'credibility', 'videos', 'podcasts']. Missing FR files: share.json, teams.json. Also missing (not in ns but in DE/EN): auth.json, bookmarks.json, dashboard.json, settings.json.
  implication: Selecting FR will trigger HTTP 404s for `share.json` and `teams.json` namespaces on initial load. i18next falls back per-key to `fallbackLng: 'en'`, so the UI will not crash but Teams/Share strings will appear in English (graceful degradation).

- timestamp: 2026-05-05T07:48
  checked: git log -S 'fr' / -S 'Français' on LanguageSwitcher.tsx
  found: Both searches empty. The string 'fr' has never been present in this file across full git history.
  implication: This is not a regression — FR was never wired into the switcher. The component was created with DE+EN only and FR locales were added separately (Phase-40 work) without ever updating the UI list. Pure oversight.

- timestamp: 2026-05-05T07:48
  checked: apps/web/src/components/Header.tsx
  found: Imports and renders `<LanguageSwitcher />` at line 189. No alternative language UI.
  implication: LanguageSwitcher.tsx is the single point of fix.

## Resolution

root_cause: |
  apps/web/src/components/LanguageSwitcher.tsx hardcodes a `languages` array (lines 7-10) containing only `{code: 'de'}` and `{code: 'en'}`. The FR entry was never added to this array, even though i18next is configured with `supportedLngs: ['de','en','fr']`, the Zustand store accepts 'fr', and FR locale JSON files exist under `public/locales/fr/`. Git history confirms the string 'fr'/'Français' has never been present in this component file. This is a UI-list omission, not a regression.

fix: |
  Add `{ code: 'fr', label: 'Français', flag: 'FR' }` to the `languages` array in apps/web/src/components/LanguageSwitcher.tsx (line 9, between English and the closing `]`). Optionally (lower priority): backfill missing FR namespaces — share.json, teams.json — to eliminate 404s on i18next-http-backend lazy load. Without those backfills the FR experience still works (English fallback per `fallbackLng: 'en'`), but with two harmless 404 errors in network panel.

verification: typecheck passes (npx tsc --noEmit exits 0); component renders 3 options in dropdown
files_changed:
  - apps/web/src/components/LanguageSwitcher.tsx
fix_commit: 3dc11da
plan: 40-10
