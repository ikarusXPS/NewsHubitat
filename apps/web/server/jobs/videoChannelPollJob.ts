/**
 * Video Channel Poll Job (Phase 40-05 / CONT-05 / D-D1).
 *
 * Daily worker job that polls each curated YouTube channel's RSS feed,
 * upserts new videos into the `Video` Prisma table, then back-fills
 * durationSec via batched `videos.list?part=contentDetails` calls
 * (≤50 IDs per call → 1 quota unit per batch — Pitfall 3 in RESEARCH).
 *
 * Mirrors `PodcastFeedPollJob` lifecycle exactly (start/stop/runOnce
 * + RUN_JOBS=false self-skip per the placeholder seam contract). The
 * mount in `server/index.ts` calls `start()` unconditionally; only the
 * `app-worker` Swarm replica with RUN_JOBS=true actually schedules the
 * interval.
 *
 * Per-channel error isolation: a hostile/dead RSS feed cannot kill the
 * whole sweep. Errors are logged with the channel id and the loop
 * continues with the next channel.
 *
 * Hard caps:
 *   - 500 rows/run for the duration backfill (avoids runaway quota burn
 *     on a fresh deployment with empty Video table)
 */

import { prisma } from '../db/prisma';
import { YouTubeService } from '../services/youtubeService';
import { VIDEO_CHANNELS } from '../config/video-channels';
import logger from '../utils/logger';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = DAY_IN_MS;
const DURATION_BACKFILL_CAP = 500;

export class VideoChannelPollJob {
  private static instance: VideoChannelPollJob | undefined;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly youtube = YouTubeService.getInstance();

  private constructor() {
    logger.info('VideoChannelPollJob initialized');
  }

  static getInstance(): VideoChannelPollJob {
    if (!VideoChannelPollJob.instance) {
      VideoChannelPollJob.instance = new VideoChannelPollJob();
    }
    return VideoChannelPollJob.instance;
  }

  start(): void {
    // RUN_JOBS internal gate (per index.ts:543 placeholder contract): web
    // replicas with RUN_JOBS=false never schedule this job. Default true so
    // single-replica dev preserves existing behaviour.
    if (process.env.RUN_JOBS === 'false') {
      logger.debug('VideoChannelPollJob skipped: RUN_JOBS=false');
      return;
    }
    if (this.isRunning) {
      logger.warn('VideoChannelPollJob already running');
      return;
    }
    this.isRunning = true;

    // Run immediately on startup
    this.runOnce().catch(err =>
      logger.error(`Initial videoChannelPoll failed: ${(err as Error).message}`),
    );

    // Schedule daily run
    this.intervalId = setInterval(() => {
      this.runOnce().catch(err =>
        logger.error(`Scheduled videoChannelPoll failed: ${(err as Error).message}`),
      );
    }, POLL_INTERVAL_MS);

    logger.info('VideoChannelPollJob started — runs daily');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('VideoChannelPollJob stopped');
  }

  async runOnce(): Promise<{ inserted: number; backfilled: number }> {
    logger.info(`videoChannelPoll:start (${VIDEO_CHANNELS.length} channels)`);
    let inserted = 0;

    // Phase 1: per-channel RSS poll → upsert new Video rows
    for (const ch of VIDEO_CHANNELS) {
      try {
        const items = await this.youtube.fetchChannelRSS(ch.channelId);
        if (items.length === 0) continue;

        // Dedupe vs existing rows
        const existing = await prisma.video.findMany({
          where: { youtubeId: { in: items.map(i => i.youtubeId) } },
          select: { youtubeId: true },
        });
        const existingIds = new Set(existing.map(e => e.youtubeId));
        const newItems = items.filter(i => !existingIds.has(i.youtubeId));

        if (newItems.length === 0) continue;

        await prisma.video.createMany({
          data: newItems.map(i => ({
            id: `yt:${i.youtubeId}`,
            youtubeId: i.youtubeId,
            channelId: ch.channelId,
            channelName: ch.name,
            title: i.title,
            description: i.description,
            thumbnailUrl: i.thumbnailUrl,
            publishedAt: i.publishedAt,
            region: ch.region,
            // durationSec back-filled in Phase 2 below
          })),
          skipDuplicates: true,
        });
        inserted += newItems.length;
      } catch (err) {
        // Per-channel isolation: a hostile feed cannot kill the whole run
        logger.warn(`videoChannelPoll: channel ${ch.id} (${ch.handle}) failed: ${(err as Error).message}`);
      }
    }

    // Phase 2: batched duration backfill (Pitfall 3)
    let backfilled = 0;
    try {
      const needsDuration = await prisma.video.findMany({
        where: { durationSec: null, youtubeId: { not: null } },
        select: { youtubeId: true },
        take: DURATION_BACKFILL_CAP,
      });
      if (needsDuration.length > 0) {
        const ids = needsDuration
          .map(v => v.youtubeId)
          .filter((id): id is string => Boolean(id));
        const durations = await this.youtube.backfillDurations(ids);
        for (const [youtubeId, sec] of durations) {
          try {
            await prisma.video.update({
              where: { youtubeId },
              data: { durationSec: sec },
            });
            backfilled++;
          } catch (err) {
            logger.warn(
              `videoChannelPoll: duration backfill for ${youtubeId} failed: ${(err as Error).message}`,
            );
          }
        }
      }
    } catch (err) {
      logger.warn(`videoChannelPoll: backfill phase failed: ${(err as Error).message}`);
    }

    logger.info(`videoChannelPoll:complete inserted=${inserted} backfilled=${backfilled}`);
    return { inserted, backfilled };
  }
}
