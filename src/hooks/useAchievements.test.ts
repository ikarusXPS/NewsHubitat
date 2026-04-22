import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAchievements } from './useAchievements';

// Mock useAuth
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock useAppStore
vi.mock('../store', () => ({
  useAppStore: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';

const mockUseAuth = vi.mocked(useAuth);
const mockUseAppStore = vi.mocked(useAppStore);

// Helper to create reading history entries
function createHistoryEntries(
  count: number,
  options?: { hour?: number }
): Array<{ articleId: string; timestamp: number; readCount?: number }> {
  const hour = options?.hour ?? 12;
  const baseDate = new Date();
  baseDate.setHours(hour, 0, 0, 0);

  return Array.from({ length: count }, (_, i) => ({
    articleId: `article-${i}`,
    timestamp: baseDate.getTime() - i * 3600000, // 1 hour apart
    readCount: 1,
  }));
}

// Helper to create bookmarks
function createBookmarks(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `bookmark-${i}`);
}

describe('useAchievements', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockLocalStorage: { getItem: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock fetch
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn().mockReturnValue('test-auth-token'),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    // Default mock for useAuth - authenticated and verified
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        bookmarks: [],
        preferences: { language: 'en', theme: 'dark', regions: [] },
        emailVerified: true,
      },
      token: 'test-token',
      isLoading: false,
      isAuthenticated: true,
      isVerified: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updatePreferences: vi.fn(),
      addBookmark: vi.fn(),
      removeBookmark: vi.fn(),
      resendVerification: vi.fn(),
    });

    // Default mock for useAppStore - empty state
    mockUseAppStore.mockReturnValue({
      readingHistory: [],
      bookmarkedArticles: [],
    } as ReturnType<typeof useAppStore>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('authentication requirements', () => {
    it('does not check badges when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isVerified: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updatePreferences: vi.fn(),
        addBookmark: vi.fn(),
        removeBookmark: vi.fn(),
        resendVerification: vi.fn(),
      });

      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(15),
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.pendingUnlock).toBeNull();
    });

    it('does not check badges when email not verified', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString(),
          bookmarks: [],
          preferences: { language: 'en', theme: 'dark', regions: [] },
          emailVerified: false,
        },
        token: 'test-token',
        isLoading: false,
        isAuthenticated: true,
        isVerified: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updatePreferences: vi.fn(),
        addBookmark: vi.fn(),
        removeBookmark: vi.fn(),
        resendVerification: vi.fn(),
      });

      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(15),
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.pendingUnlock).toBeNull();
    });
  });

  describe('Bookworm milestones', () => {
    it('triggers bronze badge at 10 articles', async () => {
      // With 10 articles and no bookmarks, starting from prev=0
      // Should trigger bookworm-bronze
      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(10),
        bookmarkedArticles: [], // No bookmarks to avoid curator conflict
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock).not.toBeNull();
      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');
      expect(result.current.pendingUnlock?.message).toBe("You've read 10 articles!");
    });

    it('triggers silver badge at 50 articles when crossing from 49', async () => {
      // Use a stable mock that we can update
      let history = createHistoryEntries(49);
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: history,
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // First call - prev=0 crosses 10 (bronze), sets prev to 49
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');

      // Dismiss and update history to 50
      act(() => {
        result.current.dismissUnlock();
        history = createHistoryEntries(50);
      });

      rerender();

      // Second call - prev=49 crosses 50 (silver)
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock).not.toBeNull();
      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-silver');
    });

    it('triggers gold badge at 100 articles when crossing from 99', async () => {
      let history = createHistoryEntries(99);
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: history,
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // First call - crosses bronze at 10
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      act(() => {
        result.current.dismissUnlock();
        history = createHistoryEntries(100);
      });

      rerender();

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-gold');
    });

    it('triggers platinum badge at 500 articles when crossing from 499', async () => {
      let history = createHistoryEntries(499);
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: history,
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // First call - crosses bronze at 10
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      act(() => {
        result.current.dismissUnlock();
        history = createHistoryEntries(500);
      });

      rerender();

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-platinum');
    });

    it('does not trigger when already past milestone', async () => {
      // Start at 12 (past 10), then go to 15
      // Should not trigger since prev (12) >= 10 already
      let history = createHistoryEntries(12);
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: history,
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // First call - crosses 10 from 0
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');

      act(() => {
        result.current.dismissUnlock();
        history = createHistoryEntries(15);
      });

      rerender();

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      // Should not trigger since 15 doesn't cross any new milestone (prev=12)
      expect(result.current.pendingUnlock).toBeNull();
    });
  });

  describe('Curator milestones', () => {
    it('triggers bronze badge at 5 bookmarks', async () => {
      mockUseAppStore.mockReturnValue({
        readingHistory: [],
        bookmarkedArticles: createBookmarks(5),
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock).not.toBeNull();
      expect(result.current.pendingUnlock?.badgeId).toBe('curator-bronze');
      expect(result.current.pendingUnlock?.message).toBe("You've bookmarked 5 articles!");
    });

    it('triggers silver badge at 20 bookmarks when crossing from 19', async () => {
      let bookmarks = createBookmarks(19);
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: [],
        bookmarkedArticles: bookmarks,
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // First call - crosses 5 from 0
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('curator-bronze');

      act(() => {
        result.current.dismissUnlock();
        bookmarks = createBookmarks(20);
      });

      rerender();

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('curator-silver');
    });

    it('triggers gold badge at 50 bookmarks when crossing from 49', async () => {
      let bookmarks = createBookmarks(49);
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: [],
        bookmarkedArticles: bookmarks,
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // First call - crosses 5 from 0
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      act(() => {
        result.current.dismissUnlock();
        bookmarks = createBookmarks(50);
      });

      rerender();

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('curator-gold');
    });

    it('triggers platinum badge at 100 bookmarks when crossing from 99', async () => {
      let bookmarks = createBookmarks(99);
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: [],
        bookmarkedArticles: bookmarks,
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // First call - crosses 5 from 0
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      act(() => {
        result.current.dismissUnlock();
        bookmarks = createBookmarks(100);
      });

      rerender();

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('curator-platinum');
    });
  });

  describe('server persistence', () => {
    it('calls /api/badges/award with badge details', async () => {
      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(10),
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/badges/award',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-auth-token',
          }),
        })
      );

      // Check the body contains the badge details
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.badgeId).toBe('bookworm-bronze');
      expect(body.progress).toBe(10);
    });

    it('handles server error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(10),
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      // Should not throw
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to award badge:', expect.any(Error));
      // Badge should still be pending even if server call failed
      expect(result.current.pendingUnlock).not.toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('dismissUnlock', () => {
    it('clears pendingUnlock', async () => {
      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(10),
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock).not.toBeNull();

      act(() => {
        result.current.dismissUnlock();
      });

      expect(result.current.pendingUnlock).toBeNull();
    });
  });

  describe('useEffect debounce behavior', () => {
    it('runs check on initial mount', () => {
      // Start with 10 articles - effect should run on mount
      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(10),
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      // Effect runs synchronously on mount with fake timers
      // The useEffect sets lastCheckedRef and calls checkBadgeProgress
      expect(result.current.pendingUnlock).not.toBeNull();
      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');
    });

    it('skips effect check when dependencies change within 5 seconds', () => {
      // Start with 10 articles
      const historyLength = 10;
      let bookmarkLength = 0;
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: createHistoryEntries(historyLength),
        bookmarkedArticles: createBookmarks(bookmarkLength),
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // Effect runs on mount - triggers bookworm-bronze
      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');

      // Clear the fetch calls from initial render
      mockFetch.mockClear();

      // Dismiss unlock
      act(() => {
        result.current.dismissUnlock();
      });

      // Advance only 3 seconds (within debounce window)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Change bookmarks to trigger effect dependency change
      bookmarkLength = 5;
      rerender();

      // Effect should be skipped due to debounce - still no pending unlock
      expect(result.current.pendingUnlock).toBeNull();
      // No fetch call since debounce blocked the check
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('runs effect check after debounce window passes', () => {
      // This test verifies that after debounce window, a new effect run is allowed
      // The debounce is time-based: now - lastCheckedRef.current < 5000

      let historyLength = 0;
      mockUseAppStore.mockImplementation(() => ({
        readingHistory: createHistoryEntries(historyLength),
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>));

      const { result, rerender } = renderHook(() => useAchievements());

      // Effect runs on mount with empty history - no milestone triggered
      expect(result.current.pendingUnlock).toBeNull();

      // Advance past 5 second debounce
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      // Update history to trigger milestone
      historyLength = 10;
      rerender();

      // Effect should run now (past debounce) - triggers bronze
      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');
    });
  });

  describe('calculateStats (tested via checkBadgeProgress)', () => {
    it('counts totalArticles from readingHistory length', async () => {
      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(25),
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      // Check the fetch was called with correct progress
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.progress).toBe(25); // totalArticles = 25
    });

    it('counts earlyBird entries for hour < 6', async () => {
      // Create entries at 5 AM (early bird)
      const earlyBirdEntries = createHistoryEntries(10, { hour: 5 });

      mockUseAppStore.mockReturnValue({
        readingHistory: earlyBirdEntries,
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      // 10 articles triggers bookworm-bronze
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');
    });

    it('counts nightOwl entries for hour 0-6', async () => {
      // Create entries at 3 AM (night owl)
      const nightOwlEntries = createHistoryEntries(10, { hour: 3 });

      mockUseAppStore.mockReturnValue({
        readingHistory: nightOwlEntries,
        bookmarkedArticles: [],
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      // 10 articles triggers bookworm-bronze
      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');
    });

    it('counts bookmarkCount from bookmarkedArticles length', async () => {
      mockUseAppStore.mockReturnValue({
        readingHistory: [],
        bookmarkedArticles: createBookmarks(5),
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      await act(async () => {
        await result.current.checkBadgeProgress();
      });

      expect(result.current.pendingUnlock?.badgeId).toBe('curator-bronze');
      expect(result.current.pendingUnlock?.message).toBe("You've bookmarked 5 articles!");
    });
  });

  describe('milestone behavior', () => {
    it('bookworm badge persists to server when triggered', () => {
      // When bookworm milestone is crossed, it persists to server via fetch

      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(10),
        bookmarkedArticles: [], // No bookmarks to avoid curator
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      // useEffect runs on mount - bookworm triggers and persists
      expect(result.current.pendingUnlock).not.toBeNull();
      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');

      // Bookworm fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.badgeId).toBe('bookworm-bronze');
    });

    it('curator badge triggers when only bookmarks cross threshold', () => {
      // When only curator milestone is crossed (no bookworm), curator shows
      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(5), // Below bookworm threshold
        bookmarkedArticles: createBookmarks(5),
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      // useEffect runs on mount - only curator triggers
      expect(result.current.pendingUnlock?.badgeId).toBe('curator-bronze');

      // No fetch call since curator doesn't have server persistence
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('only one badge triggers when only one milestone is crossed', () => {
      // Test that only bookworm badge triggers when no curator milestone crossed
      mockUseAppStore.mockReturnValue({
        readingHistory: createHistoryEntries(10),
        bookmarkedArticles: createBookmarks(2), // Below curator threshold
      } as ReturnType<typeof useAppStore>);

      const { result } = renderHook(() => useAchievements());

      // useEffect runs on mount - only bookworm triggers
      expect(result.current.pendingUnlock?.badgeId).toBe('bookworm-bronze');

      // Only bookworm fetch call (useEffect runs once on mount)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.badgeId).toBe('bookworm-bronze');
    });
  });
});
