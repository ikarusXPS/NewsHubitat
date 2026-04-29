# Phase 23: i18n Foundation - Research

**Researched:** 2026-04-23
**Domain:** Frontend internationalization (React + Vite)
**Confidence:** HIGH

## Summary

This phase implements UI internationalization for NewsHub using react-i18next, the industry standard for React i18n. The project already has partial infrastructure: Zustand store with `language: 'de' | 'en'` state, and locale-aware utility functions (`timeAgo`, `formatDate` in `src/lib/utils.ts`). The primary work involves: (1) installing and configuring react-i18next with namespace-based lazy loading, (2) extracting ~50+ component hardcoded strings into translation JSON files, (3) replacing the Settings page language toggle with a header dropdown (per D-04), and (4) integrating date-fns locales for consistent date formatting.

ICU MessageFormat support (D-09) requires the `i18next-icu` plugin for proper pluralization like `{count, plural, one {# article} other {# articles}}`. Browser language detection uses `i18next-browser-languagedetector`. The existing `newshub-storage` localStorage key (Zustand persist) should sync with i18next's language state to maintain a single source of truth.

**Primary recommendation:** Use react-i18next v17 with i18next-icu for ICU plurals, namespace-per-feature file organization, and Suspense-based lazy loading. Integrate with existing Zustand language state rather than duplicating storage.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Keys organized nested by page/feature (e.g., `settings.account.deleteAccount`, `dashboard.hero.stats`)
- **D-02:** Translations split into multiple namespace files per major feature: `common.json`, `settings.json`, `dashboard.json`, `auth.json` — enables lazy-loading per page
- **D-03:** Key naming convention: camelCase (matches JS/TS conventions, autocomplete-friendly)
- **D-04:** Switcher placed in header navigation only (not in Settings page)
- **D-05:** Visual style: Dropdown with text ("DE ▼") that expands to show language options — compact, familiar pattern
- **D-06:** Dates displayed as relative + absolute hybrid: "5 min ago" for recent, "23. Apr 2026" for older
- **D-07:** Numbers formatted according to UI language (DE: 1.234,56 | EN: 1,234.56)
- **D-08:** Fallback language: English (more widely understood than German)
- **D-09:** Pluralization: ICU MessageFormat (`{count, plural, one {# article} other {# articles}}`)

### Claude's Discretion
- Exact threshold for relative vs absolute date display (e.g., 24h, 7d)
- Translation file directory structure within `src/`
- Whether to use i18next-browser-languagedetector or custom detection
- Loading indicator while translations load

### Deferred Ideas (OUT OF SCOPE)
- **Preferred source language for articles** — Fetch English versions of Russian/Chinese content when available (enhancement to translation service, not UI i18n)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| I18N-01 | User kann UI-Sprache uber Sprachumschalter andern | Header dropdown component (D-04, D-05), i18next `changeLanguage()` API, Zustand sync |
| I18N-02 | Alle UI-Texte sind ubersetzbar (DE, EN, weitere Sprachen vorbereitet) | react-i18next `useTranslation` hook, namespace files per feature (D-02), ICU plurals (D-09) |
| I18N-03 | Browser-Sprache wird automatisch erkannt und angewendet | i18next-browser-languagedetector plugin, localStorage fallback |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Translation strings | Browser / Client | — | UI text is purely client-side, no SSR in this project |
| Language detection | Browser / Client | — | Browser `navigator.language` API, localStorage persistence |
| Date/number formatting | Browser / Client | — | `Intl.DateTimeFormat` and `Intl.NumberFormat` run in browser |
| Language switcher UI | Browser / Client | — | React component in header |
| Translation file loading | CDN / Static | Browser / Client | JSON files served as static assets, fetched by i18next-http-backend |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard | Source |
|---------|---------|---------|--------------|--------|
| react-i18next | 17.0.4 | React i18n bindings | [VERIFIED: npm registry] Industry standard, hooks-based API, Suspense support |
| i18next | 26.0.7 | Core i18n framework | [VERIFIED: npm registry] Most mature JS i18n library, 10M+ weekly downloads |
| i18next-icu | 2.4.3 | ICU MessageFormat plugin | [VERIFIED: npm registry] Required for D-09 pluralization syntax |
| intl-messageformat | 11.2.1 | ICU parser (peer dep) | [VERIFIED: npm registry] Peer dependency of i18next-icu |

### Supporting
| Library | Version | Purpose | When to Use | Source |
|---------|---------|---------|-------------|--------|
| i18next-browser-languagedetector | 8.2.1 | Auto-detect browser language | [VERIFIED: npm registry] I18N-03 requirement, uses `navigator.language` |
| i18next-http-backend | 3.0.6 | Lazy load translation files | [VERIFIED: npm registry] Enables namespace-based code splitting (D-02) |

### Existing (No Install Needed)
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| date-fns | 4.1.0 | Date formatting with locales | [VERIFIED: package.json] Already installed, has `de` and `en` locales |
| zustand | 5.0.11 | State management | [VERIFIED: package.json] Already manages `language` state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-i18next | react-intl (FormatJS) | react-intl has native ICU but heavier API; react-i18next more flexible, better Suspense |
| i18next-icu | i18next native plurals | Native plurals use `_one`/`_other` suffixes; ICU is more standard and D-09 specifies ICU |
| i18next-http-backend | Bundled translations | Bundled is simpler but increases initial bundle size; HTTP backend enables lazy loading |

**Installation:**
```bash
npm install react-i18next@17 i18next@26 i18next-icu@2 intl-messageformat@11 i18next-browser-languagedetector@8 i18next-http-backend@3
```

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Browser                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────┐     ┌──────────────────┐     ┌─────────────────────────┐   │
│  │  App.tsx   │────>│  I18nextProvider │────>│  React Component Tree   │   │
│  │  (entry)   │     │  (context)       │     │                         │   │
│  └────────────┘     └────────┬─────────┘     │  ┌─────────────────┐    │   │
│                              │               │  │ useTranslation  │    │   │
│  ┌────────────┐              │               │  │ t('key')        │────┼───┤
│  │ i18n.ts    │<─────────────┘               │  └─────────────────┘    │   │
│  │ (config)   │                              │                         │   │
│  └─────┬──────┘                              │  ┌─────────────────┐    │   │
│        │                                     │  │ LanguageSwitcher│    │   │
│        │ init()                              │  │ (Header)        │────┼───┤
│        │                                     │  └─────────────────┘    │   │
│        ▼                                     └─────────────────────────┘   │
│  ┌─────────────────────────────────┐                                        │
│  │           i18next               │                                        │
│  │  ┌─────────┐  ┌──────────────┐  │         ┌─────────────────────────┐   │
│  │  │   ICU   │  │LanguageDetect│  │         │     Zustand Store       │   │
│  │  │ Plugin  │  │   Plugin     │──┼────────>│  language: 'de' | 'en'  │   │
│  │  └─────────┘  └──────────────┘  │  sync   │  setLanguage()          │   │
│  │  ┌─────────────────────────────┐│         └─────────────────────────┘   │
│  │  │     HTTP Backend Plugin     ││                     │                  │
│  │  └──────────────┬──────────────┘│                     │                  │
│  └─────────────────┼───────────────┘                     │                  │
│                    │ fetch                               │                  │
│                    ▼                                     ▼                  │
│  ┌─────────────────────────────────┐         ┌─────────────────────────┐   │
│  │  /public/locales/{lang}/{ns}.json│         │   localStorage          │   │
│  │  ├── en/                        │         │   newshub-storage       │   │
│  │  │   ├── common.json            │         │   (language persisted)  │   │
│  │  │   ├── settings.json          │         └─────────────────────────┘   │
│  │  │   ├── dashboard.json         │                                        │
│  │  │   └── auth.json              │                                        │
│  │  └── de/                        │                                        │
│  │      └── ...                    │                                        │
│  └─────────────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

Per D-02, translations split by feature with namespace lazy loading:

```
src/
├── i18n/
│   └── i18n.ts              # i18next configuration
├── components/
│   └── LanguageSwitcher.tsx # Header dropdown (D-04, D-05)
├── lib/
│   └── formatters.ts        # Locale-aware number/date formatters
└── ...

public/
└── locales/
    ├── en/
    │   ├── common.json      # Shared strings (buttons, errors, navigation)
    │   ├── settings.json    # Settings page strings
    │   ├── dashboard.json   # Dashboard/NewsFeed strings
    │   ├── auth.json        # Login/register strings
    │   ├── community.json   # Community page strings
    │   ├── profile.json     # Profile page strings
    │   └── events.json      # EventMap/Timeline strings
    └── de/
        ├── common.json
        ├── settings.json
        └── ...
```

### Pattern 1: i18next Configuration with ICU

**What:** Core i18next setup with all required plugins
**When to use:** App initialization (import in main.tsx)

```typescript
// Source: react.i18next.com/misc/using-with-icu-format [CITED]
// src/i18n/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(ICU)                    // ICU MessageFormat (D-09)
  .use(Backend)                // Lazy load from /public/locales
  .use(LanguageDetector)       // Auto-detect browser language (I18N-03)
  .use(initReactI18next)       // React bindings
  .init({
    fallbackLng: 'en',         // D-08: English fallback
    supportedLngs: ['de', 'en'],
    ns: ['common'],            // Default namespace
    defaultNS: 'common',

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'newshub-language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,      // React handles XSS
    },

    react: {
      useSuspense: true,       // Enable Suspense for loading
    },
  });

export default i18n;
```

### Pattern 2: useTranslation Hook with Namespaces

**What:** Component-level translation loading
**When to use:** Every component that displays user-facing text

```typescript
// Source: react.i18next.com/latest/using-with-hooks [CITED]
// Per D-01: nested keys, D-02: namespace loading
import { useTranslation } from 'react-i18next';

function SettingsPage() {
  // Load 'settings' namespace, falls back to 'common' for shared strings
  const { t } = useTranslation(['settings', 'common']);

  return (
    <div>
      <h1>{t('settings:account.title')}</h1>
      <button>{t('common:buttons.save')}</button>
      {/* ICU plural (D-09) */}
      <p>{t('settings:history.articleCount', { count: 42 })}</p>
    </div>
  );
}
```

### Pattern 3: Zustand + i18next Sync

**What:** Keep Zustand language state in sync with i18next
**When to use:** Language switcher and app initialization

```typescript
// Integration pattern for existing store
import i18n from '../i18n/i18n';
import { useAppStore } from '../store';

// Sync on i18next language change
i18n.on('languageChanged', (lng) => {
  const setLanguage = useAppStore.getState().setLanguage;
  setLanguage(lng as 'de' | 'en');
});

// Sync on store change (for persistence)
useAppStore.subscribe(
  (state) => state.language,
  (language) => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }
);
```

### Pattern 4: Locale-Aware Date Formatting

**What:** Hybrid relative/absolute date display per D-06
**When to use:** Article timestamps, history entries

```typescript
// src/lib/formatters.ts
import { formatDistance, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import i18n from '../i18n/i18n';

const locales = { de, en: enUS };

// D-06: Relative for recent, absolute for older
// Claude's discretion: 7 days threshold
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const locale = locales[i18n.language as keyof typeof locales] || enUS;

  if (diffMs < sevenDays) {
    // Relative: "5 min ago" / "vor 5 Min."
    return formatDistance(d, now, { addSuffix: true, locale });
  }

  // Absolute: "23. Apr 2026" (DE) / "Apr 23, 2026" (EN)
  const pattern = i18n.language === 'de' ? 'd. MMM yyyy' : 'MMM d, yyyy';
  return format(d, pattern, { locale });
}

// D-07: Locale-aware number formatting
export function formatNumber(value: number): string {
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale).format(value);
}
```

### Pattern 5: Language Switcher Dropdown

**What:** Header language switcher per D-04, D-05
**When to use:** Header.tsx component

```typescript
// src/components/LanguageSwitcher.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

const languages = [
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'en', label: 'English', flag: 'EN' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-cyber py-1.5 px-3 rounded-md text-[10px] flex items-center gap-1.5"
      >
        <Globe className="h-3.5 w-3.5" />
        {currentLang.flag}
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 py-1 w-32 rounded-lg bg-gray-800 border border-gray-700 shadow-lg z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors',
                i18n.language === lang.code ? 'text-[#00f0ff]' : 'text-gray-300'
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Hardcoded language checks:** Don't use `language === 'de' ? 'German text' : 'English text'`. Use `t('key')` instead. 20 files currently have this pattern and must be refactored.
- **Duplicate language state:** Don't store language in both Zustand and i18next independently. Sync them via listeners or use i18next as source of truth.
- **Loading all namespaces upfront:** Don't load all translation files in i18n.ts init. Use namespace arrays in `useTranslation(['ns1', 'ns2'])` for lazy loading.
- **Missing Suspense boundaries:** Components using `useTranslation` will suspend. Wrap pages with `<Suspense fallback={...}>` or disable with `useSuspense: false`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| String interpolation | Template literals with locale checks | `t('key', { name })` | ICU MessageFormat handles plurals, select, numbers |
| Plural forms | if/else for count variations | ICU `{count, plural, ...}` | German/English plural rules are different, ICU handles correctly |
| Date locale switching | Custom locale maps in each component | date-fns locales + i18n.language | Consistent locale handling, tree-shakeable |
| Number formatting | `toFixed()` + string replace for separators | `Intl.NumberFormat` | Handles DE (1.234,56) vs EN (1,234.56) correctly |
| Language detection | `navigator.language` parsing | i18next-browser-languagedetector | Handles fallbacks, region codes, caching |

**Key insight:** i18next's ICU plugin handles the complexity of pluralization rules per language (German doesn't have the same plural categories as English). Rolling your own leads to grammatically incorrect translations.

## Common Pitfalls

### Pitfall 1: SSR/Hydration Mismatch
**What goes wrong:** Server renders in one language, client detects different language, React hydration fails
**Why it happens:** Language detection runs on client only
**How to avoid:** This is a Vite SPA (no SSR), so not applicable. If SSR is added later, use `i18next-fs-backend` on server.
**Warning signs:** React hydration warnings mentioning text content mismatch

### Pitfall 2: Namespace Loading Race Condition
**What goes wrong:** Component renders before its namespace is loaded, shows translation keys
**Why it happens:** `useSuspense: true` but no Suspense boundary
**How to avoid:** Wrap lazy-loaded pages with `<Suspense>` (already done in App.tsx), or load critical namespaces in init
**Warning signs:** Seeing `common:buttons.save` instead of "Save"

### Pitfall 3: Zustand/i18next Desync
**What goes wrong:** Zustand says 'de', i18next says 'en', UI shows mixed languages
**Why it happens:** Two sources of truth for language state
**How to avoid:** Use i18next as single source of truth, sync to Zustand only for persistence
**Warning signs:** Settings page shows correct language but other pages don't

### Pitfall 4: ICU Syntax in JSX
**What goes wrong:** Curly braces in ICU syntax conflict with JSX interpolation
**Why it happens:** `{` and `}` are reserved in JSX
**How to avoid:** Keep ICU syntax in JSON files only, never in JSX. Use `t('key', { count })` to pass values.
**Warning signs:** JSX syntax errors when trying to inline ICU strings

### Pitfall 5: Missing Translation Keys
**What goes wrong:** New features added without translation keys, fall back to English or show keys
**Why it happens:** Developer forgets to add German translation
**How to avoid:** Use TypeScript type generation for translation keys (i18next-resources-to-backend), lint for missing keys
**Warning signs:** German users seeing English text or `settings.newFeature.title`

## Code Examples

### Translation JSON Structure (ICU Format)

```json
// public/locales/en/common.json
// Source: ICU MessageFormat Guide [CITED: phrase.com/blog/posts/guide-to-the-icu-message-format/]
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm"
  },
  "errors": {
    "generic": "Something went wrong",
    "network": "Network error. Please try again."
  },
  "time": {
    "justNow": "Just now",
    "minutesAgo": "{count, plural, one {# minute ago} other {# minutes ago}}",
    "hoursAgo": "{count, plural, one {# hour ago} other {# hours ago}}",
    "daysAgo": "{count, plural, one {# day ago} other {# days ago}}"
  },
  "articles": {
    "count": "{count, plural, =0 {No articles} one {# article} other {# articles}}",
    "available": "{count} of {total} articles available"
  }
}
```

```json
// public/locales/de/common.json
{
  "buttons": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Loschen",
    "confirm": "Bestatigen"
  },
  "errors": {
    "generic": "Etwas ist schiefgelaufen",
    "network": "Netzwerkfehler. Bitte erneut versuchen."
  },
  "time": {
    "justNow": "Gerade eben",
    "minutesAgo": "{count, plural, one {vor # Minute} other {vor # Minuten}}",
    "hoursAgo": "{count, plural, one {vor # Stunde} other {vor # Stunden}}",
    "daysAgo": "{count, plural, one {vor # Tag} other {vor # Tagen}}"
  },
  "articles": {
    "count": "{count, plural, =0 {Keine Artikel} one {# Artikel} other {# Artikel}}",
    "available": "{count} von {total} Artikeln verfugbar"
  }
}
```

### Refactoring Existing Component

```typescript
// BEFORE: src/pages/Bookmarks.tsx (hardcoded German)
<h1 className="text-2xl font-bold text-white">Gespeicherte Artikel</h1>
<p className="text-gray-400">
  Deine markierten Artikel zum spateren Lesen.
</p>

// AFTER: src/pages/Bookmarks.tsx (i18n)
import { useTranslation } from 'react-i18next';

export function Bookmarks() {
  const { t } = useTranslation(['bookmarks', 'common']);

  // ...

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">
        {t('bookmarks:title')}
      </h1>
      <p className="text-gray-400">
        {t('bookmarks:description')}
      </p>
      {/* With ICU plural */}
      <p className="text-sm text-gray-500">
        {t('common:articles.available', { count: articles?.length || 0, total: bookmarkedArticles.length })}
      </p>
    </div>
  );
}
```

### Test Helper for i18n

```typescript
// src/test/i18n-test-utils.tsx
// Source: [ASSUMED] Common testing pattern for react-i18next
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Create test i18n instance with inline resources
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      common: {
        'buttons.save': 'Save',
        'buttons.cancel': 'Cancel',
      },
    },
    de: {
      common: {
        'buttons.save': 'Speichern',
        'buttons.cancel': 'Abbrechen',
      },
    },
  },
  interpolation: { escapeValue: false },
});

export function TestI18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>;
}

export { testI18n };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-intl (FormatJS) | react-i18next | 2020+ | i18next has better lazy loading, smaller bundle |
| JSON keys like "greeting.hello" | Natural language keys "Hello, {name}" | Ongoing debate | Both valid; we use structured keys per D-01 |
| Manual language detection | i18next-browser-languagedetector | Always preferred | Handles edge cases (region codes, fallbacks) |
| Moment.js for dates | date-fns | 2020+ | Tree-shakeable, smaller bundle |

**Deprecated/outdated:**
- react-intl 2.x: Old API, replaced by FormatJS v3+
- i18next-xhr-backend: Deprecated, replaced by i18next-http-backend

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 7-day threshold for relative vs absolute date display is appropriate | Pattern 4: Locale-Aware Date Formatting | Users may prefer different threshold; easily adjustable constant |
| A2 | `public/locales/` is the correct directory for translation files | Recommended Project Structure | Vite serves `public/` as static; alternative would be `src/locales/` with import |
| A3 | Test helper pattern for i18n is standard | Code Examples - Test Helper | May need adjustment based on vitest/jsdom specifics |

## Open Questions

1. **Translation file bundling vs HTTP loading**
   - What we know: HTTP backend enables lazy loading, bundling is simpler
   - What's unclear: Is network latency acceptable for translation loading?
   - Recommendation: Use HTTP backend per D-02, add preload for `common` namespace

2. **Existing `timeAgo` and `formatDate` functions**
   - What we know: `src/lib/utils.ts` has locale-aware functions already
   - What's unclear: Should these be replaced with date-fns or kept and enhanced?
   - Recommendation: Replace with date-fns for consistency with i18next locale

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| date-fns | Date formatting | Yes | 4.1.0 | — |
| Zustand | Language state | Yes | 5.0.11 | — |
| React 19 | useTranslation hook | Yes | 19.2.0 | — |
| Vite | Static file serving | Yes | 8.0.8 | — |

No missing dependencies.

## Security Domain

> `security_enforcement` not explicitly set to false in config.json, so including security analysis.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Yes | Translation interpolation uses i18next escaping |
| V6 Cryptography | No | — |

### Known Threat Patterns for i18n

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via translation interpolation | Tampering | i18next `escapeValue: false` is safe because React escapes by default |
| Translation key injection | Information Disclosure | Keys come from code, not user input; no risk |
| Locale spoofing | Spoofing | Low impact; only affects UI language preference |

## Sources

### Primary (HIGH confidence)
- [npm registry] react-i18next@17.0.4, i18next@26.0.7, i18next-icu@2.4.3 - version verification
- [react.i18next.com/misc/using-with-icu-format] - ICU plugin configuration
- [react.i18next.com/guides/multiple-translation-files] - namespace organization
- [react.i18next.com/latest/using-with-hooks] - useTranslation API

### Secondary (MEDIUM confidence)
- [MDN Intl.NumberFormat] - locale-aware number formatting
- [date-fns GitHub docs/i18n.md] - locale usage with formatDistance
- [phrase.com/blog/posts/guide-to-the-icu-message-format/] - ICU syntax reference

### Tertiary (LOW confidence)
- Test helper pattern - based on common practices, not official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against npm registry
- Architecture: HIGH - Patterns from official documentation
- Pitfalls: MEDIUM - Based on common issues, not project-specific testing

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days - react-i18next is stable)
