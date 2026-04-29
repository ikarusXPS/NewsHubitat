# Phase 23: i18n Foundation - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/i18n/i18n.ts` | config | request-response | `src/store/index.ts` | role-match |
| `src/components/LanguageSwitcher.tsx` | component | event-driven | `src/components/FocusSelector.tsx` | exact |
| `src/components/Header.tsx` | component | event-driven | (self - modification) | exact |
| `src/lib/formatters.ts` | utility | transform | `src/lib/utils.ts` | exact |
| `src/test/i18nTestUtils.tsx` | test-utility | transform | `src/test/testUtils.tsx` | exact |
| `public/locales/en/common.json` | config | static | N/A (new pattern) | N/A |
| `public/locales/de/common.json` | config | static | N/A (new pattern) | N/A |
| `public/locales/en/settings.json` | config | static | N/A (new pattern) | N/A |
| `public/locales/de/settings.json` | config | static | N/A (new pattern) | N/A |
| `src/pages/Settings.tsx` | page | request-response | (self - modification) | exact |
| `src/pages/Bookmarks.tsx` | page | request-response | (self - modification) | exact |
| `src/App.tsx` | provider | request-response | (self - modification) | exact |

## Pattern Assignments

### `src/i18n/i18n.ts` (config, request-response)

**Analog:** `src/store/index.ts`

**Purpose:** Core i18next configuration with plugins. This file initializes i18n similar to how the store initializes Zustand.

**Imports pattern** (lines 1-7):
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterState, PerspectiveRegion, Sentiment } from '../types';
import type { FocusPreset } from '../types/focus';
import type { FeedState, ReadState, CustomFeed, ReadingHistoryEntry } from '../types/feeds';
import { detectDefaultRegions } from '../utils/regionDetection';
import { defaultFeedState, defaultReadState } from '../types/feeds';
```

**Recommended imports for i18n.ts:**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
```

**Configuration pattern** (store lines 93-105):
```typescript
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      // Language
      language: 'de',
      setLanguage: (lang) => set({ language: lang }),
```

**Persist/localStorage pattern** (store lines 372-388):
```typescript
    {
      name: 'newshub-storage',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        commandPaletteEnabled: state.commandPaletteEnabled,
        bookmarkedArticles: state.bookmarkedArticles,
        readingHistory: state.readingHistory,
        isHistoryPaused: state.isHistoryPaused,
        isPersonalizationEnabled: state.isPersonalizationEnabled,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        activeFocusPreset: state.activeFocusPreset,
        customPresets: state.customPresets,
        feedState: state.feedState,
        readState: state.readState,
      }),
    }
```

---

### `src/components/LanguageSwitcher.tsx` (component, event-driven)

**Analog:** `src/components/FocusSelector.tsx`

**Purpose:** Header dropdown for language switching. FocusSelector is the exact pattern to copy for a compact dropdown in the header.

**Imports pattern** (lines 1-6):
```typescript
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { FOCUS_PRESETS } from '../config/focusPresets';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
```

**Dropdown state pattern** (lines 8-11):
```typescript
export function FocusSelector() {
  const { activeFocusPreset, setActiveFocus } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
```

**Click outside handler** (lines 13-25):
```typescript
  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
```

**Trigger button pattern** (lines 41-63):
```typescript
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-mono transition-all',
          'bg-[#0a0e1a]/90 backdrop-blur-sm',
          isOpen
            ? 'border-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
            : 'border-[#00f0ff]/30 hover:border-[#00f0ff]/50'
        )}
        style={{
          borderColor: isOpen ? currentPreset.color : undefined,
        }}
      >
        <span className="text-base">{currentPreset.icon}</span>
        <span className="text-[#00f0ff] hidden sm:inline">{currentPreset.name}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[#00f0ff]/70 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
```

**Dropdown panel pattern** (lines 66-81):
```typescript
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[#00f0ff]/20 bg-[#0a0e1a]/95 backdrop-blur-xl shadow-2xl z-50"
            style={{ boxShadow: '0 0 30px rgba(0,240,255,0.2)' }}
          >
            {/* Header */}
            <div className="border-b border-[#00f0ff]/10 px-4 py-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#00f0ff]/70">
                Focus Presets
              </h3>
            </div>
```

**Selection item pattern** (lines 86-102):
```typescript
                {FOCUS_PRESETS.map((preset) => {
                  const isActive = activeFocusPreset?.id === preset.id;

                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetClick(preset)}
                      className={cn(
                        'group relative flex items-start gap-3 rounded-md p-3 text-left transition-all',
                        isActive
                          ? 'bg-[rgba(0,240,255,0.1)] border border-[#00f0ff]/30'
                          : 'border border-transparent hover:bg-white/5 hover:border-[#00f0ff]/20'
                      )}
```

---

### `src/components/Header.tsx` (component, event-driven) - MODIFICATION

**Analog:** Self (current implementation)

**Purpose:** Add LanguageSwitcher component, replace simple toggle button.

**Current language toggle** (lines 116-123):
```typescript
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
            className="btn-cyber py-1.5 px-3 rounded-md text-[10px]"
          >
            <Globe className="h-3.5 w-3.5 inline mr-1.5" />
            {language.toUpperCase()}
          </button>
```

**Replace with:**
```typescript
          {/* Language Switcher */}
          <LanguageSwitcher />
```

**Imports to add:**
```typescript
import { LanguageSwitcher } from './LanguageSwitcher';
```

---

### `src/lib/formatters.ts` (utility, transform)

**Analog:** `src/lib/utils.ts`

**Purpose:** Locale-aware date and number formatting functions integrated with i18next.

**Imports pattern** (lines 1-2):
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
```

**Date formatting pattern** (lines 8-17):
```typescript
export function formatDate(date: Date | string, locale = 'de-DE'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

**Time ago pattern** (lines 19-32):
```typescript
export function timeAgo(date: Date | string, locale = 'de'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return locale === 'de' ? 'Gerade eben' : 'Just now';
  if (diffMins < 60) return locale === 'de' ? `vor ${diffMins} Min.` : `${diffMins}m ago`;
  if (diffHours < 24) return locale === 'de' ? `vor ${diffHours} Std.` : `${diffHours}h ago`;
  if (diffDays < 7) return locale === 'de' ? `vor ${diffDays} Tagen` : `${diffDays}d ago`;
  return formatDate(d, locale === 'de' ? 'de-DE' : 'en-US');
}
```

**Recommended replacement using date-fns:**
```typescript
import { formatDistance, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import i18n from '../i18n/i18n';

const locales = { de, en: enUS };

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const locale = locales[i18n.language as keyof typeof locales] || enUS;

  if (diffMs < sevenDays) {
    return formatDistance(d, now, { addSuffix: true, locale });
  }

  const pattern = i18n.language === 'de' ? 'd. MMM yyyy' : 'MMM d, yyyy';
  return format(d, pattern, { locale });
}

export function formatNumber(value: number): string {
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale).format(value);
}
```

---

### `src/test/i18nTestUtils.tsx` (test-utility, transform)

**Analog:** `src/test/testUtils.tsx`

**Purpose:** Test utilities for components using i18n. Extends existing test utilities pattern.

**Provider wrapper pattern** (lines 133-147):
```typescript
function AllProviders({
  children,
  queryClient,
  route = '/',
  useBrowserRouter = false,
}: AllProvidersProps) {
  const Router = useBrowserRouter ? BrowserRouter : MemoryRouter;
  const routerProps = useBrowserRouter ? {} : { initialEntries: [route] };

  return (
    <QueryClientProvider client={queryClient}>
      <Router {...routerProps}>{children}</Router>
    </QueryClientProvider>
  );
}
```

**Custom render function pattern** (lines 169-204):
```typescript
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & {
  queryClient: QueryClient;
  user: ReturnType<typeof userEvent.setup>;
} {
  const {
    route = '/',
    useBrowserRouter = false,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  // Setup userEvent instance
  const user = userEvent.setup();

  const result = render(ui, {
    wrapper: ({ children }) => (
      <AllProviders
        queryClient={queryClient}
        route={route}
        useBrowserRouter={useBrowserRouter}
      >
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });

  return {
    ...result,
    queryClient,
    user,
  };
}
```

**Mock context pattern** (lines 70-81):
```typescript
export const mockAuthContext: MockAuthContextValue = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updatePreferences: async () => {},
  addBookmark: async () => {},
  removeBookmark: async () => {},
};
```

**Recommended i18n test utils:**
```typescript
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
```

---

### `src/App.tsx` (provider, request-response) - MODIFICATION

**Analog:** Self (current implementation)

**Purpose:** Wrap app with I18nextProvider for translation context.

**Current provider structure** (lines 158-181):
```typescript
  return (
    <QueryClientProvider client={queryClient}>
      <ConsentProvider>
        <AuthProvider>
          <BrowserRouter>
            {/* Show onboarding for first-time users */}
            {!hasCompletedOnboarding && <FocusOnboarding />}

            {/* Verification banner for unverified users */}
            <VerificationBanner />

            <Layout>
              <AppRoutes />
            </Layout>
            {/* Global Focus Suggestions - overlays on all pages */}
            <FocusSuggestions />

            {/* GDPR Consent Banner */}
            <ConsentBanner />
          </BrowserRouter>
        </AuthProvider>
      </ConsentProvider>
    </QueryClientProvider>
  );
```

**Modification pattern:**
```typescript
import './i18n/i18n'; // Initialize i18n before App renders

// ...existing imports...

export default function App() {
  // ...existing code...

  return (
    <QueryClientProvider client={queryClient}>
      <ConsentProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>  {/* Required for i18n lazy loading */}
              {/* ...existing children... */}
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ConsentProvider>
    </QueryClientProvider>
  );
}
```

---

### `src/pages/Bookmarks.tsx` (page, request-response) - MODIFICATION

**Analog:** Self (current implementation)

**Purpose:** Replace hardcoded German strings with `t()` calls.

**Current hardcoded strings** (lines 68-77):
```typescript
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Gespeicherte Artikel</h1>
        <p className="text-gray-400">
          Deine markierten Artikel zum spateren Lesen.
        </p>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bookmark className="mb-4 h-16 w-16 text-gray-500" />
          <p className="text-gray-400">Keine gespeicherten Artikel</p>
          <p className="mt-2 text-sm text-gray-500">
            Klicke auf das Lesezeichen-Symbol bei einem Artikel, um ihn zu speichern.
          </p>
```

**Refactoring pattern:**
```typescript
import { useTranslation } from 'react-i18next';

export function Bookmarks() {
  const { t } = useTranslation(['bookmarks', 'common']);
  // ...existing code...

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('bookmarks:title')}</h1>
      <p className="text-gray-400">
        {t('bookmarks:description')}
      </p>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bookmark className="mb-4 h-16 w-16 text-gray-500" />
        <p className="text-gray-400">{t('bookmarks:empty.title')}</p>
        <p className="mt-2 text-sm text-gray-500">
          {t('bookmarks:empty.description')}
        </p>
```

---

### `src/pages/Settings.tsx` (page, request-response) - MODIFICATION

**Analog:** Self (current implementation)

**Purpose:** Remove language toggle (D-04), replace hardcoded strings with `t()` calls.

**Current language section to REMOVE** (lines 506-531):
```typescript
        <div>
          <h2 className="text-base font-medium text-white mb-3">Sprache</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setLanguage('de')}
              className={cn(
                'rounded-lg border-2 px-6 py-3 transition-colors',
                language === 'de'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              )}
            >
              Deutsch
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                'rounded-lg border-2 px-6 py-3 transition-colors',
                language === 'en'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              )}
            >
              English
            </button>
          </div>
        </div>
```

**Current hardcoded strings** (lines 173, 478, 507, etc.):
```typescript
<h1 className="text-xl font-bold text-white font-mono">Einstellungen</h1>
<h2 className="text-base font-medium text-white mb-3">Erscheinungsbild</h2>
<h2 className="text-base font-medium text-white mb-3">Sprache</h2>
```

**Refactoring pattern:**
```typescript
import { useTranslation } from 'react-i18next';

export function Settings() {
  const { t } = useTranslation(['settings', 'common']);
  // ...existing code...

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white font-mono">{t('settings:title')}</h1>
        {/* ... */}
      </div>
      {/* Remove language section per D-04 */}
      {/* ... */}
    </div>
  );
}
```

---

## Shared Patterns

### useTranslation Hook Pattern
**Source:** react-i18next documentation
**Apply to:** All page and component files with user-facing text

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  // Load specific namespace(s), with common as fallback
  const { t } = useTranslation(['myNamespace', 'common']);

  return (
    <div>
      <h1>{t('myNamespace:title')}</h1>
      <button>{t('common:buttons.save')}</button>
      {/* ICU plural syntax */}
      <p>{t('common:articles.count', { count: articles.length })}</p>
    </div>
  );
}
```

### Zustand + i18next Sync Pattern
**Source:** RESEARCH.md Pattern 3
**Apply to:** `src/i18n/i18n.ts` and store integration

```typescript
// In i18n.ts after init
import { useAppStore } from '../store';

i18n.on('languageChanged', (lng) => {
  const setLanguage = useAppStore.getState().setLanguage;
  setLanguage(lng as 'de' | 'en');
});

// Optional: sync from store to i18n on store change
useAppStore.subscribe(
  (state) => state.language,
  (language) => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }
);
```

### Translation JSON Structure (ICU Format)
**Source:** RESEARCH.md Code Examples
**Apply to:** All `public/locales/{lang}/{ns}.json` files

```json
{
  "title": "Page Title",
  "description": "Page description text",
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "plurals": {
    "articleCount": "{count, plural, =0 {No articles} one {# article} other {# articles}}"
  },
  "interpolation": {
    "welcome": "Hello, {name}!"
  }
}
```

### CSS/Styling Pattern for Language Switcher
**Source:** `src/components/Header.tsx` (lines 116-123)
**Apply to:** `src/components/LanguageSwitcher.tsx`

```typescript
// Current button styling in Header
className="btn-cyber py-1.5 px-3 rounded-md text-[10px]"

// For dropdown, use FocusSelector pattern:
className={cn(
  'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-mono transition-all',
  'bg-[#0a0e1a]/90 backdrop-blur-sm',
  isOpen
    ? 'border-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
    : 'border-[#00f0ff]/30 hover:border-[#00f0ff]/50'
)}
```

---

## No Analog Found

Files with no close match in the codebase (use RESEARCH.md patterns):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `public/locales/en/common.json` | config | static | New i18n pattern, no JSON translation files exist yet |
| `public/locales/de/common.json` | config | static | New i18n pattern |
| `public/locales/en/settings.json` | config | static | New i18n pattern |
| `public/locales/de/settings.json` | config | static | New i18n pattern |
| `public/locales/en/dashboard.json` | config | static | New i18n pattern |
| `public/locales/de/dashboard.json` | config | static | New i18n pattern |
| `public/locales/en/auth.json` | config | static | New i18n pattern |
| `public/locales/de/auth.json` | config | static | New i18n pattern |

**Pattern to follow for JSON files:** See RESEARCH.md "Translation JSON Structure (ICU Format)" code example.

---

## Metadata

**Analog search scope:** `src/components/`, `src/pages/`, `src/lib/`, `src/store/`, `src/test/`
**Files scanned:** 94 components, 16 pages, 4 lib files, 1 store file, 4 test files
**Pattern extraction date:** 2026-04-23
