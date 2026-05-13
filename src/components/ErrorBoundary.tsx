import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-50 px-4 text-center dark:bg-stone-950">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <span className="text-4xl">🍳</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              Something went wrong
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              An unexpected error occurred. Refresh the page to try again.
            </p>
            {this.state.error && (
              <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2 font-mono text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-600"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
