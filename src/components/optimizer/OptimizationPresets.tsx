/**
 * Optimization Presets - P1 Optimizer
 * Quick-start configurations for common optimization scenarios
 */

import { useState } from 'react';
import { 
  Zap, 
  Target, 
  Shield, 
  TrendingUp, 
  Clock, 
  Sparkles,
  ChevronRight,
  Check,
  Plus,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface OptimizationPreset {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  objective: string;
  algorithm: 'grid' | 'genetic' | 'pso' | 'bayesian';
  maxIterations: number;
  populationSize?: number;
  crossoverRate?: number;
  mutationRate?: number;
  convergenceThreshold?: number;
  isBuiltIn?: boolean;
}

const BUILT_IN_PRESETS: OptimizationPreset[] = [
  {
    id: 'quick-scan',
    name: 'Quick Scan',
    description: 'Fast parameter sweep for initial exploration',
    icon: Zap,
    objective: 'sharpe',
    algorithm: 'grid',
    maxIterations: 100,
    isBuiltIn: true,
  },
  {
    id: 'maximize-profit',
    name: 'Maximize Profit',
    description: 'Aggressive search for highest returns',
    icon: TrendingUp,
    objective: 'netProfit',
    algorithm: 'genetic',
    maxIterations: 500,
    populationSize: 50,
    crossoverRate: 0.8,
    mutationRate: 0.1,
    isBuiltIn: true,
  },
  {
    id: 'minimize-risk',
    name: 'Minimize Risk',
    description: 'Focus on drawdown reduction and stability',
    icon: Shield,
    objective: 'minDD',
    algorithm: 'genetic',
    maxIterations: 300,
    populationSize: 30,
    crossoverRate: 0.7,
    mutationRate: 0.15,
    isBuiltIn: true,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Optimize Sharpe ratio for risk-adjusted returns',
    icon: Target,
    objective: 'sharpe',
    algorithm: 'genetic',
    maxIterations: 400,
    populationSize: 40,
    crossoverRate: 0.75,
    mutationRate: 0.12,
    isBuiltIn: true,
  },
  {
    id: 'overnight',
    name: 'Overnight Deep Search',
    description: 'Thorough optimization for best results',
    icon: Clock,
    objective: 'sharpe',
    algorithm: 'genetic',
    maxIterations: 2000,
    populationSize: 100,
    crossoverRate: 0.85,
    mutationRate: 0.08,
    convergenceThreshold: 0.001,
    isBuiltIn: true,
  },
];

interface OptimizationPresetsProps {
  onSelectPreset: (preset: OptimizationPreset) => void;
  selectedPresetId?: string;
  customPresets?: OptimizationPreset[];
  onSavePreset?: (preset: Omit<OptimizationPreset, 'id' | 'isBuiltIn'>) => void;
  className?: string;
}

export function OptimizationPresets({
  onSelectPreset,
  selectedPresetId,
  customPresets = [],
  onSavePreset,
  className,
}: OptimizationPresetsProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  const handleSavePreset = () => {
    if (onSavePreset && newPresetName.trim()) {
      onSavePreset({
        name: newPresetName,
        description: newPresetDescription,
        icon: Sparkles,
        objective: 'sharpe',
        algorithm: 'genetic',
        maxIterations: 300,
        populationSize: 40,
      });
      setNewPresetName('');
      setNewPresetDescription('');
      setSaveDialogOpen(false);
    }
  };

  return (
    <Card className={cn("card-neural", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Optimization Presets
          </CardTitle>
          {onSavePreset && (
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Save Current
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Optimization Preset</DialogTitle>
                  <DialogDescription>
                    Save current settings as a reusable preset
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Preset Name</Label>
                    <Input
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="My Custom Preset"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newPresetDescription}
                      onChange={(e) => setNewPresetDescription(e.target.value)}
                      placeholder="Brief description..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {allPresets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPresetId === preset.id;
            
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg text-left transition-all group",
                  isSelected
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30 border border-transparent hover:bg-muted/50 hover:border-border/50"
                )}
              >
                <div className={cn(
                  "p-2 rounded-md",
                  isSelected ? "bg-primary/20" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-4 w-4",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isSelected && "text-primary"
                    )}>
                      {preset.name}
                    </p>
                    {!preset.isBuiltIn && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {preset.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {preset.algorithm}
                  </Badge>
                  {isSelected ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
