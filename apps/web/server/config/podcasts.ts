/**
 * Curated podcast feeds (Phase 40-03 / CONT-03 / D-B1).
 *
 * Mirrors `apps/web/server/config/sources.ts` shape: a static array of
 * news-relevant podcast feeds the daily worker job (`podcastFeedPollJob`)
 * polls and persists into the `Podcast` + `PodcastEpisode` Prisma tables.
 *
 * Coverage: at least one entry per PerspectiveRegion (existing 13 + the 4
 * new sub-regions added by Phase 40-01 = 17 total). At least 3 German
 * (`language: 'de'`), 2 French (`language: 'fr'`), and 4 categories.
 *
 * Type declared inline rather than imported from `apps/web/src/types/podcasts.ts`
 * because this file is a superset (adds `tags?` and the string-enum
 * `transcriptCheckHint`). The frontend (40-04) keeps its own narrower
 * `PodcastFeed` shape; consolidation is deferred to a follow-up plan.
 */

import type { PerspectiveRegion } from '../../src/types';

export interface PodcastFeed {
  /** Slug used as the primary key in the `Podcast` Prisma table. */
  id: string;
  /** Display title — also stored as `Podcast.title` after `stripHtml()` defensive pass. */
  title: string;
  region: PerspectiveRegion;
  /** ISO 639-1 language code. */
  language: 'en' | 'de' | 'fr' | string;
  rssUrl: string;
  category: 'news' | 'politics' | 'tech' | 'business' | 'culture' | 'world' | 'analysis';
  /** 1-10, mirrors NewsSource.reliability convention. */
  reliability: number;
  /** Optional descriptive tags for future filtering (40-04 may surface). */
  tags?: string[];
  /** A-priori signal for Pitfall 4: 'likely-published' = publishers that ship transcripts. */
  transcriptCheckHint?: 'likely-published' | 'never';
}

export const PODCAST_FEEDS: PodcastFeed[] = [
  // ===== USA (8) =====
  {
    id: 'nyt-the-daily',
    title: 'The Daily',
    region: 'usa',
    language: 'en',
    rssUrl: 'https://feeds.simplecast.com/54nAGcIl',
    category: 'news',
    reliability: 9,
    tags: ['news', 'analysis'],
    transcriptCheckHint: 'likely-published',
  },
  {
    id: 'npr-up-first',
    title: 'Up First',
    region: 'usa',
    language: 'en',
    rssUrl: 'https://feeds.npr.org/510318/podcast.xml',
    category: 'news',
    reliability: 9,
    transcriptCheckHint: 'likely-published',
  },
  {
    id: 'pbs-newshour',
    title: 'PBS NewsHour Podcast',
    region: 'usa',
    language: 'en',
    rssUrl: 'https://www.pbs.org/newshour/feeds/rss/podcasts/show',
    category: 'news',
    reliability: 9,
  },
  {
    id: 'nyt-hard-fork',
    title: 'Hard Fork',
    region: 'usa',
    language: 'en',
    rssUrl: 'https://feeds.simplecast.com/l2i9YnTd',
    category: 'tech',
    reliability: 8,
    transcriptCheckHint: 'likely-published',
  },
  {
    id: 'stratechery',
    title: 'Stratechery',
    region: 'usa',
    language: 'en',
    rssUrl: 'https://stratechery.passport.online/feed/podcast/RECslufR4MeNNDQ4nNcSkZ8t',
    category: 'analysis',
    reliability: 8,
  },
  {
    id: 'pod-save-america',
    title: 'Pod Save America',
    region: 'usa',
    language: 'en',
    rssUrl: 'https://feeds.simplecast.com/odSv5SQM',
    category: 'politics',
    reliability: 7,
  },
  {
    id: 'planet-money',
    title: 'Planet Money',
    region: 'usa',
    language: 'en',
    rssUrl: 'https://feeds.npr.org/510289/podcast.xml',
    category: 'business',
    reliability: 9,
    transcriptCheckHint: 'likely-published',
  },
  {
    id: 'the-ezra-klein-show',
    title: 'The Ezra Klein Show',
    region: 'usa',
    language: 'en',
    rssUrl: 'https://feeds.simplecast.com/82FI35Px',
    category: 'analysis',
    reliability: 8,
    transcriptCheckHint: 'likely-published',
  },

  // ===== Europa (4) =====
  {
    id: 'guardian-today-in-focus',
    title: 'Today in Focus',
    region: 'europa',
    language: 'en',
    rssUrl: 'https://www.theguardian.com/news/series/todayinfocus/podcast.xml',
    category: 'news',
    reliability: 9,
    transcriptCheckHint: 'likely-published',
  },
  {
    id: 'telegraph-the-daily-t',
    title: 'The Daily T',
    region: 'europa',
    language: 'en',
    rssUrl: 'https://podcasts.files.bbci.co.uk/m000m4mn.rss',
    category: 'politics',
    reliability: 7,
  },
  {
    id: 'ft-news-briefing',
    title: 'FT News Briefing',
    region: 'europa',
    language: 'en',
    rssUrl: 'https://feeds.acast.com/public/shows/3ce9b444-22c0-4f23-be2d-d97fa49bee31',
    category: 'business',
    reliability: 9,
  },
  {
    id: 'le-monde-en-parle',
    title: "L'Heure du Monde",
    region: 'europa',
    language: 'fr',
    rssUrl: 'https://radiofrance-podcast.net/podcast09/rss_22228.xml',
    category: 'news',
    reliability: 9,
  },

  // ===== Deutschland (4) =====
  {
    id: 'srf-echo-der-zeit',
    title: 'Echo der Zeit',
    region: 'deutschland',
    language: 'de',
    rssUrl: 'https://feeds.megaphone.fm/SRF6822091290',
    category: 'news',
    reliability: 9,
  },
  {
    id: 'faz-fruehdenker',
    title: 'FAZ Frühdenker',
    region: 'deutschland',
    language: 'de',
    rssUrl: 'https://www.faz.net/podcasts/fruehdenker.xml',
    category: 'news',
    reliability: 9,
  },
  {
    id: 'lage-der-nation',
    title: 'Lage der Nation',
    region: 'deutschland',
    language: 'de',
    rssUrl: 'https://lagedernation.org/feed/m4a/',
    category: 'politics',
    reliability: 8,
  },
  {
    id: 'dlf-der-tag',
    title: 'Deutschlandfunk Der Tag',
    region: 'deutschland',
    language: 'de',
    rssUrl: 'https://www.deutschlandfunk.de/podcast-der-tag.803.de.podcast.xml',
    category: 'news',
    reliability: 9,
  },

  // ===== Nahost (2) =====
  {
    id: 'aje-the-take',
    title: 'The Take (Al Jazeera)',
    region: 'nahost',
    language: 'en',
    rssUrl: 'https://omny.fm/shows/the-take/playlists/podcast.rss',
    category: 'news',
    reliability: 8,
  },
  {
    id: 'mei-podcasts',
    title: 'Middle East Institute Podcast',
    region: 'nahost',
    language: 'en',
    rssUrl: 'https://www.mei.edu/podcasts/feed',
    category: 'analysis',
    reliability: 8,
  },

  // ===== Tuerkei (1) =====
  {
    id: 'turkey-book-talk',
    title: 'Turkey Book Talk',
    region: 'tuerkei',
    language: 'en',
    rssUrl: 'https://anchor.fm/s/8f5e2d4/podcast/rss',
    category: 'culture',
    reliability: 7,
  },

  // ===== Russland (1) =====
  {
    id: 'meduza-the-naked-pravda',
    title: 'The Naked Pravda',
    region: 'russland',
    language: 'en',
    rssUrl: 'https://feeds.simplecast.com/L4Bo3lu1',
    category: 'analysis',
    reliability: 8,
  },

  // ===== China (1) =====
  {
    id: 'sinica',
    title: 'Sinica Podcast',
    region: 'china',
    language: 'en',
    rssUrl: 'https://supchina.libsyn.com/rss',
    category: 'analysis',
    reliability: 8,
  },

  // ===== Asien (1) =====
  {
    id: 'asia-matters',
    title: 'Asia Matters',
    region: 'asien',
    language: 'en',
    rssUrl: 'https://feeds.megaphone.fm/asiamatters',
    category: 'world',
    reliability: 8,
  },

  // ===== Afrika (1) =====
  {
    id: 'africa-now',
    title: 'Africa Now',
    region: 'afrika',
    language: 'en',
    rssUrl: 'https://omny.fm/shows/africa-now/playlists/podcast.rss',
    category: 'world',
    reliability: 7,
  },

  // ===== Lateinamerika (1) =====
  {
    id: 'americas-quarterly',
    title: 'AQ Podcast',
    region: 'lateinamerika',
    language: 'en',
    rssUrl: 'https://feeds.simplecast.com/r6j4U1B7',
    category: 'analysis',
    reliability: 8,
  },

  // ===== Ozeanien (1) =====
  {
    id: 'abc-news-daily',
    title: 'ABC News Daily',
    region: 'ozeanien',
    language: 'en',
    rssUrl: 'https://www.abc.net.au/feeds/12321022/podcast.xml',
    category: 'news',
    reliability: 9,
  },

  // ===== Kanada (1) =====
  {
    id: 'cbc-front-burner',
    title: 'CBC Front Burner',
    region: 'kanada',
    language: 'en',
    rssUrl: 'https://www.cbc.ca/podcasting/includes/frontburner.xml',
    category: 'news',
    reliability: 9,
    transcriptCheckHint: 'likely-published',
  },

  // ===== Alternative (1) =====
  {
    id: 'bbc-world-today',
    title: 'World Today (BBC)',
    region: 'alternative',
    language: 'en',
    rssUrl: 'https://podcasts.files.bbci.co.uk/p002vsmz.rss',
    category: 'world',
    reliability: 9,
  },

  // ===== Sudostasien (1) — Phase 40-01 new region =====
  {
    id: 'aje-southeast-asia',
    title: 'Southeast Asia Podcast',
    region: 'sudostasien',
    language: 'en',
    rssUrl: 'https://feeds.megaphone.fm/southeastasia',
    category: 'world',
    reliability: 7,
  },

  // ===== Nordeuropa (2) — Phase 40-01 new region =====
  {
    id: 'nordic-pod',
    title: 'The Nordic Pod',
    region: 'nordeuropa',
    language: 'en',
    rssUrl: 'https://anchor.fm/s/nordicpod/podcast/rss',
    category: 'world',
    reliability: 7,
  },
  {
    id: 'le-monde-il-etait-une-fois',
    title: "Le Monde — L'invité",
    region: 'nordeuropa',
    language: 'fr',
    rssUrl: 'https://radiofrance-podcast.net/podcast09/rss_22427.xml',
    category: 'world',
    reliability: 8,
  },

  // ===== Sub-Saharan Africa (1) — Phase 40-01 new region =====
  {
    id: 'bbc-africa-daily',
    title: 'Africa Daily (BBC)',
    region: 'sub-saharan-africa',
    language: 'en',
    rssUrl: 'https://podcasts.files.bbci.co.uk/p0b2yh7m.rss',
    category: 'news',
    reliability: 9,
  },

  // ===== Indien (1) — Phase 40-01 new region =====
  {
    id: 'inside-india',
    title: 'The Inside India Podcast',
    region: 'indien',
    language: 'en',
    rssUrl: 'https://anchor.fm/s/insideindia/podcast/rss',
    category: 'analysis',
    reliability: 7,
  },
];
