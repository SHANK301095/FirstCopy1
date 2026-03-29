import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Bot, Search, Eye } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageTitle } from '@/components/ui/PageTitle';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EA } from '@/types';
import { useToast } from '@/hooks/use-toast';

const riskProfiles = [
  { value: 'conservative', label: 'Conservative', color: 'text-profit' },
  { value: 'moderate', label: 'Moderate', color: 'text-warning' },
  { value: 'aggressive', label: 'Aggressive', color: 'text-loss' },
] as const;

const defaultSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'];

export default function EALibrary() {
  const { eas, currentProjectId, addEA, updateEA, deleteEA, projects } = useStore();
  const { toast } = useToast();
  
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectEAs = eas.filter((e) => e.projectId === currentProjectId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEA, setEditingEA] = useState<EA | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    fileName: '',
    version: '1.0',
    strategyNotes: '',
    riskProfile: 'moderate' as EA['riskProfile'],
    allowedSymbols: ['EURUSD'],
    magicNumber: undefined as number | undefined,
  });

  const filteredEAs = projectEAs.filter((ea) =>
    ea.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ea.strategyNotes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (ea?: EA) => {
    if (ea) {
      setEditingEA(ea);
      setFormData({
        name: ea.name,
        fileName: ea.fileName || '',
        version: ea.version,
        strategyNotes: ea.strategyNotes,
        riskProfile: ea.riskProfile,
        allowedSymbols: ea.allowedSymbols,
        magicNumber: ea.magicNumber,
      });
    } else {
      setEditingEA(null);
      setFormData({
        name: '',
        fileName: '',
        version: '1.0',
        strategyNotes: '',
        riskProfile: 'moderate',
        allowedSymbols: currentProject?.defaultSymbols.slice(0, 2) || ['EURUSD'],
        magicNumber: undefined,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'EA name is required', variant: 'destructive' });
      return;
    }

    if (!currentProjectId) {
      toast({ title: 'Error', description: 'Please select a project first', variant: 'destructive' });
      return;
    }

    if (editingEA) {
      updateEA(editingEA.id, formData);
      toast({ title: 'Success', description: 'EA updated' });
    } else {
      const newEA: EA = {
        id: uuidv4(),
        projectId: currentProjectId,
        ...formData,
        createdAt: new Date().toISOString(),
      };
      addEA(newEA);
      toast({ title: 'Success', description: 'EA added to library' });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const ea = eas.find((e) => e.id === id);
    if (confirm(`Delete EA "${ea?.name}"?`)) {
      deleteEA(id);
      toast({ title: 'Deleted', description: 'EA removed from library' });
    }
  };

  const toggleSymbol = (symbol: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedSymbols: prev.allowedSymbols.includes(symbol)
        ? prev.allowedSymbols.filter((s) => s !== symbol)
        : [...prev.allowedSymbols, symbol],
    }));
  };

  const getRiskBadgeColor = (risk: EA['riskProfile']) => {
    switch (risk) {
      case 'conservative': return 'bg-profit/20 text-profit';
      case 'moderate': return 'bg-warning/20 text-warning';
      case 'aggressive': return 'bg-loss/20 text-loss';
    }
  };

  if (!currentProjectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center border-dashed">
          <CardContent className="py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
            <p className="text-muted-foreground mb-4">
              Please select or create a project first to manage your Expert Advisors.
            </p>
            <Button asChild>
              <Link to="/workspace">Go to Workspace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle 
          title="EA Library" 
          subtitle={`Manage Expert Advisors for ${currentProject?.name || 'your project'}`}
        />
        <Button onClick={() => handleOpenDialog()} variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Add EA
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search EAs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* EA Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEAs.map((ea) => (
          <Card key={ea.id} variant="stat">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{ea.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">v{ea.version}</p>
                  </div>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getRiskBadgeColor(ea.riskProfile))}>
                  {ea.riskProfile}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {ea.fileName && (
                <p className="text-xs font-mono text-muted-foreground mb-2 truncate">
                  {ea.fileName}
                </p>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {ea.strategyNotes || 'No notes'}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {ea.allowedSymbols.slice(0, 3).map((s) => (
                  <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                    {s}
                  </span>
                ))}
                {ea.allowedSymbols.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{ea.allowedSymbols.length - 3}
                  </span>
                )}
              </div>
              {ea.magicNumber && (
                <p className="text-xs text-muted-foreground mb-3">
                  Magic: <span className="font-mono">{ea.magicNumber}</span>
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="default" asChild>
                  <Link to={`/ea/${ea.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    Profile
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(ea)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(ea.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredEAs.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No EAs found' : 'No Expert Advisors yet'}
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add your first Expert Advisor to get started with backtesting.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => handleOpenDialog()} variant="default">
                  <Plus className="h-4 w-4 mr-2" />
                  Add EA
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg glass-dialog">
          <DialogHeader>
            <DialogTitle className="page-title-cyber text-xl">{editingEA ? 'Edit EA' : 'Add Expert Advisor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">EA Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., TrendRider Pro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name (optional)</Label>
              <Input
                id="fileName"
                value={formData.fileName}
                onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                placeholder="TrendRider_Pro_v1.0.ex5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="riskProfile">Risk Profile</Label>
              <Select
                value={formData.riskProfile}
                onValueChange={(v) => setFormData({ ...formData, riskProfile: v as EA['riskProfile'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {riskProfiles.map((rp) => (
                    <SelectItem key={rp.value} value={rp.value}>
                      <span className={rp.color}>{rp.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Strategy Notes</Label>
              <Textarea
                id="notes"
                value={formData.strategyNotes}
                onChange={(e) => setFormData({ ...formData, strategyNotes: e.target.value })}
                placeholder="Describe the trading strategy..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Allowed Symbols</Label>
              <div className="flex flex-wrap gap-2">
                {defaultSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => toggleSymbol(symbol)}
                    className={cn(
                      'px-3 py-1 text-sm font-mono rounded-md transition-colors',
                      formData.allowedSymbols.includes(symbol)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="magic">Magic Number (optional)</Label>
              <Input
                id="magic"
                type="number"
                value={formData.magicNumber || ''}
                onChange={(e) => setFormData({ ...formData, magicNumber: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="100001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingEA ? 'Save Changes' : 'Add EA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
