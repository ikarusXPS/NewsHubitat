---
status: pending
phase: 40-content-expansion
created: 2026-05-05
priority: low
labels: [i18n, polish, frontend]
related_plans: [40-10]
related_uat: 10
related_debug: .planning/debug/language-switcher-missing-fr.md
---

# Backfill FR translations for missing namespaces

## Why

Plan 40-10 added FR to the LanguageSwitcher dropdown. Selecting FR triggers i18next-http-backend to lazy-load all 8 declared namespaces (`common`, `share`, `teams`, `pricing`, `factcheck`, `credibility`, `videos`, `podcasts`). 6 of those exist in `apps/web/public/locales/fr/` with real translations. 2 are missing:

- `apps/web/public/locales/fr/share.json` — corresponds to share/social-sharing UI strings (used by SharedContent components)
- `apps/web/public/locales/fr/teams.json` — corresponds to team-collaboration UI strings (used by TeamDashboard, TeamMember, etc.)

Effect: harmless 404s in DevTools Network tab on first FR load. Per-key fallback to `fallbackLng: 'en'` keeps the UI functional. So the bug is cosmetic + observability noise.

## What

Copy `apps/web/public/locales/de/share.json` and `apps/web/public/locales/de/teams.json` (or `en/...`) into `apps/web/public/locales/fr/`. Translate every value into French. Keep the JSON keys identical.

Example minimal content (illustrative — do not commit until translated):
- `share.json`: keys like `shareButton`, `copyLink`, `shareViaEmail`, `tweetThis`, …
- `teams.json`: keys like `teamDashboard`, `inviteMember`, `roleOwner`, `roleAdmin`, `roleMember`, …

Use a translator agent or DeepL CLI for bulk translation, then human-review for tone consistency with the existing FR namespaces in the repo (which use formal French — "Enregistrer" not "Sauve", "Annuler" not "Annule").

## Acceptance

- `apps/web/public/locales/fr/share.json` exists with all keys present in `de/share.json` and `en/share.json`.
- `apps/web/public/locales/fr/teams.json` exists with all keys present in `de/teams.json` and `en/teams.json`.
- DevTools Network tab on first FR selection shows 200 (not 404) for both files.
- Visual sanity: open /team and /article/{id}, switch to FR, observe team/share strings rendering in French (not English fallback).

## Out of scope

- New namespaces (auth, bookmarks, dashboard, settings — these are already not in the i18n.ts ns array, so they're either inlined or use `common`).
- Mobile-only namespaces.
- Changing `fallbackLng` behavior.
- Translation QA process documentation (separate concern).

## Resolution

**Closed 2026-05-11.**

Created `apps/web/public/locales/fr/share.json` (19 keys) and `apps/web/public/locales/fr/teams.json` (80 keys). Translations follow the formal-vouvoiement tone of the existing FR namespaces ("Veuillez réessayer", "Vous perdrez l'accès", "Enregistrer" / "Annuler").

**Parity verified programmatically:**
- Key sets identical across en/de/fr for both namespaces (19/19/19 and 80/80/80).
- All 9 named placeholders (`{{name}}`, `{{email}}`, `{{team}}`, `{{count}}`) preserved in `teams`.
- Both ICU plural placeholders (`{count, plural, one {…} other {…}}`) preserved in `share`.

Per i18n.ts ns array (`apps/web/src/i18n/i18n.ts:16`), share + teams are declared. With these two files present, first-load 404s on FR are eliminated.
