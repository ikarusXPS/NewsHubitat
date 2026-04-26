import { Suspense, lazy } from 'react';

// Lazy load NewsFeed content (heavy component with data fetching)
const NewsFeedContent = lazy(() =>
  import('../components/NewsFeed').then(m => ({ default: m.NewsFeed }))
);

/**
 * Skeleton loading state for Dashboard.
 * Matches approximate dimensions of NewsFeed cards.
 * Note: This skeleton pattern achieves the same effect as critical CSS inlining
 * (immediate above-fold content) without build complexity. See design_decisions.
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Skeleton header area */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-48 rounded bg-gray-800 animate-pulse" />
        <div className="h-8 w-32 rounded bg-gray-800 animate-pulse" />
      </div>

      {/* Skeleton card grid - matches NewsFeed layout */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-lg bg-gray-800/50 animate-pulse border border-gray-700/30"
          >
            {/* Image placeholder */}
            <div className="h-32 rounded-t-lg bg-gray-700/50" />
            {/* Content placeholder */}
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-700/50" />
              <div className="h-4 w-1/2 rounded bg-gray-700/50" />
              <div className="h-3 w-1/4 rounded bg-gray-700/50 mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <div className="dashboard-shell min-h-screen">
      <Suspense fallback={<DashboardSkeleton />}>
        <NewsFeedContent />
      </Suspense>
    </div>
  );
}
