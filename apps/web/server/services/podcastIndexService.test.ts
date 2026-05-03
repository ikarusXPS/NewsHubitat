/**
 * Unit tests for PodcastIndexService (Phase 40-03 / CONT-03).
 *
 * Covers:
 *   1. Singleton invariant
 *   2. Correct URL + HMAC SHA-1 header construction (sha1(KEY+SECRET+unixTime))
 *   3. Graceful degradation when env vars unset (returns [], warns)
 *   4. 401/403 returns [] (no throw)
 *   5. 5xx returns [] (no throw)
 *   6. Secret never reaches logger (T-40-03-01 mitigation)
 *   7. Cache hit path (no fetch on second call)
 */

import crypto from 'crypto';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Shared cache mock — captured in vi.mock factory below
const cacheGet = vi.fn();
const cacheSet = vi.fn();

vi.mock('./cacheService', () => ({
  CacheService: { getInstance: () => ({ get: cacheGet, set: cacheSet }) },
  CACHE_TTL: { SHORT: 60, MEDIUM: 300, LONG: 1800, HOUR: 3600, DAY: 86400, WEEK: 604800 },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Helpers to (re-)load the module after env changes since the service
// reads PODCAST_INDEX_API_KEY/SECRET in the constructor.
async function loadFreshService() {
  vi.resetModules();
  const mod = await import('./podcastIndexService');
  // Reset singleton between loads
  (mod.PodcastIndexService as unknown as { instance: unknown }).instance = undefined;
  return mod;
}

describe('PodcastIndexService', () => {
  const fetchMock = vi.fn();
  const ORIGINAL_KEY = process.env.PODCAST_INDEX_API_KEY;
  const ORIGINAL_SECRET = process.env.PODCAST_INDEX_API_SECRET;

  beforeEach(() => {
    cacheGet.mockReset();
    cacheSet.mockReset();
    fetchMock.mockReset();
    cacheGet.mockResolvedValue(null); // default cache miss
    // Set env BEFORE loading the module — constructor reads it
    process.env.PODCAST_INDEX_API_KEY = 'TESTKEY';
    process.env.PODCAST_INDEX_API_SECRET = 'TESTSECRET';
    // Pin time for deterministic HMAC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T00:00:00Z'));
    // Stub global fetch
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    process.env.PODCAST_INDEX_API_KEY = ORIGINAL_KEY;
    process.env.PODCAST_INDEX_API_SECRET = ORIGINAL_SECRET;
  });

  describe('singleton', () => {
    it('getInstance() returns the same instance across calls', async () => {
      const mod = await loadFreshService();
      const a = mod.PodcastIndexService.getInstance();
      const b = mod.PodcastIndexService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('searchEpisodes — happy path', () => {
    it('builds correct URL + SHA-1 Authorization header', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [{ id: 1, title: 'ep1', enclosureUrl: 'https://x/audio.mp3' }] }),
      });

      const mod = await loadFreshService();
      const svc = mod.PodcastIndexService.getInstance();
      const results = await svc.searchEpisodes('Trump tariffs', 5);

      expect(results).toEqual([{ id: 1, title: 'ep1', enclosureUrl: 'https://x/audio.mp3' }]);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('https://api.podcastindex.org/api/1.0/search/byterm');
      expect(url).toContain('q=Trump+tariffs');
      expect(url).toContain('max=5');
      expect(url).toContain('fulltext=');

      const unixTime = Math.floor(new Date('2026-05-04T00:00:00Z').getTime() / 1000).toString();
      const expectedAuth = crypto.createHash('sha1')
        .update('TESTKEY' + 'TESTSECRET' + unixTime)
        .digest('hex');

      expect(init.headers['X-Auth-Date']).toBe(unixTime);
      expect(init.headers['X-Auth-Key']).toBe('TESTKEY');
      expect(init.headers['Authorization']).toBe(expectedAuth);
      expect(init.headers['User-Agent']).toContain('NewsHub');
    });
  });

  describe('graceful degradation — env vars unset', () => {
    it('returns [] and warn-logs when key is missing', async () => {
      delete process.env.PODCAST_INDEX_API_KEY;
      delete process.env.PODCAST_INDEX_API_SECRET;
      const mod = await loadFreshService();
      const logger = (await import('../utils/logger')).default;
      const svc = mod.PodcastIndexService.getInstance();
      const results = await svc.searchEpisodes('anything', 5);
      expect(results).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('HTTP error tolerance', () => {
    it('401 returns [] + warn-log (no throw)', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const mod = await loadFreshService();
      const logger = (await import('../utils/logger')).default;
      const svc = mod.PodcastIndexService.getInstance();
      const results = await svc.searchEpisodes('x', 5);
      expect(results).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('403 returns [] (no throw)', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
      const mod = await loadFreshService();
      const svc = mod.PodcastIndexService.getInstance();
      const results = await svc.searchEpisodes('x', 5);
      expect(results).toEqual([]);
    });

    it('5xx returns [] + error-log', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
      const mod = await loadFreshService();
      const logger = (await import('../utils/logger')).default;
      const svc = mod.PodcastIndexService.getInstance();
      const results = await svc.searchEpisodes('x', 5);
      expect(results).toEqual([]);
      // 5xx should escalate to error level
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('secret hygiene (T-40-03-01)', () => {
    it('never logs the literal API secret value', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
      const mod = await loadFreshService();
      const logger = (await import('../utils/logger')).default;
      const svc = mod.PodcastIndexService.getInstance();
      await svc.searchEpisodes('x', 5);

      const allLogCalls = [
        ...vi.mocked(logger.info).mock.calls,
        ...vi.mocked(logger.warn).mock.calls,
        ...vi.mocked(logger.error).mock.calls,
        ...vi.mocked(logger.debug).mock.calls,
      ];
      const flatArgs = allLogCalls.flat().map(a => (typeof a === 'string' ? a : JSON.stringify(a)));
      for (const arg of flatArgs) {
        expect(arg).not.toContain('TESTSECRET');
        expect(arg).not.toContain('TESTKEY');
      }
    });
  });

  describe('caching', () => {
    it('returns cached result on hit (no fetch)', async () => {
      cacheGet.mockResolvedValueOnce([{ id: 99, title: 'cached' }]);
      const mod = await loadFreshService();
      const svc = mod.PodcastIndexService.getInstance();
      const results = await svc.searchEpisodes('foo', 3);
      expect(results).toEqual([{ id: 99, title: 'cached' }]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('writes successful response to cache with deterministic key + 1h TTL', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [{ id: 7 }] }),
      });
      const mod = await loadFreshService();
      const svc = mod.PodcastIndexService.getInstance();
      await svc.searchEpisodes('alpha', 4);
      expect(cacheSet).toHaveBeenCalledTimes(1);
      const [key, value, ttl] = cacheSet.mock.calls[0];
      expect(key).toMatch(/^podcastindex:search:[a-f0-9]{40}$/);
      expect(value).toEqual([{ id: 7 }]);
      expect(ttl).toBe(3600);
    });
  });
});
