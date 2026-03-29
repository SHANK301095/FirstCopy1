/**
 * Undo/Redo Store - Quick Wins
 * Global undo/redo functionality for state changes
 */

import { create } from 'zustand';

interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  undo: () => void;
  redo: () => void;
}

interface UndoRedoState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxHistory: number;
  
  // Actions
  pushAction: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useUndoRedo = create<UndoRedoState>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,
  
  pushAction: (entry) => {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    set((state) => ({
      past: [
        ...state.past.slice(-(state.maxHistory - 1)),
        { ...entry, id, timestamp },
      ],
      future: [], // Clear future on new action
    }));
  },
  
  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    
    const lastAction = past[past.length - 1];
    lastAction.undo();
    
    set({
      past: past.slice(0, -1),
      future: [lastAction, ...future],
    });
  },
  
  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    
    const nextAction = future[0];
    nextAction.redo();
    
    set({
      past: [...past, nextAction],
      future: future.slice(1),
    });
  },
  
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  
  clear: () => set({ past: [], future: [] }),
}));

// Helper hook for common undo/redo patterns
export function useUndoableAction<T>(
  getCurrentValue: () => T,
  setValue: (value: T) => void,
  description: string
) {
  const { pushAction } = useUndoRedo();
  
  return (newValue: T) => {
    const previousValue = getCurrentValue();
    
    pushAction({
      description,
      undo: () => setValue(previousValue),
      redo: () => setValue(newValue),
    });
    
    setValue(newValue);
  };
}
