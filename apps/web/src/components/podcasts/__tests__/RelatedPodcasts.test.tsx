/**
 * Unit tests for RelatedPodcasts (Phase 40-04 / Task 4).
 *
 * Load-bearing test: collapsed-by-default mount does NOT call fetch (D-B3).
 *
 * Covers PLAN behaviors:
 *   1. Lazy: collapsed → no fetch fires; click → exactly one /api/podcasts/related/:articleId call
 *   2. Render: 2-episode fixture renders 2 PodcastEpisodeCard stubs
 *   3. Empty: empty array renders the empty-state i18n key
 *   4. Error: failing fetch renders the error i18n key
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

vi.mock('../PodcastEpisodeCard', () => ({
  PodcastEpisodeCard: (props: { episode: { id: string; episodeTitle: string } }) => (
    <div
      data-testid="episode-card-stub"
      data-id={props.episode.id}
      data-title={props.episode.episodeTitle}
    />
  ),
}));

import { RelatedPodcasts } from '../RelatedPodcasts';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('RelatedPodcasts', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  it('Test 1: collapsed by default — no fetch fires; click → one fetch', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<RelatedPodcasts articleId="article-1" />, { wrapper: createWrapper() });

    expect(fetchMock).not.toHaveBeenCalled();
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(button);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/podcasts/related/article-1');
  });

  it('Test 2: with episodes → renders one card per (max 3) episode', async () => {
    const fixture = [
      {
        id: 'ep-1',
        podcastGuid: 'g1',
        podcastTitle: 'The Daily',
        episodeTitle: 'First',
        description: '',
        audioUrl: 'https://example.com/1.mp3',
        publishedAt: '2026-05-01T00:00:00Z',
        score: 10,
      },
      {
        id: 'ep-2',
        podcastGuid: 'g2',
        podcastTitle: 'Up First',
        episodeTitle: 'Second',
        description: '',
        audioUrl: 'https://example.com/2.mp3',
        publishedAt: '2026-04-30T00:00:00Z',
        score: 9,
      },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: fixture }),
    });

    render(<RelatedPodcasts articleId="article-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const cards = screen.getAllByTestId('episode-card-stub');
      expect(cards).toHaveLength(2);
    });
  });

  it('Test 3: empty array → empty-state message', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<RelatedPodcasts articleId="article-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('relatedPodcasts.empty')).toBeTruthy();
    });
  });

  it('Test 4: fetch rejection → error message', async () => {
    // Use mockResolvedValue (not Once) so the hook's `retry: 1` retry path
    // also fails, surfacing `isError === true` to the rendered tree.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ success: false }),
    });

    render(<RelatedPodcasts articleId="article-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(
      () => {
        expect(screen.getByText('relatedPodcasts.loadError')).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('caps rendered episodes at 3 even if API returns more', async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: `ep-${i}`,
      podcastGuid: `g${i}`,
      podcastTitle: 'P',
      episodeTitle: `T${i}`,
      description: '',
      audioUrl: `https://example.com/${i}.mp3`,
      publishedAt: '2026-05-01T00:00:00Z',
      score: 10 - i,
    }));
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: many }),
    });

    render(<RelatedPodcasts articleId="article-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getAllByTestId('episode-card-stub')).toHaveLength(3);
    });
  });
});
