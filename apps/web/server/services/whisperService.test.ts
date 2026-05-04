/**
 * WhisperService unit tests (Phase 40-06 / Task 1).
 *
 * Mocks OpenAI + ffmpeg-static + fluent-ffmpeg + global fetch to lock in:
 *  - verbose_json + timestamp_granularities are passed to OpenAI (CC-05)
 *  - WHISPER_DISABLED=true short-circuits without hitting the API
 *  - >200MB content-length is rejected pre-download (T-40-06-02)
 *  - >25MB triggers chunking and chunk offsets are merged into continuous timestamps
 *  - missing OPENAI_API_KEY throws on first transcribe() call (not at module load)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';

// In-memory mock of the OpenAI client. The constructor stub must remain
// stable across module reloads so re-importing whisperService picks up
// the same captured `transcribeMock`.
const transcribeMock = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      audio = { transcriptions: { create: transcribeMock } };
    },
  };
});

// Mock fluent-ffmpeg's chainable builder to avoid spawning an external binary.
const ffmpegSaveMock = vi.fn();
vi.mock('fluent-ffmpeg', () => {
  const factory = (input: string) => {
    void input;
    const builder: Record<string, unknown> = {};
    builder.outputOptions = () => builder;
    let endHandler: (() => void) | null = null;
    builder.on = (event: string, cb: (...args: unknown[]) => void) => {
      if (event === 'end') endHandler = cb as () => void;
      return builder;
    };
    builder.save = (pattern: string) => {
      ffmpegSaveMock(pattern);
      // Synchronously fire `end` so tests don't need to wait
      setImmediate(() => endHandler?.());
      return builder;
    };
    return builder;
  };
  return {
    default: Object.assign(factory, { setFfmpegPath: vi.fn() }),
  };
});

// ffmpeg-static is only used to set the path; mock it out cleanly.
vi.mock('ffmpeg-static', () => ({ default: '/fake/ffmpeg' }));

// We mock `node:fs/promises` (the production code imports `* as fs` from it)
// and also `node:fs` for the synchronous `createReadStream` used to feed
// the OpenAI Whisper request. createReadStream returns a no-op Readable
// stream so the mocked OpenAI client doesn't have to read real bytes off
// disk and the stream never emits an error event.
const statMock = vi.fn();
const writeFileMock = vi.fn().mockResolvedValue(undefined);
const readdirMock = vi.fn();
const unlinkMock = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    default: {
      ...actual,
      createReadStream: () => Readable.from(['fake audio bytes']),
    },
    createReadStream: () => Readable.from(['fake audio bytes']),
  };
});

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    default: {
      ...actual,
      stat: statMock,
      writeFile: writeFileMock,
      readdir: readdirMock,
      unlink: unlinkMock,
    },
    stat: statMock,
    writeFile: writeFileMock,
    readdir: readdirMock,
    unlink: unlinkMock,
  };
});

describe('WhisperService', () => {
  beforeEach(async () => {
    vi.resetModules();
    transcribeMock.mockReset();
    ffmpegSaveMock.mockReset();
    statMock.mockReset();
    writeFileMock.mockClear();
    readdirMock.mockReset();
    unlinkMock.mockClear();

    // Default: small file
    statMock.mockResolvedValue({ size: 5 * 1024 * 1024 });
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.WHISPER_DISABLED;

    // Default fetch: HEAD returns small content-length, GET returns body
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: { 'content-length': String(5 * 1024 * 1024) },
        });
      }
      return new Response(new ArrayBuffer(8));
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.WHISPER_DISABLED;
  });

  it('passes verbose_json + segment timestamp_granularities to OpenAI (CC-05)', async () => {
    transcribeMock.mockResolvedValueOnce({
      language: 'en',
      segments: [
        { start: 0, end: 5, text: 'Hello' },
        { start: 5, end: 10, text: 'World' },
      ],
    });

    const { WhisperService } = await import('./whisperService.ts');
    WhisperService.resetForTest();
    const svc = WhisperService.getInstance();

    const result = await svc.transcribe('https://example.com/audio.mp3');

    expect(transcribeMock).toHaveBeenCalledTimes(1);
    const call = transcribeMock.mock.calls[0][0];
    expect(call.response_format).toBe('verbose_json');
    expect(call.timestamp_granularities).toEqual(['segment']);
    expect(call.model).toBe('whisper-1');
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({ startSec: 0, endSec: 5, text: 'Hello' });
    expect(result.language).toBe('en');
  });

  it('short-circuits when WHISPER_DISABLED=true (no API call, no fetch)', async () => {
    process.env.WHISPER_DISABLED = 'true';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { WhisperService } = await import('./whisperService.ts');
    WhisperService.resetForTest();
    const svc = WhisperService.getInstance();

    const result = await svc.transcribe('https://example.com/audio.mp3', { language: 'de' });

    expect(result).toEqual({ segments: [], language: 'de' });
    expect(transcribeMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects audio whose content-length exceeds 200 MB (T-40-06-02)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: { 'content-length': String(300 * 1024 * 1024) },
        });
      }
      return new Response(new ArrayBuffer(8));
    }));

    const { WhisperService } = await import('./whisperService.ts');
    WhisperService.resetForTest();
    const svc = WhisperService.getInstance();

    await expect(svc.transcribe('https://example.com/huge.mp3')).rejects.toThrow(
      /audio too large/i,
    );
    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it('chunks audio > 25 MB and merges chunk timestamps with offsets', async () => {
    statMock.mockResolvedValue({ size: 30 * 1024 * 1024 });
    // Service derives a UUID-based prefix; capture the pattern argument passed
    // to ffmpeg.save() and synthesise matching filenames in readdir so the
    // service's startsWith(prefix + '_') filter accepts them.
    let capturedPrefix = '';
    ffmpegSaveMock.mockImplementation((pattern: string) => {
      const base = pattern.replace(/_%03d\.[A-Za-z0-9]+$/, '');
      const slash = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'));
      capturedPrefix = base.slice(slash + 1);
    });
    readdirMock.mockImplementation(async () => [
      `${capturedPrefix}_000.mp3`,
      `${capturedPrefix}_001.mp3`,
    ]);

    transcribeMock
      .mockResolvedValueOnce({
        language: 'en',
        segments: [{ start: 0, end: 30, text: 'chunk-1-segment' }],
      })
      .mockResolvedValueOnce({
        language: 'en',
        segments: [{ start: 0, end: 30, text: 'chunk-2-segment' }],
      });

    const { WhisperService } = await import('./whisperService.ts');
    WhisperService.resetForTest();
    const svc = WhisperService.getInstance();

    const result = await svc.transcribe('https://example.com/long.mp3');

    expect(transcribeMock).toHaveBeenCalledTimes(2);
    expect(ffmpegSaveMock).toHaveBeenCalledTimes(1);
    expect(result.segments).toHaveLength(2);
    // First chunk's start stays 0; second chunk's start shifts by 600.
    expect(result.segments[0]).toEqual({ startSec: 0, endSec: 30, text: 'chunk-1-segment' });
    expect(result.segments[1]).toEqual({ startSec: 600, endSec: 630, text: 'chunk-2-segment' });
  });

  it('throws on first transcribe() call when OPENAI_API_KEY missing (boot stays non-fatal)', async () => {
    delete process.env.OPENAI_API_KEY;
    // Module load must NOT throw — only transcribe()
    const { WhisperService } = await import('./whisperService.ts');
    WhisperService.resetForTest();
    const svc = WhisperService.getInstance(); // does not throw

    await expect(svc.transcribe('https://example.com/audio.mp3')).rejects.toThrow(
      /OPENAI_API_KEY/i,
    );
  });
});
