export interface PodcastFeed {
  id: string;
  title: string;
  rssUrl: string;
  region: string;
  language: string;
  category: string;
  reliability: number;
  imageUrl?: string;
  description?: string;
  transcriptCheckHint?: boolean;
}

export interface PodcastEpisode {
  id: string;
  podcastId: string;
  guid: string;
  title: string;
  description: string;
  audioUrl: string;
  durationSec?: number;
  publishedAt: Date;
  transcriptUrl?: string;
  transcriptType?: string;
}

export interface MatchedEpisode {
  episode: PodcastEpisode;
  feed: PodcastFeed;
  matchScore: number;
  matchedTerms: string[];
}
