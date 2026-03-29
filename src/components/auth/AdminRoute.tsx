import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { LoadingSpinner } from '@/components/ui/loading';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Route-level guard that blocks non-admin users.
 * Must be used INSIDE <ProtectedRoute> (requires authenticated user).
 * 
 * Flow: ProtectedRoute (auth) → AdminRoute (role) → Page
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground animate-pulse text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/trading-dashboard" replace />;
  }

  return <>{children}</>;
}
