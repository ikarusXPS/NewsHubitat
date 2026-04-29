# Phase 23: i18n Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 23-i18n-foundation
**Areas discussed:** String extraction strategy, Language switcher UX, Date/number formatting, Fallback & missing strings

---

## String Extraction Strategy

### Question: How should translation keys be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Nested by page/feature (Recommended) | e.g., settings.account.title, dashboard.hero.stats — matches component structure, easy to find | ✓ |
| Flat with prefixes | e.g., settings_account_title — simpler structure, but long keys get unwieldy | |
| Nested by semantic domain | e.g., actions.save, labels.email — groups by meaning, not location | |

**User's choice:** Nested by page/feature

---

### Question: Should translations be split into multiple namespace files?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, per major feature (Recommended) | common.json + settings.json + dashboard.json + auth.json — lazy-load per page, smaller bundles | ✓ |
| Single file per language | All in de.json / en.json — simpler setup, loads everything upfront | |
| Split by frequency | common.json (always loaded) + extended.json (lazy) — hot-path optimization | |

**User's choice:** Yes, per major feature

---

### Question: Which naming convention for translation keys?

| Option | Description | Selected |
|--------|-------------|----------|
| camelCase (Recommended) | e.g., settings.account.deleteAccount — matches JS/TS conventions, autocomplete-friendly | ✓ |
| kebab-case | e.g., settings.account.delete-account — matches i18n community convention, more readable | |
| snake_case | e.g., settings.account.delete_account — common in Rails/Python ecosystems | |

**User's choice:** camelCase

---

## Language Switcher UX

### Question: Where should the language switcher be placed?

| Option | Description | Selected |
|--------|-------------|----------|
| Header nav only (Recommended) | Compact switcher in top navigation — always accessible, one location | ✓ |
| Both header and Settings | Header for quick access + Settings page for full options — redundant but discoverable | |
| Settings page only | Keep current location — cleaner nav, but less discoverable | |

**User's choice:** Header nav only

---

### Question: How should the language switcher look in the header?

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown with text (Recommended) | "DE ▼" that expands to show language options — compact, familiar pattern | ✓ |
| Flag icons | Country flag icons — visual but controversial (languages ≠ countries) | |
| Toggle button | "DE | EN" inline toggle — works for 2 languages, doesn't scale | |
| Icon + dropdown | Globe icon that opens language menu — universal, scales well | |

**User's choice:** Dropdown with text

---

## Date/Number Formatting

### Question: How should dates be displayed?

| Option | Description | Selected |
|--------|-------------|----------|
| Relative + absolute (Recommended) | "5 min ago" for recent, "23. Apr 2026" for older — best of both worlds | ✓ |
| Always relative | "5 minutes ago", "2 days ago" — conversational but imprecise for old dates | |
| Always absolute | "23.04.2026 14:30" — precise but less scannable | |
| User preference | Let user choose in Settings — flexible but adds complexity | |

**User's choice:** Relative + absolute

---

### Question: How should numbers be formatted?

| Option | Description | Selected |
|--------|-------------|----------|
| Follow UI language (Recommended) | DE: 1.234,56 / EN: 1,234.56 — consistent with selected language | ✓ |
| Follow browser locale | Use navigator.language for formatting — respects OS settings | |
| Always use period decimal | 1,234.56 everywhere — simpler, but feels odd in German UI | |

**User's choice:** Follow UI language

---

## Fallback & Missing Strings

### Question: What should happen when a translation is missing?

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to German (Recommended) | German is the primary language — show DE text rather than broken keys | |
| Fall back to English | English as universal fallback — more widely understood | ✓ |
| Show translation key | Show "settings.account.title" — makes missing strings obvious for debugging | |

**User's choice:** Fall back to English

---

### Question: How should plurals be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| ICU MessageFormat (Recommended) | "{count, plural, one {# article} other {# articles}}" — i18next standard, handles complex plurals | ✓ |
| Simple key suffixes | article_one, article_other — simpler but less flexible for languages with complex plural rules | |
| Claude's discretion | Let implementation decide based on react-i18next defaults | |

**User's choice:** ICU MessageFormat

---

## Claude's Discretion

- Exact threshold for relative vs absolute date display
- Translation file directory structure
- Language detection library choice
- Loading indicator design

## Deferred Ideas

- Preferred source language for articles (fetch English versions of Russian/Chinese content when available)
