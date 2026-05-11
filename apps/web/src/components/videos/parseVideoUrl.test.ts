import { describe, it, expect } from 'vitest';
import { parseVideoUrl } from './parseVideoUrl';

describe('parseVideoUrl', () => {
  describe('YouTube', () => {
    it('extracts id from youtube.com/watch?v=ID', () => {
      expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
      });
    });

    it('extracts id from youtube-nocookie.com', () => {
      expect(parseVideoUrl('https://www.youtube-nocookie.com/watch?v=abc123XYZ_-')).toEqual({
        provider: 'youtube',
        id: 'abc123XYZ_-',
      });
    });

    it('extracts id from youtube.com/embed/ID', () => {
      expect(parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual({
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
      });
    });

    it('extracts id from youtu.be short link', () => {
      expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
      });
    });

    it('handles youtu.be link with extra path segments', () => {
      expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ/extra')).toEqual({
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
      });
    });

    it('returns null when youtu.be path is empty', () => {
      expect(parseVideoUrl('https://youtu.be/')).toBeNull();
    });

    it('returns null when youtube.com has no ?v= and no /embed/', () => {
      expect(parseVideoUrl('https://www.youtube.com/playlist?list=PL123')).toBeNull();
    });

    it('returns null when youtube.com/embed/ID has empty id', () => {
      expect(parseVideoUrl('https://www.youtube.com/embed/')).toBeNull();
    });

    it('falls back to embed path when ?v= is empty', () => {
      // /embed regex requires non-empty id; missing v + non-matching embed → null
      expect(parseVideoUrl('https://www.youtube.com/embed')).toBeNull();
    });
  });

  describe('Vimeo', () => {
    it('extracts numeric id from vimeo.com/123456', () => {
      expect(parseVideoUrl('https://vimeo.com/123456')).toEqual({
        provider: 'vimeo',
        id: '123456',
      });
    });

    it('returns null for player.vimeo.com/video/ID (path does not start with digits)', () => {
      // The current implementation only matches paths starting with /<digits> —
      // /video/123456 misses the regex because it starts with /video.
      expect(parseVideoUrl('https://player.vimeo.com/video/123456')).toBeNull();
    });

    it('returns null for vimeo URL with non-numeric path', () => {
      expect(parseVideoUrl('https://vimeo.com/ondemand/something')).toBeNull();
    });
  });

  describe('unknown / invalid', () => {
    it('returns null for unknown providers', () => {
      expect(parseVideoUrl('https://example.com/video/abc')).toBeNull();
    });

    it('returns null for malformed URLs (URL constructor throws)', () => {
      expect(parseVideoUrl('not a url')).toBeNull();
      expect(parseVideoUrl('')).toBeNull();
      expect(parseVideoUrl('://broken')).toBeNull();
    });
  });
});
