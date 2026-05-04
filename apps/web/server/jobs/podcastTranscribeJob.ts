/**
 * Podcast Transcribe Job (Phase 40-06 / D-C2 / Q-01).
 *
 * Nightly batch worker that pre-transcribes curated podcast episodes lacking
 * a Transcript row. Mirrors `cleanupService.ts`'s start/stop/runOnce shape.
 *
 * Pitfall 4 cost guard (load-bearing): every per-episode call goes through
 * `TranscriptService.transcribePodcastEpisode(id)`, which checks
 * `PodcastEpisode.transcriptUrl` (set by 40-03's RSS poll from
 * `<podcast:transcript>`) BEFORE invoking Whisper. When a publisher transcript
 * is available the publisher-rss provider wins and Whisper is never called —
 * that is the load-bearing test for this plan and the cost model
 * (≥ 40% Whisper bill savings per 40-CONTEXT.md D-C2).
 *
 * Gating: per the placeholder comment at apps/web/server/index.ts:550
 * ("both check RUN_JOBS internally inside the job module's start() method"),
 * `start()` self-skips when RUN_JOBS=false. The seam in index.ts simply calls
 * `PodcastTranscribeJob.getInstance().start()` unconditionally; only the
 * app-worker Swarm replica (RUN_JOBS=true) actually schedules the interval.
 */

import { prisma } from '../db/prisma';
import { TranscriptService } from '../services/transcriptService';
import logger from '../utils/logger';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = DAY_IN_MS;
const BATCH_SIZE = 50; // ceiling per run; bounded cost: ~50 × 25min × $0.006 ≈ $7.5

export interface RunStats {
  processed: number;
  skippedRss: number;
  transcribed: number;
  failed: number;
}

export class PodcastTranscribeJob {
  private static instance: PodcastTranscribeJob;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly transcriptService = TranscriptService.getInstance();

  private constructor() {
    logger.info('PodcastTranscribeJob initialized');
  }

  static getInstance(): PodcastTranscribeJob {
    if (!PodcastTranscribeJob.instance) {
      PodcastTranscribeJob.instance = new PodcastTranscribeJob();
    }
    return PodcastTranscribeJob.instance;
  }

  static resetForTest(): void {
    PodcastTranscribeJob.instance = undefined as unknown as PodcastTranscribeJob;
  }

  start(): void {
    if (process.env.RUN_JOBS === 'false') {
      logger.debug('PodcastTranscribeJob skipped: RUN_JOBS=false');
      return;
    }
    if (this.isRunning) {
      logger.warn('PodcastTranscribeJob already running');
      return;
    }
    this.isRunning = true;

    this.runOnce().catch((err) =>
      logger.error('podcastTranscribeJob:initial_failed', { err: String(err) }),
    );

    this.intervalId = setInterval(() => {
      this.runOnce().catch((err) =>
        logger.error('podcastTranscribeJob:scheduled_failed', { err: String(err) }),
      );
    }, POLL_INTERVAL_MS);

    logger.info('PodcastTranscribeJob started — runs daily');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('PodcastTranscribeJob stopped');
  }

  /**
   * One pass. Selects up to BATCH_SIZE episodes that DO NOT yet have a
   * Transcript row (using a 2-step query: episode IDs minus existing
   * podcast Transcript rows — Prisma's relation filter cannot point through
   * a flat `(contentType, contentId)` discriminator).
   */
  async runOnce(): Promise<RunStats> {
    logger.info('podcastTranscribeJob:run_start');
    const stats: RunStats = { processed: 0, skippedRss: 0, transcribed: 0, failed: 0 };

    // Step 1: fetch most-recent episodes
    const candidates = await prisma.podcastEpisode.findMany({
      orderBy: { publishedAt: 'desc' },
      take: BATCH_SIZE * 2, // over-fetch so we still hit BATCH_SIZE after filtering
      select: { id: true, transcriptUrl: true },
    });
    if (candidates.length === 0) {
      logger.info('podcastTranscribeJob:run_complete', stats);
      return stats;
    }

    // Step 2: drop episodes that already have a non-sentinel Transcript
    const existing = await prisma.transcript.findMany({
      where: {
        contentType: 'podcast',
        contentId: { in: candidates.map((c) => c.id) },
        provider: { not: 'unavailable' },
      },
      select: { contentId: true },
    });
    const seen = new Set(existing.map((r) => r.contentId));
    const todo = candidates.filter((c) => !seen.has(c.id)).slice(0, BATCH_SIZE);

    for (const ep of todo) {
      try {
        const result = await this.transcriptService.transcribePodcastEpisode(ep.id);
        if (!result) {
          stats.failed++;
        } else if (result.provider === 'publisher-rss') {
          stats.skippedRss++; // Pitfall 4 saved a Whisper call.
        } else if (result.provider === 'whisper') {
          stats.transcribed++;
        } else {
          stats.failed++;
        }
      } catch (err) {
        logger.error('podcastTranscribeJob:episode_failed', {
          episodeId: ep.id,
          err: String(err),
        });
        stats.failed++;
      }
      stats.processed++;
    }

    logger.info('podcastTranscribeJob:run_complete', stats);
    return stats;
  }
}
