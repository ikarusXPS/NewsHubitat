export interface VideoChannel {
  id: string;
  name: string;
  handle: string;
  region: string;
  language: string;
  channelId: string;
}

export interface Video {
  id: string;
  youtubeId?: string;
  vimeoId?: string;
  channelId?: string;
  title: string;
  description: string;
  durationSec?: number;
  publishedAt: Date;
  thumbnailUrl?: string;
  tags?: string[];
}

export interface MatchedVideo {
  video: Video;
  matchScore: number;
  matchedTerms: string[];
  source: 'local-index' | 'youtube-api' | 'vimeo-link';
}
