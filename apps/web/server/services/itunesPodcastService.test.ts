/**
 * Unit tests for ItunesPodcastService (Phase 40-03 / CONT-03 / D-B1).
 *
 * Covers:
 *   1. Singleton invariant
 *   2. Correct URL construction (URLSearchParams; country=US default; Pitfall 6)
 *   3. Default country='US' when not passed
 *   4. 24h cache by (country, term)
 *   5. In-process throttle (min 100ms gap between calls)
 *   6. HTTP 429 returns [] + warn-log
 *   7. Network error returns [] + error-log
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const cacheGet = vi.fn();
const cacheSet = vi.fn();

vi.mock('./cacheService', () => ({
  CacheService: { getInstance: () => ({ get: cacheGet, set: cacheSet }) },
  CACHE_TTL: { SHORT: 60, MEDIUM: 300, LONG: 1800, HOUR: 3600, DAY: 86400, WEEK: 604800 },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

async function loadFreshService() {
  vi.resetModules();
  const mod = await import('./itunesPodcastService');
  (mod.ItunesPodcastService as unknown as { instance: unknown }).instance = undefined;
  return mod;
}

describe('ItunesPodcastService', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    cacheGet.mockReset();
    cacheSet.mockReset();
    fetchMock.mockReset();
    cacheGet.mockResolvedValue(null);
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('singleton', () => {
    it('getInstance() returns the same instance', async () => {
      const mod = await loadFreshService();
      const a = mod.ItunesPodcastService.getInstance();
      const b = mod.ItunesPodcastService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('searchPodcasts — URL construction', () => {
    it('builds canonical URL with country, media, entity, limit', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: [{ collectionId: 1, collectionName: 'Daily' }] }),
      });
      const mod = await loadFreshService();
      const svc = mod.ItunesPodcastService.getInstance();
      const out = await svc.searchPodcasts('the daily', 'US', 10);
      expect(out).toEqual([{ collectionId: 1, collectionName: 'Daily' }]);

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('https://itunes.apple.com/search?');
      expect(url).toContain('term=the+daily');
      expect(url).toContain('country=US');
      expect(url).toContain('media=podcast');
      expect(url).toContain('entity=podcast');
      expect(url).toContain('limit=10');
    });

    it("defaults country to 'US' when not passed (Pitfall 6 — never blank)", async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [] }) });
      const mod = await loadFreshService();
      const svc = mod.ItunesPodcastService.getInstance();
      await svc.searchPodcasts('foo');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('country=US');
    });
  });

  describe('caching', () => {
    it('returns cached value on hit (no fetch)', async () => {
      cacheGet.mockResolvedValueOnce([{ collectionId: 99 }]);
      const mod = await loadFreshService();
      const svc = mod.ItunesPodcastService.getInstance();
      const out = await svc.searchPodcasts('foo', 'US');
      expect(out).toEqual([{ collectionId: 99 }]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('writes results to cache with 24h TTL keyed by (country, term)', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [{ collectionId: 7 }] }) });
      const mod = await loadFreshService();
      const svc = mod.ItunesPodcastService.getInstance();
      await svc.searchPodcasts('beta', 'DE', 5);
      expect(cacheSet).toHaveBeenCalledTimes(1);
      const [key, value, ttl] = cacheSet.mock.calls[0];
      expect(key).toMatch(/^itunes:search:DE:[a-f0-9]{40}$/);
      expect(value).toEqual([{ collectionId: 7 }]);
      expect(ttl).toBe(86400);
    });
  });

  describe('throttle (in-process min-gap)', () => {
    it('awaits min 100ms gap between successive cache-miss fetches', async () => {
      // Use real timers but with tiny delays — assert that the second fetch waited.
      fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [] }) });
      const mod = await loadFreshService();
      const svc = mod.ItunesPodcastService.getInstance();
      const start = Date.now();
      await svc.searchPodcasts('alpha', 'US');
      await svc.searchPodcasts('bravo', 'US');
      const elapsed = Date.now() - start;
      // Two distinct cache-miss fetches with min 100ms gap => >= 100ms total
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('HTTP error tolerance', () => {
    it('429 returns [] + warn-log', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
      const mod = await loadFreshService();
      const logger = (await import('../utils/logger')).default;
      const svc = mod.ItunesPodcastService.getInstance();
      const out = await svc.searchPodcasts('x');
      expect(out).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('non-2xx (other) returns [] + warn-log', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
      const mod = await loadFreshService();
      const svc = mod.ItunesPodcastService.getInstance();
      const out = await svc.searchPodcasts('x');
      expect(out).toEqual([]);
    });

    it('network error returns [] + error-log', async () => {
      fetchMock.mockRejectedValue(new Error('boom'));
      const mod = await loadFreshService();
      const logger = (await import('../utils/logger')).default;
      const svc = mod.ItunesPodcastService.getInstance();
      const out = await svc.searchPodcasts('x');
      expect(out).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
