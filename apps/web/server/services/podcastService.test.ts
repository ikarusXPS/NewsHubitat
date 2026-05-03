/**
 * Unit tests for PodcastService (Phase 40-03 / CONT-03 / D-B1, D-B2).
 *
 * Covers the full surface (Tests 1-15 per plan):
 *   1. Singleton invariant
 *   2. findRelated cache miss path: Prisma read + parallel provider fan-out + cache write
 *   3. findRelated cache hit path: returns cached, skips providers
 *   4. findRelated article-not-found: returns []
 *   5. findRelated provider rejections: still survives (Promise.allSettled)
 *   6. listCurated returns PODCAST_FEEDS unchanged
 *   7. getEpisodes(feedId) reads Prisma, ordered desc, limit 50
 *   8. getEpisode(id) returns row or null
 *   9. pollFeed parses RSS, captures podcast:transcript + podcast:guid (Pitfall 4)
 *   10. rss-parser instance has the customFields config
 *   11-15: HTML strip at persistence boundary (H8/M2 fix) — description, title,
 *          entity decoding, undefined/empty, malformed HTML
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// rss-parser mock — we control the parser instance entirely
const mockParseURL = vi.fn();
const mockParseString = vi.fn();
class MockParser {
  options: unknown;
  constructor(options?: unknown) {
    this.options = options;
    capturedParserOptions = options;
  }
  parseURL = mockParseURL;
  parseString = mockParseString;
}
let capturedParserOptions: unknown = null;
vi.mock('rss-parser', () => ({ default: MockParser }));

// Prisma mock
const prismaMock = {
  newsArticle: { findUnique: vi.fn() },
  podcast: { upsert: vi.fn() },
  podcastEpisode: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
};
vi.mock('../db/prisma', () => ({ prisma: prismaMock }));

// Sub-service mocks
const podcastIndexSearchEpisodes = vi.fn();
vi.mock('./podcastIndexService', () => ({
  PodcastIndexService: { getInstance: () => ({ searchEpisodes: podcastIndexSearchEpisodes }) },
}));

const itunesSearchPodcasts = vi.fn();
vi.mock('./itunesPodcastService', () => ({
  ItunesPodcastService: { getInstance: () => ({ searchPodcasts: itunesSearchPodcasts }) },
}));

// Cache mock
const cacheGet = vi.fn();
const cacheSet = vi.fn();
vi.mock('./cacheService', () => ({
  CacheService: { getInstance: () => ({ get: cacheGet, set: cacheSet }) },
  CACHE_TTL: { SHORT: 60, MEDIUM: 300, LONG: 1800, HOUR: 3600, DAY: 86400, WEEK: 604800 },
}));

// Logger mock
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// PODCAST_FEEDS — provide a small fixture so the service has feeds to fall back on
vi.mock('../config/podcasts', () => ({
  PODCAST_FEEDS: [
    {
      id: 'fixture-feed',
      title: 'Fixture Daily',
      region: 'usa',
      language: 'en',
      rssUrl: 'https://example.com/feed.xml',
      category: 'news',
      reliability: 8,
    },
  ],
}));

async function loadFreshService() {
  vi.resetModules();
  const mod = await import('./podcastService');
  (mod.PodcastService as unknown as { instance: unknown }).instance = undefined;
  return mod;
}

beforeEach(() => {
  Object.values(prismaMock).forEach(m => Object.values(m).forEach(f => (f as ReturnType<typeof vi.fn>).mockReset()));
  podcastIndexSearchEpisodes.mockReset();
  itunesSearchPodcasts.mockReset();
  cacheGet.mockReset();
  cacheSet.mockReset();
  mockParseURL.mockReset();
  mockParseString.mockReset();
  cacheGet.mockResolvedValue(null);
  prismaMock.podcastEpisode.findMany.mockResolvedValue([]);
  prismaMock.podcastEpisode.upsert.mockResolvedValue({});
  prismaMock.podcast.upsert.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodcastService', () => {
  describe('singleton', () => {
    it('getInstance() returns same instance', async () => {
      const mod = await loadFreshService();
      const a = mod.PodcastService.getInstance();
      const b = mod.PodcastService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('listCurated', () => {
    it('returns the static PODCAST_FEEDS array', async () => {
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      const out = await svc.listCurated();
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe('fixture-feed');
    });
  });

  describe('getEpisodes', () => {
    it('reads Prisma ordered by publishedAt desc, default limit 50', async () => {
      prismaMock.podcastEpisode.findMany.mockResolvedValueOnce([{ id: 'e1' }, { id: 'e2' }]);
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      const out = await svc.getEpisodes('fixture-feed');
      expect(out).toEqual([{ id: 'e1' }, { id: 'e2' }]);
      expect(prismaMock.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: { podcastId: 'fixture-feed' },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      });
    });

    it('respects custom limit', async () => {
      prismaMock.podcastEpisode.findMany.mockResolvedValueOnce([]);
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      await svc.getEpisodes('fixture-feed', 10);
      expect(prismaMock.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: { podcastId: 'fixture-feed' },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      });
    });
  });

  describe('getEpisode', () => {
    it('returns row when found', async () => {
      prismaMock.podcastEpisode.findUnique.mockResolvedValueOnce({ id: 'e9', title: 'x' });
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      expect(await svc.getEpisode('e9')).toEqual({ id: 'e9', title: 'x' });
    });

    it('returns null when not found', async () => {
      prismaMock.podcastEpisode.findUnique.mockResolvedValueOnce(null);
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      expect(await svc.getEpisode('missing')).toBeNull();
    });
  });

  describe('findRelated', () => {
    it('cache miss: reads NewsArticle + fans out providers + writes cache', async () => {
      prismaMock.newsArticle.findUnique.mockResolvedValueOnce({
        entities: ['Trump', 'Biden', 'Putin', 'Macron'],
        topics: ['tariffs', 'inflation'],
        originalLanguage: 'en',
      });
      podcastIndexSearchEpisodes.mockResolvedValueOnce([
        {
          id: 1,
          title: 'Trump on tariffs',
          description: 'Plain text desc',
          enclosureUrl: 'https://x/a.mp3',
          datePublished: Math.floor(Date.now() / 1000),
          duration: 1800,
          feedTitle: 'Some Cast',
          feedId: 100,
          feedImage: 'https://x/i.png',
          podcastGuid: 'pi-guid-1',
        },
      ]);
      itunesSearchPodcasts.mockResolvedValueOnce([]);

      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      const out = await svc.findRelated('article-1');

      expect(prismaMock.newsArticle.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-1' },
        select: { entities: true, topics: true, originalLanguage: true },
      });
      expect(podcastIndexSearchEpisodes).toHaveBeenCalled();
      expect(itunesSearchPodcasts).toHaveBeenCalled();
      expect(out.length).toBeGreaterThan(0);
      expect(out[0].episodeTitle).toContain('Trump');
      expect(cacheSet).toHaveBeenCalledTimes(1);
      const [key, , ttl] = cacheSet.mock.calls[0];
      expect(key).toBe('podcast:related:article-1');
      expect(ttl).toBe(86400);
    });

    it('cache hit: returns cached value, skips providers', async () => {
      cacheGet.mockResolvedValueOnce([{ id: 'cached', score: 99 }]);
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      const out = await svc.findRelated('article-1');
      expect(out).toEqual([{ id: 'cached', score: 99 }]);
      expect(prismaMock.newsArticle.findUnique).not.toHaveBeenCalled();
      expect(podcastIndexSearchEpisodes).not.toHaveBeenCalled();
      expect(itunesSearchPodcasts).not.toHaveBeenCalled();
    });

    it('article not found: returns []', async () => {
      prismaMock.newsArticle.findUnique.mockResolvedValueOnce(null);
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      const out = await svc.findRelated('missing');
      expect(out).toEqual([]);
      expect(podcastIndexSearchEpisodes).not.toHaveBeenCalled();
    });

    it('both providers reject: still returns ranked candidates from curated fallback', async () => {
      prismaMock.newsArticle.findUnique.mockResolvedValueOnce({
        entities: ['Trump'],
        topics: [],
        originalLanguage: 'en',
      });
      // Curated fallback: a Prisma episode that mentions Trump
      prismaMock.podcastEpisode.findMany.mockImplementation(async () => [
        {
          id: 'curated-ep',
          podcastId: 'fixture-feed',
          podcastGuid: 'curated-guid',
          title: 'Trump deep dive',
          description: 'Plain text',
          audioUrl: 'https://x/a.mp3',
          publishedAt: new Date(),
        },
      ]);
      podcastIndexSearchEpisodes.mockRejectedValueOnce(new Error('PI down'));
      itunesSearchPodcasts.mockRejectedValueOnce(new Error('iTunes down'));

      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      const out = await svc.findRelated('article-2');
      expect(out.length).toBeGreaterThan(0);
      expect(out[0].episodeTitle).toContain('Trump');
    });

    it('handles entities stored as JSON string (legacy double-encoded)', async () => {
      prismaMock.newsArticle.findUnique.mockResolvedValueOnce({
        entities: JSON.stringify(['Trump']),
        topics: JSON.stringify(['tariffs']),
        originalLanguage: 'en',
      });
      podcastIndexSearchEpisodes.mockResolvedValueOnce([]);
      itunesSearchPodcasts.mockResolvedValueOnce([]);

      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      const out = await svc.findRelated('article-3');
      expect(Array.isArray(out)).toBe(true);
    });
  });

  describe('rss-parser instance config (Pitfall 4 — load-bearing)', () => {
    it('customFields.item contains podcast:transcript and podcast:guid', async () => {
      await loadFreshService();
      const opts = capturedParserOptions as { customFields?: { item?: Array<unknown> } };
      const items = opts?.customFields?.item ?? [];
      const flat = items.map((i: unknown) => Array.isArray(i) ? i[0] : i);
      expect(flat).toContain('podcast:transcript');
      expect(flat).toContain('podcast:guid');
    });
  });

  describe('pollFeed — RSS parsing + persistence boundary', () => {
    const feed = {
      id: 'fixture-feed',
      title: 'Fixture Daily',
      region: 'usa',
      language: 'en',
      rssUrl: 'https://example.com/feed.xml',
      category: 'news',
      reliability: 8,
    };

    it('captures podcast:transcript and podcast:guid into upsert payload (Pitfall 4)', async () => {
      mockParseURL.mockResolvedValueOnce({
        description: 'Channel desc',
        items: [
          {
            title: 'Episode 1',
            content: 'plain content',
            contentSnippet: 'plain snippet',
            enclosure: { url: 'https://x/audio.mp3' },
            pubDate: '2026-05-01T00:00:00Z',
            podcastGuid: 'guid-1',
            transcripts: [{ $: { url: 'https://x/transcript.vtt', type: 'text/vtt' } }],
          },
        ],
      });
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      const inserted = await svc.pollFeed(feed);
      expect(inserted).toBe(1);
      expect(prismaMock.podcastEpisode.upsert).toHaveBeenCalledTimes(1);
      const payload = prismaMock.podcastEpisode.upsert.mock.calls[0][0];
      expect(payload.create.transcriptUrl).toBe('https://x/transcript.vtt');
      expect(payload.create.transcriptType).toBe('text/vtt');
      expect(payload.create.podcastGuid).toBe('guid-1');
    });

    it('strips HTML from description (Test 11 — H8/M2)', async () => {
      mockParseURL.mockResolvedValueOnce({
        description: 'Channel',
        items: [
          {
            title: 'Episode A',
            content: '<p>Hello <strong>world</strong></p>',
            enclosure: { url: 'https://x/a.mp3' },
            pubDate: '2026-05-01T00:00:00Z',
            podcastGuid: 'guid-A',
          },
        ],
      });
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      await svc.pollFeed(feed);
      const payload = prismaMock.podcastEpisode.upsert.mock.calls[0][0];
      expect(payload.create.description).toBe('Hello world');
      expect(payload.create.description).not.toContain('<p>');
      expect(payload.create.description).not.toContain('<strong>');
    });

    it('strips HTML from title (Test 12 — H8/M2 defensive)', async () => {
      mockParseURL.mockResolvedValueOnce({
        description: 'Channel',
        items: [
          {
            title: '<b>Episode 1</b>',
            content: 'plain',
            enclosure: { url: 'https://x/a.mp3' },
            pubDate: '2026-05-01T00:00:00Z',
            podcastGuid: 'guid-T',
          },
        ],
      });
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      await svc.pollFeed(feed);
      const payload = prismaMock.podcastEpisode.upsert.mock.calls[0][0];
      expect(payload.create.title).toBe('Episode 1');
    });

    it('decodes HTML entities (Test 13 — H8/M2)', async () => {
      mockParseURL.mockResolvedValueOnce({
        description: 'Channel',
        items: [
          {
            title: 'Episode',
            content: 'AT&amp;T merger',
            enclosure: { url: 'https://x/a.mp3' },
            pubDate: '2026-05-01T00:00:00Z',
            podcastGuid: 'guid-E',
          },
        ],
      });
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      await svc.pollFeed(feed);
      const payload = prismaMock.podcastEpisode.upsert.mock.calls[0][0];
      expect(payload.create.description).toBe('AT&T merger');
    });

    it('stripHtml helper (Test 14 — H8/M2): undefined/empty/whitespace cases', async () => {
      const mod = await loadFreshService();
      expect(mod.stripHtml(undefined)).toBe('');
      expect(mod.stripHtml(null)).toBe('');
      expect(mod.stripHtml('')).toBe('');
      expect(mod.stripHtml('   <p>  spaced  </p>  ')).toBe('spaced');
      expect(mod.stripHtml('<p>line 1</p><p>line 2</p>')).toBe('line 1 line 2');
    });

    it('tolerates malformed HTML (Test 15 — H8/M2)', async () => {
      mockParseURL.mockResolvedValueOnce({
        description: 'Channel',
        items: [
          {
            title: 'Episode',
            content: '<p>unclosed <strong>nested',
            enclosure: { url: 'https://x/a.mp3' },
            pubDate: '2026-05-01T00:00:00Z',
            podcastGuid: 'guid-M',
          },
        ],
      });
      const mod = await loadFreshService();
      const svc = mod.PodcastService.getInstance();
      await svc.pollFeed(feed);
      const payload = prismaMock.podcastEpisode.upsert.mock.calls[0][0];
      expect(payload.create.description).toBe('unclosed nested');
    });
  });
});
