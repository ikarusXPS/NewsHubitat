/**
 * Unit tests for PodcastFeedPollJob (Phase 40-03 / CONT-03 / Q-01).
 *
 * Mirrors cleanupService.test.ts shape (vi.useFakeTimers + vi.advanceTimersByTime).
 *
 * Behaviors covered:
 *   1. Singleton invariant
 *   2. Idempotent start() — second call without stop() warns + skips
 *   3. start() runs immediately + schedules 24h interval
 *   4. stop() clears the interval + flips isRunning
 *   5. runOnce() iterates PODCAST_FEEDS and calls pollFeed for each
 *   6. Single-feed rejection does NOT abort the run
 *   7. Job is NOT internally RUN_JOBS-gated — gating happens at the call site
 *      (Task 8). The unit test exercises start() unconditionally.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

const pollFeed = vi.fn();
vi.mock('../services/podcastService', () => ({
  PodcastService: { getInstance: () => ({ pollFeed }) },
}));

vi.mock('../config/podcasts', () => ({
  PODCAST_FEEDS: [
    { id: 'feed-a', title: 'A', region: 'usa', language: 'en', rssUrl: 'https://a', category: 'news', reliability: 8 },
    { id: 'feed-b', title: 'B', region: 'usa', language: 'en', rssUrl: 'https://b', category: 'news', reliability: 8 },
    { id: 'feed-c', title: 'C', region: 'usa', language: 'en', rssUrl: 'https://c', category: 'news', reliability: 8 },
  ],
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { PodcastFeedPollJob } from './podcastFeedPollJob';
import logger from '../utils/logger';

describe('PodcastFeedPollJob', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    pollFeed.mockReset();
    pollFeed.mockResolvedValue(0);
    vi.clearAllMocks();
  });

  afterEach(() => {
    PodcastFeedPollJob.getInstance().stop();
    (PodcastFeedPollJob as unknown as { instance: PodcastFeedPollJob | undefined }).instance = undefined;
  });

  describe('singleton', () => {
    it('getInstance() returns same instance', () => {
      const a = PodcastFeedPollJob.getInstance();
      const b = PodcastFeedPollJob.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('start()', () => {
    it('triggers initial run and schedules 24h interval', async () => {
      const job = PodcastFeedPollJob.getInstance();
      job.start();
      // Initial run scheduled — flush microtasks
      await Promise.resolve();
      await Promise.resolve();
      // Initial run should have called pollFeed for each feed
      expect(pollFeed).toHaveBeenCalledTimes(3);
      // Advance 24h: scheduled run fires
      pollFeed.mockClear();
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      expect(pollFeed).toHaveBeenCalledTimes(3);
    });

    it('is idempotent — second start() warns and does not spawn second interval', async () => {
      const job = PodcastFeedPollJob.getInstance();
      job.start();
      // Drain the initial-run microtasks so all 3 feed pollFeed calls settle
      await vi.advanceTimersByTimeAsync(0);
      pollFeed.mockClear();
      job.start(); // second call
      expect(logger.warn).toHaveBeenCalled();
      // Advance 24h once: pollFeed called once per feed (not twice — only one interval)
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      expect(pollFeed).toHaveBeenCalledTimes(3);
    });
  });

  describe('stop()', () => {
    it('clears interval and resets isRunning', async () => {
      const job = PodcastFeedPollJob.getInstance();
      job.start();
      // Drain initial run before clearing the spy — otherwise in-flight
      // runOnce iterations land on pollFeed AFTER the spy reset.
      await vi.advanceTimersByTimeAsync(0);
      job.stop();
      pollFeed.mockClear();
      // No more scheduled runs
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      expect(pollFeed).not.toHaveBeenCalled();

      // After stop(), start() should work again (not stuck in 'already running')
      job.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(pollFeed).toHaveBeenCalled();
    });
  });

  describe('runOnce()', () => {
    it('iterates PODCAST_FEEDS, returns aggregate inserted count', async () => {
      pollFeed.mockResolvedValueOnce(2).mockResolvedValueOnce(0).mockResolvedValueOnce(3);
      const job = PodcastFeedPollJob.getInstance();
      const result = await job.runOnce();
      expect(result.totalInserted).toBe(5);
      expect(pollFeed).toHaveBeenCalledTimes(3);
    });

    it('continues iterating when one feed rejects', async () => {
      pollFeed
        .mockRejectedValueOnce(new Error('A failed'))
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      const job = PodcastFeedPollJob.getInstance();
      const result = await job.runOnce();
      // 2 successful feeds inserted; failure logged but didn't abort
      expect(result.totalInserted).toBe(3);
      expect(pollFeed).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
