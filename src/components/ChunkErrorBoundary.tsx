import { Component, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Wifi, RefreshCw } from 'lucide-react';
import { getCriticalString } from '../i18n/criticalStrings';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  lang?: string; // Language code for localized messages
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary for chunk load failures.
 * Shows toast notification and provides retry button with localized text.
 *
 * Usage:
 * <ChunkErrorBoundary lang={currentLanguage}>
 *   <Suspense fallback={<PageLoader />}>
 *     <LazyComponent />
 *   </Suspense>
 * </ChunkErrorBoundary>
 */
export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChunkErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Check if it's a chunk load error
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
      const message = getCriticalString(
        this.props.lang || 'en',
        'connectionIssue'
      );
      toast.error(message, { duration: 3000 });
    }

    console.error('[ChunkErrorBoundary] Chunk load failed:', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const failedMessage = getCriticalString(
        this.props.lang || 'en',
        'failed'
      );

      return (
        <div className="max-w-md mx-auto py-12">
          <div className="glass-panel rounded-xl p-8 text-center">
            {/* Connection Icon */}
            <div className="mb-6">
              <Wifi className="h-12 w-12 text-gray-400 mx-auto" />
            </div>

            {/* Error Message */}
            <p className="text-gray-400 font-mono text-sm mb-6">
              {failedMessage}
            </p>

            {/* Retry Button */}
            <button
              onClick={this.handleRetry}
              className="btn-cyber inline-flex items-center gap-2 px-6 py-3 rounded-lg font-mono"
            >
              <RefreshCw className="h-4 w-4" />
              {getCriticalString(this.props.lang || 'en', 'retry')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
