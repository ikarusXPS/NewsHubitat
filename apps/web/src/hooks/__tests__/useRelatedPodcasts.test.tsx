/**
 * Unit tests for useRelatedPodcasts (Phase 40-04 / Task 1).
 *
 * Load-bearing assertions:
 *   - `enabled: false` → no fetch fires (the lazy gate in RelatedPodcasts).
 *   - `enabled: true` → exactly one call to /api/podcasts/related/:articleId
 *     and the envelope is unwrapped to MatchedEpisode[].
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useRelatedPodcasts } from '../useRelatedPodcasts';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useRelatedPodcasts', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  it('enabled: false → no fetch fires (lazy gate)', () => {
    renderHook(() => useRelatedPodcasts('article-1', { enabled: false }), {
      wrapper: createWrapper(),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enabled: true → fetches /api/podcasts/related/:articleId and unwraps envelope', async () => {
    const fixture = [
      {
        id: 'ep-1',
        podcastGuid: 'guid-1',
        podcastTitle: 'The Daily',
        episodeTitle: 'Today in Politics',
        description: 'A summary',
        audioUrl: 'https://example.com/audio.mp3',
        publishedAt: '2026-05-01T12:00:00Z',
        durationSec: 1800,
        score: 12.4,
      },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: fixture }),
    });

    const { result } = renderHook(
      () => useRelatedPodcasts('article-1', { enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/podcasts/related/article-1');
    expect(result.current.data).toEqual(fixture);
  });

  it('default enabled is true when articleId is set', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(() => useRelatedPodcasts('article-2'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send Authorization header (FREE-tier endpoint)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    renderHook(() => useRelatedPodcasts('article-3', { enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const callArgs = fetchMock.mock.calls[0];
    const init = callArgs[1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
  });
});
