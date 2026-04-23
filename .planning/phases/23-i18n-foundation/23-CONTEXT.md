# Phase 23: i18n Foundation - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can switch UI language and experience fully localized interface. This phase covers UI text translation infrastructure, language switching, and locale-aware formatting. Article content translation is handled by the existing translation service and is out of scope.

</domain>

<decisions>
## Implementation Decisions

### String Extraction Strategy
- **D-01:** Keys organized nested by page/feature (e.g., `settings.account.deleteAccount`, `dashboard.hero.stats`)
- **D-02:** Translations split into multiple namespace files per major feature: `common.json`, `settings.json`, `dashboard.json`, `auth.json` — enables lazy-loading per page
- **D-03:** Key naming convention: camelCase (matches JS/TS conventions, autocomplete-friendly)

### Language Switcher UX
- **D-04:** Switcher placed in header navigation only (not in Settings page)
- **D-05:** Visual style: Dropdown with text ("DE ▼") that expands to show language options — compact, familiar pattern

### Date/Number Formatting
- **D-06:** Dates displayed as relative + absolute hybrid: "5 min ago" for recent, "23. Apr 2026" for older
- **D-07:** Numbers formatted according to UI language (DE: 1.234,56 | EN: 1,234.56)

### Fallback & Missing Strings
- **D-08:** Fallback language: English (more widely understood than German)
- **D-09:** Pluralization: ICU MessageFormat (`{count, plural, one {# article} other {# articles}}`)

### Claude's Discretion
- Exact threshold for relative vs absolute date display (e.g., 24h, 7d)
- Translation file directory structure within `src/`
- Whether to use i18next-browser-languagedetector or custom detection
- Loading indicator while translations load

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### i18n Library
- react-i18next official docs — hooks-based API, namespace lazy loading, ICU format

### Existing Code
- `src/store/index.ts` — Current language state (`language: 'de' | 'en'`), needs migration to i18next
- `src/pages/Settings.tsx` — Current language toggle UI (to be removed, replaced by header switcher)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAppStore` already has `language` state and `setLanguage` action — can integrate with i18next
- Zustand persist middleware already saves language preference to localStorage

### Established Patterns
- Component structure follows pages/ pattern — namespace split should match
- Tailwind CSS v4 for styling — dropdown will use existing design system

### Integration Points
- Header component (add language switcher dropdown)
- App root (wrap with I18nextProvider)
- All components with hardcoded German text (~50+ files)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard react-i18next approaches.

</specifics>

<deferred>
## Deferred Ideas

- **Preferred source language for articles** — Fetch English versions of Russian/Chinese content when available (enhancement to translation service, not UI i18n)

</deferred>

---

*Phase: 23-i18n-foundation*
*Context gathered: 2026-04-23*
