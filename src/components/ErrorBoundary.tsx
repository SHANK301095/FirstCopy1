/**
 * Global Error Boundary
 * Catches unhandled React errors with friendly UI and unique error IDs
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, Home } from 'lucide-react';
import { captureError } from '@/lib/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
  copied: boolean;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: '', copied: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Detect chunk load errors — show friendly "update available" instead of crash
    const isChunkError = error.message?.includes('Failed to fetch dynamically imported module') ||
                         error.message?.includes('Loading chunk') ||
                         error.name === 'ChunkLoadError';
    
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return { hasError: true, error, errorId, isChunkError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.state.errorId}:`, error, errorInfo);
    captureError(error, { action: 'ErrorBoundary', metadata: { componentStack: errorInfo.componentStack, errorId: this.state.errorId } });
  }

  handleHardReload = () => {
    // Clear caches + unregister SW for chunk errors
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      }).catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyId = () => {
    navigator.clipboard.writeText(this.state.errorId);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Chunk load error — show friendly "update available" screen
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="max-w-sm w-full text-center space-y-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight">Update Available</h1>
                <p className="text-muted-foreground text-sm">
                  A new version of MMC has been deployed. Please refresh to load the latest version.
                </p>
              </div>
              <button
                onClick={this.handleHardReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Now
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-muted-foreground text-sm">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <code className="text-xs bg-muted px-3 py-1.5 rounded-lg font-mono">
                {this.state.errorId}
              </code>
              <button
                onClick={this.handleCopyId}
                className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                {this.state.copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            </div>

            {this.state.error && (
              <details className="text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-muted text-xs font-mono text-destructive overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
