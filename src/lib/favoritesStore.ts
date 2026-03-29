/**
 * Favorites & Bookmarks System
 * Phase 10 Quick Win: Star runs/strategies with persistent filter views
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Favorite {
  id: string;
  type: 'run' | 'strategy' | 'dataset' | 'portfolio' | 'report';
  name: string;
  addedAt: number;
  notes?: string;
  tags?: string[];
}

export interface SavedFilter {
  id: string;
  name: string;
  type: 'run' | 'strategy' | 'dataset' | 'all';
  criteria: {
    tags?: string[];
    minWinRate?: number;
    maxDrawdown?: number;
    minSharpe?: number;
    dateRange?: { start: string; end: string };
    favoritesOnly?: boolean;
  };
  createdAt: number;
}

interface FavoritesState {
  favorites: Favorite[];
  savedFilters: SavedFilter[];
  
  // Actions
  addFavorite: (item: Omit<Favorite, 'id' | 'addedAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string, type: Favorite['type'], name: string) => void;
  updateFavoriteNotes: (id: string, notes: string) => void;
  addTagToFavorite: (id: string, tag: string) => void;
  removeTagFromFavorite: (id: string, tag: string) => void;
  
  // Filter actions
  saveFilter: (filter: Omit<SavedFilter, 'id' | 'createdAt'>) => void;
  deleteFilter: (id: string) => void;
  updateFilter: (id: string, updates: Partial<SavedFilter>) => void;
  
  // Getters
  getFavoritesByType: (type: Favorite['type']) => Favorite[];
  getRecentFavorites: (limit?: number) => Favorite[];
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      savedFilters: [],
      
      addFavorite: (item) => {
        const newFavorite: Favorite = {
          id: crypto.randomUUID(),
          type: item.type,
          name: item.name,
          addedAt: Date.now(),
          notes: item.notes,
          tags: item.tags,
        };
        set(state => ({
          favorites: [...state.favorites, newFavorite]
        }));
      },
      
      removeFavorite: (id) => {
        set(state => ({
          favorites: state.favorites.filter(f => f.id !== id)
        }));
      },
      
      isFavorite: (id) => {
        return get().favorites.some(f => f.id === id);
      },
      
      toggleFavorite: (id, type, name) => {
        const state = get();
        if (state.isFavorite(id)) {
          state.removeFavorite(id);
        } else {
          // Store with the provided id as well
          const newFavorite: Favorite = {
            id,
            type,
            name,
            addedAt: Date.now(),
          };
          set(s => ({
            favorites: [...s.favorites, newFavorite]
          }));
        }
      },
      
      updateFavoriteNotes: (id, notes) => {
        set(state => ({
          favorites: state.favorites.map(f => 
            f.id === id ? { ...f, notes } : f
          )
        }));
      },
      
      addTagToFavorite: (id, tag) => {
        set(state => ({
          favorites: state.favorites.map(f => 
            f.id === id 
              ? { ...f, tags: [...(f.tags || []), tag].filter((t, i, a) => a.indexOf(t) === i) }
              : f
          )
        }));
      },
      
      removeTagFromFavorite: (id, tag) => {
        set(state => ({
          favorites: state.favorites.map(f => 
            f.id === id 
              ? { ...f, tags: (f.tags || []).filter(t => t !== tag) }
              : f
          )
        }));
      },
      
      saveFilter: (filter) => {
        const newFilter: SavedFilter = {
          ...filter,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };
        set(state => ({
          savedFilters: [...state.savedFilters, newFilter]
        }));
      },
      
      deleteFilter: (id) => {
        set(state => ({
          savedFilters: state.savedFilters.filter(f => f.id !== id)
        }));
      },
      
      updateFilter: (id, updates) => {
        set(state => ({
          savedFilters: state.savedFilters.map(f => 
            f.id === id ? { ...f, ...updates } : f
          )
        }));
      },
      
      getFavoritesByType: (type) => {
        return get().favorites.filter(f => f.type === type);
      },
      
      getRecentFavorites: (limit = 10) => {
        return get().favorites
          .sort((a, b) => b.addedAt - a.addedAt)
          .slice(0, limit);
      },
    }),
    {
      name: 'backtest-favorites-storage',
    }
  )
);

// Hook for easy favorite toggling in components
export function useFavorite(id: string, type: Favorite['type'], name: string) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  
  return {
    isFavorited: isFavorite(id),
    toggle: () => toggleFavorite(id, type, name),
  };
}
