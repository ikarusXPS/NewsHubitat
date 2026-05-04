/**
 * PodcastTranscribeJob unit tests (Phase 40-06 / Task 5).
 *
 * Pitfall 4 (load-bearing): episodes WITH transcriptUrl set must NOT cause
 * Whisper to be called. The test verifies that when TranscriptService returns
 * provider='publisher-rss', the skippedRss counter increments and the per-run
 * stats reflect the cost saving.
 *
 * Lifecycle: start() honours RUN_JOBS=false self-skip; idempotent across calls;
 * stop() clears the interval cleanly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findManyEpisodes = vi.fn();
const findManyTranscripts = vi.fn();
vi.mock('../db/prisma', () => ({
  prisma: {
    podcastEpisode: { findMany: findManyEpisodes },
    transcript: { findMany: findManyTranscripts },
  },
}));

const transcribePodcastEpisode = vi.fn();
vi.mock('../services/transcriptService', () => ({
  TranscriptService: {
    getInstance: () => ({ transcribePodcastEpisode }),
  },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('PodcastTranscribeJob', () => {
  beforeEach(() => {
    vi.resetModules();
    findManyEpisodes.mockReset();
    findManyTranscripts.mockReset();
    transcribePodcastEpisode.mockReset();
    delete process.env.RUN_JOBS;
  });
  afterEach(() => {
    delete process.env.RUN_JOBS;
  });

  it('Pitfall 4: episode with publisher transcript counts as skippedRss (no Whisper bill)', async () => {
    findManyEpisodes.mockResolvedValueOnce([
      { id: 'ep-with-rss', transcriptUrl: 'https://publisher.example/x.vtt' },
      { id: 'ep-no-rss', transcriptUrl: null },
    ]);
    findManyTranscripts.mockResolvedValueOnce([]);
    transcribePodcastEpisode
      .mockResolvedValueOnce({ provider: 'publisher-rss' })
      .mockResolvedValueOnce({ provider: 'whisper' });

    const { PodcastTranscribeJob } = await import('./podcastTranscribeJob.ts');
    PodcastTranscribeJob.resetForTest();
    const stats = await PodcastTranscribeJob.getInstance().runOnce();

    expect(stats).toEqual({
      processed: 2,
      skippedRss: 1,
      transcribed: 1,
      failed: 0,
    });
    // Pitfall 4 contract: TranscriptService is the only call site; the
    // service's internal Whisper short-circuit is verified in
    // transcriptService.test.ts. Here we assert the orchestrator counted
    // both providers correctly so cost telemetry holds.
    expect(transcribePodcastEpisode).toHaveBeenCalledTimes(2);
    expect(transcribePodcastEpisode).toHaveBeenCalledWith('ep-with-rss');
    expect(transcribePodcastEpisode).toHaveBeenCalledWith('ep-no-rss');
  });

  it('skips episodes that already have a non-sentinel Transcript', async () => {
    findManyEpisodes.mockResolvedValueOnce([
      { id: 'ep-already-done', transcriptUrl: null },
      { id: 'ep-pending', transcriptUrl: null },
    ]);
    findManyTranscripts.mockResolvedValueOnce([{ contentId: 'ep-already-done' }]);
    transcribePodcastEpisode.mockResolvedValueOnce({ provider: 'whisper' });

    const { PodcastTranscribeJob } = await import('./podcastTranscribeJob.ts');
    PodcastTranscribeJob.resetForTest();
    const stats = await PodcastTranscribeJob.getInstance().runOnce();

    expect(stats.processed).toBe(1);
    expect(transcribePodcastEpisode).toHaveBeenCalledTimes(1);
    expect(transcribePodcastEpisode).toHaveBeenCalledWith('ep-pending');
  });

  it('start() self-skips when RUN_JOBS=false (web-replica safe)', async () => {
    process.env.RUN_JOBS = 'false';
    const { PodcastTranscribeJob } = await import('./podcastTranscribeJob.ts');
    PodcastTranscribeJob.resetForTest();
    const job = PodcastTranscribeJob.getInstance();
    job.start();
    // No timer scheduled, no findMany invoked.
    expect(findManyEpisodes).not.toHaveBeenCalled();
  });

  it('start() is idempotent — second call warns and is a no-op', async () => {
    findManyEpisodes.mockResolvedValue([]);
    findManyTranscripts.mockResolvedValue([]);

    const { PodcastTranscribeJob } = await import('./podcastTranscribeJob.ts');
    PodcastTranscribeJob.resetForTest();
    const job = PodcastTranscribeJob.getInstance();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    job.start();
    job.start();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    job.stop();
    setIntervalSpy.mockRestore();
  });

  it('stop() clears the interval', async () => {
    findManyEpisodes.mockResolvedValue([]);
    findManyTranscripts.mockResolvedValue([]);

    const { PodcastTranscribeJob } = await import('./podcastTranscribeJob.ts');
    PodcastTranscribeJob.resetForTest();
    const job = PodcastTranscribeJob.getInstance();
    job.start();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    job.stop();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    clearIntervalSpy.mockRestore();
  });
});
