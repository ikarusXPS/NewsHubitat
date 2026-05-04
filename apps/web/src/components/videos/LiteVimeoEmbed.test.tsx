/**
 * Unit tests for LiteVimeoEmbed (Phase 40-05 / Task 11).
 *
 * Covers PLAN behaviors 1-5:
 *   1. Initial render fetches Vimeo oEmbed exactly once per vimeoId
 *   2. Caches the oEmbed response in localStorage
 *   3. Initial DOM contains a button — NO iframe present
 *   4. After click, replaces button with player.vimeo.com iframe
 *   5. Failed fetch → fallback button with generic title
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LiteVimeoEmbed } from './LiteVimeoEmbed';

describe('LiteVimeoEmbed', () => {
  const fetchMock = vi.fn();
  const localGetItem = vi.fn();
  const localSetItem = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    localGetItem.mockReset();
    localSetItem.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: localGetItem, setItem: localSetItem, removeItem: vi.fn(), clear: vi.fn() },
      configurable: true,
    });
    localGetItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: initial render fetches oEmbed exactly once per vimeoId', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thumbnail_url: 'https://i.vimeocdn.com/x.jpg', title: 'Cool Vimeo' }),
    });

    render(<LiteVimeoEmbed vimeoId="76979871" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('https://vimeo.com/api/oembed.json');
    expect(url).toContain('76979871');
  });

  it('Test 2: caches oEmbed response in localStorage', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thumbnail_url: 'https://i.vimeocdn.com/x.jpg', title: 'Cool Vimeo' }),
    });

    render(<LiteVimeoEmbed vimeoId="76979871" />);

    await waitFor(() => expect(localSetItem).toHaveBeenCalled());
    const [key, value] = localSetItem.mock.calls[0];
    expect(key).toBe('vimeo:oembed:76979871');
    const parsed = JSON.parse(value);
    expect(parsed.title).toBe('Cool Vimeo');
  });

  it('cached response → skips fetch', () => {
    localGetItem.mockReturnValueOnce(
      JSON.stringify({ thumbnail_url: 'cached.jpg', title: 'Cached' }),
    );

    render(<LiteVimeoEmbed vimeoId="76979871" />);

    expect(fetchMock).not.toHaveBeenCalled();
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toContain('Cached');
  });

  it('Test 3: initial DOM contains a button — NO iframe', () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thumbnail_url: 'https://x.jpg', title: 't' }),
    });

    const { container } = render(<LiteVimeoEmbed vimeoId="76979871" />);
    expect(screen.getByRole('button')).toBeTruthy();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('Test 4: after click, replaces button with player.vimeo.com iframe', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thumbnail_url: 'https://x.jpg', title: 't' }),
    });

    const { container } = render(<LiteVimeoEmbed vimeoId="76979871" />);
    await waitFor(() => expect(localSetItem).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button'));
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toContain('player.vimeo.com/video/76979871');
    expect(iframe?.getAttribute('src')).toContain('autoplay=1');
  });

  it('Test 5: failed fetch → fallback button with generic title', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });

    render(<LiteVimeoEmbed vimeoId="not-real" />);

    // Wait for the catch handler to set fallback meta
    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toContain('Vimeo Video');
    });
  });

  it('network error → fallback button with generic title', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    render(<LiteVimeoEmbed vimeoId="x" />);
    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toContain('Vimeo Video');
    });
  });
});
