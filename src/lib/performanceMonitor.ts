/**
 * Global Performance Monitor
 * Tracks and reports key performance metrics
 */

interface PerformanceMetrics {
  fcp: number | null;  // First Contentful Paint
  lcp: number | null;  // Largest Contentful Paint
  fid: number | null;  // First Input Delay
  cls: number | null;  // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
}

type MetricCallback = (metrics: PerformanceMetrics) => void;

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  };
  private callbacks: MetricCallback[] = [];
  private observer: PerformanceObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Get TTFB from navigation timing
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
      }
    } catch (e) {
      // Navigation timing not supported
    }

    // Observe Core Web Vitals
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                this.metrics.fcp = entry.startTime;
                this.notify();
              }
              break;
            case 'largest-contentful-paint':
              this.metrics.lcp = entry.startTime;
              this.notify();
              break;
            case 'first-input':
              this.metrics.fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
              this.notify();
              break;
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                this.metrics.cls = (this.metrics.cls || 0) + (entry as any).value;
                this.notify();
              }
              break;
          }
        }
      });

      this.observer.observe({ 
        entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
      });
    } catch (e) {
      // PerformanceObserver not supported
    }
  }

  private notify() {
    this.callbacks.forEach(cb => cb(this.metrics));
  }

  subscribe(callback: MetricCallback): () => void {
    this.callbacks.push(callback);
    // Immediately call with current metrics
    callback(this.metrics);
    
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Log metrics to console in development
  logMetrics() {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔥 Performance Metrics');
      console.table({
        'First Contentful Paint': this.metrics.fcp ? `${this.metrics.fcp.toFixed(0)}ms` : 'N/A',
        'Largest Contentful Paint': this.metrics.lcp ? `${this.metrics.lcp.toFixed(0)}ms` : 'N/A',
        'First Input Delay': this.metrics.fid ? `${this.metrics.fid.toFixed(0)}ms` : 'N/A',
        'Cumulative Layout Shift': this.metrics.cls?.toFixed(4) || 'N/A',
        'Time to First Byte': this.metrics.ttfb ? `${this.metrics.ttfb.toFixed(0)}ms` : 'N/A',
      });
      console.groupEnd();
    }
  }

  // Send metrics to analytics (placeholder)
  reportToAnalytics() {
    const metrics = this.getMetrics();
    
    // Only report if we have meaningful data
    if (metrics.lcp === null && metrics.fcp === null) return;

    // Phase 8: Removed console.log — metrics stored internally for programmatic access
    // Production: send to analytics endpoint if configured
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.callbacks = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for React components
import { useEffect, useState } from 'react';

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics());

  useEffect(() => {
    return performanceMonitor.subscribe(setMetrics);
  }, []);

  return metrics;
}

// Report metrics on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      performanceMonitor.reportToAnalytics();
    }
  });
}
