/**
 * Admin Config Center
 * Manage app configuration, kill switches, limits, and maintenance mode
 */

import { useState, useEffect } from 'react';
import {
  Sliders, Save, Plus, Trash2, Edit2, RefreshCw, Loader2,
  AlertTriangle, Shield, Lock, Settings, Zap, ToggleLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ConfigEntry {
  id: string;
  key: string;
  value: any;
  category: string;
  description: string | null;
  is_sensitive: boolean;
  requires_approval: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_ICONS: Record<string, typeof Settings> = {
  general: Settings,
  limits: Zap,
  security: Shield,
  features: ToggleLeft,
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-blue-500/10 text-blue-500',
  limits: 'bg-amber-500/10 text-amber-500',
  security: 'bg-red-500/10 text-red-500',
  features: 'bg-purple-500/10 text-purple-500',
};

export function AdminConfigCenter() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editDialog, setEditDialog] = useState<{ open: boolean; config: ConfigEntry | null }>({ open: false, config: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; key: string }>({ open: false, id: '', key: '' });
  const [form, setForm] = useState({ key: '', value: '', category: 'general', description: '', is_sensitive: false, requires_approval: false });

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_config')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });
      if (error) throw error;
      setConfigs((data || []) as ConfigEntry[]);
    } catch {
      toast.error('Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfigs(); }, []);

  const openAddDialog = () => {
    setForm({ key: '', value: '', category: 'general', description: '', is_sensitive: false, requires_approval: false });
    setEditDialog({ open: true, config: null });
  };

  const openEditDialog = (config: ConfigEntry) => {
    setForm({
      key: config.key,
      value: JSON.stringify(config.value?.value ?? config.value, null, 2),
      category: config.category,
      description: config.description || '',
      is_sensitive: config.is_sensitive,
      requires_approval: config.requires_approval,
    });
    setEditDialog({ open: true, config });
  };

  const handleSave = async () => {
    if (!form.key) { toast.error('Key is required'); return; }
    setSaving(true);
    try {
      let parsedValue: any;
      try {
        parsedValue = { value: JSON.parse(form.value) };
      } catch {
        parsedValue = { value: form.value };
      }

      const payload = {
        key: form.key,
        value: parsedValue,
        category: form.category,
        description: form.description || null,
        is_sensitive: form.is_sensitive,
        requires_approval: form.requires_approval,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (editDialog.config) {
        const { error } = await supabase.from('admin_config').update(payload).eq('id', editDialog.config.id);
        if (error) throw error;

        // Log audit
        await supabase.rpc('log_audit_event', {
          p_action: 'config_change',
          p_entity_type: 'admin_config',
          p_entity_id: form.key,
          p_before_data: editDialog.config.value,
          p_after_data: parsedValue,
        });

        toast.success('Config updated');
      } else {
        const { error } = await supabase.from('admin_config').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        toast.success('Config created');
      }

      setEditDialog({ open: false, config: null });
      loadConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('admin_config').delete().eq('id', deleteDialog.id);
      if (error) throw error;
      await supabase.rpc('log_audit_event', {
        p_action: 'config_change',
        p_entity_type: 'admin_config',
        p_entity_id: deleteDialog.key,
        p_before_data: { deleted: true },
      });
      toast.success('Config deleted');
      setDeleteDialog({ open: false, id: '', key: '' });
      loadConfigs();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = categoryFilter === 'all' ? configs : configs.filter(c => c.category === categoryFilter);
  const categories = [...new Set(configs.map(c => c.category))];

  return (
    <>
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                Config Center
              </CardTitle>
              <CardDescription>App configuration, limits, and kill switches</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openAddDialog} className="rounded-xl">
                <Plus className="h-4 w-4 mr-1" /> Add Config
              </Button>
              <Button variant="outline" size="sm" onClick={loadConfigs} disabled={loading} className="rounded-xl">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2">
            <Button variant={categoryFilter === 'all' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setCategoryFilter('all')}>
              All ({configs.length})
            </Button>
            {categories.map(cat => (
              <Button key={cat} variant={categoryFilter === cat ? 'default' : 'outline'} size="sm" className="rounded-xl capitalize" onClick={() => setCategoryFilter(cat)}>
                {cat} ({configs.filter(c => c.category === cat).length})
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sliders className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No config entries</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((config) => {
                const Icon = CATEGORY_ICONS[config.category] || Settings;
                const colorClass = CATEGORY_COLORS[config.category] || 'bg-muted text-muted-foreground';
                const displayValue = config.is_sensitive ? '••••••' : JSON.stringify(config.value?.value ?? config.value);

                return (
                  <div key={config.id} className="flex items-start gap-3 p-4 rounded-xl border border-border/50 hover:border-border transition-colors group">
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', colorClass.split(' ')[0])}>
                      <Icon className={cn('h-4 w-4', colorClass.split(' ')[1])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">{config.key}</span>
                        {config.is_sensitive && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {config.requires_approval && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 rounded text-amber-500 border-amber-500/30">
                            Requires Approval
                          </Badge>
                        )}
                      </div>
                      {config.description && <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <code className="text-xs bg-muted/50 px-2 py-0.5 rounded font-mono max-w-[300px] truncate">
                          {displayValue}
                        </code>
                        <span className="text-[10px] text-muted-foreground">
                          Updated {formatDistanceToNow(new Date(config.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(config)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteDialog({ open: true, id: config.id, key: config.key })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.config ? 'Edit Config' : 'Add Config Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="config_key" disabled={!!editDialog.config} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="limits">Limits</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="features">Features</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Value (JSON or plain text)</Label>
              <Textarea value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder='50 or {"enabled": true}' rows={3} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this config controls" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_sensitive} onCheckedChange={(v) => setForm({ ...form, is_sensitive: v })} />
                <Label className="text-sm">Sensitive</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.requires_approval} onCheckedChange={(v) => setForm({ ...form, requires_approval: v })} />
                <Label className="text-sm">Requires Approval</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, config: null })}>Cancel</Button>
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
            <AlertDialogTitle>Delete Config</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleteDialog.key}</strong>? This may affect application behavior.</AlertDialogDescription>
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
