/**
 * Tests for the curated VIDEO_CHANNELS config (Phase 40-05 / Task 1).
 *
 * Verifies the shape contract that downstream consumers rely on:
 *   - youtubeService.fetchChannelRSS(channelId) needs every channelId
 *     to match the YouTube UC… 24-character format
 *   - videoChannelPollJob iterates every entry
 *   - VideoChannel type must include id/handle/name/language/region
 */

import { describe, it, expect } from 'vitest';
import { VIDEO_CHANNELS } from './video-channels';
import type { PerspectiveRegion } from '../../src/types';

const VALID_REGIONS: PerspectiveRegion[] = [
  'usa',
  'europa',
  'deutschland',
  'nahost',
  'tuerkei',
  'russland',
  'china',
  'asien',
  'afrika',
  'lateinamerika',
  'ozeanien',
  'kanada',
  'alternative',
  'sudostasien',
  'nordeuropa',
  'sub-saharan-africa',
  'indien',
];

describe('VIDEO_CHANNELS', () => {
  it('exports an array with at least 20 entries', () => {
    expect(Array.isArray(VIDEO_CHANNELS)).toBe(true);
    expect(VIDEO_CHANNELS.length).toBeGreaterThanOrEqual(20);
  });

  it('every entry has non-empty id, handle, name, language', () => {
    for (const ch of VIDEO_CHANNELS) {
      expect(ch.id, `id missing on ${ch.name}`).toMatch(/^[a-z0-9-]+$/);
      expect(ch.name.length, `name empty on ${ch.id}`).toBeGreaterThan(0);
      expect(ch.handle.length, `handle empty on ${ch.id}`).toBeGreaterThan(0);
      expect(ch.language.length, `language empty on ${ch.id}`).toBeGreaterThan(0);
    }
  });

  it('every entry has a valid PerspectiveRegion', () => {
    for (const ch of VIDEO_CHANNELS) {
      expect(VALID_REGIONS, `invalid region on ${ch.id}`).toContain(ch.region);
    }
  });

  it('every handle starts with @', () => {
    for (const ch of VIDEO_CHANNELS) {
      expect(ch.handle.startsWith('@'), `handle ${ch.handle} on ${ch.id} missing @ prefix`).toBe(true);
    }
  });

  it('every channelId matches YouTube UC… format', () => {
    // Per Task 4: youtubeService writes the RSS URL as
    // youtube.com/feeds/videos.xml?channel_id=UCxxxxx
    // YouTube channelIds are exactly 24 chars: 'UC' + 22 alnum/_/-
    for (const ch of VIDEO_CHANNELS) {
      expect(
        ch.channelId,
        `channelId ${ch.channelId} on ${ch.id} not in UC… format`,
      ).toMatch(/^UC[A-Za-z0-9_-]{22}$/);
    }
  });

  it('every entry has a unique id', () => {
    const ids = VIDEO_CHANNELS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a unique channelId', () => {
    const channelIds = VIDEO_CHANNELS.map(c => c.channelId);
    expect(new Set(channelIds).size).toBe(channelIds.length);
  });
});
