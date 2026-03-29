/**
 * Column Configuration Store - Quick Wins
 * Custom columns for data tables
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ColumnConfig {
  id: string;
  label: string;
  field: string;
  visible: boolean;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'number' | 'currency' | 'percent' | 'date' | 'text';
  decimals?: number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface TableConfig {
  id: string;
  name: string;
  columns: ColumnConfig[];
}

interface ColumnConfigState {
  tables: Record<string, TableConfig>;
  
  // Actions
  getTableConfig: (tableId: string) => TableConfig | undefined;
  setTableConfig: (tableId: string, config: TableConfig) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<ColumnConfig>) => void;
  toggleColumnVisibility: (tableId: string, columnId: string) => void;
  reorderColumns: (tableId: string, fromIndex: number, toIndex: number) => void;
  resetTableConfig: (tableId: string) => void;
}

// Default column configurations for common tables
const defaultResultsColumns: ColumnConfig[] = [
  { id: 'ea', label: 'EA', field: 'eaName', visible: true, align: 'left', format: 'text', sortable: true },
  { id: 'symbol', label: 'Symbol', field: 'symbol', visible: true, align: 'left', format: 'text', sortable: true },
  { id: 'timeframe', label: 'TF', field: 'timeframe', visible: true, align: 'center', format: 'text', sortable: true },
  { id: 'netProfit', label: 'Net Profit', field: 'netProfit', visible: true, align: 'right', format: 'currency', decimals: 2, sortable: true },
  { id: 'profitFactor', label: 'PF', field: 'profitFactor', visible: true, align: 'right', format: 'number', decimals: 2, sortable: true },
  { id: 'sharpe', label: 'Sharpe', field: 'sharpeRatio', visible: true, align: 'right', format: 'number', decimals: 2, sortable: true },
  { id: 'maxDrawdown', label: 'Max DD', field: 'maxDrawdownPct', visible: true, align: 'right', format: 'percent', decimals: 1, sortable: true },
  { id: 'winRate', label: 'Win %', field: 'winRate', visible: true, align: 'right', format: 'percent', decimals: 1, sortable: true },
  { id: 'totalTrades', label: 'Trades', field: 'totalTrades', visible: true, align: 'right', format: 'number', decimals: 0, sortable: true },
  { id: 'expectancy', label: 'Expectancy', field: 'expectancy', visible: false, align: 'right', format: 'currency', decimals: 2, sortable: true },
  { id: 'sortino', label: 'Sortino', field: 'sortinoRatio', visible: false, align: 'right', format: 'number', decimals: 2, sortable: true },
  { id: 'avgWin', label: 'Avg Win', field: 'avgWin', visible: false, align: 'right', format: 'currency', decimals: 2, sortable: true },
  { id: 'avgLoss', label: 'Avg Loss', field: 'avgLoss', visible: false, align: 'right', format: 'currency', decimals: 2, sortable: true },
  { id: 'avgHold', label: 'Avg Hold', field: 'avgHoldBars', visible: false, align: 'right', format: 'number', decimals: 1, sortable: true },
  { id: 'recoveryFactor', label: 'Recovery', field: 'recoveryFactor', visible: false, align: 'right', format: 'number', decimals: 2, sortable: true },
];

const defaultTradesColumns: ColumnConfig[] = [
  { id: 'openTime', label: 'Open Time', field: 'openTime', visible: true, align: 'left', format: 'date', sortable: true },
  { id: 'closeTime', label: 'Close Time', field: 'closeTime', visible: true, align: 'left', format: 'date', sortable: true },
  { id: 'type', label: 'Type', field: 'type', visible: true, align: 'center', format: 'text', sortable: true },
  { id: 'symbol', label: 'Symbol', field: 'symbol', visible: true, align: 'left', format: 'text', sortable: true },
  { id: 'entryPrice', label: 'Entry', field: 'entryPrice', visible: true, align: 'right', format: 'number', decimals: 5, sortable: true },
  { id: 'exitPrice', label: 'Exit', field: 'exitPrice', visible: true, align: 'right', format: 'number', decimals: 5, sortable: true },
  { id: 'lots', label: 'Lots', field: 'lots', visible: true, align: 'right', format: 'number', decimals: 2, sortable: true },
  { id: 'pnl', label: 'P/L', field: 'pnl', visible: true, align: 'right', format: 'currency', decimals: 2, sortable: true },
  { id: 'pips', label: 'Pips', field: 'pips', visible: true, align: 'right', format: 'number', decimals: 1, sortable: true },
  { id: 'duration', label: 'Duration', field: 'duration', visible: false, align: 'right', format: 'text', sortable: true },
  { id: 'mae', label: 'MAE', field: 'mae', visible: false, align: 'right', format: 'number', decimals: 1, sortable: true },
  { id: 'mfe', label: 'MFE', field: 'mfe', visible: false, align: 'right', format: 'number', decimals: 1, sortable: true },
];

const defaultTables: Record<string, TableConfig> = {
  results: { id: 'results', name: 'Backtest Results', columns: defaultResultsColumns },
  trades: { id: 'trades', name: 'Trade List', columns: defaultTradesColumns },
};

export const useColumnConfig = create<ColumnConfigState>()(
  persist(
    (set, get) => ({
      tables: defaultTables,
      
      getTableConfig: (tableId) => get().tables[tableId],
      
      setTableConfig: (tableId, config) => {
        set((state) => ({
          tables: { ...state.tables, [tableId]: config },
        }));
      },
      
      updateColumn: (tableId, columnId, updates) => {
        set((state) => {
          const table = state.tables[tableId];
          if (!table) return state;
          
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...table,
                columns: table.columns.map((col) =>
                  col.id === columnId ? { ...col, ...updates } : col
                ),
              },
            },
          };
        });
      },
      
      toggleColumnVisibility: (tableId, columnId) => {
        set((state) => {
          const table = state.tables[tableId];
          if (!table) return state;
          
          return {
            tables: {
              ...state.tables,
              [tableId]: {
                ...table,
                columns: table.columns.map((col) =>
                  col.id === columnId ? { ...col, visible: !col.visible } : col
                ),
              },
            },
          };
        });
      },
      
      reorderColumns: (tableId, fromIndex, toIndex) => {
        set((state) => {
          const table = state.tables[tableId];
          if (!table) return state;
          
          const columns = [...table.columns];
          const [removed] = columns.splice(fromIndex, 1);
          columns.splice(toIndex, 0, removed);
          
          return {
            tables: {
              ...state.tables,
              [tableId]: { ...table, columns },
            },
          };
        });
      },
      
      resetTableConfig: (tableId) => {
        const defaultConfig = defaultTables[tableId];
        if (defaultConfig) {
          set((state) => ({
            tables: { ...state.tables, [tableId]: { ...defaultConfig } },
          }));
        }
      },
    }),
    {
      name: 'column-config-storage',
    }
  )
);

// Helper to format values based on column config
export function formatColumnValue(value: any, config: ColumnConfig): string {
  if (value === null || value === undefined) return '-';
  
  switch (config.format) {
    case 'currency':
      return `$${Number(value).toFixed(config.decimals ?? 2)}`;
    case 'percent':
      return `${Number(value).toFixed(config.decimals ?? 1)}%`;
    case 'number':
      return Number(value).toFixed(config.decimals ?? 2);
    case 'date':
      return new Date(value).toLocaleDateString();
    default:
      return String(value);
  }
}
