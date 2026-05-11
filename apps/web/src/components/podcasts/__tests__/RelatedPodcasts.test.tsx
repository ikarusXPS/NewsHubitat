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
import { createElement, forwardRef, useImperativeHandle } from 'react';
import type { PodcastPlayerHandle } from '../PodcastPlayer';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

// Captured seek calls per episode-id — exposed for assertions in the seek-wiring test.
const seekCalls: Array<{ id: string; seconds: number }> = [];

vi.mock('../PodcastEpisodeCard', () => ({
  PodcastEpisodeCard: forwardRef<
    PodcastPlayerHandle,
    { episode: { id: string; episodeTitle: string } }
  >(function PodcastEpisodeCardMock(props, ref) {
    useImperativeHandle(
      ref,
      () => ({
        seek(seconds: number) {
          seekCalls.push({ id: props.episode.id, seconds });
        },
      }),
      [props.episode.id],
    );
    return (
      <div
        data-testid="episode-card-stub"
        data-id={props.episode.id}
        data-title={props.episode.episodeTitle}
      />
    );
  }),
}));

// Capture the onSeek prop given to TranscriptDrawer so the seek-wiring test
// can invoke it directly and verify ref propagation.
let lastDrawerOnSeek: ((seconds: number) => void) | undefined;

vi.mock('../TranscriptDrawer', () => ({
  TranscriptDrawer: (props: {
    id: string;
    onSeek?: (seconds: number) => void;
  }) => {
    lastDrawerOnSeek = props.onSeek;
    return <div data-testid="transcript-drawer-stub" data-id={props.id} />;
  },
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
    seekCalls.length = 0;
    lastDrawerOnSeek = undefined;
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

  it('Test 5 (SC-3): transcript drawer onSeek forwards to the open episode\'s player ref', async () => {
    // Closes Phase 40 SC-3 verification gap (40-VERIFICATION.md human_needed item):
    // proves the TranscriptDrawer onSeek -> playerRef.current?.seek(...) chain
    // works in the lazy-list view that used to leave onSeek undefined.
    const fixture = [
      {
        id: 'ep-A',
        podcastGuid: 'gA',
        podcastTitle: 'Pod A',
        episodeTitle: 'A',
        description: '',
        audioUrl: 'https://example.com/A.mp3',
        publishedAt: '2026-05-01T00:00:00Z',
        score: 10,
      },
      {
        id: 'ep-B',
        podcastGuid: 'gB',
        podcastTitle: 'Pod B',
        episodeTitle: 'B',
        description: '',
        audioUrl: 'https://example.com/B.mp3',
        publishedAt: '2026-04-30T00:00:00Z',
        score: 9,
      },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: fixture }),
    });

    render(<RelatedPodcasts articleId="article-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /relatedPodcasts/i }));

    // Wait for both episode cards to render
    await waitFor(() =>
      expect(screen.getAllByTestId('episode-card-stub')).toHaveLength(2),
    );

    // No transcript open yet → drawer not mounted, onSeek capture is undefined
    expect(lastDrawerOnSeek).toBeUndefined();

    // Open transcript for the FIRST episode (ep-A). The ref is wired only to
    // the card whose transcript is open — that's the contract we're testing.
    const toggles = screen.getAllByTestId('transcript-toggle');
    fireEvent.click(toggles[0]);

    await waitFor(() =>
      expect(screen.getByTestId('transcript-drawer-stub')).toBeTruthy(),
    );

    // Drawer should have received an onSeek callback.
    expect(typeof lastDrawerOnSeek).toBe('function');

    // Invoke it the same way TranscriptSegment would on segment-click.
    lastDrawerOnSeek!(42);
    lastDrawerOnSeek!(120.5);

    // Only the ref-wired card (ep-A) should have received seek calls — ep-B's
    // ref is undefined (transcript not open there).
    expect(seekCalls).toEqual([
      { id: 'ep-A', seconds: 42 },
      { id: 'ep-A', seconds: 120.5 },
    ]);
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
