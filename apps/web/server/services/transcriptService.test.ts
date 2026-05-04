/**
 * TranscriptService unit tests (Phase 40-06 / Task 3).
 *
 * Covers the orchestration contract:
 *   - Postgres cache hit returns existing transcript without provider calls
 *   - Sentinel < 7d: returns null without retry (T-40-06-05)
 *   - Sentinel ≥ 7d: retries the chain
 *   - Video contentType tries YouTube captions first; podcast skips that step
 *   - Whisper failure writes a sentinel row and returns null
 *   - Pitfall 4: transcribePodcastEpisode with transcriptUrl set fetches the
 *     publisher transcript and DOES NOT call Whisper
 *   - searchSegments uses Postgres FTS via $queryRaw
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Prisma mock
const prismaMock = {
  transcript: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  podcastEpisode: { findUnique: vi.fn() },
  video: { findUnique: vi.fn() },
  $queryRaw: vi.fn(),
};
vi.mock('../db/prisma', () => ({ prisma: prismaMock }));

// CacheService mock
const cacheGet = vi.fn();
const cacheSet = vi.fn();
const cacheIsAvailable = vi.fn().mockReturnValue(false);
vi.mock('./cacheService', () => ({
  CacheService: {
    getInstance: () => ({
      get: cacheGet,
      set: cacheSet,
      isAvailable: cacheIsAvailable,
    }),
  },
  CACHE_TTL: { SHORT: 60, MEDIUM: 300, LONG: 1800, HOUR: 3600, DAY: 86400, WEEK: 604800 },
}));

// WhisperService mock
const whisperTranscribe = vi.fn();
vi.mock('./whisperService', () => ({
  WhisperService: { getInstance: () => ({ transcribe: whisperTranscribe }) },
}));

// YoutubeCaptionService mock
const youtubeExtract = vi.fn();
vi.mock('./youtubeCaptionService', () => ({
  YoutubeCaptionService: { getInstance: () => ({ extract: youtubeExtract }) },
}));

describe('TranscriptService', () => {
  beforeEach(async () => {
    vi.resetModules();
    Object.values(prismaMock.transcript).forEach((f) => (f as ReturnType<typeof vi.fn>).mockReset());
    prismaMock.podcastEpisode.findUnique.mockReset();
    prismaMock.video.findUnique.mockReset();
    prismaMock.$queryRaw.mockReset();
    cacheGet.mockReset();
    cacheSet.mockReset();
    cacheIsAvailable.mockReturnValue(false);
    whisperTranscribe.mockReset();
    youtubeExtract.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns existing Postgres transcript without invoking providers (cache hit)', async () => {
    prismaMock.transcript.findUnique.mockResolvedValueOnce({
      id: 't1',
      contentType: 'podcast',
      contentId: 'ep1',
      language: 'en',
      segments: [{ startSec: 0, endSec: 5, text: 'cached' }],
      provider: 'whisper',
      transcribedAt: new Date(),
    });

    const { TranscriptService } = await import('./transcriptService.ts');
    TranscriptService.resetForTest();
    const result = await TranscriptService.getInstance().getTranscript('podcast', 'ep1');

    expect(result?.provider).toBe('whisper');
    expect(whisperTranscribe).not.toHaveBeenCalled();
    expect(youtubeExtract).not.toHaveBeenCalled();
  });

  it('returns null without retry when sentinel row is < 7 days old (T-40-06-05)', async () => {
    prismaMock.transcript.findUnique.mockResolvedValueOnce({
      id: 't1',
      contentType: 'video',
      contentId: 'v1',
      language: 'en',
      segments: [],
      provider: 'unavailable',
      transcribedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1d old
    });

    const { TranscriptService } = await import('./transcriptService.ts');
    TranscriptService.resetForTest();
    const result = await TranscriptService.getInstance().getTranscript('video', 'v1');

    expect(result).toBeNull();
    expect(youtubeExtract).not.toHaveBeenCalled();
    expect(whisperTranscribe).not.toHaveBeenCalled();
    expect(prismaMock.transcript.upsert).not.toHaveBeenCalled();
  });

  it('retries the chain when sentinel row is ≥ 7 days old', async () => {
    prismaMock.transcript.findUnique.mockResolvedValueOnce({
      id: 't1',
      contentType: 'video',
      contentId: 'v1',
      language: 'en',
      segments: [],
      provider: 'unavailable',
      transcribedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8d old
    });
    prismaMock.video.findUnique.mockResolvedValueOnce({ youtubeId: 'abc12345678' });
    youtubeExtract.mockResolvedValueOnce({
      segments: [{ startSec: 0, endSec: 4, text: 'fresh' }],
      language: 'en',
    });
    prismaMock.transcript.upsert.mockResolvedValueOnce({
      id: 't1',
      contentType: 'video',
      contentId: 'v1',
      language: 'en',
      segments: [{ startSec: 0, endSec: 4, text: 'fresh' }],
      provider: 'youtube-captions',
      transcribedAt: new Date(),
    });

    const { TranscriptService } = await import('./transcriptService.ts');
    TranscriptService.resetForTest();
    const result = await TranscriptService.getInstance().getTranscript('video', 'v1');

    expect(youtubeExtract).toHaveBeenCalledTimes(1);
    expect(result?.provider).toBe('youtube-captions');
  });

  it('skips YouTube caption step entirely for podcast contentType', async () => {
    prismaMock.transcript.findUnique.mockResolvedValueOnce(null);
    prismaMock.podcastEpisode.findUnique.mockResolvedValueOnce({
      audioUrl: 'https://x.com/a.mp3',
      transcriptUrl: null,
      transcriptType: null,
    });
    whisperTranscribe.mockResolvedValueOnce({
      segments: [{ startSec: 0, endSec: 5, text: 'whispered' }],
      language: 'en',
    });
    prismaMock.transcript.upsert.mockResolvedValueOnce({
      id: 't2',
      contentType: 'podcast',
      contentId: 'ep1',
      language: 'en',
      segments: [{ startSec: 0, endSec: 5, text: 'whispered' }],
      provider: 'whisper',
      transcribedAt: new Date(),
    });

    const { TranscriptService } = await import('./transcriptService.ts');
    TranscriptService.resetForTest();
    const result = await TranscriptService.getInstance().getTranscript('podcast', 'ep1');

    expect(youtubeExtract).not.toHaveBeenCalled();
    expect(whisperTranscribe).toHaveBeenCalledTimes(1);
    expect(result?.provider).toBe('whisper');
  });

  it('writes a sentinel row when Whisper terminally fails', async () => {
    prismaMock.transcript.findUnique.mockResolvedValueOnce(null);
    prismaMock.podcastEpisode.findUnique.mockResolvedValueOnce({
      audioUrl: 'https://x.com/a.mp3',
      transcriptUrl: null,
      transcriptType: null,
    });
    whisperTranscribe.mockRejectedValueOnce(new Error('whisper down'));
    prismaMock.transcript.upsert.mockResolvedValueOnce({
      id: 't3',
      contentType: 'podcast',
      contentId: 'ep1',
      language: 'en',
      segments: [],
      provider: 'unavailable',
      transcribedAt: new Date(),
    });

    const { TranscriptService } = await import('./transcriptService.ts');
    TranscriptService.resetForTest();
    const result = await TranscriptService.getInstance().getTranscript('podcast', 'ep1');

    expect(result).toBeNull();
    expect(prismaMock.transcript.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = prismaMock.transcript.upsert.mock.calls[0][0];
    expect(upsertArg.create.provider).toBe('unavailable');
  });

  it('Pitfall 4: transcribePodcastEpisode short-circuits to publisher transcript without Whisper', async () => {
    prismaMock.transcript.findUnique.mockResolvedValueOnce(null);
    prismaMock.podcastEpisode.findUnique.mockResolvedValueOnce({
      id: 'ep1',
      audioUrl: 'https://x.com/a.mp3',
      transcriptUrl: 'https://publisher.example/transcript.vtt',
      transcriptType: 'text/vtt',
    });
    const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nFirst line\n\n00:00:05.000 --> 00:00:10.000\nSecond line`;
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/vtt' },
      text: async () => vtt,
    });
    prismaMock.transcript.upsert.mockResolvedValueOnce({
      id: 't4',
      contentType: 'podcast',
      contentId: 'ep1',
      language: 'en',
      segments: [
        { startSec: 0, endSec: 5, text: 'First line' },
        { startSec: 5, endSec: 10, text: 'Second line' },
      ],
      provider: 'publisher-rss',
      transcribedAt: new Date(),
    });

    const { TranscriptService } = await import('./transcriptService.ts');
    TranscriptService.resetForTest();
    const result = await TranscriptService.getInstance().transcribePodcastEpisode('ep1');

    expect(whisperTranscribe).not.toHaveBeenCalled();
    expect(result?.provider).toBe('publisher-rss');
    const upsertArg = prismaMock.transcript.upsert.mock.calls[0][0];
    expect(upsertArg.create.provider).toBe('publisher-rss');
  });

  it('searchSegments uses Postgres FTS via $queryRaw and filters to matching segments', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        id: 't1',
        segments: [
          { startSec: 0, endSec: 5, text: 'introduction to cyber threats' },
          { startSec: 5, endSec: 10, text: 'monetary policy update' },
        ],
      },
    ]);

    const { TranscriptService } = await import('./transcriptService.ts');
    TranscriptService.resetForTest();
    const segments = await TranscriptService.getInstance().searchSegments(
      'podcast',
      'ep1',
      'cyber threats',
    );

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('introduction to cyber threats');
  });
});
