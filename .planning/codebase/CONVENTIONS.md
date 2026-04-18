# Coding Conventions

**Analysis Date:** 2026-04-18

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `NewsCard.tsx`, `ErrorBoundary.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useKeyboardShortcuts.ts`, `useCachedQuery.ts`)
- Utilities: camelCase (e.g., `utils.ts`, `mapCentering.ts`)
- Tests: `{filename}.test.ts` or `{filename}.test.tsx`
- E2E tests: `{feature}.spec.ts`
- Services (backend): camelCase (e.g., `aiService.ts`, `authService.ts`)
- Routes (backend): camelCase (e.g., `news.ts`, `auth.ts`)
- Types: camelCase in `index.ts` or feature-specific files

**Functions:**
- camelCase for all functions: `formatDate()`, `getSentimentColor()`, `generateClusterSummary()`
- Boolean getters: `is` prefix (`isBookmarked()`, `isAvailable()`, `isValidEmail()`)
- Event handlers: `handle` prefix (`handleKeyDown()`, `handleTranslate()`, `handleAnalyze()`)
- Factory functions: `getMock` prefix (`getMockNewsArticle()`, `getMockGeoEvent()`)

**Variables:**
- camelCase for all variables: `articleIds`, `cacheKey`, `responseText`
- Boolean variables: `is` or `has` prefix (`isTranslating`, `hasTranslation`, `hasCompletedOnboarding`)
- Constants: UPPER_SNAKE_CASE (`CACHE_TTL`, `JWT_SECRET`, `MIN_PASSWORD_LENGTH`)

**Types:**
- PascalCase for interfaces and types: `NewsArticle`, `FilterState`, `PerspectiveRegion`
- Props interfaces: `{ComponentName}Props` (e.g., `NewsCardProps`, `ErrorBoundaryProps`)
- State interfaces: `{ComponentName}State` (e.g., `ErrorBoundaryState`)
- Union types for enums: `type Sentiment = 'positive' | 'negative' | 'neutral'`

## Code Style

**Formatting:**
- No dedicated Prettier config (uses ESLint defaults)
- Single quotes for strings
- Semicolons at line end
- 2-space indentation
- Trailing commas in multi-line structures

**Linting:**
- ESLint with flat config (`eslint.config.js`)
- TypeScript ESLint for type checking
- React Hooks plugin (enforces hooks rules)
- React Refresh plugin (Vite HMR compatibility)

**Key ESLint Rules:**
```javascript
// eslint.config.js
js.configs.recommended,
tseslint.configs.recommended,
reactHooks.configs.flat.recommended,
reactRefresh.configs.vite,
```

**TypeScript Configuration:**
- Strict mode enabled
- `noUnusedLocals` and `noUnusedParameters` enforced
- `verbatimModuleSyntax` for explicit type imports
- ES2022 target (frontend), ES2023 (backend)

## Import Organization

**Order:**
1. React/framework imports (`import { useState } from 'react'`)
2. External library imports (`import { z } from 'zod'`)
3. Internal absolute imports (`import type { NewsArticle } from '../types'`)
4. Relative imports (`import { cn } from '../lib/utils'`)
5. Type-only imports use `import type { ... }` syntax

**Example:**
```typescript
import { useState, useCallback, useEffect } from 'react';
import { Bookmark, ExternalLink, Globe } from 'lucide-react';
import { cn, timeAgo, getRegionColor } from '../lib/utils';
import { useAppStore } from '../store';
import type { NewsArticle } from '../types';
```

**Path Aliases:**
- None configured - relative imports used throughout
- Types imported from `../types` or `../../src/types`

## Error Handling

**Frontend Patterns:**
```typescript
// Try-catch with user-friendly fallback
try {
  const response = await fetch('/api/ai/propaganda', { ... });
  if (!response.ok) throw new Error('Failed to analyze article');
  const data = await response.json();
  setPropagandaAnalysis(data);
} catch {
  setAnalysisError('Analysis failed. Please try again.');
} finally {
  setIsAnalyzing(false);
}
```

**Backend Patterns:**
```typescript
// Express route error handling
try {
  const authResult = await authService.register(email, password, name);
  res.status(201).json({ success: true, data: authResult });
} catch (err) {
  res.status(400).json({
    success: false,
    error: err instanceof Error ? err.message : 'Registration failed',
  });
}
```

**ErrorBoundary:**
- Class component for React error boundaries
- Logs errors to console with component stack
- Provides "RELOAD PAGE" and "GO BACK" actions

## Logging

**Framework:** Winston (backend), console (frontend/errors)

**Backend Patterns:**
```typescript
import logger from '../utils/logger';

logger.info('✓ Gemini client initialized (Free Tier)');
logger.warn('⚠ AI Service: No API key found');
logger.error('AI summary generation failed:', err);
logger.debug(`OpenRouter ${model} unavailable, trying next model`);
```

**Frontend Patterns:**
- `console.error('[ErrorBoundary] Caught error:', error, errorInfo)`
- Debug logs with `[DEBUG]` prefix in routes

## Comments

**When to Comment:**
- JSDoc for factory functions and complex utilities
- Section headers for code organization
- Brief inline comments for non-obvious logic

**JSDoc Style:**
```typescript
/**
 * Factory functions for creating mock test data
 * Pattern: getMockX(overrides?: Partial<X>) => X
 */

/**
 * Reset the ID counter (useful for deterministic tests)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}
```

**Section Headers:**
```typescript
// ==========================================
// NewsSource Factory
// ==========================================
```

## Function Design

**Size:**
- Target: <50 lines per function
- Complex functions broken into private helpers
- Single responsibility principle

**Parameters:**
- Use object destructuring for multiple optional params
- Optional params use `?` syntax or default values
- Override pattern for factories: `overrides?: Partial<T>`

**Return Values:**
- Explicit return types on public functions
- `null` for "not found" cases
- `ApiResponse<T>` wrapper for API responses

**Example Patterns:**
```typescript
// Factory with overrides
export function getMockNewsArticle(overrides?: Partial<NewsArticle>): NewsArticle {
  return { ...defaults, ...overrides };
}

// Singleton service pattern
static getInstance(): AIService {
  if (!AIService.instance) {
    AIService.instance = new AIService();
  }
  return AIService.instance;
}
```

## Module Design

**Exports:**
- Named exports preferred over default exports
- Components export as named: `export function NewsCard() { ... }`
- Types export with `export type` or `export interface`
- Re-export patterns for test utilities: `export * from '@testing-library/react'`

**Barrel Files:**
- `src/types/index.ts` exports all type definitions
- Test utilities re-export testing-library functions

## State Management

**Zustand Store Pattern:**
```typescript
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // State
      theme: 'dark',

      // Actions (immutable updates)
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      // Derived (using get())
      isBookmarked: (articleId) => get().bookmarkedArticles.includes(articleId),
    }),
    { name: 'newshub-storage' }
  )
);
```

**Immutability Rules:**
- Always spread existing state before updates
- Use filter/map for array modifications (never mutate)
- Nested updates create new objects at each level

## Input Validation

**Backend with Zod:**
```typescript
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter'),
  name: z.string().min(2).max(100),
});

// In route handler
const result = registerSchema.safeParse(req.body);
if (!result.success) {
  res.status(400).json({ success: false, error: formatZodError(result.error) });
  return;
}
```

## API Response Pattern

**Standard Response Shape:**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}
```

**Success:**
```typescript
res.json({ success: true, data: articles, meta: { total, page, limit, hasMore } });
```

**Error:**
```typescript
res.status(404).json({ success: false, error: 'Article not found' });
```

## Component Patterns

**Props Definition:**
```typescript
interface NewsCardProps {
  article: NewsArticle;
  onTranslate?: (articleId: string, targetLang: 'de' | 'en') => Promise<NewsArticle | null>;
}

export function NewsCard({ article, onTranslate }: NewsCardProps) { ... }
```

**Graceful Degradation:**
```typescript
const { data, error } = useQuery({ queryKey: ['data'], queryFn: fetchData });
if (error) return null;  // Don't break the page
if (!data) return null;
```

**Class Utility (Tailwind):**
```typescript
import { cn } from '../lib/utils';
className={cn('base-class', isActive && 'active-class', variant)}
```

---

*Convention analysis: 2026-04-18*
