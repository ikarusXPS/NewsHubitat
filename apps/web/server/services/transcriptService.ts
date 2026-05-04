/**
 * TranscriptService — singleton orchestrator that coordinates the
 * cache-first transcript lookup chain (Phase 40-06 / D-C1 / CC-05).
 *
 * Lookup order (`getTranscript`):
 *   1. Postgres `Transcript` — if a non-sentinel row exists, return it
 *      (transcribe-once-serve-many; the durable layer per D-C1).
 *   2. If the row IS a sentinel (`provider='unavailable'`) and
 *      `transcribedAt` is < 7 days old, return null without retry
 *      (T-40-06-05 retry-storm guard).
 *   3. Redis hot-cache (`transcript:${contentType}:${id}`) — pure read-through,
 *      30-day TTL.
 *   4. For `video` only: try `youtubeCaptionService.extract(youtubeId)`.
 *      Persist as `provider='youtube-captions'` on hit.
 *   5. Whisper fallback (both content types). For podcast: load the audioUrl.
 *      For video: skip if non-YouTube (Vimeo not transcoded this phase).
 *      Persist as `provider='whisper'` on hit.
 *   6. On terminal failure → upsert sentinel row, return null.
 *
 * `transcribePodcastEpisode(episodeId)` is the worker-callable variant.
 * Critically, it short-circuits to the publisher's transcript (set by
 * 40-03's RSS poll on `<podcast:transcript>`) BEFORE invoking Whisper —
 * that is the Pitfall 4 cost guard (T-40-06-07).
 *
 * Pattern: aiService.ts multi-provider fallback chain.
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma';
import { CacheService, CACHE_TTL } from './cacheService';
import {
  WhisperService,
  type TranscriptResult as WhisperResult,
  type TranscriptSegment,
} from './whisperService';
import { YoutubeCaptionService } from './youtubeCaptionService';
import logger from '../utils/logger';

export type ContentType = 'podcast' | 'video';
export type TranscriptProvider =
  | 'youtube-captions'
  | 'whisper'
  | 'publisher-rss'
  | 'unavailable';

export interface TranscriptRecord {
  id: string;
  contentType: ContentType;
  contentId: string;
  language: string;
  segments: TranscriptSegment[];
  provider: TranscriptProvider;
  transcribedAt: Date;
}

const SENTINEL_RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7d
const REDIS_TTL = 30 * CACHE_TTL.DAY;                    // 30d
const HTTPS_ONLY = /^https:\/\//i;

export class TranscriptService {
  private static instance: TranscriptService;
  private readonly whisper = WhisperService.getInstance();
  private readonly youtube = YoutubeCaptionService.getInstance();
  private readonly cache = CacheService.getInstance();

  private constructor() {
    logger.info('TranscriptService initialized');
  }

  static getInstance(): TranscriptService {
    if (!TranscriptService.instance) {
      TranscriptService.instance = new TranscriptService();
    }
    return TranscriptService.instance;
  }

  static resetForTest(): void {
    TranscriptService.instance = undefined as unknown as TranscriptService;
  }

  /**
   * Cache-first transcript lookup. Returns null when no transcript can be
   * produced (sentinel within 7d, missing audio, terminal Whisper failure).
   */
  async getTranscript(
    contentType: ContentType,
    id: string,
  ): Promise<TranscriptRecord | null> {
    // 1. Postgres cache
    const row = await this.findRow(contentType, id);
    if (row) {
      if (row.provider !== 'unavailable') return this.toRecord(row);
      const age = Date.now() - row.transcribedAt.getTime();
      if (age < SENTINEL_RETRY_AFTER_MS) {
        logger.debug('transcriptService:sentinel_fresh', { contentType, id, age });
        return null;
      }
      logger.info('transcriptService:sentinel_stale_retry', { contentType, id, age });
      // fall through and retry the chain
    }

    // 2. Redis hot-cache (only when no DB row OR retrying after sentinel expiry)
    const cached = await this.readRedis(contentType, id);
    if (cached) return cached;

    // 3+4. Provider chain
    try {
      if (contentType === 'video') {
        const captioned = await this.tryYoutubeCaptions(id);
        if (captioned) {
          return await this.persist(contentType, id, captioned, 'youtube-captions');
        }
      }
      const whispered = await this.tryWhisper(contentType, id);
      if (whispered) {
        return await this.persist(contentType, id, whispered, 'whisper');
      }
    } catch (err) {
      logger.warn('transcriptService:provider_chain_failed', {
        contentType,
        id,
        err: String(err),
      });
    }

    // 5. Sentinel write
    await this.writeSentinel(contentType, id);
    return null;
  }

  /**
   * Premium-gated transcript-segment search via Postgres FTS (Q-05).
   * The `Transcript.search_tsv` GIN index from 40-01 narrows by row; segment
   * filtering happens in JS because we store one Transcript per content.
   */
  async searchSegments(
    contentType: ContentType,
    id: string,
    query: string,
  ): Promise<TranscriptSegment[]> {
    if (!query || query.trim().length === 0) return [];

    // Run the FTS query first to confirm the row matches at all.
    const matches = (await prisma.$queryRaw`
      SELECT id, segments
      FROM "Transcript"
      WHERE "contentType" = ${contentType}
        AND "contentId" = ${id}
        AND search_tsv @@ websearch_to_tsquery('simple', ${query})
      LIMIT 1
    `) as Array<{ id: string; segments: unknown }>;

    if (matches.length === 0) return [];

    const segments = (matches[0].segments as TranscriptSegment[]) ?? [];
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    if (tokens.length === 0) return segments;

    return segments.filter((seg) =>
      tokens.every((tok) => seg.text.toLowerCase().includes(tok)),
    );
  }

  /**
   * Worker-callable variant that pre-transcribes a podcast episode.
   * Pitfall 4: when `PodcastEpisode.transcriptUrl` is present (set by
   * 40-03's RSS poll from `<podcast:transcript>`), fetch the publisher
   * transcript directly and skip Whisper entirely.
   */
  async transcribePodcastEpisode(
    episodeId: string,
  ): Promise<TranscriptRecord | null> {
    const existing = await this.findRow('podcast', episodeId);
    if (existing && existing.provider !== 'unavailable') {
      return this.toRecord(existing);
    }

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        audioUrl: true,
        transcriptUrl: true,
        transcriptType: true,
      },
    });
    if (!episode) return null;

    // Pitfall 4 short-circuit: publisher transcript wins over Whisper.
    if (episode.transcriptUrl && HTTPS_ONLY.test(episode.transcriptUrl)) {
      try {
        const fetched = await this.fetchPublisherTranscript(
          episode.transcriptUrl,
          episode.transcriptType ?? null,
        );
        if (fetched) {
          return await this.persist('podcast', episodeId, fetched, 'publisher-rss');
        }
      } catch (err) {
        logger.warn('transcriptService:publisher_transcript_failed', {
          episodeId,
          err: String(err),
        });
      }
    }

    // No publisher transcript — fall through to Whisper.
    if (!episode.audioUrl) return null;
    try {
      const result = await this.whisper.transcribe(episode.audioUrl);
      if (result.segments.length > 0) {
        return await this.persist('podcast', episodeId, result, 'whisper');
      }
    } catch (err) {
      logger.warn('transcriptService:whisper_failed', { episodeId, err: String(err) });
    }

    await this.writeSentinel('podcast', episodeId);
    return null;
  }

  /**
   * Worker-callable variant for videos. Tries YouTube auto-captions first,
   * falls through to Whisper for YouTube-only (Vimeo not transcoded).
   */
  async transcribeVideo(videoId: string): Promise<TranscriptRecord | null> {
    const existing = await this.findRow('video', videoId);
    if (existing && existing.provider !== 'unavailable') {
      return this.toRecord(existing);
    }
    return this.getTranscript('video', videoId);
  }

  // ────────────────────────────────────────────────────────────────────
  // private helpers

  private async findRow(contentType: ContentType, id: string) {
    return prisma.transcript.findUnique({
      where: { contentType_contentId: { contentType, contentId: id } },
    });
  }

  private async readRedis(
    contentType: ContentType,
    id: string,
  ): Promise<TranscriptRecord | null> {
    if (!this.cache.isAvailable()) return null;
    const key = this.cacheKey(contentType, id);
    const raw = await this.cache.get<TranscriptRecord & { transcribedAt: string | Date }>(key);
    if (!raw) return null;
    return {
      ...raw,
      transcribedAt:
        raw.transcribedAt instanceof Date ? raw.transcribedAt : new Date(raw.transcribedAt),
    };
  }

  private async tryYoutubeCaptions(videoId: string): Promise<WhisperResult | null> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { youtubeId: true },
    });
    if (!video?.youtubeId) return null;
    const result = await this.youtube.extract(video.youtubeId);
    return result;
  }

  private async tryWhisper(
    contentType: ContentType,
    id: string,
  ): Promise<WhisperResult | null> {
    if (contentType === 'podcast') {
      const ep = await prisma.podcastEpisode.findUnique({
        where: { id },
        select: { audioUrl: true, transcriptUrl: true, transcriptType: true },
      });
      if (!ep) return null;
      if (ep.transcriptUrl && HTTPS_ONLY.test(ep.transcriptUrl)) {
        // Pitfall 4 — also honoured on the lazy path.
        try {
          return await this.fetchPublisherTranscript(
            ep.transcriptUrl,
            ep.transcriptType ?? null,
          );
        } catch (err) {
          logger.warn('transcriptService:publisher_transcript_lazy_failed', {
            id,
            err: String(err),
          });
        }
      }
      if (!ep.audioUrl) return null;
      return this.whisper.transcribe(ep.audioUrl);
    }
    // contentType === 'video'
    const video = await prisma.video.findUnique({
      where: { id },
      select: { youtubeId: true, vimeoId: true },
    });
    if (!video) return null;
    if (!video.youtubeId) {
      // Vimeo (or unknown): we don't transcode this phase.
      return null;
    }
    const audioUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;
    return this.whisper.transcribe(audioUrl);
  }

  private async persist(
    contentType: ContentType,
    contentId: string,
    payload: WhisperResult,
    provider: TranscriptProvider,
  ): Promise<TranscriptRecord> {
    const fullText = payload.segments.map((s) => s.text).join(' ').trim();
    const id = randomUUID();
    const row = await prisma.transcript.upsert({
      where: { contentType_contentId: { contentType, contentId } },
      create: {
        id,
        contentType,
        contentId,
        language: payload.language,
        // Prisma serialises JS objects to JSONB.
        segments: payload.segments as unknown as object,
        fullText,
        provider,
      },
      update: {
        language: payload.language,
        segments: payload.segments as unknown as object,
        fullText,
        provider,
        transcribedAt: new Date(),
      },
    });
    const record = this.toRecord(row);
    if (this.cache.isAvailable()) {
      await this.cache
        .set(this.cacheKey(contentType, contentId), record, REDIS_TTL)
        .catch((err) =>
          logger.warn('transcriptService:cache_write_failed', { err: String(err) }),
        );
    }
    return record;
  }

  private async writeSentinel(
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    try {
      const id = randomUUID();
      await prisma.transcript.upsert({
        where: { contentType_contentId: { contentType, contentId } },
        create: {
          id,
          contentType,
          contentId,
          language: 'en',
          segments: [] as unknown as object,
          fullText: '',
          provider: 'unavailable',
        },
        update: { transcribedAt: new Date(), provider: 'unavailable' },
      });
    } catch (err) {
      logger.warn('transcriptService:sentinel_write_failed', {
        contentType,
        contentId,
        err: String(err),
      });
    }
  }

  /**
   * Fetch and parse a publisher transcript URL into TranscriptSegment[].
   * Detects format by content-type AND first 8 bytes:
   *   - WEBVTT prefix → VTT
   *   - first non-blank line is a digit → SRT
   *   - first non-whitespace `{` → JSON
   *   - else plain text → single segment with startSec=0
   *
   * Validates `https://` only (T-40-06-07 SSRF guard).
   */
  private async fetchPublisherTranscript(
    url: string,
    typeHint: string | null,
  ): Promise<WhisperResult | null> {
    if (!HTTPS_ONLY.test(url)) {
      logger.warn('transcriptService:publisher_transcript_blocked_scheme', { url });
      return null;
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`publisher transcript fetch failed: ${res.status}`);
    }
    const ct = (res.headers.get('content-type') ?? typeHint ?? '').toLowerCase();
    const text = await res.text();
    return parsePublisherTranscript(text, ct);
  }

  private toRecord(row: {
    id: string;
    contentType: string;
    contentId: string;
    language: string;
    segments: unknown;
    provider: string;
    transcribedAt: Date;
  }): TranscriptRecord {
    return {
      id: row.id,
      contentType: row.contentType as ContentType,
      contentId: row.contentId,
      language: row.language,
      segments: (row.segments as TranscriptSegment[]) ?? [],
      provider: row.provider as TranscriptProvider,
      transcribedAt: row.transcribedAt,
    };
  }

  private cacheKey(contentType: ContentType, id: string): string {
    return `transcript:${contentType}:${id}`;
  }
}

/**
 * Parse a publisher transcript text payload into TranscriptSegment[].
 * Exposed for unit testing.
 */
export function parsePublisherTranscript(
  text: string,
  contentType: string,
): WhisperResult | null {
  if (!text || text.trim().length === 0) return null;
  const trimmed = text.trim();

  if (contentType.includes('vtt') || trimmed.startsWith('WEBVTT')) {
    return parseVtt(text);
  }
  if (contentType.includes('srt') || /^\d+\s*$/m.test(trimmed.slice(0, 32))) {
    return parseSrt(text);
  }
  if (contentType.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJsonTranscript(text);
  }
  // Plain text fallback — single segment.
  return {
    segments: [{ startSec: 0, endSec: 0, text: trimmed }],
    language: 'en',
  };
}

function parseTimestamp(s: string): number {
  // 00:01:02.345 or 00:01:02,345
  const m = s.match(/^(\d+):(\d+):(\d+)[.,](\d+)$/);
  if (!m) return 0;
  const [, h, mm, ss, ms] = m;
  return Number(h) * 3600 + Number(mm) * 60 + Number(ss) + Number(`0.${ms}`);
}

function parseVtt(text: string): WhisperResult {
  const segments: TranscriptSegment[] = [];
  const blocks = text.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const cueLine = lines.find((l) => l.includes('-->'));
    if (!cueLine) continue;
    const [start, end] = cueLine.split('-->').map((p) => p.trim());
    const idx = lines.indexOf(cueLine);
    const body = lines.slice(idx + 1).join(' ').trim();
    if (!body) continue;
    segments.push({
      startSec: parseTimestamp(start),
      endSec: parseTimestamp(end),
      text: body,
    });
  }
  return { segments, language: 'en' };
}

function parseSrt(text: string): WhisperResult {
  const segments: TranscriptSegment[] = [];
  const blocks = text.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length < 2) continue;
    const cueLine = lines.find((l) => l.includes('-->'));
    if (!cueLine) continue;
    const [start, end] = cueLine.split('-->').map((p) => p.trim());
    const idx = lines.indexOf(cueLine);
    const body = lines.slice(idx + 1).join(' ').trim();
    if (!body) continue;
    segments.push({
      startSec: parseTimestamp(start),
      endSec: parseTimestamp(end),
      text: body,
    });
  }
  return { segments, language: 'en' };
}

function parseJsonTranscript(text: string): WhisperResult | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    const segs = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { segments?: unknown[] }).segments)
        ? (parsed as { segments: unknown[] }).segments
        : null;
    if (!segs) return null;
    const segments = segs
      .map((raw) => {
        const s = raw as { startSec?: number; start?: number; endSec?: number; end?: number; text?: string };
        const startSec = Number(s.startSec ?? s.start ?? 0);
        const endSec = Number(s.endSec ?? s.end ?? startSec);
        const text = String(s.text ?? '').trim();
        if (!text) return null;
        return { startSec, endSec, text };
      })
      .filter((s): s is TranscriptSegment => s !== null);
    const language = (parsed as { language?: string }).language ?? 'en';
    return { segments, language };
  } catch {
    return null;
  }
}
