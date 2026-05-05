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
import { render, screen, fireEvent, act } from '@testing-library/react';
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

// === APPEND: PodcastPlayer autoPlayOnMount behavior (Phase 40-08) ===
// The file-scoped beforeEach (lines 22-24) runs vi.spyOn before each test but does NOT
// clear the call history if Vitest reuses the same spy across re-invocations. We add a
// describe-scoped beforeEach that calls mockClear() to reset call counts between tests.
// We do NOT add a new spy for play/pause here — that would stack a second spy on the
// prototype and corrupt teardown (the BLOCKER the plan-checker flagged).

describe('PodcastPlayer autoPlayOnMount', () => {
  beforeEach(() => {
    // Reset call history so counts are per-test, not cumulative.
    // The file-scoped beforeEach already sets the mock implementation.
    vi.mocked(window.HTMLMediaElement.prototype.play).mockClear();
  });

  it('does NOT call play() when autoPlayOnMount is omitted', () => {
    const playMock = vi.mocked(window.HTMLMediaElement.prototype.play);
    const { container } = render(<PodcastPlayer audioUrl="https://example.com/a.mp3" />);
    const audio = container.querySelector('audio')!;
    // jsdom doesn't fire loadedmetadata from a string src — dispatch manually
    act(() => {
      audio.dispatchEvent(new Event('loadedmetadata'));
    });
    expect(playMock).not.toHaveBeenCalled();
  });

  it('calls play() once when autoPlayOnMount is true and loadedmetadata fires', () => {
    const playMock = vi.mocked(window.HTMLMediaElement.prototype.play);
    const { container } = render(
      <PodcastPlayer audioUrl="https://example.com/a.mp3" autoPlayOnMount />,
    );
    const audio = container.querySelector('audio')!;
    act(() => {
      audio.dispatchEvent(new Event('loadedmetadata'));
    });
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('only fires play() once even if loadedmetadata fires multiple times', () => {
    const playMock = vi.mocked(window.HTMLMediaElement.prototype.play);
    const { container } = render(
      <PodcastPlayer audioUrl="https://example.com/a.mp3" autoPlayOnMount />,
    );
    const audio = container.querySelector('audio')!;
    act(() => {
      audio.dispatchEvent(new Event('loadedmetadata'));
      audio.dispatchEvent(new Event('loadedmetadata'));
      audio.dispatchEvent(new Event('loadedmetadata'));
    });
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('swallows play() rejection (autoplay policy block) without throwing', async () => {
    const playMock = vi.mocked(window.HTMLMediaElement.prototype.play);
    // mockRejectedValueOnce overrides ONLY the next play() call — the file-scoped
    // beforeEach restores the resolved-Promise mock for the next test automatically.
    playMock.mockRejectedValueOnce(new DOMException('NotAllowedError', 'NotAllowedError'));

    const { container } = render(
      <PodcastPlayer audioUrl="https://example.com/a.mp3" autoPlayOnMount />,
    );
    const audio = container.querySelector('audio')!;
    act(() => {
      audio.dispatchEvent(new Event('loadedmetadata'));
    });
    await Promise.resolve(); // flush microtask so the rejection surfaces
    expect(playMock).toHaveBeenCalledTimes(1);
    // No throw assertion needed — the component's .catch(() => {}) handles it.
    // If the component were missing the .catch, the test would fail on an unhandled rejection.
  });

  it('refuses to autoplay when audio.paused is false (already playing)', () => {
    const playMock = vi.mocked(window.HTMLMediaElement.prototype.play);
    // Override the paused getter to false so the component sees the audio as already-playing.
    const originalPaused = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'paused');
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: () => false,
    });

    try {
      const { container } = render(
        <PodcastPlayer audioUrl="https://example.com/a.mp3" autoPlayOnMount />,
      );
      const audio = container.querySelector('audio')!;
      act(() => {
        audio.dispatchEvent(new Event('loadedmetadata'));
      });
      expect(playMock).not.toHaveBeenCalled();
    } finally {
      // Restore the original descriptor so sibling tests aren't poisoned.
      if (originalPaused) {
        Object.defineProperty(HTMLMediaElement.prototype, 'paused', originalPaused);
      } else {
        // No original descriptor (jsdom default) — delete the override to fall back to default behavior.
        // (paused defaults to true on a fresh audio element.)
        delete (HTMLMediaElement.prototype as { paused?: boolean }).paused;
      }
    }
  });
});
