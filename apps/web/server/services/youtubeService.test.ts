/**
 * Unit tests for YouTubeService (Phase 40-05 / Task 4).
 *
 * Covers PLAN behaviors 1-5:
 *   1. fetchChannelRSS returns parsed items with no durationSec
 *   2. backfillDurations chunks ≤50 IDs/batch and aggregates results
 *   3. searchVideos calls youtube/v3/search and returns ≤5 results
 *   4. resolveChannelByHandle returns the UC… ID
 *   5. Missing API key throws clear error mentioning the env var
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const parseURLMock = vi.fn();

vi.mock('rss-parser', () => {
  return {
    default: class FakeParser {
      // The constructor receives Parser options; we ignore them for the mock
      constructor(_opts?: unknown) {}
      parseURL = parseURLMock;
    },
  };
});

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

async function loadFreshService() {
  vi.resetModules();
  const mod = await import('./youtubeService');
  // Reset singleton between test cases that re-import
  (mod.YouTubeService as unknown as { instance: unknown }).instance = undefined;
  return mod;
}

describe('YouTubeService', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    parseURLMock.mockReset();
    fetchMock.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
    process.env.YOUTUBE_DATA_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.YOUTUBE_DATA_API_KEY;
  });

  describe('singleton', () => {
    it('getInstance() returns the same instance', async () => {
      const mod = await loadFreshService();
      expect(mod.YouTubeService.getInstance()).toBe(mod.YouTubeService.getInstance());
    });
  });

  describe('fetchChannelRSS', () => {
    it('Test 1: parses YouTube channel RSS feed and returns items without durationSec', async () => {
      parseURLMock.mockResolvedValueOnce({
        items: [
          {
            videoId: 'abc123',
            title: 'Test video',
            pubDate: '2026-05-01T10:00:00Z',
            mediaGroup: {
              'media:description': ['Detailed description here'],
              'media:thumbnail': [{ $: { url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' } }],
            },
          },
        ],
      });

      const mod = await loadFreshService();
      const items = await mod.YouTubeService.getInstance().fetchChannelRSS('UCxxxxxxxxxxxxxxxxxxxxxx');

      expect(parseURLMock).toHaveBeenCalledWith(
        'https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxxxxxxxxxxxxxxxxxx',
      );
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        youtubeId: 'abc123',
        title: 'Test video',
        description: 'Detailed description here',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      });
      expect(items[0].publishedAt).toBeInstanceOf(Date);
      // RSS doesn't carry duration; service must NOT invent one
      expect((items[0] as { durationSec?: number }).durationSec).toBeUndefined();
    });

    it('skips items without a videoId', async () => {
      parseURLMock.mockResolvedValueOnce({
        items: [
          { videoId: undefined, title: 'No ID', pubDate: '2026-05-01T00:00:00Z' },
          { videoId: 'good1', title: 'Good', pubDate: '2026-05-01T00:00:00Z', mediaGroup: {} },
        ],
      });
      const mod = await loadFreshService();
      const items = await mod.YouTubeService.getInstance().fetchChannelRSS('UC0000000000000000000000');
      expect(items).toHaveLength(1);
      expect(items[0].youtubeId).toBe('good1');
    });
  });

  describe('backfillDurations', () => {
    it('Test 2: chunks IDs ≤50 per call and aggregates ISO-8601 durations to seconds', async () => {
      // Build 75 IDs → expect 2 calls (50 + 25)
      const ids = Array.from({ length: 75 }, (_, i) => `vid${i.toString().padStart(3, '0')}`);

      // Mock the responses for 2 batches
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: ids.slice(0, 50).map(id => ({ id, contentDetails: { duration: 'PT5M30S' } })),
        }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: ids.slice(50).map(id => ({ id, contentDetails: { duration: 'PT1H2M3S' } })),
        }),
      });

      const mod = await loadFreshService();
      const result = await mod.YouTubeService.getInstance().backfillDurations(ids);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      // First batch: 50 IDs joined
      expect(fetchMock.mock.calls[0][0]).toContain('id=vid000%2Cvid001');
      expect(result.size).toBe(75);
      expect(result.get('vid000')).toBe(5 * 60 + 30); // 330s
      expect(result.get('vid050')).toBe(1 * 3600 + 2 * 60 + 3); // 3723s
    });

    it('returns empty map on empty input', async () => {
      const mod = await loadFreshService();
      const out = await mod.YouTubeService.getInstance().backfillDurations([]);
      expect(out.size).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('searchVideos', () => {
    it('Test 3: calls youtube/v3/search and returns up to 5 video results', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: { videoId: 'res001', kind: 'youtube#video' },
              snippet: {
                channelId: 'UC11111111111111111111',
                title: 'Result 1',
                description: 'Description 1',
                thumbnails: { high: { url: 'https://i.ytimg.com/vi/res001/hqdefault.jpg' } },
              },
            },
            {
              id: { videoId: 'res002', kind: 'youtube#video' },
              snippet: {
                channelId: 'UC22222222222222222222',
                title: 'Result 2',
                description: '',
                thumbnails: {},
              },
            },
          ],
        }),
      });

      const mod = await loadFreshService();
      const results = await mod.YouTubeService.getInstance().searchVideos('ukraine war', { maxResults: 5 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('https://www.googleapis.com/youtube/v3/search');
      expect(url).toContain('q=ukraine+war');
      expect(url).toContain('type=video');
      expect(url).toContain('part=snippet');
      expect(url).toContain('maxResults=5');
      expect(url).toContain('key=test-key');

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        youtubeId: 'res001',
        channelId: 'UC11111111111111111111',
        title: 'Result 1',
      });
    });

    it('Test 5: missing API key throws an error mentioning YOUTUBE_DATA_API_KEY', async () => {
      delete process.env.YOUTUBE_DATA_API_KEY;
      const mod = await loadFreshService();
      await expect(
        mod.YouTubeService.getInstance().searchVideos('anything'),
      ).rejects.toThrow(/YOUTUBE_DATA_API_KEY/);
    });
  });

  describe('resolveChannelByHandle', () => {
    it('Test 4: calls channels.list?forHandle and returns the UC… id', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 'UCabcdefghijklmnopqrstuv' }] }),
      });

      const mod = await loadFreshService();
      const id = await mod.YouTubeService.getInstance().resolveChannelByHandle('@MyHandle');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('forHandle=MyHandle');
      expect(url).toContain('part=id');
      expect(id).toBe('UCabcdefghijklmnopqrstuv');
    });

    it('returns null when no items returned', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
      const mod = await loadFreshService();
      const id = await mod.YouTubeService.getInstance().resolveChannelByHandle('@unknown');
      expect(id).toBeNull();
    });
  });
});
