/**
 * Favorite Pages Hook - P1 Navigation
 * Pin favorite pages to sidebar
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritePagesStore {
  favorites: string[];
  addFavorite: (path: string) => void;
  removeFavorite: (path: string) => void;
  toggleFavorite: (path: string) => void;
  isFavorite: (path: string) => boolean;
  reorderFavorites: (favorites: string[]) => void;
  clearFavorites: () => void;
}

export const useFavoritePages = create<FavoritePagesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      addFavorite: (path: string) => {
        set((state) => ({
          favorites: state.favorites.includes(path) 
            ? state.favorites 
            : [...state.favorites, path]
        }));
      },
      
      removeFavorite: (path: string) => {
        set((state) => ({
          favorites: state.favorites.filter(f => f !== path)
        }));
      },
      
      toggleFavorite: (path: string) => {
        const { favorites } = get();
        if (favorites.includes(path)) {
          get().removeFavorite(path);
        } else {
          get().addFavorite(path);
        }
      },
      
      isFavorite: (path: string) => {
        return get().favorites.includes(path);
      },
      
      reorderFavorites: (favorites: string[]) => {
        set({ favorites });
      },
      
      clearFavorites: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: 'mmc-favorite-pages',
    }
  )
);
