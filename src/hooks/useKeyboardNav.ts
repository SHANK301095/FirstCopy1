/**
 * Keyboard Navigation Hook - P1 Navigation
 * Arrow key navigation for sidebar
 */

import { useCallback, useEffect, useState } from 'react';

interface UseKeyboardNavOptions {
  items: { path: string; label: string }[];
  enabled?: boolean;
  onSelect?: (path: string) => void;
  containerRef?: React.RefObject<HTMLElement>;
}

export function useKeyboardNav({ 
  items, 
  enabled = true, 
  onSelect,
  containerRef 
}: UseKeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || items.length === 0) return;

    // Only handle if container has focus
    if (containerRef?.current && !containerRef.current.contains(document.activeElement)) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsNavigating(true);
        setFocusedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsNavigating(true);
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          e.preventDefault();
          onSelect?.(items[focusedIndex].path);
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        setIsNavigating(false);
        break;
    }
  }, [enabled, items, focusedIndex, onSelect, containerRef]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetFocus = useCallback(() => {
    setFocusedIndex(-1);
    setIsNavigating(false);
  }, []);

  return {
    focusedIndex,
    isNavigating,
    setFocusedIndex,
    resetFocus,
  };
}
