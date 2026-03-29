/**
 * Bulk Data Manager — Admin tool for batch operations on shared datasets
 * Supports: select all, batch delete, batch export, batch update metadata
 */

import { useState, useMemo } from 'react';
import {
  Trash2, Download, Edit3, CheckSquare, Square, Search,
  Loader2, FileSpreadsheet, Calendar, Database, MoreHorizontal,
  X, Save, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface SharedDataset {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  row_count: number;
  file_size_bytes: number;
  storage_path: string;
  range_from_ts: number;
  range_to_ts: number;
  created_at: string;
  is_active: boolean;
  description: string | null;
  source_info: string | null;
}

export function BulkDataManager() {
  const [datasets, setDatasets] = useState<SharedDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('all');

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editField, setEditField] = useState<'symbol' | 'timeframe' | 'status'>('symbol');
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);

  // Load data
  const loadDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shared_datasets')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setDatasets((data || []) as SharedDataset[]);
    setLoading(false);
  };

  useState(() => { loadDatasets(); });

  const symbols = useMemo(() => [...new Set(datasets.map(d => d.symbol))], [datasets]);

  const filtered = useMemo(() => {
    let list = datasets;
    if (symbolFilter !== 'all') list = list.filter(d => d.symbol === symbolFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(s) || d.symbol.toLowerCase().includes(s));
    }
    return list;
  }, [datasets, symbolFilter, search]);

  const allSelected = filtered.length > 0 && filtered.every(d => selected.has(d.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(d => d.id)));
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const formatBytes = (b: number) => b < 1024 * 1024 ? (b / 1024).toFixed(1) + ' KB' : (b / (1024 * 1024)).toFixed(2) + ' MB';

  // Batch delete
  const handleBatchDelete = async () => {
    setDeleting(true);
    const ids = Array.from(selected);
    const toDelete = datasets.filter(d => ids.includes(d.id));

    try {
      // Delete storage files
      const paths = toDelete.map(d => d.storage_path);
      if (paths.length) await supabase.storage.from('market-data').remove(paths);

      // Delete metadata
      const { error } = await supabase.from('shared_datasets').delete().in('id', ids);
      if (error) throw error;

      setDatasets(prev => prev.filter(d => !ids.includes(d.id)));
      setSelected(new Set());
      toast.success(`${ids.length} dataset(s) deleted`);
    } catch (err) {
      toast.error('Delete failed: ' + String(err));
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
    }
  };

  // Batch export metadata as CSV
  const handleBatchExport = () => {
    const ids = Array.from(selected);
    const items = datasets.filter(d => ids.includes(d.id));
    const headers = ['Name', 'Symbol', 'Timeframe', 'Rows', 'Size', 'Range From', 'Range To', 'Status', 'Created'];
    const rows = items.map(d => [
      `"${d.name}"`, d.symbol, d.timeframe, d.row_count,
      formatBytes(d.file_size_bytes),
      d.range_from_ts ? format(new Date(d.range_from_ts), 'yyyy-MM-dd') : '',
      d.range_to_ts ? format(new Date(d.range_to_ts), 'yyyy-MM-dd') : '',
      d.is_active ? 'Active' : 'Inactive',
      format(new Date(d.created_at), 'yyyy-MM-dd HH:mm'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `datasets-export-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${items.length} datasets exported`);
  };

  // Batch update
  const handleBatchUpdate = async () => {
    setUpdating(true);
    const ids = Array.from(selected);
    try {
      const updateData: Record<string, any> = {};
      if (editField === 'symbol') updateData.symbol = editValue.toUpperCase();
      else if (editField === 'timeframe') updateData.timeframe = editValue;
      else if (editField === 'status') updateData.is_active = editValue === 'active';

      const { error } = await supabase.from('shared_datasets').update(updateData).in('id', ids);
      if (error) throw error;

      setDatasets(prev => prev.map(d => ids.includes(d.id) ? { ...d, ...updateData } : d));
      toast.success(`${ids.length} datasets updated`);
    } catch (err) {
      toast.error('Update failed: ' + String(err));
    } finally {
      setUpdating(false);
      setEditDialog(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Bulk Data Manager
            </CardTitle>
            <CardDescription>{datasets.length} shared datasets • {selectedCount} selected</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={loadDatasets} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search datasets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={symbolFilter} onValueChange={setSymbolFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Symbol" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Symbols</SelectItem>
              {symbols.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <Badge variant="secondary" className="text-xs">{selectedCount} selected</Badge>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" onClick={handleBatchExport}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" onClick={() => { setEditField('symbol'); setEditValue(''); setEditDialog(true); }}>
                  <Edit3 className="h-3.5 w-3.5" /> Batch Edit
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteDialog(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelected(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="border rounded-xl overflow-hidden">
          <ScrollArea className="h-[450px]">
            <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>TF</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No datasets found
                  </TableCell></TableRow>
                ) : (
                  filtered.map(d => (
                    <TableRow key={d.id} className={cn(selected.has(d.id) && 'bg-primary/5', 'hover:bg-muted/40 transition-colors')}>
                      <TableCell><Checkbox checked={selected.has(d.id)} onCheckedChange={() => toggleOne(d.id)} /></TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">{d.name}</p>
                          {d.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{d.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{d.symbol}</Badge></TableCell>
                      <TableCell className="text-sm">{d.timeframe}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{d.row_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{formatBytes(d.file_size_bytes)}</TableCell>
                      <TableCell>
                        <Badge variant={d.is_active ? 'default' : 'secondary'} className="text-xs">
                          {d.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {selectedCount} Dataset{selectedCount !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected datasets and their storage files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {deleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Update {selectedCount} Dataset{selectedCount !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>Choose a field and set the new value for all selected datasets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Field to Update</Label>
              <Select value={editField} onValueChange={(v) => { setEditField(v as any); setEditValue(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="symbol">Symbol</SelectItem>
                  <SelectItem value="timeframe">Timeframe</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New Value</Label>
              {editField === 'status' ? (
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger><SelectValue placeholder="Choose status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              ) : editField === 'timeframe' ? (
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger><SelectValue placeholder="Choose timeframe" /></SelectTrigger>
                  <SelectContent>
                    {['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'].map(tf => (
                      <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value.toUpperCase())}
                  placeholder="e.g. NIFTY"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleBatchUpdate} disabled={updating || !editValue}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {updating ? 'Updating...' : `Update ${selectedCount} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
