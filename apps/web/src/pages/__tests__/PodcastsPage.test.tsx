/**
 * Unit tests for PodcastsPage (Phase 40-04 / Task 6).
 *
 * Covers PLAN behaviors:
 *   1. Web FREE — UpgradePrompt rendered next to disabled transcript toggle
 *   2. Mobile FREE (CC-01) — plain text + <span>newshub.example</span>;
 *      NO <a> to /pricing visible (App Review compliance)
 *   3. Web PREMIUM — toggle enabled; turning it ON triggers /api/podcasts/transcripts/search
 *   4. Search filter — toggle OFF, typing filters episode list client-side
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createElement } from 'react';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

const { platformMock, authMock } = vi.hoisted(() => ({
  platformMock: { isNativeApp: vi.fn(() => false) },
  authMock: { user: null as null | { subscriptionTier: string } },
}));

vi.mock('../../lib/platform', () => platformMock);

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: authMock.user, isAuthenticated: !!authMock.user }),
}));

vi.mock('../../components/podcasts/PodcastEpisodeCard', () => ({
  PodcastEpisodeCard: (props: {
    episode: { id: string };
    episodeTitle?: string;
    podcastTitle?: string;
  }) => (
    <div
      data-testid="episode-card-stub"
      data-id={props.episode.id}
      data-title={props.episodeTitle}
    />
  ),
}));

import { PodcastsPage } from '../PodcastsPage';

const FEEDS = [
  {
    id: 'nyt-the-daily',
    title: 'The Daily',
    rssUrl: 'https://feeds.simplecast.com/54nAGcIl',
    region: 'usa',
    language: 'en',
    category: 'news',
    reliability: 9,
    imageUrl: 'https://example.com/cover.jpg',
  },
];

const EPISODES = [
  {
    id: 'ep-1',
    podcastId: 'nyt-the-daily',
    title: 'Today in Politics',
    description: 'A summary',
    audioUrl: 'https://example.com/1.mp3',
    durationSec: 1800,
    publishedAt: '2026-05-01T00:00:00Z',
    podcastGuid: 'g1',
  },
  {
    id: 'ep-2',
    podcastId: 'nyt-the-daily',
    title: 'Inflation Report',
    description: 'B summary',
    audioUrl: 'https://example.com/2.mp3',
    durationSec: 1500,
    publishedAt: '2026-04-30T00:00:00Z',
    podcastGuid: 'g2',
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, null, children),
    );
}

function setupFetchMock() {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url === '/api/podcasts') {
      return {
        ok: true,
        json: async () => ({ success: true, data: FEEDS }),
      } as Response;
    }
    if (url.startsWith('/api/podcasts/nyt-the-daily/episodes')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: EPISODES }),
      } as Response;
    }
    if (url.startsWith('/api/podcasts/transcripts/search')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response;
    }
    return { ok: false, status: 404, json: async () => ({ success: false }) } as Response;
  });
  (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  return fetchMock;
}

describe('PodcastsPage', () => {
  beforeEach(() => {
    platformMock.isNativeApp.mockReset();
    platformMock.isNativeApp.mockReturnValue(false);
    authMock.user = null;
  });

  it('Test 1 — Web FREE: shows UpgradePrompt next to disabled transcript toggle', async () => {
    setupFetchMock();
    platformMock.isNativeApp.mockReturnValue(false);
    authMock.user = { subscriptionTier: 'FREE' };

    render(<PodcastsPage />, { wrapper: createWrapper() });

    // Wait for feeds to load (fetched + auto-selected)
    await waitFor(() => {
      expect(screen.getByText('The Daily')).toBeTruthy();
    });

    // UpgradePrompt 'inline' renders a button containing the upgrade text
    expect(
      screen.getByText('upgrade.unlockFeature', { exact: false }),
    ).toBeTruthy();

    // No PREMIUM checkbox toggle visible
    const checkbox = screen.queryByRole('checkbox');
    expect(checkbox).toBeNull();
  });

  it('Test 2 — Mobile FREE (CC-01): plain text + span, NO <a> to /pricing', async () => {
    setupFetchMock();
    platformMock.isNativeApp.mockReturnValue(true);
    authMock.user = { subscriptionTier: 'FREE' };

    render(<PodcastsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('The Daily')).toBeTruthy();
    });

    // Plain-text URL rendered as <span>, NOT <a>
    const newshub = screen.getByText('newshub.example');
    expect(newshub.tagName).toBe('SPAN');

    // No /pricing link anywhere on the page
    const pricingLink = screen.queryByRole('link', { name: /pricing/i });
    expect(pricingLink).toBeNull();

    // No upgrade button either
    const upgradeBtn = screen.queryByText('upgrade.unlockFeature', { exact: false });
    expect(upgradeBtn).toBeNull();
  });

  it('Test 3 — Web PREMIUM: toggle enabled; ON triggers transcripts search call', async () => {
    const fetchMock = setupFetchMock();
    platformMock.isNativeApp.mockReturnValue(false);
    authMock.user = { subscriptionTier: 'PREMIUM' };

    render(<PodcastsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('The Daily')).toBeTruthy();
    });

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.disabled).toBe(false);

    // Type a query first so the toggle has something to search
    const search = screen.getByPlaceholderText('podcastsPage.searchPlaceholder');
    fireEvent.change(search, { target: { value: 'inflation' } });

    fireEvent.click(checkbox);

    await waitFor(() => {
      const transcriptCall = fetchMock.mock.calls.find((c) =>
        String(c[0]).startsWith('/api/podcasts/transcripts/search'),
      );
      expect(transcriptCall).toBeDefined();
    });
  });

  it('Test 4 — toggle OFF, typing filters episode list client-side', async () => {
    setupFetchMock();
    platformMock.isNativeApp.mockReturnValue(false);
    authMock.user = { subscriptionTier: 'PREMIUM' };

    render(<PodcastsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTestId('episode-card-stub')).toHaveLength(2);
    });

    const search = screen.getByPlaceholderText('podcastsPage.searchPlaceholder');
    fireEvent.change(search, { target: { value: 'Inflation' } });

    await waitFor(() => {
      const cards = screen.getAllByTestId('episode-card-stub');
      expect(cards).toHaveLength(1);
      expect(cards[0].getAttribute('data-title')).toBe('Inflation Report');
    });
  });
});
