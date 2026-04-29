/**
 * Unit tests for usePersonalization hook
 * Tests eligibility conditions, cold start scenarios, and recommendation generation
 *
 * Per D-07: Cold start when < 10 articles
 * Per D-13: Requires authenticated + verified + 10+ articles
 * Per D-11: Fresh QueryClient per test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePersonalization } from './usePersonalization';
import { resetIdCounter, getMockNewsArticle } from '../test/factories';
import type { ReactNode } from 'react';
import type { NewsArticle } from '../types';

// Mock useAuth
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock useAppStore
vi.mock('../store', () => ({
  useAppStore: vi.fn(),
}));

// Mock getRecommendations from personalization lib
vi.mock('../lib/personalization', () => ({
  getRecommendations: vi.fn(() => []),
}));

import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import { getRecommendations } from '../lib/personalization';

// Per D-11: Fresh QueryClient per test
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Helper for reading history
interface HistoryEntry {
  articleId: string;
  timestamp: number;
  readCount?: number;
}

function createHistory(count: number): HistoryEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    articleId: `article-${i}`,
    timestamp: Date.now() - i * 3600000,
    readCount: 1,
  }));
}

// Mock authenticated verified user
function mockAuthenticatedVerifiedUser() {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    isAuthenticated: true,
    user: { emailVerified: true, id: 'user-1', email: 'test@example.com' },
    token: 'mock-token',
    isLoading: false,
    isVerified: true,
  });
}

// Mock unauthenticated user
function mockUnauthenticatedUser() {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    isVerified: false,
  });
}

// Mock authenticated but unverified user
function mockUnverifiedUser() {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    isAuthenticated: true,
    user: { emailVerified: false, id: 'user-1', email: 'test@example.com' },
    token: 'mock-token',
    isLoading: false,
    isVerified: false,
  });
}

// Create mock articles for API responses
function createMockArticles(count: number): NewsArticle[] {
  return Array.from({ length: count }, (_, i) =>
    getMockNewsArticle({
      id: `news-${i}`,
      title: `Article ${i} about technology`,
      topics: ['Technology', 'Economy'],
    })
  );
}

describe('usePersonalization', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    resetIdCounter();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('eligibility per D-07, D-13', () => {
    it('returns isEligible=false when not authenticated', () => {
      mockUnauthenticatedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(15),
      });

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isEligible).toBe(false);
      expect(result.current.recommendations).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns isEligible=false when email not verified', () => {
      mockUnverifiedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(15),
      });

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isEligible).toBe(false);
      expect(result.current.recommendations).toEqual([]);
    });

    it('returns isEligible=false when < 10 articles read', () => {
      mockAuthenticatedVerifiedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(5),
      });

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isEligible).toBe(false);
      expect(result.current.readCount).toBe(5);
      expect(result.current.requiredCount).toBe(10);
    });

    it('returns isEligible=false when enabled=false', () => {
      mockAuthenticatedVerifiedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(15),
      });

      const { result } = renderHook(
        () => usePersonalization({ enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isEligible).toBe(false);
      expect(result.current.recommendations).toEqual([]);
    });

    it('returns isEligible=true when all conditions met', () => {
      mockAuthenticatedVerifiedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(15),
      });

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isEligible).toBe(true);
      expect(result.current.readCount).toBe(15);
      expect(result.current.requiredCount).toBe(10);
    });
  });

  describe('cold start per D-07', () => {
    it('returns empty recommendations when ineligible (not authenticated)', () => {
      mockUnauthenticatedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(5),
      });

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      expect(result.current.recommendations).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns empty recommendations when < 10 articles read', () => {
      mockAuthenticatedVerifiedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(3),
      });

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      expect(result.current.recommendations).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.readCount).toBe(3);
    });

    it('disables queries when ineligible', () => {
      mockUnauthenticatedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(5),
      });

      renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      // Fetch should not be called when queries are disabled
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('eligible user flow', () => {
    it('fetches news when eligible', async () => {
      mockAuthenticatedVerifiedUser();
      const history = createHistory(15);
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: history,
      });

      const mockArticles = createMockArticles(10);

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        (url: string) => {
          if (url.includes('/api/news?limit=100')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: mockArticles }),
            });
          }
          // Individual article fetches for history
          const match = url.match(/\/api\/news\/(.+)/);
          if (match) {
            const articleId = match[1];
            const article = getMockNewsArticle({
              id: articleId,
              title: `History article ${articleId}`,
            });
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: article }),
            });
          }
          return Promise.reject(new Error('Unknown URL'));
        }
      );

      renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/news?limit=100');
      });
    });

    it('fetches history articles when eligible', async () => {
      mockAuthenticatedVerifiedUser();
      const history = createHistory(15);
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: history,
      });

      const mockArticles = createMockArticles(10);

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        (url: string) => {
          if (url.includes('/api/news?limit=100')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: mockArticles }),
            });
          }
          // Individual article fetches for history
          const match = url.match(/\/api\/news\/(.+)/);
          if (match) {
            const articleId = match[1];
            const article = getMockNewsArticle({
              id: articleId,
              title: `History article ${articleId}`,
            });
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: article }),
            });
          }
          return Promise.reject(new Error('Unknown URL'));
        }
      );

      renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // Should fetch individual history articles (limit 20)
        expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/news\/article-\d+/));
      });
    });

    it('calls getRecommendations with limit of 12', async () => {
      mockAuthenticatedVerifiedUser();
      const history = createHistory(15);
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: history,
      });

      const mockArticles = createMockArticles(10);

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        (url: string) => {
          if (url.includes('/api/news?limit=100')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: mockArticles }),
            });
          }
          // Individual article fetches for history
          const match = url.match(/\/api\/news\/(.+)/);
          if (match) {
            const articleId = match[1];
            const article = getMockNewsArticle({
              id: articleId,
              title: `History article ${articleId}`,
            });
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: article }),
            });
          }
          return Promise.reject(new Error('Unknown URL'));
        }
      );

      // Mock getRecommendations to return some recommendations
      (getRecommendations as ReturnType<typeof vi.fn>).mockReturnValue([
        {
          article: mockArticles[0],
          score: 10,
          matchedTopic: 'technology',
        },
      ]);

      renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getRecommendations).toHaveBeenCalledWith(
          expect.any(Array), // articles
          expect.any(Array), // history
          expect.any(Map), // historyArticles Map
          12 // limit
        );
      });
    });
  });

  describe('return values', () => {
    it('returns readCount from history length', () => {
      mockAuthenticatedVerifiedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(25),
      });

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      expect(result.current.readCount).toBe(25);
    });

    it('returns requiredCount as 10', () => {
      mockAuthenticatedVerifiedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(5),
      });

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      expect(result.current.requiredCount).toBe(10);
    });

    it('returns recommendations sorted by score when eligible', async () => {
      mockAuthenticatedVerifiedUser();
      const history = createHistory(15);
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: history,
      });

      const mockArticles = createMockArticles(10);

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        (url: string) => {
          if (url.includes('/api/news?limit=100')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: mockArticles }),
            });
          }
          const match = url.match(/\/api\/news\/(.+)/);
          if (match) {
            const articleId = match[1];
            const article = getMockNewsArticle({
              id: articleId,
              title: `History article ${articleId}`,
            });
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: article }),
            });
          }
          return Promise.reject(new Error('Unknown URL'));
        }
      );

      // Return recommendations in sorted order
      const sortedRecommendations = [
        { article: mockArticles[0], score: 20, matchedTopic: 'climate' },
        { article: mockArticles[1], score: 15, matchedTopic: 'politics' },
        { article: mockArticles[2], score: 10, matchedTopic: 'economy' },
      ];
      (getRecommendations as ReturnType<typeof vi.fn>).mockReturnValue(
        sortedRecommendations
      );

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.recommendations).toEqual(sortedRecommendations);
      });
    });

    it('returns isLoading=true while fetching', async () => {
      mockAuthenticatedVerifiedUser();
      (useAppStore as ReturnType<typeof vi.fn>).mockReturnValue({
        readingHistory: createHistory(15),
      });

      // Create a promise that doesn't resolve immediately
      let resolveNews: (value: unknown) => void;
      const newsPromise = new Promise((resolve) => {
        resolveNews = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        (url: string) => {
          if (url.includes('/api/news?limit=100')) {
            return newsPromise;
          }
          const match = url.match(/\/api\/news\/(.+)/);
          if (match) {
            const articleId = match[1];
            const article = getMockNewsArticle({ id: articleId });
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: article }),
            });
          }
          return Promise.reject(new Error('Unknown URL'));
        }
      );

      const { result } = renderHook(() => usePersonalization(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the news fetch
      resolveNews!({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
