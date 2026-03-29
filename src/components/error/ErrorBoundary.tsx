import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secureLogger';
import { captureError } from '@/lib/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log error to secure logger
    secureLogger.error('ui', 'ErrorBoundary caught an error', {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });

    // Send to error tracking (Sentry if configured)
    captureError(error, { action: 'ErrorBoundary', metadata: { componentStack: errorInfo.componentStack?.slice(0, 500) } });
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onReload={this.handleReload}
          retryCount={this.state.retryCount}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  onGoHome: () => void;
  onReload: () => void;
  retryCount: number;
  showDetails?: boolean;
}

export function ErrorFallback({
  error,
  errorInfo,
  onRetry,
  onGoHome,
  onReload,
  retryCount,
  showDetails = false,
}: ErrorFallbackProps) {
  const [showStack, setShowStack] = React.useState(false);

  const errorMessages = [
    "Oops! Something went wrong",
    "We hit a snag",
    "Hmm, that didn't work",
    "Something unexpected happened",
  ];

  const randomMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card variant="glass" className="max-w-lg w-full p-8 text-center">
        {/* Icon */}
        <div className="relative mx-auto mb-6 w-20 h-20">
          <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {randomMessage}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Don't worry, your data is safe. This is usually a temporary issue
          that can be fixed by retrying or refreshing the page.
        </p>

        {/* Error message (simplified) */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-mono break-all">
              {error.message || 'An unknown error occurred'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button
            onClick={onRetry}
            className="gap-2"
            disabled={retryCount >= 3}
          >
            <RefreshCw className={cn("h-4 w-4", retryCount > 0 && "animate-spin")} />
            {retryCount >= 3 ? 'Max retries reached' : 'Try Again'}
          </Button>
          
          <Button variant="outline" onClick={onReload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
          
          <Button variant="ghost" onClick={onGoHome} className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>

        {/* Retry counter */}
        {retryCount > 0 && retryCount < 3 && (
          <p className="text-xs text-muted-foreground mb-4">
            Retry attempt {retryCount} of 3
          </p>
        )}

        {/* Developer details toggle */}
        {(showDetails || process.env.NODE_ENV === 'development') && (
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowStack(!showStack)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <Bug className="h-3 w-3" />
              {showStack ? 'Hide' : 'Show'} technical details
            </button>
            
            {showStack && errorInfo && (
              <pre className="mt-4 p-4 bg-muted/50 rounded-lg text-left text-xs overflow-auto max-h-48 text-muted-foreground">
                {errorInfo.componentStack}
              </pre>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// Hook for functional error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    secureLogger.error('ui', 'useErrorHandler caught error', {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack?.slice(0, 500),
    });
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    throw error;
  }

  return { handleError, resetError };
}

export default ErrorBoundary;
