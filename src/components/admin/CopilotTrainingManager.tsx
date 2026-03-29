/**
 * Copilot Training Manager
 * Admin tool to manage knowledge entries that power MMC Copilot context
 * Stores training data as app_settings with 'copilot_knowledge_' prefix
 */

import { useState, useEffect } from 'react';
import {
  Sparkles, Plus, Save, Trash2, Search, Loader2, Edit3,
  BookOpen, Lightbulb, Code2, Brain, MessageSquare, X, Copy, Check, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface KnowledgeEntry {
  id: string;
  key: string;
  title: string;
  category: string;
  content: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'feature', label: 'Feature Guide', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10' },
  { value: 'workflow', label: 'Workflow', icon: Lightbulb, color: 'text-amber-500 bg-amber-500/10' },
  { value: 'api', label: 'API / Technical', icon: Code2, color: 'text-emerald-500 bg-emerald-500/10' },
  { value: 'troubleshoot', label: 'Troubleshooting', icon: Brain, color: 'text-red-500 bg-red-500/10' },
  { value: 'faq', label: 'FAQ', icon: MessageSquare, color: 'text-purple-500 bg-purple-500/10' },
  { value: 'context', label: 'App Context', icon: FileText, color: 'text-teal-500 bg-teal-500/10' },
];

const PREFIX = 'copilot_kb_';

export function CopilotTrainingManager() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [form, setForm] = useState({ title: '', category: 'feature', content: '' });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .like('key', `${PREFIX}%`)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setEntries(data.map(d => {
        let parsed: any = {};
        try { parsed = JSON.parse(d.value || '{}'); } catch {}
        return {
          id: d.id,
          key: d.key,
          title: parsed.title || d.key.replace(PREFIX, ''),
          category: parsed.category || 'context',
          content: parsed.content || '',
          updated_at: d.updated_at,
        };
      }));
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditingEntry(null);
    setForm({ title: '', category: 'feature', content: '' });
    setEditorOpen(true);
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setForm({ title: entry.title, category: entry.category, content: entry.content });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    const key = editingEntry?.key || `${PREFIX}${form.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}_${Date.now()}`;
    const value = JSON.stringify({ title: form.title, category: form.category, content: form.content });

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: 'key' });

    if (error) {
      toast.error('Save failed: ' + error.message);
    } else {
      toast.success(editingEntry ? 'Knowledge updated' : 'Knowledge added');
      setEditorOpen(false);
      loadEntries();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('app_settings').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Delete failed');
    } else {
      toast.success('Entry deleted');
      setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const copyContent = (entry: KnowledgeEntry) => {
    navigator.clipboard.writeText(`[${entry.category.toUpperCase()}] ${entry.title}\n\n${entry.content}`);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = entries.filter(e => {
    if (catFilter !== 'all' && e.category !== catFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return e.title.toLowerCase().includes(s) || e.content.toLowerCase().includes(s);
    }
    return true;
  });

  const getCatInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[5];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Copilot Knowledge Base
          </h3>
          <p className="text-sm text-muted-foreground">
            {entries.length} entries • Train MMC Copilot with app-specific knowledge
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl gap-1.5">
          <Plus className="h-4 w-4" /> Add Knowledge
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map(cat => {
          const count = entries.filter(e => e.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setCatFilter(catFilter === cat.value ? 'all' : cat.value)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border transition-all text-left',
                catFilter === cat.value ? 'border-primary/40 bg-primary/5' : 'border-border/50 hover:border-border'
              )}
            >
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', cat.color.split(' ')[1])}>
                <cat.icon className={cn('h-4 w-4', cat.color.split(' ')[0])} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{cat.label}</p>
                <p className="text-sm font-bold">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search knowledge base..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-xl"
        />
      </div>

      {/* Entries List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="py-16 text-center">
            <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground font-medium">No knowledge entries found</p>
            <p className="text-sm text-muted-foreground mt-1">Add training data to make Copilot smarter</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 rounded-xl">
              <Plus className="h-4 w-4 mr-1.5" /> Create First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence>
            {filtered.map(entry => {
              const catInfo = getCatInfo(entry.category);
              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="rounded-2xl border-border/50 hover:border-border transition-all group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', catInfo.color.split(' ')[1])}>
                          <catInfo.icon className={cn('h-4 w-4', catInfo.color.split(' ')[0])} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-sm truncate">{entry.title}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 rounded">{catInfo.label}</Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(entry.updated_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyContent(entry)}>
                                {copiedId === entry.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(entry)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {entry.content.slice(0, 150)}...
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {editingEntry ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}
            </DialogTitle>
            <DialogDescription>
              This will be used to train MMC Copilot about app features, workflows, and troubleshooting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. How to import CSV data"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content * (Markdown supported)</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder={`Describe the feature, workflow, or answer in detail...\n\nExample:\n## CSV Import\n1. Go to Data Hub → Import\n2. Drag & drop your CSV file\n3. Map columns: Date/Time, Open, High, Low, Close\n4. Click "Start Import"\n\n**Supported formats:** CSV with OHLC data\n**Max size:** 50MB`}
                className="min-h-[250px] font-mono text-sm"
              />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Tip: Be specific, include step-by-step instructions, mention UI labels exactly as they appear.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : editingEntry ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This knowledge entry will be permanently removed from the copilot training data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
