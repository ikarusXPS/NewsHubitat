/**
 * Podcast Feed Poll Job (Phase 40-03 / CONT-03 / Q-01).
 *
 * Daily worker job that polls each curated podcast feed for new episodes.
 * Captures the Podcasting 2.0 `<podcast:transcript>` namespace tag
 * (Pitfall 4 — load-bearing for the Phase 40-06 transcript orchestrator's
 * cost model). All per-episode logic — including HTML stripping at the
 * persistence boundary (H8/M2 fix) — lives inside `podcastService.pollFeed()`.
 * This job is just the iterator + retry shell, mirroring CleanupService's
 * start/stop/runOnce lifecycle.
 *
 * Gating: per the placeholder comment at apps/web/server/index.ts:538
 * ("both check RUN_JOBS internally inside the job module's start() method"),
 * `start()` self-skips when RUN_JOBS=false. The seam in index.ts simply calls
 * `PodcastFeedPollJob.getInstance().start()` unconditionally; only the
 * app-worker Swarm replica (RUN_JOBS=true) actually schedules the interval.
 * Web replicas log a debug line and return without spawning the timer.
 */

import { PodcastService } from '../services/podcastService';
import { PODCAST_FEEDS } from '../config/podcasts';
import logger from '../utils/logger';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = DAY_IN_MS;

export class PodcastFeedPollJob {
  private static instance: PodcastFeedPollJob;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly podcastService = PodcastService.getInstance();

  private constructor() {
    logger.info('PodcastFeedPollJob initialized');
  }

  static getInstance(): PodcastFeedPollJob {
    if (!PodcastFeedPollJob.instance) {
      PodcastFeedPollJob.instance = new PodcastFeedPollJob();
    }
    return PodcastFeedPollJob.instance;
  }

  start(): void {
    // RUN_JOBS internal gate (per index.ts:538 placeholder contract): web
    // replicas with RUN_JOBS=false never schedule this job. Default true so
    // single-replica dev preserves existing behaviour.
    if (process.env.RUN_JOBS === 'false') {
      logger.debug('PodcastFeedPollJob skipped: RUN_JOBS=false');
      return;
    }
    if (this.isRunning) {
      logger.warn('PodcastFeedPollJob already running');
      return;
    }
    this.isRunning = true;

    // Run immediately on startup
    this.runOnce().catch(err =>
      logger.error(`Initial podcast feed poll failed: ${(err as Error).message}`),
    );

    // Schedule daily run
    this.intervalId = setInterval(() => {
      this.runOnce().catch(err =>
        logger.error(`Scheduled podcast feed poll failed: ${(err as Error).message}`),
      );
    }, POLL_INTERVAL_MS);

    logger.info('PodcastFeedPollJob started — runs daily');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('PodcastFeedPollJob stopped');
  }

  async runOnce(): Promise<{ totalInserted: number }> {
    logger.info(`podcast-feed-poll:start (${PODCAST_FEEDS.length} feeds)`);
    let totalInserted = 0;
    for (const feed of PODCAST_FEEDS) {
      try {
        const inserted = await this.podcastService.pollFeed(feed);
        totalInserted += inserted;
      } catch (err) {
        // Per-feed isolation: a hostile feed cannot kill the whole run.
        logger.warn(`pollFeed(${feed.id}) error: ${(err as Error).message}`);
      }
    }
    logger.info(`podcast-feed-poll:done (inserted=${totalInserted})`);
    return { totalInserted };
  }
}
