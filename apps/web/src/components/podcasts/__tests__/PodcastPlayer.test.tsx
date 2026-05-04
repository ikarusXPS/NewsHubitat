/**
 * Unit tests for PodcastPlayer (Phase 40-04 / Task 2).
 *
 * Covers PLAN behaviors:
 *   1. Renders given a https audioUrl
 *   2. Rejects file:/// URLs (T-40-04-01)
 *   3. Clicking play invokes audioRef.play()
 *   4. Forwarded ref `seek(s)` sets audio.currentTime
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { PodcastPlayer, type PodcastPlayerHandle } from '../PodcastPlayer';

beforeEach(() => {
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

describe('PodcastPlayer', () => {
  it('Test 1: renders <audio> with given https src', () => {
    const url = 'https://example.com/episode.mp3';
    const { container } = render(<PodcastPlayer audioUrl={url} />);
    const audio = container.querySelector('audio');
    expect(audio).toBeTruthy();
    expect(audio?.getAttribute('src')).toBe(url);
  });

  it('Test 2: rejects non-https URLs (T-40-04-01)', () => {
    const { container } = render(<PodcastPlayer audioUrl="file:///etc/passwd" />);
    const audio = container.querySelector('audio');
    expect(audio).toBeNull();
    expect(screen.getByText('podcastPlayer.invalidUrl')).toBeTruthy();
  });

  it('Test 3: clicking play invokes audioRef.play()', () => {
    render(<PodcastPlayer audioUrl="https://example.com/ep.mp3" />);
    const playBtn = screen.getByRole('button', { name: 'podcastPlayer.play' });
    fireEvent.click(playBtn);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('Test 4: forwarded ref seek(120) sets audio.currentTime', () => {
    const ref = createRef<PodcastPlayerHandle>();
    const { container } = render(
      <PodcastPlayer ref={ref} audioUrl="https://example.com/ep.mp3" />,
    );
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio).toBeTruthy();

    // Make currentTime writable + readable for jsdom
    let currentTime = 0;
    Object.defineProperty(audio, 'currentTime', {
      configurable: true,
      get: () => currentTime,
      set: (v: number) => {
        currentTime = v;
      },
    });

    ref.current?.seek(120);
    expect(audio.currentTime).toBe(120);
  });

  it('does not render audio for javascript: URLs', () => {
    const { container } = render(<PodcastPlayer audioUrl="javascript:alert(1)" />);
    expect(container.querySelector('audio')).toBeNull();
  });
});
