/**
 * Data Sync Hook
 * Provides cloud-first data sync with automatic loading on auth
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as dataService from '@/lib/dataService';
import type { CloudDataset, CloudStrategy, CloudRun, CloudResult, SyncStatus } from '@/lib/dataService';

export interface DataSyncState {
  datasets: CloudDataset[];
  strategies: CloudStrategy[];
  runs: CloudRun[];
  results: CloudResult[];
  symbols: string[];
  syncStatus: SyncStatus;
}

export function useDataSync() {
  const { user, session } = useAuth();
  
  const [datasets, setDatasets] = useState<CloudDataset[]>([]);
  const [strategies, setStrategies] = useState<CloudStrategy[]>([]);
  const [runs, setRuns] = useState<CloudRun[]>([]);
  const [results, setResults] = useState<CloudResult[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    pendingUploads: 0,
    error: null,
  });

  // Sync all data from cloud
  const syncAll = useCallback(async () => {
    if (!user || !session) {
      setSyncStatus(s => ({ ...s, isOnline: false, error: 'Not authenticated' }));
      return;
    }

    setSyncStatus(s => ({ ...s, isSyncing: true, error: null }));

    try {
      const [datasetsData, strategiesData, runsData, resultsData, symbolsData] = await Promise.all([
        dataService.fetchAllDatasets(),
        dataService.fetchAllStrategies(),
        dataService.fetchRuns(),
        dataService.fetchResults(),
        dataService.getUniqueSymbols(),
      ]);

      setDatasets(datasetsData);
      setStrategies(strategiesData);
      setRuns(runsData);
      setResults(resultsData);
      setSymbols(symbolsData);

      setSyncStatus({
        isOnline: true,
        isSyncing: false,
        lastSync: new Date(),
        pendingUploads: 0,
        error: null,
      });
    } catch (err) {
      setSyncStatus(s => ({
        ...s,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    }
  }, [user, session]);

  // Auto-sync on login
  useEffect(() => {
    if (user && session) {
      syncAll();
    } else {
      // Clear data on logout
      setDatasets([]);
      setStrategies([]);
      setRuns([]);
      setResults([]);
      setSymbols([]);
      setSyncStatus({
        isOnline: false,
        isSyncing: false,
        lastSync: null,
        pendingUploads: 0,
        error: null,
      });
    }
  }, [user, session, syncAll]);

  // Dataset actions
  const addDataset = useCallback(async (dataset: Parameters<typeof dataService.createDataset>[0]) => {
    const created = await dataService.createDataset(dataset);
    setDatasets(d => [created, ...d]);
    if (dataset.symbol && !symbols.includes(dataset.symbol)) {
      setSymbols(s => [...s, dataset.symbol].sort());
    }
    return created;
  }, [symbols]);

  const removeDataset = useCallback(async (id: string) => {
    await dataService.deleteDataset(id);
    setDatasets(d => d.filter(ds => ds.id !== id));
  }, []);

  const renameSymbol = useCallback(async (oldSymbol: string, newSymbol: string) => {
    await dataService.renameSymbolFolder(oldSymbol, newSymbol);
    setDatasets(d => d.map(ds => 
      ds.symbol === oldSymbol ? { ...ds, symbol: newSymbol } : ds
    ));
    setSymbols(s => s.map(sym => sym === oldSymbol ? newSymbol : sym).sort());
  }, []);

  const deleteSymbol = useCallback(async (symbol: string) => {
    await dataService.deleteSymbolFolder(symbol);
    setDatasets(d => d.filter(ds => ds.symbol !== symbol));
    setSymbols(s => s.filter(sym => sym !== symbol));
  }, []);

  // Strategy actions
  const addStrategy = useCallback(async (strategy: Parameters<typeof dataService.createStrategy>[0]) => {
    const created = await dataService.createStrategy(strategy);
    setStrategies(s => [created, ...s]);
    return created;
  }, []);

  const removeStrategy = useCallback(async (id: string) => {
    await dataService.deleteStrategy(id);
    setStrategies(s => s.filter(st => st.id !== id));
  }, []);

  const modifyStrategy = useCallback(async (id: string, updates: Partial<CloudStrategy>) => {
    const updated = await dataService.updateStrategy(id, updates);
    setStrategies(s => s.map(st => st.id === id ? updated : st));
    return updated;
  }, []);

  // Run actions
  const addRun = useCallback(async (run: Parameters<typeof dataService.createRun>[0]) => {
    const created = await dataService.createRun(run);
    setRuns(r => [created, ...r]);
    return created;
  }, []);

  // Result actions
  const addResult = useCallback(async (result: Parameters<typeof dataService.createResult>[0]) => {
    const created = await dataService.createResult(result);
    setResults(r => [created, ...r]);
    return created;
  }, []);

  // Get datasets by symbol
  const getDatasetsBySymbol = useCallback((symbol: string) => {
    return datasets.filter(d => d.symbol === symbol);
  }, [datasets]);

  return {
    // State
    datasets,
    strategies,
    runs,
    results,
    symbols,
    syncStatus,
    isAuthenticated: !!user,
    isLoading: syncStatus.isSyncing,

    // Sync
    syncAll,
    refresh: syncAll,

    // Dataset actions
    addDataset,
    removeDataset,
    renameSymbol,
    deleteSymbol,
    getDatasetsBySymbol,

    // Strategy actions
    addStrategy,
    removeStrategy,
    modifyStrategy,

    // Run actions
    addRun,

    // Result actions
    addResult,
  };
}
