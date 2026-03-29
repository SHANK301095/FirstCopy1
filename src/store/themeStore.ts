/**
 * Enhanced Theme Store with All Requested Themes
 * Themes: Default, True Black OLED, Cyberpunk, Financial Terminal, Zen Mode
 * Features: Color-blind palettes, custom fonts, glassmorphism control
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeVariant = 
  | 'default' 
  | 'oled-black' 
  | 'cyberpunk' 
  | 'terminal' 
  | 'zen';

export type ColorBlindMode = 
  | 'none' 
  | 'protanopia' 
  | 'deuteranopia' 
  | 'tritanopia';

export type FontFamily = 
  | 'inter' 
  | 'roboto-mono' 
  | 'fira-code' 
  | 'jetbrains-mono';

export interface ThemeState {
  // Core theme
  theme: ThemeVariant;
  isDark: boolean;
  
  // Accessibility
  colorBlindMode: ColorBlindMode;
  highContrast: boolean;
  reducedMotion: boolean;
  
  // Typography
  fontFamily: FontFamily;
  fontSize: number; // 12-20
  
  // Visual Effects
  glassmorphism: boolean;
  glassmorphismIntensity: number; // 0-100
  
  // Zen Mode
  zenMode: boolean;
  
  // Time-based theming
  autoTimeTheme: boolean;
  
  // Accent colors
  customAccentColor: string | null;
  
  // Actions
  setTheme: (theme: ThemeVariant) => void;
  setColorBlindMode: (mode: ColorBlindMode) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: number) => void;
  setGlassmorphism: (enabled: boolean) => void;
  setGlassmorphismIntensity: (intensity: number) => void;
  setZenMode: (enabled: boolean) => void;
  setAutoTimeTheme: (enabled: boolean) => void;
  setCustomAccentColor: (color: string | null) => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const defaultState = {
  theme: 'default' as ThemeVariant,
  isDark: true,
  colorBlindMode: 'none' as ColorBlindMode,
  highContrast: false,
  reducedMotion: false,
  fontFamily: 'inter' as FontFamily,
  fontSize: 16,
  glassmorphism: false,
  glassmorphismIntensity: 50,
  zenMode: false,
  autoTimeTheme: false,
  customAccentColor: null,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...defaultState,
      
      setTheme: (theme) => set({ theme }),
      setColorBlindMode: (colorBlindMode) => set({ colorBlindMode }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize: Math.max(12, Math.min(20, fontSize)) }),
      setGlassmorphism: (glassmorphism) => set({ glassmorphism }),
      setGlassmorphismIntensity: (glassmorphismIntensity) => set({ glassmorphismIntensity }),
      setZenMode: (zenMode) => set({ zenMode }),
      setAutoTimeTheme: (autoTimeTheme) => set({ autoTimeTheme }),
      setCustomAccentColor: (customAccentColor) => set({ customAccentColor }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      resetToDefaults: () => set(defaultState),
    }),
    {
      name: 'mmc-theme',
    }
  )
);

// ============= Theme CSS Variable Generators =============

export function getThemeCSSVariables(theme: ThemeVariant): Record<string, string> {
  switch (theme) {
    case 'oled-black':
      return {
        '--background': '0 0% 0%',
        '--foreground': '0 0% 95%',
        '--card': '0 0% 3%',
        '--card-foreground': '0 0% 95%',
        '--popover': '0 0% 5%',
        '--popover-foreground': '0 0% 95%',
        '--muted': '0 0% 8%',
        '--muted-foreground': '0 0% 60%',
        '--border': '0 0% 12%',
        '--input': '0 0% 8%',
      };
      
    case 'cyberpunk':
      return {
        '--background': '270 50% 3%',
        '--foreground': '180 100% 90%',
        '--card': '270 45% 6%',
        '--card-foreground': '180 100% 90%',
        '--primary': '320 100% 60%',
        '--primary-foreground': '0 0% 0%',
        '--accent': '180 100% 50%',
        '--accent-foreground': '0 0% 0%',
        '--profit': '120 100% 50%',
        '--loss': '0 100% 60%',
        '--border': '270 40% 15%',
      };
      
    case 'terminal':
      return {
        '--background': '220 20% 3%',
        '--foreground': '120 100% 70%',
        '--card': '220 18% 5%',
        '--card-foreground': '120 100% 70%',
        '--primary': '35 100% 50%',
        '--primary-foreground': '0 0% 0%',
        '--muted': '220 15% 10%',
        '--muted-foreground': '120 60% 50%',
        '--profit': '120 100% 50%',
        '--loss': '0 100% 50%',
        '--border': '220 15% 12%',
      };
      
    case 'zen':
      return {
        '--background': '40 20% 7%',
        '--foreground': '40 15% 85%',
        '--card': '40 18% 9%',
        '--card-foreground': '40 15% 85%',
        '--primary': '40 30% 50%',
        '--primary-foreground': '0 0% 0%',
        '--muted': '40 15% 12%',
        '--muted-foreground': '40 15% 55%',
        '--border': '40 12% 15%',
      };
      
    default:
      return {}; // Use default CSS variables
  }
}

export function getColorBlindCSSVariables(mode: ColorBlindMode): Record<string, string> {
  switch (mode) {
    case 'protanopia':
      return {
        '--profit': '210 80% 55%',  // Blue instead of green
        '--loss': '45 90% 55%',      // Yellow instead of red
      };
    case 'deuteranopia':
      return {
        '--profit': '200 80% 50%',   // Cyan-blue
        '--loss': '30 95% 55%',       // Orange
      };
    case 'tritanopia':
      return {
        '--profit': '160 70% 45%',   // Teal
        '--loss': '340 80% 55%',      // Pink-red
      };
    default:
      return {};
  }
}

export function getFontFamilyCSS(font: FontFamily): string {
  switch (font) {
    case 'roboto-mono':
      return '"Roboto Mono", monospace';
    case 'fira-code':
      return '"Fira Code", monospace';
    case 'jetbrains-mono':
      return '"JetBrains Mono", monospace';
    default:
      return '"Inter", system-ui, sans-serif';
  }
}

// Apply theme to document
export function applyThemeToDocument(state: ThemeState): void {
  const root = document.documentElement;
  
  // Apply theme CSS variables
  const themeVars = getThemeCSSVariables(state.theme);
  for (const [key, value] of Object.entries(themeVars)) {
    root.style.setProperty(key, value);
  }
  
  // Apply color-blind mode
  const colorBlindVars = getColorBlindCSSVariables(state.colorBlindMode);
  for (const [key, value] of Object.entries(colorBlindVars)) {
    root.style.setProperty(key, value);
  }
  
  // Apply font family
  root.style.setProperty('--font-family', getFontFamilyCSS(state.fontFamily));
  root.style.fontFamily = getFontFamilyCSS(state.fontFamily);
  
  // Apply font size
  root.style.fontSize = `${state.fontSize}px`;
  
  // Apply glassmorphism
  if (state.glassmorphism) {
    root.style.setProperty('--glass-blur', `${state.glassmorphismIntensity / 5}px`);
  } else {
    root.style.setProperty('--glass-blur', '0px');
  }
  
  // Apply reduced motion
  if (state.reducedMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }
  
  // Apply high contrast
  if (state.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }
  
  // Apply zen mode
  if (state.zenMode) {
    root.classList.add('zen-mode');
  } else {
    root.classList.remove('zen-mode');
  }
  
  // Apply custom accent color
  if (state.customAccentColor) {
    root.style.setProperty('--primary', state.customAccentColor);
    root.style.setProperty('--ring', state.customAccentColor);
  }
  
  // Theme class for conditional styling
  root.setAttribute('data-theme', state.theme);
}
