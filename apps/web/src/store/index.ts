import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterState, PerspectiveRegion, Sentiment } from '../types';
import type { FocusPreset } from '../types/focus';
import type { FeedState, ReadState, CustomFeed, ReadingHistoryEntry } from '../types/feeds';
import { detectDefaultRegions } from '../utils/regionDetection';
import { defaultFeedState, defaultReadState } from '../types/feeds';

interface AppState {
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Language
  language: 'de' | 'en';
  setLanguage: (lang: 'de' | 'en') => void;

  // Command Palette
  commandPaletteEnabled: boolean;
  setCommandPaletteEnabled: (enabled: boolean) => void;

  // Filters
  filters: FilterState;
  setRegions: (regions: PerspectiveRegion[]) => void;
  toggleRegion: (region: PerspectiveRegion) => void;
  setTopics: (topics: string[]) => void;
  toggleTopic: (topic: string) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  setSearchQuery: (query: string) => void;
  setSentimentFilter: (sentiment: Sentiment | null) => void;
  setSortBy: (sortBy: FilterState['sortBy']) => void;
  setSortOrder: (order: FilterState['sortOrder']) => void;
  resetFilters: () => void;

  // Bookmarks
  bookmarkedArticles: string[];
  toggleBookmark: (articleId: string) => void;
  isBookmarked: (articleId: string) => boolean;

  // Reading History (enhanced for Phase 6)
  readingHistory: ReadingHistoryEntry[];
  addToReadingHistory: (articleId: string) => void;
  clearReadingHistory: () => void;
  isHistoryPaused: boolean;
  pauseHistory: () => void;
  resumeHistory: () => void;

  // Personalization per D-14
  isPersonalizationEnabled: boolean;
  togglePersonalization: () => void;

  // Focus System & Onboarding
  hasCompletedOnboarding: boolean;
  activeFocusPreset: FocusPreset | null;
  customPresets: FocusPreset[];
  setOnboardingComplete: () => void;
  setActiveFocus: (preset: FocusPreset) => void;
  createCustomPreset: (preset: FocusPreset) => void;
  updateCustomPreset: (id: string, updates: Partial<FocusPreset>) => void;
  deleteCustomPreset: (id: string) => void;

  // Feed Manager
  feedState: FeedState;
  toggleSource: (sourceId: string) => void;
  toggleAllSourcesInRegion: (region: PerspectiveRegion, enabled: boolean) => void;
  enableAllSources: () => void;
  disableAllSources: () => void;
  setActiveSourceFilter: (sourceId: string | null) => void;
  addCustomFeed: (feed: CustomFeed) => void;
  removeCustomFeed: (feedId: string) => void;
  toggleCustomFeed: (feedId: string) => void;

  // Read Marking
  readState: ReadState;
  markAsRead: (articleId: string) => void;
  markAsUnread: (articleId: string) => void;
  markAllAsRead: (articleIds: string[]) => void;
  toggleHideReadArticles: () => void;
  isArticleRead: (articleId: string) => boolean;
  clearReadArticles: () => void;

  // Team Collaboration
  activeTeamId: string | null;
  setActiveTeamId: (teamId: string | null) => void;
}

const defaultFilters: FilterState = {
  regions: detectDefaultRegions(), // Locale-based default regions
  topics: [], // Empty = show all topics
  dateRange: { start: null, end: null },
  searchQuery: '',
  sentiment: null,
  sortBy: 'date',
  sortOrder: 'desc',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      // Language
      language: 'de',
      setLanguage: (lang) => set({ language: lang }),

      // Command Palette (disabled by default)
      commandPaletteEnabled: false,
      setCommandPaletteEnabled: (enabled) => set({ commandPaletteEnabled: enabled }),

      // Filters
      filters: defaultFilters,
      setRegions: (regions) =>
        set((state) => ({
          filters: { ...state.filters, regions },
        })),
      toggleRegion: (region) =>
        set((state) => {
          const regions = state.filters.regions.includes(region)
            ? state.filters.regions.filter((r) => r !== region)
            : [...state.filters.regions, region];
          return { filters: { ...state.filters, regions } };
        }),
      setTopics: (topics) =>
        set((state) => ({
          filters: { ...state.filters, topics },
        })),
      toggleTopic: (topic) =>
        set((state) => {
          const topics = state.filters.topics.includes(topic)
            ? state.filters.topics.filter((t) => t !== topic)
            : [...state.filters.topics, topic];
          return { filters: { ...state.filters, topics } };
        }),
      setDateRange: (start, end) =>
        set((state) => ({
          filters: { ...state.filters, dateRange: { start, end } },
        })),
      setSearchQuery: (query) =>
        set((state) => ({
          filters: { ...state.filters, searchQuery: query },
        })),
      setSentimentFilter: (sentiment) =>
        set((state) => ({
          filters: { ...state.filters, sentiment },
        })),
      setSortBy: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sortBy },
        })),
      setSortOrder: (order) =>
        set((state) => ({
          filters: { ...state.filters, sortOrder: order },
        })),
      resetFilters: () =>
        set({ filters: defaultFilters }),

      // Bookmarks
      bookmarkedArticles: [],
      toggleBookmark: (articleId) =>
        set((state) => {
          const isBookmarked = state.bookmarkedArticles.includes(articleId);
          return {
            bookmarkedArticles: isBookmarked
              ? state.bookmarkedArticles.filter((id) => id !== articleId)
              : [...state.bookmarkedArticles, articleId],
          };
        }),
      isBookmarked: (articleId) => get().bookmarkedArticles.includes(articleId),

      // Reading History (enhanced for Phase 6)
      readingHistory: [],
      addToReadingHistory: (articleId) =>
        set((state) => {
          // Respect pause state per D-65, D-66
          if (state.isHistoryPaused) return state;

          // Check existing entry
          const existingIndex = state.readingHistory.findIndex(
            (entry) => entry.articleId === articleId
          );

          // Don't increment within 5 minutes (dedup window)
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          if (existingIndex !== -1) {
            const existing = state.readingHistory[existingIndex];
            if (existing.timestamp > fiveMinutesAgo) {
              return state;
            }
            // Update existing entry with incremented readCount
            const newHistory = [...state.readingHistory];
            newHistory[existingIndex] = {
              ...existing,
              timestamp: Date.now(),
              readCount: existing.readCount + 1,
            };
            // Move to front
            newHistory.unshift(newHistory.splice(existingIndex, 1)[0]);
            return { readingHistory: newHistory.slice(0, 100) };
          }

          // New entry
          const newHistory = [
            { articleId, timestamp: Date.now(), readCount: 1 },
            ...state.readingHistory,
          ].slice(0, 100);  // Keep 100 limit per D-03

          return { readingHistory: newHistory };
        }),
      clearReadingHistory: () => set({ readingHistory: [] }),

      // History pause per D-65, D-66
      isHistoryPaused: false,
      pauseHistory: () => set({ isHistoryPaused: true }),
      resumeHistory: () => set({ isHistoryPaused: false }),

      // Personalization per D-14
      isPersonalizationEnabled: true,
      togglePersonalization: () =>
        set((state) => ({ isPersonalizationEnabled: !state.isPersonalizationEnabled })),

      // Focus System & Onboarding
      hasCompletedOnboarding: false,
      activeFocusPreset: null,
      customPresets: [],
      setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),
      setActiveFocus: (preset) =>
        set((state) => {
          // When focus changes, update filters to match preset
          return {
            activeFocusPreset: preset,
            filters: {
              ...state.filters,
              regions: preset.regions,
              topics: preset.topics,
            },
          };
        }),
      createCustomPreset: (preset) =>
        set((state) => ({
          customPresets: [...state.customPresets, { ...preset, isCustom: true }],
        })),
      updateCustomPreset: (id, updates) =>
        set((state) => ({
          customPresets: state.customPresets.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deleteCustomPreset: (id) =>
        set((state) => ({
          customPresets: state.customPresets.filter((p) => p.id !== id),
        })),

      // Feed Manager
      feedState: defaultFeedState,
      toggleSource: (sourceId) =>
        set((state) => {
          const currentEnabled = state.feedState.enabledSources[sourceId] !== false;
          return {
            feedState: {
              ...state.feedState,
              enabledSources: {
                ...state.feedState.enabledSources,
                [sourceId]: !currentEnabled,
              },
            },
          };
        }),
       
      toggleAllSourcesInRegion: (_region, _enabled) =>
        set((state) => {
          // This requires access to sources - handled at component level
          // Store just tracks the enabledSources state
          return state;
        }),
      enableAllSources: () =>
        set((state) => ({
          feedState: {
            ...state.feedState,
            enabledSources: {}, // Empty means all enabled (default)
          },
        })),
      disableAllSources: () =>
        set((state) => ({
          feedState: {
            ...state.feedState,
            // Mark all as false - need to get source list from component
            enabledSources: state.feedState.enabledSources,
          },
        })),
      setActiveSourceFilter: (sourceId) =>
        set((state) => ({
          feedState: {
            ...state.feedState,
            activeSourceFilter: sourceId,
          },
        })),
      addCustomFeed: (feed) =>
        set((state) => ({
          feedState: {
            ...state.feedState,
            customFeeds: [...state.feedState.customFeeds, feed],
          },
        })),
      removeCustomFeed: (feedId) =>
        set((state) => ({
          feedState: {
            ...state.feedState,
            customFeeds: state.feedState.customFeeds.filter((f) => f.id !== feedId),
          },
        })),
      toggleCustomFeed: (feedId) =>
        set((state) => ({
          feedState: {
            ...state.feedState,
            customFeeds: state.feedState.customFeeds.map((f) =>
              f.id === feedId ? { ...f, isActive: !f.isActive } : f
            ),
          },
        })),

      // Read Marking
      readState: defaultReadState,
      markAsRead: (articleId) =>
        set((state) => {
          if (state.readState.readArticles.includes(articleId)) return state;
          return {
            readState: {
              ...state.readState,
              readArticles: [...state.readState.readArticles, articleId],
            },
          };
        }),
      markAsUnread: (articleId) =>
        set((state) => ({
          readState: {
            ...state.readState,
            readArticles: state.readState.readArticles.filter((id) => id !== articleId),
          },
        })),
      markAllAsRead: (articleIds) =>
        set((state) => {
          const newReadArticles = [...state.readState.readArticles];
          articleIds.forEach((id) => {
            if (!newReadArticles.includes(id)) {
              newReadArticles.push(id);
            }
          });
          return {
            readState: {
              ...state.readState,
              readArticles: newReadArticles,
            },
          };
        }),
      toggleHideReadArticles: () =>
        set((state) => ({
          readState: {
            ...state.readState,
            hideReadArticles: !state.readState.hideReadArticles,
          },
        })),
      isArticleRead: (articleId) => get().readState.readArticles.includes(articleId),
      clearReadArticles: () =>
        set((state) => ({
          readState: {
            ...state.readState,
            readArticles: [],
          },
        })),

      // Team Collaboration
      activeTeamId: null,
      setActiveTeamId: (teamId) => set({ activeTeamId: teamId }),
    }),
    {
      name: 'newshub-storage',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        commandPaletteEnabled: state.commandPaletteEnabled,
        bookmarkedArticles: state.bookmarkedArticles,
        readingHistory: state.readingHistory,
        isHistoryPaused: state.isHistoryPaused,
        isPersonalizationEnabled: state.isPersonalizationEnabled,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        activeFocusPreset: state.activeFocusPreset,
        customPresets: state.customPresets,
        feedState: state.feedState,
        readState: state.readState,
        activeTeamId: state.activeTeamId,
      }),
    }
  )
);
