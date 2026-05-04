/**
 * Unit tests for VideoChannelPollJob (Phase 40-05 / Task 7).
 *
 * Covers:
 *   1. start/stop lifecycle (no double-start; isRunning gating)
 *   2. RUN_JOBS=false → start() is a no-op
 *   3. runOnce dedupes by youtubeId before createMany
 *   4. Per-channel error isolation: one channel failing does not abort loop
 *   5. Duration backfill respects DURATION_BACKFILL_CAP (≤500/run)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const fetchChannelRSSMock = vi.fn();
const backfillDurationsMock = vi.fn();
const findManyMock = vi.fn();
const createManyMock = vi.fn();
const updateMock = vi.fn();

vi.mock('../services/youtubeService', () => ({
  YouTubeService: {
    getInstance: () => ({
      fetchChannelRSS: fetchChannelRSSMock,
      backfillDurations: backfillDurationsMock,
    }),
  },
}));

vi.mock('../db/prisma', () => ({
  prisma: {
    video: {
      findMany: findManyMock,
      createMany: createManyMock,
      update: updateMock,
    },
  },
}));

vi.mock('../config/video-channels', () => ({
  VIDEO_CHANNELS: [
    {
      id: 'channel-a',
      name: 'Channel A',
      handle: '@a',
      channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
      region: 'usa',
      language: 'en',
    },
    {
      id: 'channel-b',
      name: 'Channel B',
      handle: '@b',
      channelId: 'UCbbbbbbbbbbbbbbbbbbbbbb',
      region: 'europa',
      language: 'en',
    },
  ],
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

async function loadFreshJob() {
  vi.resetModules();
  const mod = await import('./videoChannelPollJob');
  (mod.VideoChannelPollJob as unknown as { instance: unknown }).instance = undefined;
  return mod;
}

describe('VideoChannelPollJob', () => {
  beforeEach(() => {
    fetchChannelRSSMock.mockReset();
    backfillDurationsMock.mockReset();
    findManyMock.mockReset();
    createManyMock.mockReset();
    updateMock.mockReset();
    delete process.env.RUN_JOBS;

    // Default: empty for both phases
    fetchChannelRSSMock.mockResolvedValue([]);
    findManyMock.mockResolvedValue([]);
    createManyMock.mockResolvedValue({ count: 0 });
    backfillDurationsMock.mockResolvedValue(new Map());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 1a: start/stop lifecycle - start schedules interval, stop clears it', async () => {
    vi.useFakeTimers();
    const mod = await loadFreshJob();
    const job = mod.VideoChannelPollJob.getInstance();

    // Spy on setInterval
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    job.start();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    job.stop();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('Test 1b: double-start is a no-op (warns, no extra interval)', async () => {
    vi.useFakeTimers();
    const mod = await loadFreshJob();
    const job = mod.VideoChannelPollJob.getInstance();

    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    job.start();
    job.start(); // second call should warn + return
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    job.stop();
  });

  it('Test 2: RUN_JOBS=false → start() is a no-op', async () => {
    process.env.RUN_JOBS = 'false';
    vi.useFakeTimers();
    const mod = await loadFreshJob();
    const job = mod.VideoChannelPollJob.getInstance();

    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    job.start();
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('Test 3: runOnce dedupes by youtubeId before createMany', async () => {
    fetchChannelRSSMock
      .mockResolvedValueOnce([
        { youtubeId: 'new1', title: 'New 1', description: '', publishedAt: new Date(), thumbnailUrl: 'u1' },
        { youtubeId: 'old1', title: 'Old 1', description: '', publishedAt: new Date(), thumbnailUrl: 'u2' },
      ])
      .mockResolvedValueOnce([]);

    // Channel A has `old1` already in DB
    findManyMock
      .mockResolvedValueOnce([{ youtubeId: 'old1' }]) // pre-createMany dedupe lookup
      .mockResolvedValueOnce([]); // backfill phase

    const mod = await loadFreshJob();
    const job = mod.VideoChannelPollJob.getInstance();
    const result = await job.runOnce();

    expect(createManyMock).toHaveBeenCalledTimes(1);
    const args = createManyMock.mock.calls[0][0];
    expect(args.data).toHaveLength(1);
    expect(args.data[0].youtubeId).toBe('new1');
    expect(args.skipDuplicates).toBe(true);
    expect(result.inserted).toBe(1);
  });

  it('Test 4: per-channel error isolation - bad channel does not abort loop', async () => {
    fetchChannelRSSMock
      .mockRejectedValueOnce(new Error('RSS down'))   // Channel A fails
      .mockResolvedValueOnce([                         // Channel B succeeds
        { youtubeId: 'b1', title: 'B1', description: '', publishedAt: new Date(), thumbnailUrl: 'u' },
      ]);

    findManyMock
      .mockResolvedValueOnce([])  // pre-createMany dedupe for B
      .mockResolvedValueOnce([]); // backfill phase

    const mod = await loadFreshJob();
    const job = mod.VideoChannelPollJob.getInstance();
    const result = await job.runOnce();

    // Both channels were processed — fetchChannelRSS called twice
    expect(fetchChannelRSSMock).toHaveBeenCalledTimes(2);
    // Only Channel B's row inserted
    expect(createManyMock).toHaveBeenCalledTimes(1);
    expect(result.inserted).toBe(1);
  });

  it('Test 5: backfill respects 500-row hard cap', async () => {
    // Empty RSS → Phase 1 dedupe findMany is skipped (length===0 fast-path).
    // Only the Phase 2 backfill findMany is called.
    fetchChannelRSSMock.mockResolvedValue([]);
    findManyMock.mockResolvedValueOnce(
      Array.from({ length: 500 }, (_, i) => ({ youtubeId: `vid${i}` })),
    );
    backfillDurationsMock.mockResolvedValueOnce(new Map([['vid0', 60]]));

    const mod = await loadFreshJob();
    const job = mod.VideoChannelPollJob.getInstance();
    await job.runOnce();

    // Verify the take parameter on the backfill query
    const backfillFindManyArgs = findManyMock.mock.calls[0][0];
    expect(backfillFindManyArgs.take).toBe(500);
  });

  it('runOnce returns counters even when nothing inserted', async () => {
    const mod = await loadFreshJob();
    const job = mod.VideoChannelPollJob.getInstance();
    const result = await job.runOnce();
    expect(result).toEqual({ inserted: 0, backfilled: 0 });
  });
});
