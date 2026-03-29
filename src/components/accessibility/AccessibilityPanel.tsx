/**
 * Accessibility Settings Panel
 * Phase 6: A11y features - reduced motion, high contrast, focus indicators
 */

import { useState, useEffect } from 'react';
import { 
  Accessibility, Eye, Volume2, VolumeX, Keyboard, 
  Sun, Moon, Zap, ZapOff, Monitor, Type
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  textScale: number;
  focusIndicators: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  textScale: 100,
  focusIndicators: true,
  screenReaderOptimized: false,
  keyboardNavigation: true,
  soundEnabled: true,
};

interface AccessibilityPanelProps {
  className?: string;
}

export function AccessibilityPanel({ className }: AccessibilityPanelProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {
        // Use defaults
      }
    }

    // Check system preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setSettings(s => ({ ...s, reducedMotion: true }));
    }
  }, []);

  // Apply settings to document
  useEffect(() => {
    const html = document.documentElement;
    
    // Reduced motion
    if (settings.reducedMotion) {
      html.style.setProperty('--theme-transition', '0s');
      html.classList.add('reduce-motion');
    } else {
      html.style.setProperty('--theme-transition', '0.2s');
      html.classList.remove('reduce-motion');
    }

    // High contrast
    if (settings.highContrast) {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }

    // Text scale
    html.style.fontSize = `${settings.textScale}%`;

    // Focus indicators
    if (settings.focusIndicators) {
      html.classList.add('focus-visible-enabled');
    } else {
      html.classList.remove('focus-visible-enabled');
    }

    // Save to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K, 
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    toast({ title: 'Settings Reset', description: 'Accessibility settings restored to defaults' });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5 text-primary" />
          Accessibility
        </CardTitle>
        <CardDescription>
          Customize the interface for your needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Motion & Animations */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Motion & Animations
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reduce Motion</Label>
              <p className="text-xs text-muted-foreground">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(v) => updateSetting('reducedMotion', v)}
            />
          </div>
        </div>

        <Separator />

        {/* Visual */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visual
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>High Contrast</Label>
              <p className="text-xs text-muted-foreground">
                Increase color contrast for better visibility
              </p>
            </div>
            <Switch
              checked={settings.highContrast}
              onCheckedChange={(v) => updateSetting('highContrast', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Large Text</Label>
              <p className="text-xs text-muted-foreground">
                Increase text size throughout the app
              </p>
            </div>
            <Switch
              checked={settings.largeText}
              onCheckedChange={(v) => {
                updateSetting('largeText', v);
                updateSetting('textScale', v ? 125 : 100);
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Text Scale</Label>
              <span className="text-sm font-mono">{settings.textScale}%</span>
            </div>
            <Slider
              value={[settings.textScale]}
              onValueChange={([v]) => updateSetting('textScale', v)}
              min={75}
              max={150}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Small</span>
              <span>Normal</span>
              <span>Large</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Focus Indicators</Label>
              <p className="text-xs text-muted-foreground">
                Show visible focus outlines on interactive elements
              </p>
            </div>
            <Switch
              checked={settings.focusIndicators}
              onCheckedChange={(v) => updateSetting('focusIndicators', v)}
            />
          </div>
        </div>

        <Separator />

        {/* Navigation */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Navigation
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Keyboard Navigation</Label>
              <p className="text-xs text-muted-foreground">
                Enable full keyboard navigation support
              </p>
            </div>
            <Switch
              checked={settings.keyboardNavigation}
              onCheckedChange={(v) => updateSetting('keyboardNavigation', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Screen Reader Optimized</Label>
              <p className="text-xs text-muted-foreground">
                Enhanced ARIA labels and announcements
              </p>
            </div>
            <Switch
              checked={settings.screenReaderOptimized}
              onCheckedChange={(v) => updateSetting('screenReaderOptimized', v)}
            />
          </div>
        </div>

        <Separator />

        {/* Audio */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Audio
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Effects</Label>
              <p className="text-xs text-muted-foreground">
                Play sounds for notifications and actions
              </p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(v) => updateSetting('soundEnabled', v)}
            />
          </div>
        </div>

        <Separator />

        {/* Keyboard Shortcuts Info */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Keyboard Shortcuts</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>Command Palette</span>
              <Badge variant="outline">⌘ K</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>Toggle Theme</span>
              <Badge variant="outline">⌘ J</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>Search</span>
              <Badge variant="outline">⌘ /</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>Navigate</span>
              <Badge variant="outline">↑ ↓</Badge>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={resetToDefaults} className="w-full">
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
