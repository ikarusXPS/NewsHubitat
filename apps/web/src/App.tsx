import { Suspense, useEffect } from 'react';
import './i18n/i18n'; // Initialize i18n before App renders
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { Layout } from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ConsentProvider } from './contexts/ConsentContext';
import { VerificationBanner } from './components/VerificationBanner';
import { ConsentBanner } from './components/ConsentBanner';
import { cacheService } from './services/cacheService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import { RequireAuth } from './components/RequireAuth';
import { FocusSuggestions } from './components/FocusSuggestions';
import { FocusOnboarding } from './components/FocusOnboarding';
import { SettingsModal } from './components/SettingsModal';
import { useAppStore } from './store';
import {
  Dashboard,
  Analysis,
  Timeline,
  MapView,
  Globe,
  Monitor,
  Bookmarks,
  ReadingHistory,
  Settings,
  EventMap,
  Community,
  Profile,
  Article,
  VerifyEmail,
  ForgotPassword,
  ResetPassword,
  Privacy,
  TeamDashboard,
  TeamInviteAccept,
  DevelopersPage,
  Pricing,
  SubscriptionSuccess,
  PodcastsPage,
} from './routes';
import './index.css';
import { logger } from './lib/logger';

// Report Core Web Vitals - only in development or with analytics endpoint
function reportWebVitals() {
  const logVital = (metric: { name: string; value: number; rating: string }) => {
    // Log to console in development
    if (import.meta.env.DEV) {
      const color = metric.rating === 'good' ? '#00ff88' : metric.rating === 'needs-improvement' ? '#ffee00' : '#ff0044';
      logger.log(
        `%c[Web Vitals] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`,
        `color: ${color}; font-weight: bold;`
      );
    }

    // In production, you could send to an analytics endpoint
    // Example: navigator.sendBeacon('/analytics', JSON.stringify(metric))
  };

  // Core Web Vitals
  onCLS(logVital);   // Cumulative Layout Shift
  onINP(logVital);   // Interaction to Next Paint (replaces FID)
  onLCP(logVital);   // Largest Contentful Paint

  // Additional metrics
  onFCP(logVital);   // First Contentful Paint
  onTTFB(logVital);  // Time to First Byte
}

// Loading fallback component - Cyber style
function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block">
          <Radio className="h-10 w-10 text-[#00f0ff]" />
          <div className="absolute inset-0 animate-ping">
            <Radio className="h-10 w-10 text-[#00f0ff] opacity-30" />
          </div>
        </div>
        <p className="mt-4 text-sm font-mono text-[#00f0ff]/50 uppercase tracking-widest">
          Loading...
        </p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Always fetch on mount (fixes hard-reload issue)
      staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
      gcTime: 5 * 60 * 1000, // Keep unused data for 5 minutes
    },
  },
});

// Main app routes component with modal support
function AppRoutes() {
  const location = useLocation();

  // Check if settings should be shown as a modal (has background location)
  const backgroundLocation = location.state?.backgroundLocation;
  const isSettingsModal = location.pathname === '/settings' && backgroundLocation;

  // Use background location for main routes when settings modal is open
  const routeLocation = isSettingsModal ? backgroundLocation : location;

  return (
    <>
      <ErrorBoundary>
        <ChunkErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes location={routeLocation}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/monitor" element={<Monitor />} />
              <Route path="/analysis" element={<RequireAuth><Analysis /></RequireAuth>} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/globe" element={<Globe />} />
              <Route path="/events" element={<EventMap />} />
              <Route path="/community" element={<Community />} />
              <Route path="/bookmarks" element={<RequireAuth><Bookmarks /></RequireAuth>} />
              <Route path="/podcasts" element={<PodcastsPage />} />
              <Route path="/history" element={<RequireAuth><ReadingHistory /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              {/* Article detail page with comments */}
              <Route path="/article/:id" element={<Article />} />
              {/* Auth pages (public - no auth required) */}
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Settings as full page when accessed directly */}
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              {/* Legal pages */}
              <Route path="/privacy" element={<Privacy />} />
              {/* Team pages - invite route must come before :teamId for specificity */}
              <Route path="/team/invite/:token" element={<TeamInviteAccept />} />
              <Route path="/team/:teamId" element={<RequireAuth><TeamDashboard /></RequireAuth>} />
              {/* Developer portal - D-09: dedicated /developers page */}
              <Route path="/developers" element={<DevelopersPage />} />
              {/* Subscription pages (public - Phase 36) */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            </Routes>
          </Suspense>
        </ChunkErrorBoundary>
      </ErrorBoundary>

      {/* Settings Modal overlay when opened from another page */}
      <SettingsModal isOpen={isSettingsModal}>
        <Suspense fallback={<PageLoader />}>
          <Settings />
        </Suspense>
      </SettingsModal>
    </>
  );
}

export default function App() {
  const { hasCompletedOnboarding } = useAppStore();

  // Clear expired cache on app start and initialize performance monitoring
  useEffect(() => {
    cacheService.clearExpired().catch(logger.error);

    // Report Core Web Vitals
    reportWebVitals();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConsentProvider>
        <AuthProvider>
          <BrowserRouter>
            {/* Show onboarding for first-time users */}
            {!hasCompletedOnboarding && <FocusOnboarding />}

            {/* Verification banner for unverified users */}
            <VerificationBanner />

            <Layout>
              <AppRoutes />
            </Layout>
            {/* Global Focus Suggestions - overlays on all pages */}
            <FocusSuggestions />

            {/* GDPR Consent Banner */}
            <ConsentBanner />
          </BrowserRouter>
        </AuthProvider>
      </ConsentProvider>
    </QueryClientProvider>
  );
}
