import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AuthProvider } from './contexts/AuthContext';
import { cacheService } from './services/cacheService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FocusSuggestions } from './components/FocusSuggestions';
import { FocusOnboarding } from './components/FocusOnboarding';
import { SettingsModal } from './components/SettingsModal';
import { useAppStore } from './store';
import './index.css';

// Report Core Web Vitals - only in development or with analytics endpoint
function reportWebVitals() {
  const logVital = (metric: { name: string; value: number; rating: string }) => {
    // Log to console in development
    if (import.meta.env.DEV) {
      const color = metric.rating === 'good' ? '#00ff88' : metric.rating === 'needs-improvement' ? '#ffee00' : '#ff0044';
      console.log(
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

// Lazy load heavy pages
const Analysis = lazy(() => import('./pages/Analysis').then(m => ({ default: m.Analysis })));
const Timeline = lazy(() => import('./pages/Timeline').then(m => ({ default: m.Timeline })));
const MapView = lazy(() => import('./pages/MapView').then(m => ({ default: m.MapView })));
const Globe = lazy(() => import('./pages/Globe').then(m => ({ default: m.Globe })));
const Monitor = lazy(() => import('./pages/Monitor').then(m => ({ default: m.Monitor })));
const Bookmarks = lazy(() => import('./pages/Bookmarks').then(m => ({ default: m.Bookmarks })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const EventMap = lazy(() => import('./pages/EventMap').then(m => ({ default: m.EventMap })));
const Community = lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

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
        <Suspense fallback={<PageLoader />}>
          <Routes location={routeLocation}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/globe" element={<Globe />} />
            <Route path="/events" element={<EventMap />} />
            <Route path="/community" element={<Community />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/profile" element={<Profile />} />
            {/* Settings as full page when accessed directly */}
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
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
    cacheService.clearExpired().catch(console.error);

    // Report Core Web Vitals
    reportWebVitals();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {/* Show onboarding for first-time users */}
          {!hasCompletedOnboarding && <FocusOnboarding />}

          <Layout>
            <AppRoutes />
          </Layout>
          {/* Global Focus Suggestions - overlays on all pages */}
          <FocusSuggestions />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
