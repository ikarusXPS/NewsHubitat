import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo: errorInfo.componentStack || error.stack || null,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-8">
          <div className="max-w-2xl w-full">
            <div className="glass-panel rounded-xl p-8 border-2 border-[#ff0044]/30">
              {/* Error Icon */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-12 w-12 text-[#ff0044]" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold font-mono text-[#ff0044]">
                    RENDER ERROR
                  </h1>
                  <p className="text-sm text-gray-500 font-mono mt-1">
                    A critical error occurred while rendering this component
                  </p>
                </div>
              </div>

              {/* Error Details */}
              <div className="mb-6">
                <div className="bg-black/50 rounded-lg p-4 border border-[#ff0044]/20">
                  <p className="text-sm font-mono text-[#ff0044] mb-2">
                    {this.state.error?.name}: {this.state.error?.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-3">
                      <summary className="text-xs font-mono text-gray-500 cursor-pointer hover:text-gray-400">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-[10px] font-mono text-gray-600 overflow-x-auto max-h-48 overflow-y-auto">
                        {this.state.errorInfo}
                      </pre>
                    </details>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#ff0044] hover:bg-[#cc0036] text-white font-mono rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  RELOAD PAGE
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-3 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white font-mono rounded-lg transition-colors"
                >
                  GO BACK
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-gray-800">
                <p className="text-xs font-mono text-gray-600 leading-relaxed">
                  If this error persists, try clearing your browser cache or opening the app in an incognito window.
                  The development team has been notified of this issue.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
