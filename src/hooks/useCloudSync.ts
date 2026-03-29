/**
 * Cloud Sync Hook
 * Provides cloud sync state and actions for components
 * Supports incremental sync with delta tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as cloudSync from '@/lib/cloudSync';
import type { CloudProject, CloudStrategy, CloudDataset, CloudResult } from '@/lib/cloudSync';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
}

export function useCloudSync() {
  const { user, session } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    error: null,
  });

  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [strategies, setStrategies] = useState<CloudStrategy[]>([]);
  const [datasets, setDatasets] = useState<CloudDataset[]>([]);
  const [results, setResults] = useState<CloudResult[]>([]);
  
  // Track if initial sync has been done
  const initialSyncDone = useRef(false);

  // Check sync status on mount and when user changes
  useEffect(() => {
    if (user && session) {
      checkStatus();
    } else {
      setSyncState(s => ({ ...s, isOnline: false }));
      initialSyncDone.current = false;
    }
  }, [user, session]);

  const checkStatus = async () => {
    try {
      const status = await cloudSync.checkSyncStatus();
      setSyncState(s => ({ ...s, isOnline: status.isOnline, lastSync: status.lastSync }));
    } catch {
      setSyncState(s => ({ ...s, isOnline: false, error: 'Failed to check sync status' }));
    }
  };

  // Merge new data with existing (for incremental sync)
  const mergeData = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const map = new Map(existing.map(item => [item.id, item]));
    incoming.forEach(item => map.set(item.id, item));
    return Array.from(map.values());
  };

  // Incremental sync - only fetch changes since last sync
  const syncIncremental = useCallback(async () => {
    if (!user) return;

    setSyncState(s => ({ ...s, isSyncing: true, error: null }));
    
    try {
      const [projectsData, strategiesData, datasetsData, resultsData] = await Promise.all([
        cloudSync.fetchProjects({ incremental: true }),
        cloudSync.fetchStrategies(undefined, { incremental: true }),
        cloudSync.fetchDatasets(undefined, { incremental: true }),
        cloudSync.fetchResults({ incremental: true }),
      ]);

      // Merge with existing data
      setProjects(prev => mergeData(prev, projectsData));
      setStrategies(prev => mergeData(prev, strategiesData));
      setDatasets(prev => mergeData(prev, datasetsData));
      setResults(prev => mergeData(prev, resultsData));

      setSyncState({
        isOnline: true,
        isSyncing: false,
        lastSync: new Date(),
        error: null,
      });
    } catch (err) {
      setSyncState(s => ({
        ...s,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    }
  }, [user]);

  // Full sync - fetch all data (used on initial load)
  const syncAll = useCallback(async () => {
    if (!user) return;

    setSyncState(s => ({ ...s, isSyncing: true, error: null }));
    
    try {
      // Clear sync timestamps to force full fetch
      cloudSync.clearSyncTimestamps();
      
      const [projectsData, strategiesData, datasetsData, resultsData] = await Promise.all([
        cloudSync.fetchProjects(),
        cloudSync.fetchStrategies(),
        cloudSync.fetchDatasets(),
        cloudSync.fetchResults(),
      ]);

      setProjects(projectsData);
      setStrategies(strategiesData);
      setDatasets(datasetsData);
      setResults(resultsData);

      initialSyncDone.current = true;

      setSyncState({
        isOnline: true,
        isSyncing: false,
        lastSync: new Date(),
        error: null,
      });
    } catch (err) {
      setSyncState(s => ({
        ...s,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    }
  }, [user]);

  // Project actions
  const addProject = useCallback(async (name: string, description?: string) => {
    const project = await cloudSync.createProject(name, description);
    setProjects(p => [project, ...p]);
    return project;
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await cloudSync.deleteProject(id);
    setProjects(p => p.filter(proj => proj.id !== id));
  }, []);

  // Strategy actions
  const addStrategy = useCallback(async (strategy: Parameters<typeof cloudSync.createStrategy>[0]) => {
    const created = await cloudSync.createStrategy(strategy);
    setStrategies(s => [created, ...s]);
    return created;
  }, []);

  const removeStrategy = useCallback(async (id: string) => {
    await cloudSync.deleteStrategy(id);
    setStrategies(s => s.filter(strat => strat.id !== id));
  }, []);

  // Dataset actions
  const addDataset = useCallback(async (dataset: Parameters<typeof cloudSync.createDataset>[0]) => {
    const created = await cloudSync.createDataset(dataset);
    setDatasets(d => [created, ...d]);
    return created;
  }, []);

  const removeDataset = useCallback(async (id: string) => {
    await cloudSync.deleteDataset(id);
    setDatasets(d => d.filter(ds => ds.id !== id));
  }, []);

  // Result actions
  const addResult = useCallback(async (result: Parameters<typeof cloudSync.createResult>[0]) => {
    const created = await cloudSync.createResult(result);
    setResults(r => [created, ...r]);
    return created;
  }, []);

  const removeResult = useCallback(async (id: string) => {
    await cloudSync.deleteResult(id);
    setResults(r => r.filter(res => res.id !== id));
  }, []);

  return {
    // State
    syncState,
    isAuthenticated: !!user,
    projects,
    strategies,
    datasets,
    results,

    // Actions
    syncAll,
    syncIncremental,
    checkStatus,
    addProject,
    removeProject,
    addStrategy,
    removeStrategy,
    addDataset,
    removeDataset,
    addResult,
    removeResult,
  };
}
