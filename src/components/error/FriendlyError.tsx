/**
 * Friendly Error Page - P0 Error Handling
 * User-friendly error pages with retry
 */

import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  RefreshCw, 
  Home, 
  ArrowLeft,
  WifiOff,
  ServerCrash,
  FileQuestion,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ErrorType = 'not-found' | 'server' | 'network' | 'unauthorized' | 'generic';

interface FriendlyErrorProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeLink?: boolean;
  showBackButton?: boolean;
  className?: string;
}

const ERROR_CONFIGS: Record<ErrorType, { icon: typeof AlertCircle; title: string; message: string; color: string }> = {
  'not-found': {
    icon: FileQuestion,
    title: 'Page Not Found',
    message: "We couldn't find the page you're looking for. It may have been moved or deleted.",
    color: 'text-warning',
  },
  'server': {
    icon: ServerCrash,
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again in a few moments.',
    color: 'text-loss',
  },
  'network': {
    icon: WifiOff,
    title: 'Connection Lost',
    message: "Please check your internet connection and try again.",
    color: 'text-warning',
  },
  'unauthorized': {
    icon: Lock,
    title: 'Access Denied',
    message: "You don't have permission to access this resource.",
    color: 'text-loss',
  },
  'generic': {
    icon: AlertCircle,
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    color: 'text-loss',
  },
};

export function FriendlyError({
  type = 'generic',
  title,
  message,
  onRetry,
  showHomeLink = true,
  showBackButton = true,
  className,
}: FriendlyErrorProps) {
  const navigate = useNavigate();
  const config = ERROR_CONFIGS[type];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center justify-center min-h-[50vh] p-6", className)}>
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="relative inline-block">
            <div className={cn("rounded-full p-4 bg-muted/50", config.color.replace('text-', 'bg-') + '/10')}>
              <Icon className={cn("h-12 w-12", config.color)} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{title || config.title}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {message || config.message}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {showBackButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Go Back
              </Button>
            )}
            
            {onRetry && (
              <Button size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Try Again
              </Button>
            )}
            
            {showHomeLink && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">
                  <Home className="h-4 w-4 mr-1.5" />
                  Home
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Session Expiry Handler - P0 Error Handling
 */
interface SessionExpiryProps {
  onRelogin: () => void;
  className?: string;
}

export function SessionExpiry({ onRelogin, className }: SessionExpiryProps) {
  return (
    <div className={cn("fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", className)}>
      <Card className="max-w-sm w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <Lock className="h-12 w-12 text-warning mx-auto" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Session Expired</h2>
            <p className="text-sm text-muted-foreground">
              Your session has expired. Please log in again to continue.
            </p>
          </div>
          <Button className="w-full" onClick={onRelogin}>
            Log In Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Retry Wrapper - P0 Error Handling
 * Wraps async operations with retry logic
 */
interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = true } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
