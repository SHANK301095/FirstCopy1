/**
 * Route prefetching hook for instant navigation
 * Preloads route components on hover/focus for perceived instant loads
 */

import { useCallback, useRef } from 'react';

// Route to lazy component mapping
const routeModules: Record<string, () => Promise<unknown>> = {
  // Core navigation
  '/dashboard': () => import('@/pages/Dashboard'),
  '/strategies': () => import('@/pages/StrategyLibrary'),
  '/data': () => import('@/pages/DataManager'),
  '/workflow': () => import('@/pages/Workflow'),
  '/analytics': () => import('@/pages/Analytics'),
  '/marketplace': () => import('@/pages/StrategyMarketplace'),
  '/saved-results': () => import('@/pages/SavedResults'),
  '/optimizer': () => import('@/pages/Optimizer'),
  '/reports': () => import('@/pages/ReportGenerator'),
  '/settings': () => import('@/pages/Settings'),
  '/workspace': () => import('@/pages/WorkspaceDashboard'),
  '/projects': () => import('@/pages/Projects'),
  
  // Extended navigation - high-traffic pages
  '/scanner': () => import('@/pages/Scanner'),
  '/tearsheet': () => import('@/pages/Tearsheet'),
  '/advanced-analytics': () => import('@/pages/AdvancedAnalytics'),
  '/portfolio': () => import('@/pages/PortfolioBuilder'),
  '/journal': () => import('@/pages/TradeJournal'),
  '/risk-dashboard': () => import('@/pages/RiskDashboard'),
  '/stress-testing': () => import('@/pages/StressTesting'),
  '/bulk-tester': () => import('@/pages/BulkTester'),
  '/execution': () => import('@/pages/ExecutionBridge'),
  '/cloud-dashboard': () => import('@/pages/CloudDashboard'),
  '/ai-features': () => import('@/pages/AIFeatures'),
  '/premium': () => import('@/pages/Premium'),
};

// Cache for prefetched routes
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's component module
 */
export function prefetchRoute(path: string): void {
  // Normalize path
  const normalizedPath = path.split('?')[0].split('#')[0];
  
  // Skip if already prefetched
  if (prefetchedRoutes.has(normalizedPath)) return;
  
  // Find matching route
  const loader = routeModules[normalizedPath];
  if (loader) {
    prefetchedRoutes.add(normalizedPath);
    // Prefetch with low priority
    const loadWithFallback = () => {
      loader().catch(() => {
        // Remove from cache on error so it can retry
        prefetchedRoutes.delete(normalizedPath);
      });
    };
    
    // Use requestIdleCallback with fallback for Safari
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadWithFallback);
    } else {
      setTimeout(loadWithFallback, 100);
    }
  }
}

/**
 * Prefetch multiple routes at once
 */
export function prefetchRoutes(paths: string[]): void {
  paths.forEach(prefetchRoute);
}

/**
 * Hook that provides prefetch handlers for links
 */
export function usePrefetch() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  const onMouseEnter = useCallback((path: string) => {
    // Small delay to avoid prefetching on quick mouse movements
    timeoutRef.current = setTimeout(() => {
      prefetchRoute(path);
    }, 50);
  }, []);
  
  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  const onFocus = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);
  
  return {
    getPrefetchProps: (path: string) => ({
      onMouseEnter: () => onMouseEnter(path),
      onMouseLeave,
      onFocus: () => onFocus(path),
    }),
    prefetchRoute,
    prefetchRoutes,
  };
}

/**
 * Prefetch common routes on app load
 * Call this after initial render to preload likely next pages
 */
export function prefetchCommonRoutes(): void {
  // Use requestIdleCallback for non-blocking prefetch
  const prefetch = () => {
    prefetchRoutes([
      '/dashboard',
      '/workflow',
      '/strategies',
      '/data',
      '/analytics',
      '/saved-results',
    ]);
  };
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(prefetch, { timeout: 3000 });
  } else {
    setTimeout(prefetch, 1000);
  }
}
