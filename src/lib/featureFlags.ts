/**
 * Feature Flag System
 * Simple configuration to enable/disable major modules
 * All features ON by default
 */

export interface FeatureFlags {
  // Phase 1: Data Manager
  dataImportWizard: boolean;
  dataQualityScore: boolean;
  duplicateHandlingUI: boolean;
  mergeEnhancements: boolean;
  datasetLineage: boolean;
  
  // Phase 2: Strategy + Backtest
  strategyTagging: boolean;
  strategyVersionDiff: boolean;
  backtestPresets: boolean;
  backtestQueue: boolean;
  runtimeEstimator: boolean;
  
  // Phase 3: Trading Ops
  paperTrading: boolean;
  riskDashboard: boolean;
  portfolioBuilder: boolean;
  tradeExplorerViews: boolean;
  
  // Phase 4: Copilot + UX
  copilotGuide: boolean;
  copilotDebug: boolean;
  copilotBuild: boolean;
  inAppGlossary: boolean;
  keyboardShortcuts: boolean;
  errorSimplification: boolean;
  
  // Phase 5: Security
  auditTrail: boolean;
  rbacRoles: boolean;
  mfaSupport: boolean;
  incidentBanner: boolean;
  
  // Phase 6: Platform
  offlineMode: boolean;
  exportCenter: boolean;
  desktopUpdates: boolean;
}

// Default: all features enabled
const defaultFlags: FeatureFlags = {
  // Phase 1
  dataImportWizard: true,
  dataQualityScore: true,
  duplicateHandlingUI: true,
  mergeEnhancements: true,
  datasetLineage: true,
  
  // Phase 2
  strategyTagging: true,
  strategyVersionDiff: true,
  backtestPresets: true,
  backtestQueue: true,
  runtimeEstimator: true,
  
  // Phase 3
  paperTrading: true,
  riskDashboard: true,
  portfolioBuilder: true,
  tradeExplorerViews: true,
  
  // Phase 4
  copilotGuide: true,
  copilotDebug: true,
  copilotBuild: true,
  inAppGlossary: true,
  keyboardShortcuts: true,
  errorSimplification: true,
  
  // Phase 5
  auditTrail: true,
  rbacRoles: true,
  mfaSupport: true,
  incidentBanner: true,
  
  // Phase 6
  offlineMode: true,
  exportCenter: true,
  desktopUpdates: true,
};

// Storage key
const STORAGE_KEY = 'mmc_feature_flags';

// Get flags from localStorage or defaults
export function getFeatureFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultFlags, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultFlags;
}

// Set a specific flag
export function setFeatureFlag<K extends keyof FeatureFlags>(key: K, value: boolean): void {
  const flags = getFeatureFlags();
  flags[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
}

// Check if a feature is enabled
export function isFeatureEnabled(key: keyof FeatureFlags): boolean {
  return getFeatureFlags()[key];
}

// Reset all flags to defaults
export function resetFeatureFlags(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Hook for React components
import { useState, useEffect } from 'react';

export function useFeatureFlag(key: keyof FeatureFlags): boolean {
  const [enabled, setEnabled] = useState(() => isFeatureEnabled(key));
  
  useEffect(() => {
    const handleStorage = () => setEnabled(isFeatureEnabled(key));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);
  
  return enabled;
}

export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState(() => getFeatureFlags());
  
  useEffect(() => {
    const handleStorage = () => setFlags(getFeatureFlags());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  return flags;
}
