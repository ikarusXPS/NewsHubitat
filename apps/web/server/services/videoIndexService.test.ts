/**
 * Unit tests for VideoIndexService.findRelated (Phase 40-05 / Task 5).
 *
 * Covers PLAN behaviors 1-5:
 *   1. Local FTS hit → does NOT call youtubeService.searchVideos
 *   2. Local FTS empty + quota allows → calls searchVideos exactly once
 *   3. Local FTS empty + quota exhausted → returns empty + warns + no API call
 *   4. Cache hit returns cached value without touching Postgres or youtubeService
 *   5. Miss → result is cached for CACHE_TTL.DAY (24h)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const cacheGet = vi.fn();
const cacheSet = vi.fn();
const queryRawMock = vi.fn();
const findUniqueMock = vi.fn();
const checkAndConsumeQuotaMock = vi.fn();
const searchVideosMock = vi.fn();

vi.mock('../db/prisma', () => ({
  prisma: {
    newsArticle: { findUnique: findUniqueMock },
    $queryRaw: queryRawMock,
  },
}));

vi.mock('./cacheService', () => ({
  CacheService: { getInstance: () => ({ get: cacheGet, set: cacheSet }) },
  CACHE_TTL: { SHORT: 60, MEDIUM: 300, LONG: 1800, HOUR: 3600, DAY: 86400, WEEK: 604800 },
}));

vi.mock('../middleware/youtubeQuota', () => ({
  checkAndConsumeQuota: checkAndConsumeQuotaMock,
  YOUTUBE_DAILY_CAP: 50,
}));

vi.mock('./youtubeService', () => ({
  YouTubeService: {
    getInstance: () => ({ searchVideos: searchVideosMock }),
  },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

async function loadFreshService() {
  vi.resetModules();
  const mod = await import('./videoIndexService');
  (mod.VideoIndexService as unknown as { instance: unknown }).instance = undefined;
  return mod;
}

describe('VideoIndexService.findRelated', () => {
  beforeEach(() => {
    cacheGet.mockReset();
    cacheSet.mockReset();
    queryRawMock.mockReset();
    findUniqueMock.mockReset();
    checkAndConsumeQuotaMock.mockReset();
    searchVideosMock.mockReset();

    cacheGet.mockResolvedValue(null);
    findUniqueMock.mockResolvedValue({
      entities: ['Ukraine', 'Putin', 'NATO', 'sanctions'],
      topics: ['war', 'diplomacy', 'energy'],
      language: 'en',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: local FTS hit returns matched videos without calling youtubeService', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        id: 'v1',
        youtubeId: 'yt1',
        channelId: 'UC11111111111111111111',
        channelName: 'PBS NewsHour',
        title: 'Ukraine update',
        description: 'NATO response',
        thumbnailUrl: 'https://i.ytimg.com/vi/yt1/hqdefault.jpg',
        durationSec: 360,
        publishedAt: new Date('2026-05-01T00:00:00Z'),
        rank: 0.42,
      },
    ]);

    const mod = await loadFreshService();
    const result = await mod.VideoIndexService.getInstance().findRelated('article-123');

    expect(result.source).toBe('local');
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].source).toBe('local-index');
    expect(searchVideosMock).not.toHaveBeenCalled();
  });

  it('Test 2: local empty + quota allows → calls searchVideos exactly once', async () => {
    queryRawMock.mockResolvedValueOnce([]); // local empty
    checkAndConsumeQuotaMock.mockResolvedValueOnce(true);
    searchVideosMock.mockResolvedValueOnce([
      {
        youtubeId: 'yt-fb',
        channelId: 'UC22222222222222222222',
        title: 'Fallback hit',
        description: '',
        thumbnailUrl: 'https://i.ytimg.com/vi/yt-fb/hqdefault.jpg',
      },
    ]);

    const mod = await loadFreshService();
    const result = await mod.VideoIndexService.getInstance().findRelated('article-123');

    expect(searchVideosMock).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('youtube-search');
    expect(result.videos[0].source).toBe('youtube-api');
  });

  it('Test 3: local empty + quota exhausted → empty result, no API call', async () => {
    queryRawMock.mockResolvedValueOnce([]);
    checkAndConsumeQuotaMock.mockResolvedValueOnce(false);

    const mod = await loadFreshService();
    const result = await mod.VideoIndexService.getInstance().findRelated('article-123');

    expect(result.source).toBe('none');
    expect(result.videos).toHaveLength(0);
    expect(searchVideosMock).not.toHaveBeenCalled();
  });

  it('Test 4: cache hit returns cached value without touching Postgres or youtubeService', async () => {
    cacheGet.mockResolvedValueOnce({
      videos: [
        {
          video: {
            id: 'cached1',
            youtubeId: 'cached-yt',
            title: 'Cached',
            description: '',
            publishedAt: new Date('2026-05-01').toISOString(),
          },
          matchScore: 0.9,
          matchedTerms: ['Ukraine'],
          source: 'local-index',
        },
      ],
      source: 'cache',
    });

    const mod = await loadFreshService();
    const result = await mod.VideoIndexService.getInstance().findRelated('article-123');

    expect(result.source).toBe('cache');
    expect(result.videos).toHaveLength(1);
    expect(queryRawMock).not.toHaveBeenCalled();
    expect(searchVideosMock).not.toHaveBeenCalled();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('Test 5: miss caches the result for CACHE_TTL.DAY', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        id: 'v1',
        youtubeId: 'yt1',
        channelId: 'UC11111111111111111111',
        channelName: null,
        title: 'Ukraine update',
        description: '',
        thumbnailUrl: null,
        durationSec: null,
        publishedAt: new Date('2026-05-01T00:00:00Z'),
        rank: 0.42,
      },
    ]);

    const mod = await loadFreshService();
    await mod.VideoIndexService.getInstance().findRelated('article-123');

    expect(cacheSet).toHaveBeenCalledTimes(1);
    const [key, _value, ttl] = cacheSet.mock.calls[0];
    expect(key).toBe('video:related:article-123');
    expect(ttl).toBe(86400); // CACHE_TTL.DAY
  });

  it('returns empty when article does not exist', async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const mod = await loadFreshService();
    const result = await mod.VideoIndexService.getInstance().findRelated('does-not-exist');
    expect(result.videos).toHaveLength(0);
    expect(result.source).toBe('none');
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it('sanitizes entity tokens — strips non-alphanumeric before tsquery', async () => {
    findUniqueMock.mockResolvedValueOnce({
      entities: ["'; DROP TABLE Video; --", 'Putin\'s ally'],
      topics: ['war'],
      language: 'en',
    });
    queryRawMock.mockResolvedValueOnce([]);
    checkAndConsumeQuotaMock.mockResolvedValueOnce(false);

    const mod = await loadFreshService();
    await mod.VideoIndexService.getInstance().findRelated('article-123');

    // The Prisma template tag receives parameters as bound values, not interpolated SQL
    // — but we additionally strip dangerous chars from tokens for ts_query safety.
    expect(queryRawMock).toHaveBeenCalled();
    const args = queryRawMock.mock.calls[0];
    // Args include the tagged-template strings array + bound parameters.
    // The tsquery string parameter must NOT include semicolons or quotes.
    const allParams = args.slice(1).flat().map(String).join(' ');
    expect(allParams).not.toContain(';');
    expect(allParams).not.toContain('--');
  });
});
