/**
 * Feature Flags Component (Database-backed)
 * Toggle features on/off, kill switches, rollout control
 */

import { useState, useEffect } from 'react';
import {
  Flag, Plus, Trash2, Edit2, Save, Globe, Lock,
  Beaker, Users, Loader2, AlertTriangle, Power, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  target_groups: string[];
  environment: string;
  is_kill_switch: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

const GROUP_LABELS: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  all: { label: 'All Users', icon: Globe, color: 'bg-blue-500/10 text-blue-500' },
  admins: { label: 'Admins Only', icon: Lock, color: 'bg-red-500/10 text-red-500' },
  beta: { label: 'Beta Testers', icon: Beaker, color: 'bg-purple-500/10 text-purple-500' },
  premium: { label: 'Premium Users', icon: Users, color: 'bg-amber-500/10 text-amber-500' },
};

export function FeatureFlags() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{ open: boolean; flag: FeatureFlag | null }>({ open: false, flag: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [formData, setFormData] = useState<Partial<FeatureFlag>>({});
  const [saving, setSaving] = useState(false);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('is_kill_switch', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      setFlags((data || []) as FeatureFlag[]);
    } catch {
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFlags(); }, []);

  const openAddDialog = () => {
    setFormData({ key: '', name: '', description: '', enabled: false, rollout_percentage: 0, target_groups: ['all'], environment: 'production', is_kill_switch: false });
    setEditDialog({ open: true, flag: null });
  };

  const openEditDialog = (flag: FeatureFlag) => {
    setFormData({ ...flag });
    setEditDialog({ open: true, flag });
  };

  const handleSave = async () => {
    if (!formData.key || !formData.name) { toast.error('Key and name are required'); return; }
    setSaving(true);
    try {
      const payload = {
        key: formData.key!,
        name: formData.name!,
        description: formData.description || null,
        enabled: formData.enabled ?? false,
        rollout_percentage: formData.rollout_percentage ?? 0,
        target_groups: formData.target_groups || ['all'],
        environment: formData.environment || 'production',
        is_kill_switch: formData.is_kill_switch ?? false,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (editDialog.flag) {
        const { error } = await supabase.from('feature_flags').update(payload).eq('id', editDialog.flag.id);
        if (error) throw error;
        await supabase.rpc('log_audit_event', {
          p_action: 'feature_flag_toggle',
          p_entity_type: 'feature_flag',
          p_entity_id: formData.key,
          p_before_data: { enabled: editDialog.flag.enabled, rollout: editDialog.flag.rollout_percentage },
          p_after_data: { enabled: payload.enabled, rollout: payload.rollout_percentage },
        });
        toast.success('Feature flag updated');
      } else {
        const { error } = await supabase.from('feature_flags').insert({ ...payload, created_by: user?.id || null });
        if (error) throw error;
        toast.success('Feature flag created');
      }
      setEditDialog({ open: false, flag: null });
      loadFlags();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('feature_flags').delete().eq('id', deleteDialog.id);
      if (error) throw error;
      toast.success('Feature flag deleted');
      setDeleteDialog({ open: false, id: '', name: '' });
      loadFlags();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleEnabled = async (flag: FeatureFlag) => {
    try {
      const { error } = await supabase.from('feature_flags').update({ enabled: !flag.enabled, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('id', flag.id);
      if (error) throw error;
      await supabase.rpc('log_audit_event', {
        p_action: flag.is_kill_switch ? 'kill_switch' : 'feature_flag_toggle',
        p_entity_type: 'feature_flag',
        p_entity_id: flag.key,
        p_before_data: { enabled: flag.enabled },
        p_after_data: { enabled: !flag.enabled },
      });
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f));
      toast.success(`${flag.name} ${!flag.enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const updateRollout = async (flag: FeatureFlag, percentage: number) => {
    try {
      await supabase.from('feature_flags').update({ rollout_percentage: percentage, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('id', flag.id);
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, rollout_percentage: percentage } : f));
    } catch {
      toast.error('Failed to update rollout');
    }
  };

  const toggleTargetGroup = (group: string) => {
    const current = formData.target_groups || [];
    setFormData({
      ...formData,
      target_groups: current.includes(group) ? current.filter(g => g !== group) : [...current, group],
    });
  };

  const killSwitches = flags.filter(f => f.is_kill_switch);
  const regularFlags = flags.filter(f => !f.is_kill_switch);
  const enabledCount = flags.filter(f => f.enabled).length;

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Kill Switches */}
        {killSwitches.length > 0 && (
          <Card className="rounded-2xl border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Power className="h-5 w-5 text-destructive" />
                Kill Switches
              </CardTitle>
              <CardDescription>Emergency controls — handle with care</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {killSwitches.map(flag => (
                <div key={flag.id} className={cn('flex items-center justify-between p-4 rounded-xl border transition-all', flag.enabled ? 'border-destructive/50 bg-destructive/5' : 'border-border/50')}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={cn('h-5 w-5', flag.enabled ? 'text-destructive' : 'text-muted-foreground')} />
                    <div>
                      <p className="font-medium text-sm">{flag.name}</p>
                      <p className="text-xs text-muted-foreground">{flag.description}</p>
                    </div>
                  </div>
                  <Switch checked={flag.enabled} onCheckedChange={() => toggleEnabled(flag)} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Feature Flags */}
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-primary" />
                  Feature Flags
                </CardTitle>
                <CardDescription>{enabledCount} of {flags.length} enabled</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={openAddDialog} className="rounded-xl">
                  <Plus className="h-4 w-4 mr-1" /> Add Flag
                </Button>
                <Button variant="outline" size="sm" onClick={loadFlags} className="rounded-xl">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {regularFlags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Flag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No feature flags</p>
              </div>
            ) : (
              regularFlags.map(flag => (
                <div key={flag.id} className={cn('rounded-xl border transition-all overflow-hidden', flag.enabled ? 'border-primary/30 bg-primary/5' : 'border-border/50 opacity-70')}>
                  <button type="button" onClick={() => toggleEnabled(flag)} className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/30 transition-all">
                    <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors', flag.enabled ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/50')}>
                      {flag.enabled && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{flag.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">{flag.key}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{flag.description}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {flag.target_groups.map(group => {
                          const info = GROUP_LABELS[group];
                          if (!info) return null;
                          const Icon = info.icon;
                          return (
                            <Badge key={group} variant="outline" className={cn('text-[10px]', info.color)}>
                              <Icon className="h-3 w-3 mr-1" />{info.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </button>
                  <div className="px-4 pb-3 flex items-center gap-3 justify-end border-t border-border/50 pt-3">
                    <div className="flex-1 max-w-[200px]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Rollout</span>
                        <span className="font-mono">{flag.rollout_percentage}%</span>
                      </div>
                      <Slider value={[flag.rollout_percentage]} onValueChange={([v]) => updateRollout(flag, v)} max={100} step={5} disabled={!flag.enabled} />
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEditDialog(flag); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setDeleteDialog({ open: true, id: flag.id, name: flag.name }); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.flag ? 'Edit Feature Flag' : 'Add Feature Flag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input value={formData.key || ''} onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="feature_key" disabled={!!editDialog.flag} />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Feature Name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <Label>Target Groups</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(GROUP_LABELS).map(([group, info]) => {
                  const Icon = info.icon;
                  const isSelected = formData.target_groups?.includes(group);
                  return (
                    <Button key={group} variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => toggleTargetGroup(group)} className="gap-2">
                      <Icon className="h-4 w-4" />{info.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rollout: {formData.rollout_percentage || 0}%</Label>
              <Slider value={[formData.rollout_percentage || 0]} onValueChange={([v]) => setFormData({ ...formData, rollout_percentage: v })} max={100} step={5} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={formData.enabled ?? false} onCheckedChange={(v) => setFormData({ ...formData, enabled: v })} />
                <Label>Enabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_kill_switch ?? false} onCheckedChange={(v) => setFormData({ ...formData, is_kill_switch: v })} />
                <Label>Kill Switch</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, flag: null })}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleteDialog.name}</strong>? This may affect application behavior.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
