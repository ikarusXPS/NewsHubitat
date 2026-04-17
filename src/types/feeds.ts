import type { PerspectiveRegion } from './index';

export interface CustomFeed {
  id: string;
  name: string;
  url: string;
  region: PerspectiveRegion;
  addedAt: Date;
  lastFetched?: Date;
  isActive: boolean;
}

export interface FeedState {
  // Source toggles: sourceId -> enabled (default all enabled)
  enabledSources: Record<string, boolean>;
  // Custom RSS feeds added by user
  customFeeds: CustomFeed[];
  // Active source filter (for agency filter feature)
  activeSourceFilter: string | null;
}

export interface ReadState {
  // Articles marked as read
  readArticles: string[];
  // Whether to hide read articles in feed
  hideReadArticles: boolean;
}

export const defaultFeedState: FeedState = {
  enabledSources: {}, // Empty means all enabled
  customFeeds: [],
  activeSourceFilter: null,
};

export const defaultReadState: ReadState = {
  readArticles: [],
  hideReadArticles: false,
};
