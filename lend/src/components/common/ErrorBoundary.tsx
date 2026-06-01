import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Root-level error boundary. Catches render-time crashes anywhere in the tree
 * and shows a recovery screen instead of a blank white page. Logs to the console
 * (and is the natural hook point for an error-monitoring service later).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook point for Sentry/etc. For now, log it.
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 px-6 text-center">
        <div className="text-6xl mb-4">🌧️</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h1>
        <p className="text-slate-500 max-w-md mb-6">
          The app hit an unexpected error. Reloading usually fixes it. If it keeps
          happening, please let us know.
        </p>
        <button
          onClick={this.handleReload}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Reload Foster
        </button>
      </div>
    );
  }
}
