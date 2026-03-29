/**
 * Recent Pages Hook - P0 UX
 * Tracks recently visited pages for quick navigation
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const MAX_RECENT = 8;
const STORAGE_KEY = 'mmc-recent-pages';

interface RecentPage {
  path: string;
  title: string;
  visitedAt: number;
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/workflow': 'Backtest Workflow',
  '/data': 'Data Manager',
  '/strategies': 'Strategy Library',
  '/optimizer': 'Optimizer',
  '/walk-forward': 'Walk-Forward',
  '/analytics': 'Analytics',
  '/saved-results': 'Saved Results',
  '/reports': 'Reports',
  '/scanner': 'Scanner',
  '/sentinel': 'Sentinel AI',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/portfolio': 'Portfolio Builder',
  '/risk-dashboard': 'Risk Dashboard',
  '/tearsheet': 'Tearsheet',
  '/quick-compare': 'Quick Compare',
  '/templates': 'Templates',
  '/strategy-versions': 'Strategy Versions',
  '/logs': 'Logs',
  '/tutorials': 'Tutorials',
  '/workspace': 'Workspace',
  '/cloud-sync': 'Cloud Sync',
  '/desktop-settings': 'Desktop Settings',
};

export function useRecentPages() {
  const location = useLocation();
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentPages(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Track page visits
  useEffect(() => {
    const path = location.pathname;
    const title = ROUTE_TITLES[path] || path.split('/').pop()?.replace(/-/g, ' ') || 'Page';
    
    // Don't track login/signup pages
    if (['/login', '/signup', '/forgot-password', '/reset-password'].includes(path)) {
      return;
    }

    setRecentPages(prev => {
      const filtered = prev.filter(p => p.path !== path);
      const updated = [{ path, title, visitedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      
      return updated;
    });
  }, [location.pathname]);

  const clearRecent = useCallback(() => {
    setRecentPages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recentPages, clearRecent };
}
