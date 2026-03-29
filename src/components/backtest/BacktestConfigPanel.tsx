/**
 * Backtest Configuration Panel
 * Phase 1: Multi-timeframe, sessions, commission, slippage profiles
 */

import { useState } from 'react';
import { 
  Settings, Clock, DollarSign, TrendingDown, Calendar,
  ChevronDown, ChevronUp, Save, RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  COMMISSION_TEMPLATES,
  SESSION_PRESETS,
  SLIPPAGE_PROFILES,
} from '@/lib/backtestConfig';

interface BacktestConfigPanelProps {
  onConfigChange?: (config: BacktestConfigState) => void;
  className?: string;
}

export interface BacktestConfigState {
  commissionTemplate: string;
  sessionPreset: string;
  slippageProfile: string;
  customCommission: number;
  customSlippageTicks: number;
  customSpread: number;
  multiTimeframe: boolean;
  timeframes: string[];
  warmupPeriod: number;
  maxConcurrentTrades: number;
  marginCallLevel: number;
}

const DEFAULT_CONFIG: BacktestConfigState = {
  commissionTemplate: 'forex_standard',
  sessionPreset: 'all_day',
  slippageProfile: 'normal',
  customCommission: 0.01,
  customSlippageTicks: 1,
  customSpread: 0.5,
  multiTimeframe: false,
  timeframes: ['H1'],
  warmupPeriod: 100,
  maxConcurrentTrades: 5,
  marginCallLevel: 50,
};

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H2', 'H4', 'D1', 'W1'];

export function BacktestConfigPanel({ onConfigChange, className }: BacktestConfigPanelProps) {
  const [config, setConfig] = useState<BacktestConfigState>(DEFAULT_CONFIG);
  const [isExpanded, setIsExpanded] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const updateConfig = <K extends keyof BacktestConfigState>(key: K, value: BacktestConfigState[K]) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    onConfigChange?.(DEFAULT_CONFIG);
  };

  const selectedCommission = COMMISSION_TEMPLATES.find(t => t.id === config.commissionTemplate);
  const selectedSessionPreset = SESSION_PRESETS.find(s => s.id === config.sessionPreset);
  const selectedSlippage = SLIPPAGE_PROFILES.find(p => p.id === config.slippageProfile);

  return (
    <Card className={className}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Backtest Configuration
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {selectedCommission?.name || 'Custom'}
                </Badge>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Commission Settings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Commission Template
                </Label>
                <Select 
                  value={config.commissionTemplate} 
                  onValueChange={(v) => updateConfig('commissionTemplate', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMISSION_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCommission && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCommission.type === 'percent' 
                      ? `${selectedCommission.value}% per trade`
                      : `$${selectedCommission.value} per ${selectedCommission.type}`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Slippage Profile
                </Label>
                <Select 
                  value={config.slippageProfile} 
                  onValueChange={(v) => updateConfig('slippageProfile', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLIPPAGE_PROFILES.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSlippage && (
                  <p className="text-xs text-muted-foreground">
                    {selectedSlippage.baseTicks} ticks base, {selectedSlippage.volatilityMultiplier}x volatility
                  </p>
                )}
              </div>
            </div>

            {/* Session Settings */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Trading Session
              </Label>
              <Select 
                value={config.sessionPreset} 
                onValueChange={(v) => updateConfig('sessionPreset', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_PRESETS.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.timezone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSessionPreset && selectedSessionPreset.sessions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSessionPreset.sessions.map((sess, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {String(sess.startHour).padStart(2, '0')}:00 - {String(sess.endHour).padStart(2, '0')}:00
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Timeframe Settings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Multi-Timeframe Analysis
                </Label>
                <Switch 
                  checked={config.multiTimeframe}
                  onCheckedChange={(v) => updateConfig('multiTimeframe', v)}
                />
              </div>
              {config.multiTimeframe && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {TIMEFRAMES.map(tf => (
                    <Badge 
                      key={tf}
                      variant={config.timeframes.includes(tf) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const newTfs = config.timeframes.includes(tf)
                          ? config.timeframes.filter(t => t !== tf)
                          : [...config.timeframes, tf];
                        updateConfig('timeframes', newTfs);
                      }}
                    >
                      {tf}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  Advanced Settings
                  {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Warmup Period (bars)</Label>
                    <Input 
                      type="number"
                      value={config.warmupPeriod}
                      onChange={(e) => updateConfig('warmupPeriod', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Concurrent Trades</Label>
                    <Input 
                      type="number"
                      value={config.maxConcurrentTrades}
                      onChange={(e) => updateConfig('maxConcurrentTrades', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Margin Call Level (%)</Label>
                    <Input 
                      type="number"
                      value={config.marginCallLevel}
                      onChange={(e) => updateConfig('marginCallLevel', parseInt(e.target.value) || 50)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Spread (pips)</Label>
                  <Slider
                    value={[config.customSpread]}
                    onValueChange={([v]) => updateConfig('customSpread', v)}
                    min={0}
                    max={10}
                    step={0.1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 pips</span>
                    <span className="font-mono">{config.customSpread.toFixed(1)} pips</span>
                    <span>10 pips</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save Preset
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}