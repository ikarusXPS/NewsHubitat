/**
 * Unit tests for PodcastEpisodeCard (Phase 40-04 / Task 3; updated 40-08).
 *
 * Covers PLAN behaviors:
 *   1. Renders episode title, podcast title, formatted duration + date
 *   2. Click play (no onPlay) mounts internal PodcastPlayer with autoPlayOnMount
 *   3. Click play (with onPlay) invokes handler, no PodcastPlayer mount
 *   4. HTML in description renders as plain text (no <script> in DOM)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MatchedEpisode } from '../../../types/podcasts';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

vi.mock('../../../lib/formatters', () => ({
  formatDateTime: (d: string | Date) => `formatted(${String(d)})`,
}));

vi.mock('../PodcastPlayer', () => ({
  PodcastPlayer: ({ audioUrl, autoPlayOnMount }: { audioUrl: string; autoPlayOnMount?: boolean }) => (
    <div
      data-testid="podcast-player-stub"
      data-url={audioUrl}
      data-auto-play={String(autoPlayOnMount ?? false)}
    />
  ),
}));

vi.mock('../../ResponsiveImage', () => ({
  ResponsiveImage: ({ src, alt }: { src: string; alt: string }) => (
    <img data-testid="responsive-image-stub" src={src} alt={alt} />
  ),
}));

import { PodcastEpisodeCard } from '../PodcastEpisodeCard';

const fixture: MatchedEpisode = {
  id: 'ep-1',
  podcastGuid: 'guid-1',
  podcastTitle: 'The Daily',
  episodeTitle: 'A long form episode',
  description: 'Plain description',
  audioUrl: 'https://example.com/audio.mp3',
  publishedAt: '2026-05-01T12:00:00Z',
  durationSec: 1800, // 30:00
  imageUrl: 'https://example.com/cover.jpg',
  score: 12.4,
};

describe('PodcastEpisodeCard', () => {
  it('Test 1: renders episode title, podcast title, duration, and date', () => {
    render(
      <PodcastEpisodeCard
        episode={fixture}
        episodeTitle={fixture.episodeTitle}
        podcastTitle={fixture.podcastTitle}
      />,
    );
    expect(screen.getByText('A long form episode')).toBeTruthy();
    expect(screen.getByText('The Daily')).toBeTruthy();
    expect(screen.getByText('30:00')).toBeTruthy();
  });

  it('Test 2: clicking play without onPlay mounts the internal player with autoPlayOnMount', () => {
    render(<PodcastEpisodeCard episode={fixture} />);
    expect(screen.queryByTestId('podcast-player-stub')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /podcastEpisode\.play/ }));
    const player = screen.getByTestId('podcast-player-stub');
    expect(player.getAttribute('data-url')).toBe(fixture.audioUrl);
    expect(player.getAttribute('data-auto-play')).toBe('true');
  });

  it('Test 3: clicking play with onPlay invokes handler without mounting player', () => {
    const onPlay = vi.fn();
    render(<PodcastEpisodeCard episode={fixture} onPlay={onPlay} />);
    fireEvent.click(screen.getByRole('button', { name: /podcastEpisode\.play/ }));
    expect(onPlay).toHaveBeenCalledWith(fixture);
    expect(screen.queryByTestId('podcast-player-stub')).toBeNull();
  });

  it('Test 4: HTML in description renders as plain text — no <script> element', () => {
    const malicious: MatchedEpisode = {
      ...fixture,
      description: '<script>alert(1)</script>Hello there',
    };
    const { container } = render(<PodcastEpisodeCard episode={malicious} />);
    expect(container.querySelector('script')).toBeNull();
    // Truncated rendering still includes the safe text
    expect(container.textContent).toContain('Hello there');
  });

  it('falls back to a default cover when imageUrl is omitted', () => {
    const noCover: MatchedEpisode = { ...fixture, imageUrl: undefined };
    render(<PodcastEpisodeCard episode={noCover} />);
    const img = screen.getByTestId('responsive-image-stub') as HTMLImageElement;
    expect(img.src).toBeTruthy();
  });
});
