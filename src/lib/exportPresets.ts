/**
 * Export Presets Store - Quick Wins
 * Save and load export configurations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ExportPreset {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  config: ExportConfig;
}

export interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeEquityCurve: boolean;
  includeMonthlyBreakdown: boolean;
  includeTradeList: boolean;
  includeStatistics: boolean;
  includeParameters: boolean;
  includeMonteCarlo: boolean;
  customFields: string[];
  dateFormat: string;
  numberFormat: string;
  currencySymbol: string;
  paperSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
}

interface ExportPresetsState {
  presets: ExportPreset[];
  defaultPresetId: string | null;
  
  // Actions
  addPreset: (preset: Omit<ExportPreset, 'id' | 'createdAt'>) => string;
  updatePreset: (id: string, updates: Partial<ExportPreset>) => void;
  deletePreset: (id: string) => void;
  setDefaultPreset: (id: string | null) => void;
  getPreset: (id: string) => ExportPreset | undefined;
  getDefaultPreset: () => ExportPreset | undefined;
  duplicatePreset: (id: string) => string | null;
}

const defaultConfig: ExportConfig = {
  format: 'pdf',
  includeEquityCurve: true,
  includeMonthlyBreakdown: true,
  includeTradeList: true,
  includeStatistics: true,
  includeParameters: true,
  includeMonteCarlo: false,
  customFields: [],
  dateFormat: 'YYYY-MM-DD',
  numberFormat: '#,##0.00',
  currencySymbol: '$',
  paperSize: 'a4',
  orientation: 'portrait',
};

const builtInPresets: ExportPreset[] = [
  {
    id: 'full-report',
    name: 'Full Report',
    description: 'Complete backtest report with all sections',
    createdAt: new Date().toISOString(),
    config: {
      ...defaultConfig,
      includeMonteCarlo: true,
    },
  },
  {
    id: 'quick-summary',
    name: 'Quick Summary',
    description: 'Essential metrics only',
    createdAt: new Date().toISOString(),
    config: {
      ...defaultConfig,
      includeTradeList: false,
      includeMonteCarlo: false,
    },
  },
  {
    id: 'trade-analysis',
    name: 'Trade Analysis',
    description: 'Focus on individual trades',
    createdAt: new Date().toISOString(),
    config: {
      ...defaultConfig,
      format: 'excel',
      includeEquityCurve: false,
      includeMonthlyBreakdown: false,
    },
  },
];

export const useExportPresets = create<ExportPresetsState>()(
  persist(
    (set, get) => ({
      presets: builtInPresets,
      defaultPresetId: 'full-report',
      
      addPreset: (preset) => {
        const id = crypto.randomUUID();
        const newPreset: ExportPreset = {
          ...preset,
          id,
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          presets: [...state.presets, newPreset],
        }));
        
        return id;
      },
      
      updatePreset: (id, updates) => {
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },
      
      deletePreset: (id) => {
        // Prevent deleting built-in presets
        if (builtInPresets.some((p) => p.id === id)) return;
        
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          defaultPresetId: state.defaultPresetId === id ? null : state.defaultPresetId,
        }));
      },
      
      setDefaultPreset: (id) => {
        set({ defaultPresetId: id });
      },
      
      getPreset: (id) => get().presets.find((p) => p.id === id),
      
      getDefaultPreset: () => {
        const { presets, defaultPresetId } = get();
        return presets.find((p) => p.id === defaultPresetId) || presets[0];
      },
      
      duplicatePreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (!preset) return null;
        
        return get().addPreset({
          name: `${preset.name} (Copy)`,
          description: preset.description,
          config: { ...preset.config },
        });
      },
    }),
    {
      name: 'export-presets-storage',
    }
  )
);

export { defaultConfig };
