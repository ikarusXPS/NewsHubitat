# Testing Patterns

**Analysis Date:** 2026-04-18

## Test Framework

**Unit Testing Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`

**E2E Testing Runner:**
- Playwright 1.58.x
- Config: `playwright.config.ts`

**Assertion Library:**
- Vitest built-in assertions (`expect`)
- @testing-library/jest-dom for DOM matchers
- Playwright `expect` for E2E

**Run Commands:**
```bash
npm run test              # Run unit tests in watch mode
npm run test:run          # Run unit tests once (CI mode)
npm run test:coverage     # Coverage report with thresholds
npm run test:ui           # Vitest UI dashboard
npm run test:e2e          # Playwright headless
npm run test:e2e:headed   # Playwright with browser visible
npm run test:e2e:ui       # Playwright UI mode
```

## Test File Organization

**Unit Tests Location:**
- Co-located with source files
- Pattern: `src/**/*.test.{ts,tsx}`

**E2E Tests Location:**
- Separate `e2e/` directory at project root
- Pattern: `e2e/*.spec.ts`

**Test Utilities:**
- `src/test/setup.ts` - Global test setup
- `src/test/testUtils.tsx` - Custom render with providers
- `src/test/factories.ts` - Mock data factories
- `src/test/factories.test.ts` - Tests for factories themselves

**Directory Structure:**
```
src/
├── lib/
│   ├── utils.ts
│   └── utils.test.ts          # Co-located unit test
├── config/
│   ├── focusPresets.ts
│   └── focusPresets.test.ts   # Co-located unit test
├── utils/
│   ├── mapCentering.ts
│   └── mapCentering.test.ts   # Co-located unit test
└── test/
    ├── setup.ts               # Global Vitest setup
    ├── testUtils.tsx          # Custom render, providers
    ├── factories.ts           # Mock data factories
    └── factories.test.ts      # Factory tests
e2e/
├── auth.spec.ts               # Authentication flows
├── navigation.spec.ts         # Page navigation
├── monitor.spec.ts            # Monitor page
├── event-map.spec.ts          # Event map page
├── search.spec.ts             # Search functionality
└── timeline.spec.ts           # Timeline page
```

## Test Structure

**Unit Test Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('cn (classnames utility)', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toBe('base active');
  });
});
```

**E2E Test Suite Organization:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login button when not authenticated', async ({ page }) => {
    const loginButton = page.locator('button:has-text("Anmelden")');
    await expect(loginButton).toBeVisible();
  });
});
```

**Patterns:**
- Use `describe()` for grouping related tests
- Use `beforeEach()` for common setup
- Use `afterEach()` for cleanup (especially with mocks)
- Test names start with "should" or are descriptive phrases
- One assertion per test when practical

## Setup Files

**Global Test Setup (`src/test/setup.ts`):**
```typescript
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock matchMedia for components using media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
```

**Vitest Configuration (`vitest.config.ts`):**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,              // No need to import describe/it/expect
    environment: 'jsdom',       // DOM environment for React
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    pool: 'forks',
    testTimeout: 10000,
  },
});
```

## Custom Render Function

**renderWithProviders (`src/test/testUtils.tsx`):**
```typescript
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient; user: ReturnType<typeof userEvent.setup> } {
  const {
    route = '/',
    useBrowserRouter = false,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

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

  return { ...result, queryClient, user };
}
```

**Usage:**
```typescript
// Basic usage
const { getByText } = renderWithProviders(<MyComponent />);

// With initial route
renderWithProviders(<MyComponent />, { route: '/analysis' });

// With custom query client
const queryClient = createTestQueryClient();
renderWithProviders(<MyComponent />, { queryClient });
```

## Mocking

**Framework:** Vitest's built-in `vi` (API-compatible with Jest)

**Function Mocking:**
```typescript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn().mockReturnValue('mocked value');

// Spy on console
vi.spyOn(console, 'error').mockImplementation(() => {});

// Restore mocks
vi.restoreAllMocks();
```

**Timer Mocking:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-15T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

**Fetch Mocking (from testUtils):**
```typescript
// Success mock
export function mockFetch<T>(data: T, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  });
}

// Error mock
export function mockFetchError(message = 'Network error') {
  return vi.fn().mockRejectedValue(new Error(message));
}
```

**What to Mock:**
- External APIs (fetch calls)
- Browser APIs (matchMedia, ResizeObserver, IntersectionObserver)
- Timers and dates
- Complex dependencies with side effects

**What NOT to Mock:**
- React components under test
- Zustand store (use real store)
- React Router (use MemoryRouter)
- TanStack Query (use createTestQueryClient)

## Fixtures and Factories

**Factory Pattern (`src/test/factories.ts`):**
```typescript
/**
 * Factory functions for creating mock test data
 * Pattern: getMockX(overrides?: Partial<X>) => X
 */

let idCounter = 0;

function uniqueId(prefix = 'mock'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function getMockNewsArticle(overrides?: Partial<NewsArticle>): NewsArticle {
  const source = overrides?.source || getMockNewsSource();

  return {
    id: uniqueId('article'),
    title: 'Mock News Article Title',
    content: 'This is the mock content...',
    sentiment: 'neutral',
    sentimentScore: 0,
    source,
    perspective: source.region,
    topics: ['Politics', 'Economy'],
    entities: ['Germany', 'EU'],
    ...overrides,
  };
}
```

**Specialized Factories:**
```typescript
// Sentiment-specific
export function getMockPositiveArticle(overrides?: Partial<NewsArticle>): NewsArticle {
  return getMockNewsArticle({
    title: 'Positive News Development',
    sentiment: 'positive',
    sentimentScore: 0.7,
    ...overrides,
  });
}

// Region-specific
export function getMockArticleFromRegion(
  region: PerspectiveRegion,
  overrides?: Partial<NewsArticle>
): NewsArticle {
  const source = getMockNewsSource({ region });
  return getMockNewsArticle({ source, perspective: region, ...overrides });
}

// Cluster for comparison testing
export function getMockArticleCluster(
  topic: string,
  regions: PerspectiveRegion[]
): NewsArticle[] {
  return regions.map((region) =>
    getMockArticleFromRegion(region, { topics: [topic] })
  );
}
```

**Location:**
- All factories in `src/test/factories.ts`
- Import as needed in test files
- Call `resetIdCounter()` in `beforeEach` for deterministic IDs

## Coverage

**Requirements:**
- 80% threshold for statements, branches, functions, and lines
- Enforced in `vitest.config.ts`

**View Coverage:**
```bash
npm run test:coverage
```

**Coverage Exclusions:**
```typescript
exclude: [
  'node_modules/',
  'src/test/',       // Test utilities
  '**/*.d.ts',       // Type definitions
  '**/*.config.*',   // Config files
  '**/types/**',     // Type directories
],
```

## Test Types

**Unit Tests:**
- Pure function testing (utilities, helpers)
- Factory function validation
- State logic testing
- Location: `src/**/*.test.{ts,tsx}`

**Integration Tests:**
- Component rendering with providers
- React Query data fetching
- Zustand state interactions
- Location: `src/**/*.test.tsx`

**E2E Tests:**
- Full page navigation
- User authentication flows
- Feature workflows (search, filtering, etc.)
- Location: `e2e/*.spec.ts`

## Common Patterns

**Async Testing:**
```typescript
it('handles async operation', async () => {
  const { getByText, findByText } = renderWithProviders(<AsyncComponent />);

  // Wait for async content
  const result = await findByText('Loaded Content');
  expect(result).toBeInTheDocument();
});
```

**Error Testing:**
```typescript
it('shows error for invalid credentials', async () => {
  const { getByLabelText, getByRole, findByText } = renderWithProviders(<LoginForm />);

  await userEvent.type(getByLabelText('Email'), 'invalid@test.com');
  await userEvent.type(getByLabelText('Password'), 'wrong');
  await userEvent.click(getByRole('button', { name: /submit/i }));

  expect(await findByText(/error|invalid/i)).toBeInTheDocument();
});
```

**Timer Testing:**
```typescript
describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for less than a minute ago', () => {
    const date = new Date('2024-01-15T11:59:45');
    const result = timeAgo(date, 'en');
    expect(result).toBe('Just now');
  });
});
```

**Playwright Page Object Pattern:**
```typescript
test.describe('Monitor Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');
  });

  test('should load the Monitor page', async ({ page }) => {
    await expect(page).toHaveURL('/monitor');
    const heading = page.locator('h1');
    await expect(heading).toContainText('THE MONITOR');
  });

  test('should display view toggle buttons', async ({ page }) => {
    const globeButton = page.locator('button:has-text("3D Globe")');
    await expect(globeButton).toBeVisible();
  });
});
```

## Playwright Configuration

**Key Settings (`playwright.config.ts`):**
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**E2E Test Selectors:**
- Text selectors: `button:has-text("Anmelden")`
- Role selectors: `page.locator('[role="dialog"]')`
- CSS class selectors: `.glass-panel`, `.stat-box`
- Attribute selectors: `input[type="email"]`
- Combined selectors: `header button:has-text("Anmelden")`

## Writing New Tests

**Unit Test Checklist:**
1. Import from `vitest` and relevant utilities
2. Use `describe()` to group related tests
3. Use `beforeEach()` for setup, `afterEach()` for cleanup
4. One assertion per test when practical
5. Test both success and error cases
6. Use factories for test data
7. Mock external dependencies

**E2E Test Checklist:**
1. Import from `@playwright/test`
2. Set up page state in `beforeEach()`
3. Use `waitForLoadState('networkidle')` after navigation
4. Use readable selectors (text > CSS classes)
5. Add timeouts for async operations
6. Test user-visible behavior, not implementation

---

*Testing analysis: 2026-04-18*
