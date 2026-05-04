/**
 * Unit tests for LiteYouTubeEmbed (Phase 40-05 / Task 10).
 *
 * Behaviors:
 *   1. Renders a button (not iframe) initially with thumbnail
 *   2. Button has accessible aria-label containing the video title
 *   3. NO youtube.com iframe in initial DOM (lite-load contract)
 *   4. After click, swaps to youtube-nocookie.com iframe with autoplay=1
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiteYouTubeEmbed } from './LiteYouTubeEmbed';

describe('LiteYouTubeEmbed', () => {
  it('Test 1: initial render shows a button with thumbnail', () => {
    const { container } = render(
      <LiteYouTubeEmbed videoId="dQw4w9WgXcQ" title="Some video" />,
    );

    const button = screen.getByRole('button');
    expect(button).toBeTruthy();

    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toContain('i.ytimg.com');
    expect(img?.getAttribute('src')).toContain('dQw4w9WgXcQ');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('Test 2: button has accessible aria-label containing the title', () => {
    render(<LiteYouTubeEmbed videoId="dQw4w9WgXcQ" title="My Video Title" />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toContain('My Video Title');
  });

  it('Test 3: no youtube iframe in initial DOM', () => {
    const { container } = render(
      <LiteYouTubeEmbed videoId="dQw4w9WgXcQ" title="t" />,
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeNull();
  });

  it('Test 4: after click, renders youtube-nocookie iframe with autoplay=1', () => {
    const { container } = render(
      <LiteYouTubeEmbed videoId="dQw4w9WgXcQ" title="t" />,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toContain('youtube-nocookie.com');
    expect(iframe?.getAttribute('src')).toContain('dQw4w9WgXcQ');
    expect(iframe?.getAttribute('src')).toContain('autoplay=1');
    expect(iframe?.getAttribute('allowFullScreen') !== null).toBe(true);
  });

  it('uses hqdefault thumbnail by default and respects poster prop', () => {
    const { container, rerender } = render(
      <LiteYouTubeEmbed videoId="abc123" title="t" />,
    );
    let img = container.querySelector('img');
    expect(img?.getAttribute('src')).toContain('/hqdefault.jpg');

    rerender(<LiteYouTubeEmbed videoId="abc123" title="t" poster="maxresdefault" />);
    img = container.querySelector('img');
    expect(img?.getAttribute('src')).toContain('/maxresdefault.jpg');
  });
});
