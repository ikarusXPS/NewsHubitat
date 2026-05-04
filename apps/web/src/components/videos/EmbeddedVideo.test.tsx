/**
 * Unit tests for EmbeddedVideo dispatcher (Phase 40-05 / Task 12).
 *
 * Covers PLAN behaviors 1-5:
 *   1. youtube.com/watch?v=ID → renders LiteYouTubeEmbed
 *   2. youtu.be/ID → same as 1
 *   3. vimeo.com/ID → renders LiteVimeoEmbed
 *   4. Unrecognized URL → renders nothing + warns
 *   5. Direct provider/videoId props bypass URL parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./LiteYouTubeEmbed', () => ({
  LiteYouTubeEmbed: (props: { videoId: string; title: string }) => (
    <div data-testid="yt-stub" data-id={props.videoId} data-title={props.title} />
  ),
}));

vi.mock('./LiteVimeoEmbed', () => ({
  LiteVimeoEmbed: (props: { vimeoId: string }) => (
    <div data-testid="vimeo-stub" data-id={props.vimeoId} />
  ),
}));

import { EmbeddedVideo, parseVideoUrl } from './EmbeddedVideo';

describe('parseVideoUrl', () => {
  it('parses youtube.com/watch?v=ID', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
    });
  });

  it('parses youtu.be/ID', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
    });
  });

  it('parses youtube.com/embed/ID', () => {
    expect(parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
    });
  });

  it('parses vimeo.com/ID', () => {
    expect(parseVideoUrl('https://vimeo.com/76979871')).toEqual({
      provider: 'vimeo',
      id: '76979871',
    });
  });

  it('returns null for unknown hosts', () => {
    expect(parseVideoUrl('https://example.com/video.mp4')).toBeNull();
  });

  it('returns null for invalid URL strings', () => {
    expect(parseVideoUrl('not-a-url')).toBeNull();
  });
});

describe('EmbeddedVideo', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('Test 1: youtube.com URL → renders LiteYouTubeEmbed', () => {
    render(<EmbeddedVideo url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Tt" />);
    const stub = screen.getByTestId('yt-stub');
    expect(stub.getAttribute('data-id')).toBe('dQw4w9WgXcQ');
    expect(stub.getAttribute('data-title')).toBe('Tt');
  });

  it('Test 2: youtu.be URL → renders LiteYouTubeEmbed', () => {
    render(<EmbeddedVideo url="https://youtu.be/dQw4w9WgXcQ" />);
    const stub = screen.getByTestId('yt-stub');
    expect(stub.getAttribute('data-id')).toBe('dQw4w9WgXcQ');
  });

  it('Test 3: vimeo URL → renders LiteVimeoEmbed', () => {
    render(<EmbeddedVideo url="https://vimeo.com/76979871" />);
    const stub = screen.getByTestId('vimeo-stub');
    expect(stub.getAttribute('data-id')).toBe('76979871');
  });

  it('Test 4: unrecognized URL → renders nothing + warns to console', () => {
    const { container } = render(<EmbeddedVideo url="https://example.com/video.mp4" />);
    expect(container.firstChild).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('Test 5a: direct provider="youtube" + videoId bypasses URL parsing', () => {
    render(<EmbeddedVideo provider="youtube" videoId="abc123" title="T" />);
    expect(screen.getByTestId('yt-stub').getAttribute('data-id')).toBe('abc123');
  });

  it('Test 5b: direct provider="vimeo" + videoId bypasses URL parsing', () => {
    render(<EmbeddedVideo provider="vimeo" videoId="987654" />);
    expect(screen.getByTestId('vimeo-stub').getAttribute('data-id')).toBe('987654');
  });
});
