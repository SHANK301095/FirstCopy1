/**
 * Page History Hook - P1 Navigation
 * Full page visit history with timestamps
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PageVisit {
  path: string;
  title: string;
  timestamp: number;
}

interface PageHistoryStore {
  history: PageVisit[];
  maxHistory: number;
  addVisit: (path: string, title: string) => void;
  clearHistory: () => void;
  getRecentUnique: (count: number) => PageVisit[];
}

export const usePageHistory = create<PageHistoryStore>()(
  persist(
    (set, get) => ({
      history: [],
      maxHistory: 50,
      
      addVisit: (path: string, title: string) => {
        set((state) => {
          const newVisit: PageVisit = {
            path,
            title,
            timestamp: Date.now(),
          };
          
          const updatedHistory = [newVisit, ...state.history].slice(0, state.maxHistory);
          return { history: updatedHistory };
        });
      },
      
      clearHistory: () => {
        set({ history: [] });
      },
      
      getRecentUnique: (count: number) => {
        const { history } = get();
        const seen = new Set<string>();
        const unique: PageVisit[] = [];
        
        for (const visit of history) {
          if (!seen.has(visit.path)) {
            seen.add(visit.path);
            unique.push(visit);
            if (unique.length >= count) break;
          }
        }
        
        return unique;
      },
    }),
    {
      name: 'mmc-page-history',
    }
  )
);
