/**
 * YoutubeCaptionService unit tests (Phase 40-06 / Task 2).
 *
 * Locks in the Pitfall 5 contract: empty array → null. Also asserts thrown
 * errors are swallowed (return null) and that valid responses are mapped to
 * TranscriptSegment[] with numeric startSec/endSec.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSubtitlesMock = vi.fn();
vi.mock('youtube-caption-extractor', () => ({
  getSubtitles: getSubtitlesMock,
}));

describe('YoutubeCaptionService', () => {
  beforeEach(() => {
    vi.resetModules();
    getSubtitlesMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when the package returns an empty array (Pitfall 5)', async () => {
    getSubtitlesMock.mockResolvedValueOnce([]);
    const { YoutubeCaptionService } = await import('./youtubeCaptionService.ts');
    YoutubeCaptionService.resetForTest();
    const svc = YoutubeCaptionService.getInstance();
    const result = await svc.extract('dQw4w9WgXcQ');
    expect(result).toBeNull();
  });

  it('returns null when the package throws (network error / captions disabled)', async () => {
    getSubtitlesMock.mockRejectedValueOnce(new Error('captions disabled'));
    const { YoutubeCaptionService } = await import('./youtubeCaptionService.ts');
    YoutubeCaptionService.resetForTest();
    const svc = YoutubeCaptionService.getInstance();
    const result = await svc.extract('dQw4w9WgXcQ');
    expect(result).toBeNull();
  });

  it('maps valid response to TranscriptSegment[] with numeric startSec/endSec', async () => {
    getSubtitlesMock.mockResolvedValueOnce([
      { start: '0.5', dur: '4.2', text: 'Hello world' },
      { start: '4.7', dur: '3.0', text: ' Second  ' },
    ]);
    const { YoutubeCaptionService } = await import('./youtubeCaptionService.ts');
    YoutubeCaptionService.resetForTest();
    const svc = YoutubeCaptionService.getInstance();
    const result = await svc.extract('dQw4w9WgXcQ', { lang: 'de' });
    expect(result).not.toBeNull();
    expect(result?.language).toBe('de');
    expect(result?.segments).toHaveLength(2);
    expect(result?.segments[0]).toEqual({
      startSec: 0.5,
      endSec: 4.7,
      text: 'Hello world',
    });
    expect(result?.segments[1]).toEqual({
      startSec: 4.7,
      endSec: 7.7,
      text: 'Second',
    });
  });

  it('rejects malformed videoId without invoking the upstream package', async () => {
    const { YoutubeCaptionService } = await import('./youtubeCaptionService.ts');
    YoutubeCaptionService.resetForTest();
    const svc = YoutubeCaptionService.getInstance();
    const result = await svc.extract('not-a-valid-id');
    expect(result).toBeNull();
    expect(getSubtitlesMock).not.toHaveBeenCalled();
  });
});
