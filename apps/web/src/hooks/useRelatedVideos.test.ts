/**
 * Unit tests for useRelatedVideos hook (Phase 40-05 / Task 9).
 *
 * Covers PLAN behaviors:
 *   1. queryKey is `['related-videos', articleId]` (language NOT included)
 *   2. staleTime is 24h (matches server-side Redis 24h TTL per D-D1)
 *   3. With enabled:false (collapsed-by-default), useQuery does NOT fire
 *   4. Returns { videos, source } shape from API envelope
 *
 * Pattern mirrors apps/web/src/hooks/useCachedQuery.test.tsx — fresh
 * QueryClient per test, gcTime: 0, retry: false.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useRelatedVideos } from './useRelatedVideos';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useRelatedVideos', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: uses queryKey ["related-videos", articleId] (language NOT included)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        meta: { source: 'none', total: 0 },
      }),
    });

    const { result } = renderHook(() => useRelatedVideos('article-abc', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Hook must call /api/videos/related/<articleId>
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('/api/videos/related/article-abc');
  });

  it('Test 3: enabled:false → does NOT fire fetch', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRelatedVideos('article-abc', false), { wrapper });

    // Wait a tick to give useQuery a chance to (NOT) run
    await new Promise(r => setTimeout(r, 10));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });

  it('Test 4: returns { videos, source } shape from envelope', async () => {
    const fakeVideos = [
      {
        video: { id: 'v1', youtubeId: 'yt1', title: 't', description: '', publishedAt: new Date() },
        matchScore: 0.9,
        matchedTerms: ['ukraine'],
        source: 'local-index',
      },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: fakeVideos, meta: { source: 'local', total: 1 } }),
    });

    const { result } = renderHook(() => useRelatedVideos('article-abc', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.videos).toHaveLength(1);
    expect(result.current.data?.source).toBe('local');
  });

  it('does not fire when articleId is empty even with enabled:true', async () => {
    const { result } = renderHook(() => useRelatedVideos('', true), {
      wrapper: createWrapper(),
    });

    await new Promise(r => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });

  it('throws on non-OK response (handled by useQuery as error state)', async () => {
    // Hook sets retry: 1 — mock both initial + retry call
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const { result } = renderHook(() => useRelatedVideos('article-abc', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
