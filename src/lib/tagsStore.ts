/**
 * Tags & Smart Filters Store - Quick Wins
 * Tag-based organization for strategies and results
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface TagAssignment {
  tagId: string;
  entityType: 'ea' | 'result' | 'project' | 'batch';
  entityId: string;
}

export interface SmartFilter {
  id: string;
  name: string;
  description?: string;
  conditions: FilterCondition[];
  operator: 'and' | 'or';
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: string | number | boolean;
}

interface TagsState {
  tags: Tag[];
  assignments: TagAssignment[];
  smartFilters: SmartFilter[];
  
  // Tag Actions
  addTag: (tag: Omit<Tag, 'id'>) => string;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  
  // Assignment Actions
  assignTag: (tagId: string, entityType: TagAssignment['entityType'], entityId: string) => void;
  unassignTag: (tagId: string, entityId: string) => void;
  getEntityTags: (entityId: string) => Tag[];
  getEntitiesByTag: (tagId: string) => string[];
  
  // Smart Filter Actions
  addSmartFilter: (filter: Omit<SmartFilter, 'id'>) => string;
  updateSmartFilter: (id: string, updates: Partial<SmartFilter>) => void;
  deleteSmartFilter: (id: string) => void;
  applyFilter: <T extends Record<string, any>>(items: T[], filterId: string) => T[];
}

const defaultTags: Tag[] = [
  { id: 'profitable', name: 'Profitable', color: '#22c55e', description: 'Strategies with positive returns' },
  { id: 'risky', name: 'High Risk', color: '#ef4444', description: 'Strategies with high drawdown' },
  { id: 'scalping', name: 'Scalping', color: '#3b82f6', description: 'Short-term trading strategies' },
  { id: 'swing', name: 'Swing', color: '#8b5cf6', description: 'Medium-term strategies' },
  { id: 'trending', name: 'Trend Following', color: '#f59e0b', description: 'Trend-based strategies' },
  { id: 'mean-revert', name: 'Mean Reversion', color: '#06b6d4', description: 'Mean reversion strategies' },
  { id: 'favorite', name: 'Favorite', color: '#ec4899', description: 'Personal favorites' },
  { id: 'review', name: 'Needs Review', color: '#f97316', description: 'Strategies requiring further analysis' },
];

const defaultSmartFilters: SmartFilter[] = [
  {
    id: 'high-performers',
    name: 'High Performers',
    description: 'Strategies with Sharpe > 1.5 and Win Rate > 55%',
    operator: 'and',
    conditions: [
      { field: 'sharpeRatio', operator: 'gt', value: 1.5 },
      { field: 'winRate', operator: 'gt', value: 55 },
    ],
  },
  {
    id: 'low-risk',
    name: 'Low Risk',
    description: 'Maximum drawdown under 10%',
    operator: 'and',
    conditions: [
      { field: 'maxDrawdownPct', operator: 'lt', value: 10 },
    ],
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Profit factor > 1.5 and > 100 trades',
    operator: 'and',
    conditions: [
      { field: 'profitFactor', operator: 'gt', value: 1.5 },
      { field: 'totalTrades', operator: 'gt', value: 100 },
    ],
  },
];

export const useTagsStore = create<TagsState>()(
  persist(
    (set, get) => ({
      tags: defaultTags,
      assignments: [],
      smartFilters: defaultSmartFilters,
      
      // Tag Actions
      addTag: (tag) => {
        const id = crypto.randomUUID();
        set((state) => ({
          tags: [...state.tags, { ...tag, id }],
        }));
        return id;
      },
      
      updateTag: (id, updates) => {
        set((state) => ({
          tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },
      
      deleteTag: (id) => {
        set((state) => ({
          tags: state.tags.filter((t) => t.id !== id),
          assignments: state.assignments.filter((a) => a.tagId !== id),
        }));
      },
      
      // Assignment Actions
      assignTag: (tagId, entityType, entityId) => {
        const exists = get().assignments.some(
          (a) => a.tagId === tagId && a.entityId === entityId
        );
        if (exists) return;
        
        set((state) => ({
          assignments: [...state.assignments, { tagId, entityType, entityId }],
        }));
      },
      
      unassignTag: (tagId, entityId) => {
        set((state) => ({
          assignments: state.assignments.filter(
            (a) => !(a.tagId === tagId && a.entityId === entityId)
          ),
        }));
      },
      
      getEntityTags: (entityId) => {
        const { tags, assignments } = get();
        const entityTagIds = assignments
          .filter((a) => a.entityId === entityId)
          .map((a) => a.tagId);
        return tags.filter((t) => entityTagIds.includes(t.id));
      },
      
      getEntitiesByTag: (tagId) => {
        return get()
          .assignments.filter((a) => a.tagId === tagId)
          .map((a) => a.entityId);
      },
      
      // Smart Filter Actions
      addSmartFilter: (filter) => {
        const id = crypto.randomUUID();
        set((state) => ({
          smartFilters: [...state.smartFilters, { ...filter, id }],
        }));
        return id;
      },
      
      updateSmartFilter: (id, updates) => {
        set((state) => ({
          smartFilters: state.smartFilters.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }));
      },
      
      deleteSmartFilter: (id) => {
        // Prevent deleting built-in filters
        if (defaultSmartFilters.some((f) => f.id === id)) return;
        
        set((state) => ({
          smartFilters: state.smartFilters.filter((f) => f.id !== id),
        }));
      },
      
      applyFilter: <T extends Record<string, any>>(items: T[], filterId: string): T[] => {
        const filter = get().smartFilters.find((f) => f.id === filterId);
        if (!filter) return items;
        
        return items.filter((item) => {
          const results = filter.conditions.map((cond) => {
            const value = item[cond.field];
            if (value === undefined) return false;
            
            switch (cond.operator) {
              case 'eq': return value === cond.value;
              case 'neq': return value !== cond.value;
              case 'gt': return value > cond.value;
              case 'gte': return value >= cond.value;
              case 'lt': return value < cond.value;
              case 'lte': return value <= cond.value;
              case 'contains': return String(value).includes(String(cond.value));
              case 'startsWith': return String(value).startsWith(String(cond.value));
              case 'endsWith': return String(value).endsWith(String(cond.value));
              default: return false;
            }
          });
          
          return filter.operator === 'and'
            ? results.every(Boolean)
            : results.some(Boolean);
        });
      },
    }),
    {
      name: 'tags-storage',
    }
  )
);
