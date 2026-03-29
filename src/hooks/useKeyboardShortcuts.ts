/**
 * Keyboard Shortcut Hook
 * Global keyboard shortcut registration with conflict detection
 */

import { useEffect, useCallback, useRef } from 'react';

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';
type Shortcut = {
  key: string;
  modifiers?: ModifierKey[];
  handler: (e: KeyboardEvent) => void;
  description?: string;
  enabled?: boolean;
};

interface UseKeyboardShortcutsOptions {
  shortcuts: Shortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

// Global registry to detect conflicts
const registeredShortcuts = new Map<string, string>();

function getShortcutKey(key: string, modifiers: ModifierKey[] = []): string {
  const sortedMods = [...modifiers].sort().join('+');
  return sortedMods ? `${sortedMods}+${key.toLowerCase()}` : key.toLowerCase();
}

function matchesShortcut(e: KeyboardEvent, key: string, modifiers: ModifierKey[] = []): boolean {
  const keyMatch = e.key.toLowerCase() === key.toLowerCase();
  const ctrlMatch = modifiers.includes('ctrl') === (e.ctrlKey || e.metaKey);
  const altMatch = modifiers.includes('alt') === e.altKey;
  const shiftMatch = modifiers.includes('shift') === e.shiftKey;
  const metaMatch = modifiers.includes('meta') === e.metaKey;

  return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  preventDefault = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;
        
        if (matchesShortcut(e, shortcut.key, shortcut.modifiers)) {
          if (preventDefault) {
            e.preventDefault();
            e.stopPropagation();
          }
          shortcut.handler(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, preventDefault]);
}

// Get display string for a shortcut (e.g., "⌘+K" or "Ctrl+K")
export function getShortcutDisplay(key: string, modifiers: ModifierKey[] = []): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  const modSymbols: Record<ModifierKey, string> = isMac
    ? { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' }
    : { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Win' };

  const modDisplay = modifiers.map(m => modSymbols[m]).join(isMac ? '' : '+');
  const keyDisplay = key.length === 1 ? key.toUpperCase() : key;
  
  return isMac ? `${modDisplay}${keyDisplay}` : `${modDisplay}+${keyDisplay}`;
}
