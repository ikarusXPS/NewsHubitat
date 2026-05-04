/**
 * YoutubeCaptionService — wraps `youtube-caption-extractor` for the free
 * auto-caption fetch path (Phase 40-06 / D-C1).
 *
 * Pitfall 5 guard: the upstream package may return an empty array when a
 * video has captions disabled or the language is missing. We treat empty as
 * "captions unavailable" by returning `null` so the orchestrator can fall
 * through to Whisper. Network errors also yield `null` (logged at warn).
 *
 * videoId shape is validated up front (`/^[A-Za-z0-9_-]{11}$/`) to fail fast
 * on malformed input — defence in depth on top of the route's Zod schema.
 */

import { getSubtitles } from 'youtube-caption-extractor';
import type { TranscriptSegment } from './whisperService';
import logger from '../utils/logger';

export interface CaptionResult {
  segments: TranscriptSegment[];
  language: string;
}

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export class YoutubeCaptionService {
  private static instance: YoutubeCaptionService;

  private constructor() {
    logger.info('YoutubeCaptionService initialized');
  }

  static getInstance(): YoutubeCaptionService {
    if (!YoutubeCaptionService.instance) {
      YoutubeCaptionService.instance = new YoutubeCaptionService();
    }
    return YoutubeCaptionService.instance;
  }

  static resetForTest(): void {
    YoutubeCaptionService.instance = undefined as unknown as YoutubeCaptionService;
  }

  /**
   * Fetch auto-captions for a YouTube `videoId`.
   * Returns `null` on:
   *   - validation failure
   *   - thrown error (network, captions disabled)
   *   - empty array (Pitfall 5 — captions unavailable)
   */
  async extract(
    videoId: string,
    options: { lang?: string } = {},
  ): Promise<CaptionResult | null> {
    if (!VIDEO_ID_RE.test(videoId)) {
      logger.warn('youtube-captions:invalid_id', { videoId });
      return null;
    }

    const lang = options.lang ?? 'en';
    let raw: Array<{ start: string; dur: string; text: string }>;
    try {
      raw = await getSubtitles({ videoID: videoId, lang });
    } catch (err) {
      logger.warn('youtube-captions:fetch_failed', { videoId, err: String(err) });
      return null;
    }

    if (!Array.isArray(raw) || raw.length === 0) {
      logger.info('youtube-captions:empty', { videoId });
      return null;
    }

    const segments: TranscriptSegment[] = raw.map((s) => {
      const startSec = parseFloat(s.start);
      const dur = parseFloat(s.dur);
      return {
        startSec: Number.isFinite(startSec) ? startSec : 0,
        endSec: Number.isFinite(startSec) && Number.isFinite(dur) ? startSec + dur : 0,
        text: String(s.text ?? '').trim(),
      };
    });

    return { segments, language: lang };
  }
}
