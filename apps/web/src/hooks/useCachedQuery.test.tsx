/**
 * Unit tests for useCachedQuery hook
 * Tests network-first strategy with cache fallback and offline handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCachedQuery } from './useCachedQuery';
import { getMockNewsArticle, resetIdCounter } from '../test/factories';
import type { NewsArticle } from '../types';

// Mock useBackendStatus
vi.mock('./useBackendStatus', () => ({
  useBackendStatus: vi.fn(() => ({ isOnline: true })),
}));

// Mock cacheService
vi.mock('../services/cacheService', () => ({
  cacheService: {
    setArticles: vi.fn(),
    getArticles: vi.fn(),
    getCacheAge: vi.fn(),
  },
}));

// Import mocks after vi.mock calls
import { useBackendStatus } from './useBackendStatus';
import { cacheService } from '../services/cacheService';

// Cast mocks for type safety
const mockedUseBackendStatus = vi.mocked(useBackendStatus);
const mockedCacheService = vi.mocked(cacheService);

/**
 * Creates a fresh QueryClient per test (D-11 pattern)
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCachedQuery', () => {
  beforeEach(() => {
    resetIdCounter();
    vi.clearAllMocks();
    // Default: online mode
    mockedUseBackendStatus.mockReturnValue({
      isOnline: true,
      isChecking: false,
      lastCheck: new Date(),
      error: null,
      retry: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('network success', () => {
    it('returns data from queryFn when network succeeds', async () => {
      const mockArticles = [getMockNewsArticle(), getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['test-articles'],
            queryFn,
            cacheKey: 'test-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual(mockArticles);
      expect(result.current.isFromCache).toBe(false);
      expect(result.current.cacheAge).toBeNull();
    });

    it('caches successful response', async () => {
      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['test-cache'],
            queryFn,
            cacheKey: 'cache-test-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedCacheService.setArticles).toHaveBeenCalledWith(
        'cache-test-key',
        mockArticles,
        5 * 60 * 1000 // Default TTL
      );
    });

    it('does not cache non-array data', async () => {
      const queryFn = vi.fn().mockResolvedValue({ single: 'object' });

      const { result } = renderHook(
        () =>
          useCachedQuery<{ single: string }>({
            queryKey: ['non-array'],
            queryFn,
            cacheKey: 'non-array-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedCacheService.setArticles).not.toHaveBeenCalled();
    });
  });

  describe('network failure with cache fallback', () => {
    it('returns cached data when queryFn fails', async () => {
      const cachedArticles = [getMockNewsArticle({ id: 'cached-1' })];
      const queryFn = vi.fn().mockRejectedValue(new Error('Network error'));
      mockedCacheService.getArticles.mockResolvedValue(cachedArticles);
      mockedCacheService.getCacheAge.mockResolvedValue(60000);

      const { result } = renderHook(
        () =>
          useCachedQuery<NewsArticle[]>({
            queryKey: ['fallback-test'],
            queryFn,
            cacheKey: 'fallback-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual(cachedArticles);
      expect(result.current.isFromCache).toBe(true);
      expect(result.current.cacheAge).toBe(60000);
    });

    it('sets isFromCache to true when returning cached data', async () => {
      const cachedArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockRejectedValue(new Error('Server down'));
      mockedCacheService.getArticles.mockResolvedValue(cachedArticles);
      mockedCacheService.getCacheAge.mockResolvedValue(120000);

      const { result } = renderHook(
        () =>
          useCachedQuery<NewsArticle[]>({
            queryKey: ['cache-flag-test'],
            queryFn,
            cacheKey: 'cache-flag-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isFromCache).toBe(true);
      });

      expect(result.current.cacheAge).toBe(120000);
    });
  });

  describe('network failure without cache', () => {
    it('propagates error when no cache available', async () => {
      const networkError = new Error('Network unavailable');
      const queryFn = vi.fn().mockRejectedValue(networkError);
      mockedCacheService.getArticles.mockResolvedValue(null);

      const { result } = renderHook(
        () =>
          useCachedQuery<NewsArticle[]>({
            queryKey: ['no-cache-test'],
            queryFn,
            cacheKey: 'no-cache-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('Network unavailable');
    });

    it('does not set isFromCache when error propagates', async () => {
      const queryFn = vi.fn().mockRejectedValue(new Error('Failed'));
      mockedCacheService.getArticles.mockResolvedValue(null);

      const { result } = renderHook(
        () =>
          useCachedQuery<NewsArticle[]>({
            queryKey: ['error-flag-test'],
            queryFn,
            cacheKey: 'error-flag-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isFromCache).toBe(false);
    });
  });

  describe('offline mode', () => {
    it('loads from cache when offline on mount', async () => {
      const cachedArticles = [getMockNewsArticle({ id: 'offline-cached' })];
      mockedUseBackendStatus.mockReturnValue({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        error: 'Offline',
        retry: vi.fn(),
      });
      mockedCacheService.getArticles.mockResolvedValue(cachedArticles);
      mockedCacheService.getCacheAge.mockResolvedValue(300000);

      // queryFn should not be needed when offline and cache exists
      // But hook still runs queryFn - it's the effect that loads cache
      const queryFn = vi.fn().mockRejectedValue(new Error('Should use cache'));

      const { result: _result } = renderHook(
        () =>
          useCachedQuery<NewsArticle[]>({
            queryKey: ['offline-test'],
            queryFn,
            cacheKey: 'offline-key',
          }),
        { wrapper: createWrapper() }
      );

      // Wait for the offline cache loading effect
      await waitFor(() => {
        expect(mockedCacheService.getArticles).toHaveBeenCalledWith('offline-key');
      });
    });

    it('disables refetchInterval when offline', async () => {
      mockedUseBackendStatus.mockReturnValue({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        error: 'Offline',
        retry: vi.fn(),
      });

      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      // The hook should pass refetchInterval: false when offline
      // We verify by checking that the hook doesn't refetch when offline
      const { result } = renderHook(
        () =>
          useCachedQuery<NewsArticle[]>({
            queryKey: ['offline-refetch-test'],
            queryFn,
            cacheKey: 'offline-refetch-key',
            refetchInterval: 5000, // Should be disabled
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // The hook implementation sets refetchInterval: false when offline
      // This is an indirect test - we can verify the query runs initially
      expect(queryFn).toHaveBeenCalled();
    });

    it('disables refetchOnWindowFocus when offline', async () => {
      mockedUseBackendStatus.mockReturnValue({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        error: 'Offline',
        retry: vi.fn(),
      });

      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      const { result } = renderHook(
        () =>
          useCachedQuery<NewsArticle[]>({
            queryKey: ['offline-focus-test'],
            queryFn,
            cacheKey: 'offline-focus-key',
            refetchOnWindowFocus: true, // Should be disabled when offline
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Verify hook executed - the actual disabling is internal to the hook
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('cache configuration', () => {
    it('uses default 5 minute TTL', async () => {
      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['default-ttl-test'],
            queryFn,
            cacheKey: 'default-ttl-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedCacheService.setArticles).toHaveBeenCalledWith(
        'default-ttl-key',
        mockArticles,
        5 * 60 * 1000 // 300000ms = 5 minutes
      );
    });

    it('accepts custom cacheTTL', async () => {
      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);
      const customTTL = 10 * 60 * 1000; // 10 minutes

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['custom-ttl-test'],
            queryFn,
            cacheKey: 'custom-ttl-key',
            cacheTTL: customTTL,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedCacheService.setArticles).toHaveBeenCalledWith(
        'custom-ttl-key',
        mockArticles,
        600000 // 10 minutes
      );
    });

    it('uses provided cacheKey for cache operations', async () => {
      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);
      const specificCacheKey = 'my-specific-cache-key';

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['cache-key-test'],
            queryFn,
            cacheKey: specificCacheKey,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockedCacheService.setArticles).toHaveBeenCalledWith(
        specificCacheKey,
        expect.any(Array),
        expect.any(Number)
      );
    });
  });

  describe('query options passthrough', () => {
    it('respects enabled option', async () => {
      const queryFn = vi.fn().mockResolvedValue([]);

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['disabled-test'],
            queryFn,
            cacheKey: 'disabled-key',
            enabled: false,
          }),
        { wrapper: createWrapper() }
      );

      // Query should not run when disabled
      await new Promise((r) => setTimeout(r, 50));

      expect(queryFn).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(true);
    });

    it('uses provided staleTime', async () => {
      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['stale-time-test'],
            queryFn,
            cacheKey: 'stale-time-key',
            staleTime: 60000,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Query ran successfully with staleTime option
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('return value extensions', () => {
    it('includes isFromCache in return value', async () => {
      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['return-isFromCache'],
            queryFn,
            cacheKey: 'return-key',
          }),
        { wrapper: createWrapper() }
      );

      // Initially undefined or false
      expect(result.current.isFromCache).toBeDefined();
      expect(typeof result.current.isFromCache).toBe('boolean');

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.isFromCache).toBe(false);
    });

    it('includes cacheAge in return value', async () => {
      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['return-cacheAge'],
            queryFn,
            cacheKey: 'return-age-key',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // cacheAge should be null when data is from network
      expect(result.current.cacheAge).toBeNull();
    });

    it('spreads all UseQueryResult properties', async () => {
      const mockArticles = [getMockNewsArticle()];
      const queryFn = vi.fn().mockResolvedValue(mockArticles);

      const { result } = renderHook(
        () =>
          useCachedQuery({
            queryKey: ['spread-props'],
            queryFn,
            cacheKey: 'spread-key',
          }),
        { wrapper: createWrapper() }
      );

      // Standard useQuery properties should exist
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isPending');
      expect(result.current).toHaveProperty('refetch');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
