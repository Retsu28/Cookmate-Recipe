import { Component, type ErrorInfo, type ReactNode } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isOffline: boolean;
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message || '';
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(error.name || '') ||
    /Importing a module script failed/i.test(msg)
  );
}

export class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isOffline: false };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      isOffline: isChunkLoadError(error) && !navigator.onLine,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (!isChunkLoadError(error)) {
      console.error('[PageErrorBoundary] Uncaught error:', error, info.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, isOffline: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Don't block the UI when offline - let the app function with cached data
    if (this.state.isOffline) {
      // Auto-retry once after a short delay to allow service worker to serve cached content
      setTimeout(() => this.handleRetry(), 500);
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-950/30 dark:text-orange-400">
            <WifiOff size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Loading offline mode...
            </h2>
            <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">
              Using cached content. Some features may be limited.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5 px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <span className="text-3xl">🍳</span>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-stone-500 dark:text-stone-400">
            An error occurred loading this page. Try navigating away and back.
          </p>
        </div>
        <button
          onClick={this.handleRetry}
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-600"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    );
  }
}
