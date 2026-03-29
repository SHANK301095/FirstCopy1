/**
 * Parameter Presets Manager - P0 Backtest Workflow
 * Save/load preset parameter sets
 */

import { useState, useEffect } from 'react';
import { 
  Save, 
  FolderOpen, 
  Trash2, 
  Star, 
  StarOff,
  Plus,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'mmc-backtest-presets';

export interface BacktestPreset {
  id: string;
  name: string;
  createdAt: number;
  isFavorite: boolean;
  settings: {
    symbol?: string;
    timeframe?: string;
    dateRange?: string;
    commissionPercent: number;
    slippageTicks: number;
    spreadPoints: number;
    riskPerTrade: number;
    maxTradesPerDay: number;
    dailyLossCap: number;
    sessionFilter: boolean;
    sessionStart?: string;
    sessionEnd?: string;
  };
}

interface ParameterPresetsProps {
  currentSettings: BacktestPreset['settings'];
  onLoadPreset: (settings: BacktestPreset['settings']) => void;
  className?: string;
}

export function ParameterPresets({ 
  currentSettings, 
  onLoadPreset,
  className 
}: ParameterPresetsProps) {
  const [presets, setPresets] = useState<BacktestPreset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save presets to localStorage
  const saveToStorage = (updated: BacktestPreset[]) => {
    setPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: BacktestPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      createdAt: Date.now(),
      isFavorite: false,
      settings: { ...currentSettings },
    };

    saveToStorage([newPreset, ...presets]);
    setPresetName('');
    setShowSaveDialog(false);
  };

  const handleLoadPreset = (preset: BacktestPreset) => {
    onLoadPreset(preset.settings);
    setLastLoaded(preset.id);
  };

  const handleDeletePreset = (id: string) => {
    saveToStorage(presets.filter(p => p.id !== id));
  };

  const handleToggleFavorite = (id: string) => {
    saveToStorage(presets.map(p => 
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const sortedPresets = [...presets].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Load Preset */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Load Preset</span>
            {presets.length > 0 && (
              <Badge variant="secondary" className="h-4 text-[10px] ml-1">
                {presets.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-popover border-border">
          <DropdownMenuLabel className="text-xs">Saved Presets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortedPresets.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No presets saved yet
            </div>
          ) : (
            sortedPresets.map(preset => (
              <DropdownMenuItem
                key={preset.id}
                className="flex items-center justify-between gap-2 cursor-pointer"
                onSelect={() => handleLoadPreset(preset)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {preset.isFavorite && <Star className="h-3 w-3 text-warning fill-warning" />}
                  <span className="truncate">{preset.name}</span>
                  {lastLoaded === preset.id && (
                    <Check className="h-3 w-3 text-profit" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(preset.id);
                    }}
                    className="p-1 hover:text-warning transition-colors"
                  >
                    {preset.isFavorite ? (
                      <StarOff className="h-3 w-3" />
                    ) : (
                      <Star className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset.id);
                    }}
                    className="p-1 hover:text-loss transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Preset */}
      <Button 
        variant="outline" 
        size="sm" 
        className="h-8 gap-1.5"
        onClick={() => setShowSaveDialog(true)}
      >
        <Save className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Save</span>
      </Button>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Parameter Preset</DialogTitle>
            <DialogDescription>
              Save current settings for quick reuse
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Conservative Forex"
                className="mt-1"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Saves: commission, slippage, spread, risk settings, session filter
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Quick Re-run Button - P0 Backtest Workflow
 */
interface QuickRerunProps {
  lastSettings: BacktestPreset['settings'] | null;
  onRerun: () => void;
  disabled?: boolean;
  className?: string;
}

export function QuickRerunButton({ lastSettings, onRerun, disabled, className }: QuickRerunProps) {
  if (!lastSettings) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      onClick={onRerun}
      disabled={disabled}
    >
      <FolderOpen className="h-3.5 w-3.5" />
      Re-run Last
    </Button>
  );
}
