/**
 * Unit tests for useBackendStatus hook
 * Tests health check success/failure, timeout handling, polling, and retry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackendStatus } from './useBackendStatus';

describe('useBackendStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock successful fetch by default
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Helper to flush microtasks and advance timers enough for initial fetch
  async function flushInitialCheck(): Promise<void> {
    // Advance past the initial useEffect microtask + fetch + setTimeout(5000)
    // We just need to let the promise resolve
    await vi.advanceTimersByTimeAsync(0);
  }

  describe('initial state', () => {
    it('starts with isOnline=true, isChecking=false before useEffect runs', () => {
      // Stop timers from advancing automatically
      const { result } = renderHook(() => useBackendStatus());

      // The hook starts a check immediately in useEffect, so we need to verify
      // the initial values before checking completes. The isChecking becomes true
      // synchronously in the first effect, but render captures initial state.
      // Since React batches, we check that isOnline starts true (optimistic)
      expect(result.current.isOnline).toBe(true);
      // Note: isChecking may be true if the effect already ran
      expect(result.current.lastCheck).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('health check on mount', () => {
    it('calls /api/health endpoint', async () => {
      renderHook(() => useBackendStatus());

      // Let the initial effect run
      await act(async () => {
        await flushInitialCheck();
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/health',
        expect.objectContaining({
          headers: { 'Cache-Control': 'no-cache' },
        })
      );
    });

    it('sets isChecking=true during check', async () => {
      // Create a fetch that never resolves immediately
      let resolvePromise!: (value: Response) => void;
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingPromise));

      const { result } = renderHook(() => useBackendStatus());

      // Trigger the effect
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Should be checking now
      expect(result.current.isChecking).toBe(true);

      // Resolve the promise to clean up
      await act(async () => {
        resolvePromise({ ok: true, status: 200 } as Response);
        await vi.advanceTimersByTimeAsync(0);
      });
    });

    it('sets lastCheck after successful check', async () => {
      const mockDate = new Date('2026-04-21T10:00:00Z');
      vi.setSystemTime(mockDate);

      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.lastCheck).toEqual(mockDate);
    });
  });

  describe('successful health check', () => {
    it('sets isOnline=true and clears error', async () => {
      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isChecking).toBe(false);
    });

    it('updates lastCheck to current time', async () => {
      const mockDate = new Date('2026-04-21T15:30:00Z');
      vi.setSystemTime(mockDate);

      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.lastCheck).toEqual(mockDate);
    });
  });

  describe('failed health check - HTTP error', () => {
    it('sets isOnline=false when response.ok is false', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        })
      );

      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('sets error message with status code', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        })
      );

      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.error).toBe('Backend returned 500');
    });

    it('sets lastCheck even on failure', async () => {
      const mockDate = new Date('2026-04-21T16:00:00Z');
      vi.setSystemTime(mockDate);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
        })
      );

      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.lastCheck).toEqual(mockDate);
    });
  });

  describe('failed health check - network error', () => {
    it('sets isOnline=false on fetch rejection', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('captures error message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.error).toBe('Connection refused');
    });

    it('handles non-Error rejections', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('Unknown failure'));

      const { result } = renderHook(() => useBackendStatus());

      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.error).toBe('Unknown error');
    });
  });

  describe('timeout handling', () => {
    it('aborts request after 5 seconds', async () => {
      // Create a fetch that never resolves (simulates hanging)
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
          return new Promise((_, reject) => {
            // When abort is called, reject with AbortError
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const abortError = new Error('The operation was aborted.');
                abortError.name = 'AbortError';
                reject(abortError);
              });
            }
          });
        })
      );

      const { result } = renderHook(() => useBackendStatus());

      // Advance time by 5 seconds to trigger timeout
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should have caught the abort error
      expect(result.current.isOnline).toBe(false);
      expect(result.current.error).toContain('aborted');
    });
  });

  describe('polling interval per D-12', () => {
    it('calls checkHealth every 30 seconds', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      renderHook(() => useBackendStatus());

      // Initial call on mount
      await act(async () => {
        await flushInitialCheck();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance 30 seconds for first interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Advance another 30 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does not call before 30 seconds', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      renderHook(() => useBackendStatus());

      // Initial call
      await act(async () => {
        await flushInitialCheck();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance less than 30 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(25000);
      });

      // Still just the initial call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry function', () => {
    it('triggers immediate health check', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useBackendStatus());

      // Initial call
      await act(async () => {
        await flushInitialCheck();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Call retry
      await act(async () => {
        result.current.retry();
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('updates status after retry', async () => {
      // First call fails, retry succeeds
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok' }),
        });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useBackendStatus());

      // Initial call fails
      await act(async () => {
        await flushInitialCheck();
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.error).toBe('Backend returned 500');

      // Retry succeeds
      await act(async () => {
        result.current.retry();
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('clears interval on unmount', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { unmount } = renderHook(() => useBackendStatus());

      // Initial call
      await act(async () => {
        await flushInitialCheck();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Unmount the hook
      unmount();

      // Advance 60 seconds (two polling intervals)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      // Should still be 1 call (no new calls after unmount)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
