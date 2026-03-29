import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secureLogger';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

/**
 * A specialized error boundary for page-level components.
 * Provides consistent error handling with optional page context.
 */
export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  const handleError = (error: Error) => {
    // Show toast notification
    toast.error(`Error in ${pageName || 'page'}`, {
      description: error.message,
      duration: 5000,
    });

    // Log to secure logger
    secureLogger.error('ui', `Page error in ${pageName || 'unknown'}`, { 
      message: error.message, 
      stack: error.stack 
    });
  };

  return (
    <ErrorBoundary onError={handleError} showDetails={false}>
      {children}
    </ErrorBoundary>
  );
}

export default PageErrorBoundary;
