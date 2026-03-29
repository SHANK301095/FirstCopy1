/**
 * Smart Preloading Hook
 * Learns user navigation patterns and preloads likely next routes
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationPattern {
  from: string;
  to: string;
  count: number;
  lastVisit: number;
}

interface PreloadConfig {
  // Minimum visits before considering a pattern
  minVisits: number;
  // How long to keep patterns (ms)
  patternTTL: number;
  // Max patterns to track per source
  maxPatternsPerSource: number;
  // Delay before preloading (ms)
  preloadDelay: number;
}

const DEFAULT_CONFIG: PreloadConfig = {
  minVisits: 2,
  patternTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxPatternsPerSource: 5,
  preloadDelay: 500,
};

const STORAGE_KEY = 'mmc-nav-patterns';

// Route modules for dynamic imports
const routeModules: Record<string, () => Promise<unknown>> = {
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

// Preloaded routes cache
const preloadedRoutes = new Set<string>();

function loadPatterns(): NavigationPattern[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const patterns = JSON.parse(stored) as NavigationPattern[];
    // Filter out expired patterns
    const now = Date.now();
    return patterns.filter(p => now - p.lastVisit < DEFAULT_CONFIG.patternTTL);
  } catch {
    return [];
  }
}

function savePatterns(patterns: NavigationPattern[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  } catch {
    // Storage full or unavailable
  }
}

function recordNavigation(from: string, to: string, patterns: NavigationPattern[]): NavigationPattern[] {
  // Skip if same route or auth routes
  if (from === to) return patterns;
  if (['/login', '/signup', '/forgot-password'].includes(from) || 
      ['/login', '/signup', '/forgot-password'].includes(to)) {
    return patterns;
  }

  const existingIdx = patterns.findIndex(p => p.from === from && p.to === to);
  
  if (existingIdx >= 0) {
    // Update existing pattern
    patterns[existingIdx].count++;
    patterns[existingIdx].lastVisit = Date.now();
  } else {
    // Add new pattern
    patterns.push({
      from,
      to,
      count: 1,
      lastVisit: Date.now(),
    });
  }

  // Limit patterns per source
  const sourcePatterns = patterns.filter(p => p.from === from);
  if (sourcePatterns.length > DEFAULT_CONFIG.maxPatternsPerSource) {
    // Keep top patterns by count
    sourcePatterns.sort((a, b) => b.count - a.count);
    const toRemove = sourcePatterns.slice(DEFAULT_CONFIG.maxPatternsPerSource);
    return patterns.filter(p => !toRemove.includes(p));
  }

  return patterns;
}

function getPredictedRoutes(from: string, patterns: NavigationPattern[]): string[] {
  return patterns
    .filter(p => p.from === from && p.count >= DEFAULT_CONFIG.minVisits)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(p => p.to);
}

export function useSmartPreload() {
  const location = useLocation();
  const previousPath = useRef<string | null>(null);
  const patternsRef = useRef<NavigationPattern[]>(loadPatterns());

  // Record navigation pattern
  useEffect(() => {
    const currentPath = location.pathname;
    
    if (previousPath.current && previousPath.current !== currentPath) {
      patternsRef.current = recordNavigation(
        previousPath.current,
        currentPath,
        patternsRef.current
      );
      savePatterns(patternsRef.current);
    }

    previousPath.current = currentPath;
  }, [location.pathname]);

  // Preload predicted routes
  useEffect(() => {
    const timer = setTimeout(() => {
      const predicted = getPredictedRoutes(location.pathname, patternsRef.current);
      
      predicted.forEach(route => {
        if (!preloadedRoutes.has(route) && routeModules[route]) {
          preloadedRoutes.add(route);
          routeModules[route]().catch(() => {
            // Preload failed, remove from cache so we can retry later
            preloadedRoutes.delete(route);
          });
        }
      });
    }, DEFAULT_CONFIG.preloadDelay);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Manual preload function
  const preloadRoute = useCallback((path: string) => {
    if (!preloadedRoutes.has(path) && routeModules[path]) {
      preloadedRoutes.add(path);
      return routeModules[path]();
    }
    return Promise.resolve();
  }, []);

  // Get navigation suggestions based on patterns
  const getNavigationSuggestions = useCallback((limit = 3): string[] => {
    return getPredictedRoutes(location.pathname, patternsRef.current).slice(0, limit);
  }, [location.pathname]);

  return {
    preloadRoute,
    getNavigationSuggestions,
  };
}
