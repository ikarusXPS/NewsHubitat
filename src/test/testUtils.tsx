/**
 * Custom test utilities with all providers wrapped
 * Re-exports @testing-library/react for convenience
 */

import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };

// ==========================================
// Test QueryClient
// ==========================================

/**
 * Creates a fresh QueryClient for testing
 * - Disables retries for faster tests
 * - Disables caching to ensure fresh data
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ==========================================
// Mock Auth Context
// ==========================================

interface MockAuthContextValue {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    bookmarks: string[];
    preferences: {
      language: 'de' | 'en';
      theme: 'dark' | 'light';
      regions: string[];
    };
  } | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => void;
  updatePreferences: () => Promise<void>;
  addBookmark: () => Promise<void>;
  removeBookmark: () => Promise<void>;
}

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

export const mockAuthenticatedContext: MockAuthContextValue = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date().toISOString(),
    bookmarks: [],
    preferences: {
      language: 'de',
      theme: 'dark',
      regions: ['western', 'middle-east'],
    },
  },
  token: 'mock-jwt-token',
  isLoading: false,
  isAuthenticated: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updatePreferences: async () => {},
  addBookmark: async () => {},
  removeBookmark: async () => {},
};

// ==========================================
// Custom Render Options
// ==========================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for MemoryRouter */
  route?: string;
  /** Whether to use MemoryRouter (default) or BrowserRouter */
  useBrowserRouter?: boolean;
  /** Custom QueryClient instance */
  queryClient?: QueryClient;
  /** Initial auth state */
  authContext?: MockAuthContextValue;
}

// ==========================================
// All Providers Wrapper
// ==========================================

type AllProvidersProps = Readonly<{
  children: ReactNode;
  queryClient: QueryClient;
  route?: string;
  useBrowserRouter?: boolean;
}>;

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

// ==========================================
// Custom Render Function
// ==========================================

/**
 * Custom render function that wraps components with all providers
 *
 * @example
 * // Basic usage
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * @example
 * // With initial route
 * renderWithProviders(<MyComponent />, { route: '/analysis' });
 *
 * @example
 * // With custom query client
 * const queryClient = createTestQueryClient();
 * renderWithProviders(<MyComponent />, { queryClient });
 */
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

// ==========================================
// Utility Functions for Testing
// ==========================================

/**
 * Wait for loading states to resolve
 */
export async function waitForLoadingToFinish(container: HTMLElement): Promise<void> {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    const loader = container.querySelector('[data-testid="loader"]');
    expect(loader).not.toBeInTheDocument();
  });
}

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Mock fetch for API testing
 */
export function mockFetch<T>(data: T, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;

  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  });
}

/**
 * Mock fetch that fails
 */
export function mockFetchError(message = 'Network error') {
  return vi.fn().mockRejectedValue(new Error(message));
}

// ==========================================
// Type Exports
// ==========================================

export type { CustomRenderOptions, MockAuthContextValue };
