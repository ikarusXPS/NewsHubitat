import { lazyWithRetry } from './utils/lazyWithRetry';

// ============================================================================
// Route Components - All use lazyWithRetry for retry logic and preload API
// ============================================================================

/**
 * Dashboard - Landing page, now lazy-loaded (was sync import).
 * Critical for initial bundle size reduction.
 */
export const Dashboard = lazyWithRetry(() =>
  import('./pages/Dashboard').then(m => ({ default: m.Dashboard }))
);

// Heavy pages with visualizations
export const Analysis = lazyWithRetry(() =>
  import('./pages/Analysis').then(m => ({ default: m.Analysis }))
);

export const Timeline = lazyWithRetry(() =>
  import('./pages/Timeline').then(m => ({ default: m.Timeline }))
);

export const MapView = lazyWithRetry(() =>
  import('./pages/MapView').then(m => ({ default: m.MapView }))
);

export const Globe = lazyWithRetry(() =>
  import('./pages/Globe').then(m => ({ default: m.Globe }))
);

export const Monitor = lazyWithRetry(() =>
  import('./pages/Monitor').then(m => ({ default: m.Monitor }))
);

export const EventMap = lazyWithRetry(() =>
  import('./pages/EventMap').then(m => ({ default: m.EventMap }))
);

// User pages
export const Bookmarks = lazyWithRetry(() =>
  import('./pages/Bookmarks').then(m => ({ default: m.Bookmarks }))
);

export const ReadingHistory = lazyWithRetry(() =>
  import('./pages/ReadingHistory').then(m => ({ default: m.ReadingHistory }))
);

export const Settings = lazyWithRetry(() =>
  import('./pages/Settings').then(m => ({ default: m.Settings }))
);

export const Community = lazyWithRetry(() =>
  import('./pages/Community').then(m => ({ default: m.Community }))
);

export const Profile = lazyWithRetry(() =>
  import('./pages/Profile').then(m => ({ default: m.Profile }))
);

export const Article = lazyWithRetry(() =>
  import('./pages/Article').then(m => ({ default: m.Article }))
);

// Auth pages (default exports)
export const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail'));

export const ForgotPassword = lazyWithRetry(() =>
  import('./pages/ForgotPassword')
);

export const ResetPassword = lazyWithRetry(() =>
  import('./pages/ResetPassword')
);

// Legal pages
export const Privacy = lazyWithRetry(() =>
  import('./pages/Privacy').then(m => ({ default: m.Privacy }))
);

// Team pages
export const TeamDashboard = lazyWithRetry(() =>
  import('./pages/TeamDashboard').then(m => ({ default: m.TeamDashboard }))
);

export const TeamInviteAccept = lazyWithRetry(() =>
  import('./pages/TeamInviteAccept').then(m => ({
    default: m.TeamInviteAccept,
  }))
);

// ============================================================================
// Route Preloaders - Map of route paths to preload functions
// ============================================================================

/**
 * Route preloaders for hover prefetching.
 * Maps route paths to preload functions.
 *
 * Usage: Import in NavLinkPrefetch to trigger preload on 150ms hover.
 */
export const routePreloaders: Record<string, () => void> = {
  '/': () => {
    Dashboard.preload();
  },
  '/analysis': () => {
    Analysis.preload();
  },
  '/monitor': () => {
    Monitor.preload();
  },
  '/timeline': () => {
    Timeline.preload();
  },
  '/events': () => {
    EventMap.preload();
  },
  '/globe': () => {
    Globe.preload();
  },
  '/map': () => {
    MapView.preload();
  },
  '/bookmarks': () => {
    Bookmarks.preload();
  },
  '/history': () => {
    ReadingHistory.preload();
  },
  '/settings': () => {
    Settings.preload();
  },
  '/community': () => {
    Community.preload();
  },
  '/profile': () => {
    Profile.preload();
  },
};
