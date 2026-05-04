/**
 * Curated YouTube news channels (Phase 40-05 / CONT-05 / D-D1).
 *
 * Mirrors `apps/web/server/config/sources.ts` shape: a static array of
 * trusted news YouTube channels the daily worker job (`videoChannelPollJob`)
 * polls (via the public RSS feed at youtube.com/feeds/videos.xml?channel_id=)
 * and persists into the `Video` Prisma table. Local Postgres FTS against
 * this index is the primary discovery path for `/api/videos/related/:id`;
 * the YouTube Data API search.list fallback only fires on local-empty
 * (and only while quota allows — see `youtubeQuota.ts`).
 *
 * Coverage: ≥20 channels organized by perspective region. Each entry carries
 * the YouTube `@handle` (operator-friendly) and the `UCxxx` `channelId`
 * (machine-required for the RSS endpoint). channelIds are pre-resolved here
 * to keep Wave-2 plans free of network dependencies; `apps/web/scripts/
 * resolve-youtube-handles.ts` is a maintenance tool for adding new channels
 * (calls channels.list?forHandle= once per missing channelId, ~1 quota unit
 * each).
 *
 * The inline `VideoChannel` type alias mirrors the runtime shape from
 * `apps/web/src/types/videos.ts`. They're kept in sync manually — adding a
 * field requires touching both. (Same convention as podcasts.ts.)
 */

import type { PerspectiveRegion } from '../../src/types';

export interface VideoChannel {
  /** Local stable ID (kebab-case slug). */
  id: string;
  /** Display name. */
  name: string;
  /** YouTube @handle, including the leading '@'. */
  handle: string;
  /** YouTube `UC…` channel ID — required for the RSS feed URL. */
  channelId: string;
  region: PerspectiveRegion;
  /** BCP-47 language code (e.g. 'en', 'de', 'fr', 'ar'). */
  language: string;
}

export const VIDEO_CHANNELS: VideoChannel[] = [
  // ===== USA (5) =====
  {
    id: 'pbs-newshour',
    name: 'PBS NewsHour',
    handle: '@PBSNewsHour',
    channelId: 'UC6ZFN9Tx6xh-skXCuRHCDpQ',
    region: 'usa',
    language: 'en',
  },
  {
    id: 'nbc-news',
    name: 'NBC News',
    handle: '@NBCNews',
    channelId: 'UCeY0bbntWzzVIaj2z3QigXg',
    region: 'usa',
    language: 'en',
  },
  {
    id: 'abc-news',
    name: 'ABC News',
    handle: '@ABCNews',
    channelId: 'UCBi2mrWuNuyYy4gbM6fU18Q',
    region: 'usa',
    language: 'en',
  },
  {
    id: 'bloomberg-originals',
    name: 'Bloomberg Originals',
    handle: '@BloombergOriginals',
    channelId: 'UCUMZ7gohGI9HcU9VNsr2FJQ',
    region: 'usa',
    language: 'en',
  },
  {
    id: 'wall-street-journal',
    name: 'Wall Street Journal',
    handle: '@wsj',
    channelId: 'UCK7tptUDHh-RYDsdxO1-5QQ',
    region: 'usa',
    language: 'en',
  },

  // ===== Europa (2) =====
  {
    id: 'channel-4-news',
    name: 'Channel 4 News',
    handle: '@Channel4News',
    channelId: 'UCnBy1tEWXfRWWjmpvU1ymJg',
    region: 'europa',
    language: 'en',
  },
  {
    id: 'euronews-english',
    name: 'Euronews English',
    handle: '@euronews',
    channelId: 'UCSrZ3UV4jOidv8ppoVuvW9Q',
    region: 'europa',
    language: 'en',
  },

  // ===== Deutschland (3) =====
  {
    id: 'dw-news',
    name: 'DW News',
    handle: '@dwnews',
    channelId: 'UCknLrEdhRCp1aegoMqRaCZg',
    region: 'deutschland',
    language: 'en',
  },
  {
    id: 'tagesschau',
    name: 'tagesschau',
    handle: '@tagesschau',
    channelId: 'UC5NOEUbkLheQcaaRldYW5GA',
    region: 'deutschland',
    language: 'de',
  },
  {
    id: 'ard-aktuell',
    name: 'ARD-aktuell',
    handle: '@ARDaktuell',
    channelId: 'UCRWj9by5LGmGWpZDl5Tj-_g',
    region: 'deutschland',
    language: 'de',
  },

  // ===== Europa (France 24) =====
  {
    id: 'france-24-english',
    name: 'France 24 English',
    handle: '@FRANCE24English',
    channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg',
    region: 'europa',
    language: 'en',
  },
  {
    id: 'france-24',
    name: 'France 24',
    handle: '@FRANCE24',
    channelId: 'UCCCPCZNChQdGa9EkATeye4g',
    region: 'europa',
    language: 'fr',
  },

  // ===== Nahost (3) =====
  {
    id: 'al-jazeera-english',
    name: 'Al Jazeera English',
    handle: '@aljazeeraenglish',
    channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg',
    region: 'nahost',
    language: 'en',
  },
  {
    id: 'middle-east-eye',
    name: 'Middle East Eye',
    handle: '@MiddleEastEye',
    channelId: 'UCN2-rB4YgLTwIuf-z0v0DjA',
    region: 'nahost',
    language: 'en',
  },
  {
    id: 'trt-world',
    name: 'TRT World',
    handle: '@trtworld',
    channelId: 'UC7fWeaHhqgM4Ry-RMpM2YYw',
    region: 'nahost',
    language: 'en',
  },

  // ===== Türkei (1) =====
  {
    id: 'anadolu-agency-english',
    name: 'Anadolu Agency English',
    handle: '@anadoluagencyenglish',
    channelId: 'UCO0F3rIjFmbsAhmvcMb6gMQ',
    region: 'tuerkei',
    language: 'en',
  },

  // ===== Russland (1, biasDiversityNote at NewsSource layer not relevant for video index) =====
  {
    id: 'rt',
    name: 'RT',
    handle: '@RT',
    channelId: 'UCpwvZwUam-URkxB7g4USKpg',
    region: 'russland',
    language: 'en',
  },

  // ===== China (2) =====
  {
    id: 'cgtn',
    name: 'CGTN',
    handle: '@CGTN',
    channelId: 'UCt-DXnFR2lTb8ETSf2zPksw',
    region: 'china',
    language: 'en',
  },
  {
    id: 'south-china-morning-post',
    name: 'South China Morning Post',
    handle: '@scmp',
    channelId: 'UC4SUWizzKc1tptprBkWjX2Q',
    region: 'china',
    language: 'en',
  },

  // ===== Asien (2) =====
  {
    id: 'nhk-world',
    name: 'NHK World',
    handle: '@nhkworld',
    channelId: 'UCSPEjw8F2nQDtmUKPFNF7_A',
    region: 'asien',
    language: 'en',
  },
  {
    id: 'channel-news-asia',
    name: 'Channel News Asia',
    handle: '@channelnewsasia',
    channelId: 'UCXAgRec-NIu2EnSZw8AOwBg',
    region: 'asien',
    language: 'en',
  },

  // ===== Indien (1) =====
  {
    id: 'wion',
    name: 'WION',
    handle: '@WIONews',
    channelId: 'UC_gUM8rL-Lrg6O3adPW9K1g',
    region: 'indien',
    language: 'en',
  },

  // ===== Afrika (1) =====
  {
    id: 'africa-news',
    name: 'Africa News',
    handle: '@africanews',
    channelId: 'UCyPdjKxzZ7CN9JuzL1cwxRA',
    region: 'afrika',
    language: 'en',
  },

  // ===== Lateinamerika (1) =====
  {
    id: 'telesur-english',
    name: 'TeleSUR English',
    handle: '@telesurenglish',
    channelId: 'UCC4VfAm7OsDjaQXPhSXpQDQ',
    region: 'lateinamerika',
    language: 'en',
  },
];
