/**
 * Unit tests for `youtubeQuota.checkAndConsumeQuota` (Phase 40-05 / Task 3).
 *
 * Covers the 5 behaviors in PLAN:
 *   1. First call returns true; Redis key is INCRed to 1
 *   2. Calls 1-50 return true; call 51 returns false
 *   3. Redis-down (getClient → null) returns true (graceful degradation)
 *   4. First call (count===1) sets EXPIREAT to next-UTC-midnight
 *   5. Subsequent calls within the same day do NOT re-set EXPIREAT
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const incrMock = vi.fn();
const expireatMock = vi.fn();
const getClientMock = vi.fn();

vi.mock('../services/cacheService', () => ({
  CacheService: {
    getInstance: () => ({
      getClient: getClientMock,
    }),
  },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('youtubeQuota.checkAndConsumeQuota', () => {
  beforeEach(() => {
    incrMock.mockReset();
    expireatMock.mockReset();
    getClientMock.mockReset();
    // Default: Redis available
    getClientMock.mockReturnValue({
      incr: incrMock,
      expireat: expireatMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 1: first call on a fresh date returns true and INCRs the daily key', async () => {
    incrMock.mockResolvedValue(1);
    const { checkAndConsumeQuota } = await import('./youtubeQuota');

    const ok = await checkAndConsumeQuota();

    expect(ok).toBe(true);
    expect(incrMock).toHaveBeenCalledTimes(1);
    const key = incrMock.mock.calls[0][0] as string;
    expect(key).toMatch(/^youtube:quota:\d{4}-\d{2}-\d{2}$/);
  });

  it('Test 2: calls 1-50 return true; call 51 returns false', async () => {
    const { checkAndConsumeQuota } = await import('./youtubeQuota');
    // First 50 increments — all should be allowed
    for (let i = 1; i <= 50; i++) {
      incrMock.mockResolvedValueOnce(i);
      const ok = await checkAndConsumeQuota();
      expect(ok, `call ${i} should be allowed`).toBe(true);
    }
    // 51st call — over cap
    incrMock.mockResolvedValueOnce(51);
    const ok = await checkAndConsumeQuota();
    expect(ok).toBe(false);
  });

  it('Test 3: Redis-down (getClient returns null) returns true (graceful degradation)', async () => {
    getClientMock.mockReturnValue(null);
    const { checkAndConsumeQuota } = await import('./youtubeQuota');

    const ok = await checkAndConsumeQuota();

    expect(ok).toBe(true);
    expect(incrMock).not.toHaveBeenCalled();
  });

  it('Test 4: first call sets EXPIREAT to next-UTC-midnight', async () => {
    // Freeze time to 2026-05-04T08:30:00Z (an arbitrary mid-day UTC instant)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T08:30:00.000Z'));

    incrMock.mockResolvedValue(1);
    const { checkAndConsumeQuota } = await import('./youtubeQuota');

    await checkAndConsumeQuota();

    expect(expireatMock).toHaveBeenCalledTimes(1);
    const [key, ts] = expireatMock.mock.calls[0];
    expect(key).toBe('youtube:quota:2026-05-04');
    // 2026-05-05T00:00:00Z = 1778025600 unix seconds
    const expectedTs = Math.floor(Date.UTC(2026, 4, 5, 0, 0, 0) / 1000);
    expect(ts).toBe(expectedTs);
  });

  it('Test 5: subsequent calls within the same day do NOT re-set EXPIREAT', async () => {
    const { checkAndConsumeQuota } = await import('./youtubeQuota');

    // count===2 (second call same day)
    incrMock.mockResolvedValueOnce(2);
    await checkAndConsumeQuota();

    expect(expireatMock).not.toHaveBeenCalled();

    // count===17 (mid-day)
    incrMock.mockResolvedValueOnce(17);
    await checkAndConsumeQuota();

    expect(expireatMock).not.toHaveBeenCalled();
  });

  it('YOUTUBE_DAILY_CAP is exported and equals 50 (D-D1)', async () => {
    const { YOUTUBE_DAILY_CAP } = await import('./youtubeQuota');
    expect(YOUTUBE_DAILY_CAP).toBe(50);
  });
});
