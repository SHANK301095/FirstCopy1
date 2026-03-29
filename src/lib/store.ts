import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, EA, Batch, BacktestResult } from '@/types';

interface AppState {
  projects: Project[];
  eas: EA[];
  batches: Batch[];
  results: BacktestResult[];
  currentProjectId: string | null;
  
  // Actions
  setCurrentProject: (id: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  addEA: (ea: EA) => void;
  updateEA: (id: string, updates: Partial<EA>) => void;
  deleteEA: (id: string) => void;
  
  addBatch: (batch: Batch) => void;
  updateBatch: (id: string, updates: Partial<Batch>) => void;
  deleteBatch: (id: string) => void;
  
  addResult: (result: BacktestResult) => void;
  addResults: (results: BacktestResult[]) => void;
  deleteResult: (id: string) => void;
  
  getProjectEAs: (projectId: string) => EA[];
  getProjectBatches: (projectId: string) => Batch[];
  getProjectResults: (projectId: string) => BacktestResult[];
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      eas: [],
      batches: [],
      results: [],
      currentProjectId: null,
      
      setCurrentProject: (id) => set({ currentProjectId: id }),
      
      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, project] 
      })),
      
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map((p) => 
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      })),
      
      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        eas: state.eas.filter((e) => e.projectId !== id),
        batches: state.batches.filter((b) => b.projectId !== id),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
      })),
      
      addEA: (ea) => set((state) => ({ eas: [...state.eas, ea] })),
      
      updateEA: (id, updates) => set((state) => ({
        eas: state.eas.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      })),
      
      deleteEA: (id) => set((state) => ({
        eas: state.eas.filter((e) => e.id !== id),
      })),
      
      addBatch: (batch) => set((state) => ({ batches: [...state.batches, batch] })),
      
      updateBatch: (id, updates) => set((state) => ({
        batches: state.batches.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      })),
      
      deleteBatch: (id) => set((state) => ({
        batches: state.batches.filter((b) => b.id !== id),
        results: state.results.filter((r) => r.batchId !== id),
      })),
      
      addResult: (result) => set((state) => ({ 
        results: [...state.results, result] 
      })),
      
      addResults: (results) => set((state) => ({ 
        results: [...state.results, ...results] 
      })),
      
      deleteResult: (id) => set((state) => ({
        results: state.results.filter((r) => r.id !== id),
      })),
      
      getProjectEAs: (projectId) => get().eas.filter((e) => e.projectId === projectId),
      
      getProjectBatches: (projectId) => get().batches.filter((b) => b.projectId === projectId),
      
      getProjectResults: (projectId) => {
        const batches = get().batches.filter((b) => b.projectId === projectId);
        const batchIds = batches.map((b) => b.id);
        return get().results.filter((r) => batchIds.includes(r.batchId));
      },
    }),
    {
      name: 'batchbacktest-storage',
    }
  )
);
