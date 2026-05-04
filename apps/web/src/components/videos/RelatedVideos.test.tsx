/**
 * Unit tests for RelatedVideos (Phase 40-05 / Task 13).
 *
 * Covers PLAN behaviors:
 *   5. Initial render → collapsed disclosure button; no fetch fires
 *   6. After click → fetch fires + heading appears
 *   7. With matched videos → renders EmbeddedVideo per match
 *   8. Empty result → renders i18n empty-state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./EmbeddedVideo', () => ({
  EmbeddedVideo: (props: { videoId: string; provider: string; title?: string }) => (
    <div
      data-testid="embedded-video-stub"
      data-provider={props.provider}
      data-id={props.videoId}
      data-title={props.title}
    />
  ),
}));

import { RelatedVideos } from './RelatedVideos';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('RelatedVideos', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  it('Test 5: initial render is collapsed; no fetch fires', () => {
    render(<RelatedVideos articleId="article-1" />, { wrapper: createWrapper() });

    // Disclosure button visible with `expand` label
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.textContent).toContain('relatedVideos.expand');

    // No fetch fired (collapsed-by-default lazy fire contract)
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Test 6: after click → fetch fires and heading appears', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [], meta: { source: 'none' } }),
    });

    render(<RelatedVideos articleId="article-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/videos/related/article-1');

    // Button now shows heading instead of expand label
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toContain('relatedVideos.heading');
  });

  it('Test 7: matched videos → renders EmbeddedVideo per match (YouTube)', async () => {
    const matches = [
      {
        video: {
          id: 'v1',
          youtubeId: 'yt1',
          title: 'YouTube match',
          description: '',
          publishedAt: new Date(),
        },
        matchScore: 0.9,
        matchedTerms: ['ukraine'],
        source: 'local-index',
      },
      {
        video: {
          id: 'v2',
          vimeoId: '76979871',
          title: 'Vimeo match',
          description: '',
          publishedAt: new Date(),
        },
        matchScore: 0.8,
        matchedTerms: ['ukraine'],
        source: 'vimeo-link',
      },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: matches, meta: { source: 'local' } }),
    });

    render(<RelatedVideos articleId="article-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const stubs = screen.getAllByTestId('embedded-video-stub');
      expect(stubs).toHaveLength(2);
    });

    const stubs = screen.getAllByTestId('embedded-video-stub');
    expect(stubs[0].getAttribute('data-provider')).toBe('youtube');
    expect(stubs[0].getAttribute('data-id')).toBe('yt1');
    expect(stubs[1].getAttribute('data-provider')).toBe('vimeo');
    expect(stubs[1].getAttribute('data-id')).toBe('76979871');
  });

  it('Test 8: empty result renders i18n empty-state', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [], meta: { source: 'none' } }),
    });

    render(<RelatedVideos articleId="article-1" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('relatedVideos.empty')).toBeTruthy();
    });
  });

  it('toggles open → closed without re-firing fetch (TanStack staleTime)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [], meta: { source: 'none' } }),
    });

    render(<RelatedVideos articleId="article-1" />, { wrapper: createWrapper() });
    const button = screen.getByRole('button');

    fireEvent.click(button); // expand
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(button); // collapse
    fireEvent.click(button); // expand again — staleTime 24h, no refetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
