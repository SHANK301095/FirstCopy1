/**
 * Presets Manager Component
 * Manage cost models, session settings, and risk model presets
 */

import { useState, useEffect } from 'react';
import {
  Settings2, Plus, Trash2, Check, Edit2, Save,
  DollarSign, Clock, Shield, ChevronDown, Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getPresets,
  savePresets,
  addCostModelPreset,
  updateCostModelPreset,
  deleteCostModelPreset,
  addSessionPreset,
  updateSessionPreset,
  deleteSessionPreset,
  addRiskModelPreset,
  updateRiskModelPreset,
  deleteRiskModelPreset,
  setActiveCostModel,
  setActiveSession,
  setActiveRiskModel,
  type CostModelPreset,
  type SessionPreset,
  type RiskModelPreset,
  type PresetsStore,
} from '@/lib/presetsStore';

const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 
  'Asia/Tokyo', 'Asia/Singapore', 'Europe/Frankfurt', 'Australia/Sydney'
];

const RISK_MODES: { value: RiskModelPreset['mode']; label: string }[] = [
  { value: 'fixed', label: 'Fixed Size' },
  { value: 'risk-percent', label: 'Risk % Per Trade' },
  { value: 'kelly', label: 'Kelly Criterion' },
  { value: 'fixed-fractional', label: 'Fixed Fractional' },
];

export function PresetsManager() {
  const [presets, setPresets] = useState<PresetsStore>(getPresets());
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: 'cost' | 'session' | 'risk';
    preset: CostModelPreset | SessionPreset | RiskModelPreset | null;
  }>({ open: false, type: 'cost', preset: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'cost' | 'session' | 'risk';
    id: string;
  }>({ open: false, type: 'cost', id: '' });

  // Form states
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const refreshPresets = () => {
    setPresets(getPresets());
  };

  const openAddDialog = (type: 'cost' | 'session' | 'risk') => {
    const defaultData: Record<string, unknown> = type === 'cost' 
      ? { name: '', commission: 0, slippage: 0, spread: 0, description: '' }
      : type === 'session'
      ? { name: '', timezone: 'Asia/Kolkata', sessionStart: '09:00', sessionEnd: '17:00', excludeWeekends: true, description: '' }
      : { name: '', mode: 'fixed', value: 1, maxDrawdownStop: undefined, dailyLossCap: undefined, maxTradesPerDay: undefined, description: '' };
    
    setFormData(defaultData);
    setEditDialog({ open: true, type, preset: null });
  };

  const openEditDialog = (type: 'cost' | 'session' | 'risk', preset: CostModelPreset | SessionPreset | RiskModelPreset) => {
    setFormData({ ...preset });
    setEditDialog({ open: true, type, preset });
  };

  const handleSave = () => {
    const { type, preset } = editDialog;
    
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    try {
      if (type === 'cost') {
        if (preset) {
          updateCostModelPreset(preset.id, formData as Partial<CostModelPreset>);
          toast.success('Cost model updated');
        } else {
          addCostModelPreset(formData as Omit<CostModelPreset, 'id'>);
          toast.success('Cost model created');
        }
      } else if (type === 'session') {
        if (preset) {
          updateSessionPreset(preset.id, formData as Partial<SessionPreset>);
          toast.success('Session preset updated');
        } else {
          addSessionPreset(formData as Omit<SessionPreset, 'id'>);
          toast.success('Session preset created');
        }
      } else {
        if (preset) {
          updateRiskModelPreset(preset.id, formData as Partial<RiskModelPreset>);
          toast.success('Risk model updated');
        } else {
          addRiskModelPreset(formData as Omit<RiskModelPreset, 'id'>);
          toast.success('Risk model created');
        }
      }
      
      refreshPresets();
      setEditDialog({ open: false, type: 'cost', preset: null });
    } catch (err) {
      toast.error('Failed to save preset');
    }
  };

  const handleDelete = () => {
    const { type, id } = deleteDialog;
    
    try {
      if (type === 'cost') {
        deleteCostModelPreset(id);
      } else if (type === 'session') {
        deleteSessionPreset(id);
      } else {
        deleteRiskModelPreset(id);
      }
      
      toast.success('Preset deleted');
      refreshPresets();
      setDeleteDialog({ open: false, type: 'cost', id: '' });
    } catch (err) {
      toast.error('Failed to delete preset');
    }
  };

  const setActive = (type: 'cost' | 'session' | 'risk', id: string) => {
    if (type === 'cost') {
      setActiveCostModel(id);
    } else if (type === 'session') {
      setActiveSession(id);
    } else {
      setActiveRiskModel(id);
    }
    refreshPresets();
    toast.success('Active preset updated');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Presets & Templates
          </CardTitle>
          <CardDescription>
            Save and apply cost models, session settings, and risk configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cost" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cost" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Cost Models
              </TabsTrigger>
              <TabsTrigger value="session" className="gap-2">
                <Clock className="h-4 w-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="risk" className="gap-2">
                <Shield className="h-4 w-4" />
                Risk Models
              </TabsTrigger>
            </TabsList>

            {/* Cost Models */}
            <TabsContent value="cost" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => openAddDialog('cost')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cost Model
                </Button>
              </div>
              
              {presets.costModels.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (presets.activeCostModelId !== preset.id) {
                      setActive('cost', preset.id);
                    }
                  }}
                  className={cn(
                    "w-full p-3 sm:p-4 rounded-lg border flex items-center gap-3 text-left transition-all",
                    "hover:bg-muted/50 active:scale-[0.98] animate-fade-in",
                    presets.activeCostModelId === preset.id 
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]" 
                      : "border-border/50 bg-muted/20 opacity-70 hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    presets.activeCostModelId === preset.id 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-muted-foreground/40"
                  )}>
                    {presets.activeCostModelId === preset.id && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{preset.name}</span>
                      {presets.activeCostModelId === preset.id && (
                        <Badge variant="default" className="text-xs shrink-0">Active</Badge>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                      Comm: {preset.commission}% | Slip: {preset.slippage} | Spread: {preset.spread}
                    </div>
                    {preset.description && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">{preset.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog('cost', preset)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteDialog({ open: true, type: 'cost', id: preset.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </TabsContent>

            {/* Session Presets */}
            <TabsContent value="session" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => openAddDialog('session')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Session
                </Button>
              </div>
              
              {presets.sessions.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (presets.activeSessionId !== preset.id) {
                      setActive('session', preset.id);
                    }
                  }}
                  className={cn(
                    "w-full p-3 sm:p-4 rounded-lg border flex items-center gap-3 text-left transition-all",
                    "hover:bg-muted/50 active:scale-[0.98] animate-fade-in",
                    presets.activeSessionId === preset.id 
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]" 
                      : "border-border/50 bg-muted/20 opacity-70 hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    presets.activeSessionId === preset.id 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-muted-foreground/40"
                  )}>
                    {presets.activeSessionId === preset.id && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{preset.name}</span>
                      {presets.activeSessionId === preset.id && (
                        <Badge variant="default" className="text-xs shrink-0">Active</Badge>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                      {preset.sessionStart} - {preset.sessionEnd} ({preset.timezone})
                      {preset.excludeWeekends && ' | No weekends'}
                    </div>
                    {preset.description && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">{preset.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog('session', preset)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteDialog({ open: true, type: 'session', id: preset.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </TabsContent>

            {/* Risk Models */}
            <TabsContent value="risk" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => openAddDialog('risk')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Risk Model
                </Button>
              </div>
              
              {presets.riskModels.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (presets.activeRiskModelId !== preset.id) {
                      setActive('risk', preset.id);
                    }
                  }}
                  className={cn(
                    "w-full p-3 sm:p-4 rounded-lg border flex items-center gap-3 text-left transition-all",
                    "hover:bg-muted/50 active:scale-[0.98] animate-fade-in",
                    presets.activeRiskModelId === preset.id 
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]" 
                      : "border-border/50 bg-muted/20 opacity-70 hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    presets.activeRiskModelId === preset.id 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-muted-foreground/40"
                  )}>
                    {presets.activeRiskModelId === preset.id && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{preset.name}</span>
                      {presets.activeRiskModelId === preset.id && (
                        <Badge variant="default" className="text-xs shrink-0">Active</Badge>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                      {RISK_MODES.find(m => m.value === preset.mode)?.label} | Val: {preset.value}
                      {preset.maxDrawdownStop && ` | DD: ${preset.maxDrawdownStop}%`}
                      {preset.dailyLossCap && ` | Cap: ${preset.dailyLossCap}%`}
                    </div>
                    {preset.description && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">{preset.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog('risk', preset)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteDialog({ open: true, type: 'risk', id: preset.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.preset ? 'Edit' : 'Add'} {editDialog.type === 'cost' ? 'Cost Model' : editDialog.type === 'session' ? 'Session' : 'Risk Model'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={(formData.name as string) || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Preset name"
              />
            </div>
            
            {editDialog.type === 'cost' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Commission (%)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={(formData.commission as number) || 0}
                      onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slippage (ticks)</Label>
                    <Input
                      type="number"
                      value={(formData.slippage as number) || 0}
                      onChange={(e) => setFormData({ ...formData, slippage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Spread (pts)</Label>
                    <Input
                      type="number"
                      value={(formData.spread as number) || 0}
                      onChange={(e) => setFormData({ ...formData, spread: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </>
            )}
            
            {editDialog.type === 'session' && (
              <>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={(formData.timezone as string) || 'UTC'}
                    onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Session Start</Label>
                    <Input
                      type="time"
                      value={(formData.sessionStart as string) || '09:00'}
                      onChange={(e) => setFormData({ ...formData, sessionStart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Session End</Label>
                    <Input
                      type="time"
                      value={(formData.sessionEnd as string) || '17:00'}
                      onChange={(e) => setFormData({ ...formData, sessionEnd: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
            
            {editDialog.type === 'risk' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select 
                      value={(formData.mode as string) || 'fixed'}
                      onValueChange={(v) => setFormData({ ...formData, mode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_MODES.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={(formData.value as number) || 1}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Max DD Stop (%)</Label>
                    <Input
                      type="number"
                      value={(formData.maxDrawdownStop as number) || ''}
                      onChange={(e) => setFormData({ ...formData, maxDrawdownStop: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Loss Cap (%)</Label>
                    <Input
                      type="number"
                      value={(formData.dailyLossCap as number) || ''}
                      onChange={(e) => setFormData({ ...formData, dailyLossCap: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Trades/Day</Label>
                    <Input
                      type="number"
                      value={(formData.maxTradesPerDay as number) || ''}
                      onChange={(e) => setFormData({ ...formData, maxTradesPerDay: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={(formData.description as string) || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ ...editDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this preset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
