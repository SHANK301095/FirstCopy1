import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ShortcutOS = 'auto' | 'windows' | 'mac';

interface UIPreferencesState {
  backgroundEffects: boolean;
  particleDensity: number; // 0.3 = low, 0.5 = medium, 1 = high
  layoutDebugMode: boolean; // Layout debug overlay
  shortcutOS: ShortcutOS; // Keyboard shortcut display preference
  setBackgroundEffects: (enabled: boolean) => void;
  setParticleDensity: (density: number) => void;
  setLayoutDebugMode: (enabled: boolean) => void;
  setShortcutOS: (os: ShortcutOS) => void;
}

// Detect if user is on Mac
const detectMac = () => 
  typeof navigator !== 'undefined' && 
  (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent) || 
   /Mac|iPod|iPhone|iPad/.test(navigator.platform));

export const getEffectiveShortcutOS = (preference: ShortcutOS): 'windows' | 'mac' => {
  if (preference === 'auto') {
    return detectMac() ? 'mac' : 'windows';
  }
  return preference;
};

export const useUIPreferencesStore = create<UIPreferencesState>()(
  persist(
    (set) => ({
      backgroundEffects: true,
      particleDensity: 0.5, // default medium
      layoutDebugMode: false,
      shortcutOS: 'auto',
      setBackgroundEffects: (enabled) => set({ backgroundEffects: enabled }),
      setParticleDensity: (density) => set({ particleDensity: density }),
      setLayoutDebugMode: (enabled) => set({ layoutDebugMode: enabled }),
      setShortcutOS: (os) => set({ shortcutOS: os }),
    }),
    {
      name: 'ui-preferences',
    }
  )
);
