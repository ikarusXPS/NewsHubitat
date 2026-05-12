/**
 * WhisperService (Phase 40-06 / D-C1 / T-40-06-01 / T-40-06-02).
 *
 * Wraps an OpenAI-SDK-compatible Whisper API for podcast/video transcription.
 * Returns timestamped segments (CC-05) via `verbose_json` +
 * `timestamp_granularities: ['segment']`.
 *
 * Provider selection (2026-05-12 update):
 *  - If `GROQ_API_KEY` is set → Groq Whisper (free dev tier, drop-in
 *    OpenAI-API-compatible). Uses `whisper-large-v3-turbo` model.
 *  - Else if `OPENAI_API_KEY` is set → OpenAI Whisper (paid, ~$0.006/min).
 *    Uses `whisper-1` model.
 *  - Else `getClient()` throws.
 * Groq is preferred when both are set so dev/test stays free.
 *
 * Hard requirements (40-RESEARCH "Anti-Patterns to Avoid"):
 *  - Whisper API caps single uploads at 25 MB (Groq + OpenAI both). Larger
 *    files are chunked with `ffmpeg-static` (10-min segments, `-c copy` so
 *    no re-encode is needed). Per-chunk timestamps are shifted by the
 *    chunk's offset so the merged `segments[].startSec/endSec` are
 *    continuous across chunks (CC-05).
 *  - HEAD pre-fetch rejects audio > 200 MB (T-40-06-02 cost guard) BEFORE the
 *    download happens.
 *  - The OpenAI-shaped client is constructed lazily; missing API keys only
 *    throw at first `transcribe()` call so dev boot stays non-fatal.
 *  - `WHISPER_DISABLED=true` short-circuits to an empty result so E2E and
 *    integration tests don't burn API credits.
 *
 * Singleton: `WhisperService.getInstance()` — mirrors cleanupService.ts.
 */

import { createReadStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import logger from '../utils/logger';

export interface TranscriptSegment {
  startSec: number;
  endSec: number;
  text: string;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  language: string;
}

interface AudioChunk {
  path: string;
  offsetSec: number;
}

const WHISPER_HARD_LIMIT_BYTES = 25 * 1024 * 1024; // 25 MB — Whisper API cap
const HEAD_REJECT_BYTES = 200 * 1024 * 1024;        // 200 MB — T-40-06-02 cost guard
const CHUNK_DURATION_SEC = 600;                     // 10-minute segments

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'whisper-large-v3-turbo';
const OPENAI_MODEL = 'whisper-1';

export class WhisperService {
  private static instance: WhisperService;
  private client: OpenAI | null = null;
  private model: string = OPENAI_MODEL;

  private constructor() {
    logger.info('WhisperService initialized');
  }

  static getInstance(): WhisperService {
    if (!WhisperService.instance) {
      WhisperService.instance = new WhisperService();
    }
    return WhisperService.instance;
  }

  /**
   * Reset the cached singleton/client. Test-only — used by Vitest to ensure
   * each test sees a fresh instance after env-var mutation.
   */
  static resetForTest(): void {
    WhisperService.instance = undefined as unknown as WhisperService;
  }

  private getClient(): OpenAI {
    if (this.client) return this.client;

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (groqKey) {
      this.client = new OpenAI({ apiKey: groqKey, baseURL: GROQ_BASE_URL });
      this.model = GROQ_MODEL;
      logger.info('whisperService:provider', { provider: 'groq', model: this.model });
      return this.client;
    }
    if (openaiKey) {
      this.client = new OpenAI({ apiKey: openaiKey });
      this.model = OPENAI_MODEL;
      logger.info('whisperService:provider', { provider: 'openai', model: this.model });
      return this.client;
    }
    throw new Error(
      'Neither GROQ_API_KEY nor OPENAI_API_KEY is set; WhisperService cannot transcribe.',
    );
  }

  /**
   * Transcribe `audioUrl` and return time-aligned segments.
   *
   * @throws when `audioUrl` content-length exceeds 200 MB (T-40-06-02) OR
   *         when OPENAI_API_KEY is missing OR when the upstream Whisper
   *         request fails after retries.
   */
  async transcribe(
    audioUrl: string,
    options: { language?: string } = {},
  ): Promise<TranscriptResult> {
    if (process.env.WHISPER_DISABLED === 'true') {
      logger.info('whisperService:disabled (WHISPER_DISABLED=true) — returning empty');
      return { segments: [], language: options.language ?? 'en' };
    }

    const downloadPath = await this.downloadAudio(audioUrl);
    const tmpFiles: string[] = [downloadPath];
    try {
      const stat = await fs.stat(downloadPath);
      const chunks: AudioChunk[] = stat.size > WHISPER_HARD_LIMIT_BYTES
        ? await this.chunkAudio(downloadPath)
        : [{ path: downloadPath, offsetSec: 0 }];

      // Track every chunk path so we can clean it up regardless of success.
      for (const c of chunks) {
        if (c.path !== downloadPath) tmpFiles.push(c.path);
      }

      const merged: TranscriptSegment[] = [];
      let language: string | undefined;
      for (const c of chunks) {
        const t0 = Date.now();
        const partial = await this.transcribeChunk(c.path, options.language);
        const ms = Date.now() - t0;
        logger.info('whisperService:chunk_done', {
          chunkPath: path.basename(c.path),
          offsetSec: c.offsetSec,
          ms,
          segments: partial.segments.length,
        });
        for (const seg of partial.segments) {
          merged.push({
            startSec: seg.startSec + c.offsetSec,
            endSec: seg.endSec + c.offsetSec,
            text: seg.text,
          });
        }
        if (!language) language = partial.language;
      }

      return { segments: merged, language: language ?? options.language ?? 'en' };
    } finally {
      for (const p of tmpFiles) {
        await fs.unlink(p).catch(() => {
          // best-effort cleanup; OS will reclaim tmp eventually
        });
      }
    }
  }

  /**
   * HEAD-then-GET download. Rejects > 200 MB (T-40-06-02) before fetching the body.
   */
  private async downloadAudio(audioUrl: string): Promise<string> {
    const headRes = await fetch(audioUrl, { method: 'HEAD' }).catch((err) => {
      logger.warn('whisperService:head_failed', { audioUrl, err });
      return null;
    });
    if (headRes) {
      const len = parseInt(headRes.headers.get('content-length') ?? '0', 10);
      if (len > HEAD_REJECT_BYTES) {
        throw new Error(
          `audio too large for budget; reject before download (${len} bytes > ${HEAD_REJECT_BYTES})`,
        );
      }
    }

    const ext = this.extensionFromUrl(audioUrl);
    const tmpPath = path.join(os.tmpdir(), `whisper-${randomUUID()}${ext}`);
    const res = await fetch(audioUrl);
    if (!res.ok || !res.body) {
      throw new Error(`Failed to download audio from ${audioUrl}: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(tmpPath, buf);
    return tmpPath;
  }

  private extensionFromUrl(audioUrl: string): string {
    try {
      const u = new URL(audioUrl);
      const ext = path.extname(u.pathname);
      return ext && /^\.[A-Za-z0-9]+$/.test(ext) ? ext : '.mp3';
    } catch {
      return '.mp3';
    }
  }

  /**
   * Split a >25 MB audio file into 10-minute segments via ffmpeg-static.
   * Uses `-c copy` so there is no re-encode (fast + lossless).
   */
  private async chunkAudio(srcPath: string): Promise<AudioChunk[]> {
    const ext = path.extname(srcPath) || '.mp3';
    const base = path.join(os.tmpdir(), `whisper-chunks-${randomUUID()}`);
    const pattern = `${base}_%03d${ext}`;

    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(srcPath)
        .outputOptions([
          '-f', 'segment',
          `-segment_time`, String(CHUNK_DURATION_SEC),
          '-c', 'copy',
          '-reset_timestamps', '1',
        ])
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(pattern);
    });

    // Resolve produced files; ffmpeg numbers them sequentially.
    const dir = path.dirname(base);
    const prefix = path.basename(base);
    const entries = await fs.readdir(dir);
    const matches = entries
      .filter((n) => n.startsWith(prefix + '_') && n.endsWith(ext))
      .sort();
    if (matches.length === 0) {
      throw new Error('whisperService: ffmpeg produced no chunks');
    }
    return matches.map((name, idx) => ({
      path: path.join(dir, name),
      offsetSec: idx * CHUNK_DURATION_SEC,
    }));
  }

  /**
   * Single Whisper API call. MUST use `verbose_json` + `timestamp_granularities`
   * per CC-05 + 40-RESEARCH anti-pattern.
   */
  private async transcribeChunk(
    filePath: string,
    language: string | undefined,
  ): Promise<TranscriptResult> {
    const client = this.getClient();
    const res = (await client.audio.transcriptions.create({
      file: createReadStream(filePath) as unknown as File,
      model: this.model,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language,
    } as unknown as Parameters<typeof client.audio.transcriptions.create>[0])) as unknown as {
      language?: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    const segments: TranscriptSegment[] = (res.segments ?? []).map((s) => ({
      startSec: Number(s.start) || 0,
      endSec: Number(s.end) || 0,
      text: String(s.text ?? '').trim(),
    }));
    return { segments, language: res.language ?? language ?? 'en' };
  }
}
