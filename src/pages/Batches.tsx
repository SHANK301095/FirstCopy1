import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Layers, Download, Plus, Trash2, Play, CheckCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { generateBundle } from '@/lib/bundleGenerator';
import { cn } from '@/lib/utils';
import type { Batch, BatchSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { PageTitle } from '@/components/ui/PageTitle';

const defaultSettings: BatchSettings = {
  symbols: ['EURUSD'],
  timeframes: ['H1'],
  spreadMode: 'current',
  modelingMode: 'every_tick',
  startDate: '2024-01-01',
  endDate: '2024-12-01',
  initialDeposit: 10000,
  leverage: 100,
  optimizationMode: false,
  maxParallelTerminals: 4,
  delayBetweenLaunches: 5,
};

export default function Batches() {
  const { batches, eas, currentProjectId, projects, addBatch, deleteBatch } = useStore();
  const { toast } = useToast();
  
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const projectEAs = eas.filter((e) => e.projectId === currentProjectId);
  const projectBatches = batches.filter((b) => b.projectId === currentProjectId);
  
  const [creating, setCreating] = useState(false);
  const [selectedEAs, setSelectedEAs] = useState<string[]>([]);
  const [settings, setSettings] = useState<BatchSettings>(defaultSettings);
  const [batchName, setBatchName] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleCreateBatch = () => {
    if (!batchName.trim()) {
      toast({ title: 'Error', description: 'Batch name required', variant: 'destructive' });
      return;
    }
    if (selectedEAs.length === 0) {
      toast({ title: 'Error', description: 'Select at least one EA', variant: 'destructive' });
      return;
    }
    if (!currentProjectId) return;

    const batch: Batch = {
      id: uuidv4(),
      projectId: currentProjectId,
      name: batchName,
      eaIds: selectedEAs,
      settings,
      status: 'ready',
      createdAt: new Date().toISOString(),
    };
    addBatch(batch);
    toast({ title: 'Success', description: 'Batch created' });
    setCreating(false);
    setBatchName('');
    setSelectedEAs([]);
    setSettings(defaultSettings);
  };

  const handleDownloadBundle = async (batch: Batch) => {
    setGenerating(true);
    try {
      await generateBundle(batch, eas);
      toast({ title: 'Success', description: 'Bundle downloaded' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to generate bundle', variant: 'destructive' });
    }
    setGenerating(false);
  };

  const toggleEA = (id: string) => {
    setSelectedEAs((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

  const toggleSymbol = (s: string) => {
    setSettings((prev) => ({
      ...prev,
      symbols: prev.symbols.includes(s) ? prev.symbols.filter((x) => x !== s) : [...prev.symbols, s],
    }));
  };

  const toggleTF = (tf: string) => {
    setSettings((prev) => ({
      ...prev,
      timeframes: prev.timeframes.includes(tf) ? prev.timeframes.filter((x) => x !== tf) : [...prev.timeframes, tf],
    }));
  };

  if (!currentProjectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center border-dashed">
          <CardContent className="py-12">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
            <p className="text-muted-foreground mb-4">Select a project first.</p>
            <Button asChild><Link to="/workspace">Go to Workspace</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageTitle 
          title="Batches" 
          subtitle="Create and manage backtest batches"
        />
        {!creating && (
          <Button onClick={() => setCreating(true)} variant="default">
            <Plus className="h-4 w-4 mr-2" />New Batch
          </Button>
        )}
      </div>

      {creating && (
        <Card variant="default">
          <CardHeader><CardTitle>Create Batch</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Batch Name</Label><Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Q4 2024 Test" /></div>
            <div><Label>Select EAs ({selectedEAs.length})</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {projectEAs.map((ea) => (
                  <div key={ea.id} className={cn('flex items-center gap-2 p-2 rounded border cursor-pointer', selectedEAs.includes(ea.id) ? 'border-primary bg-primary/10' : 'border-border')} onClick={() => toggleEA(ea.id)}>
                    <Checkbox checked={selectedEAs.includes(ea.id)} />
                    <span className="text-sm truncate">{ea.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Symbols</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {['EURUSD','GBPUSD','USDJPY','AUDUSD'].map((s) => (
                    <button key={s} type="button" onClick={() => toggleSymbol(s)} className={cn('px-2 py-1 text-xs font-mono rounded', settings.symbols.includes(s) ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{s}</button>
                  ))}
                </div>
              </div>
              <div><Label>Timeframes</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {['M15','M30','H1','H4','D1'].map((tf) => (
                    <button key={tf} type="button" onClick={() => toggleTF(tf)} className={cn('px-2 py-1 text-xs font-mono rounded', settings.timeframes.includes(tf) ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{tf}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={settings.startDate} onChange={(e) => setSettings({...settings, startDate: e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="date" value={settings.endDate} onChange={(e) => setSettings({...settings, endDate: e.target.value})} /></div>
              <div><Label>Initial Deposit</Label><Input type="number" value={settings.initialDeposit} onChange={(e) => setSettings({...settings, initialDeposit: parseInt(e.target.value)})} /></div>
              <div><Label>Leverage</Label><Input type="number" value={settings.leverage} onChange={(e) => setSettings({...settings, leverage: parseInt(e.target.value)})} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={handleCreateBatch}>Create Batch</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {projectBatches.map((batch) => (
          <Card key={batch.id} variant="stat">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{batch.name}</CardTitle>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', batch.status === 'completed' ? 'bg-profit/20 text-profit' : 'bg-muted text-muted-foreground')}>{batch.status}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                {batch.eaIds.length} EAs • {batch.settings.symbols.join(', ')} • {batch.settings.timeframes.join(', ')}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleDownloadBundle(batch)} disabled={generating}>
                  <Download className="h-3 w-3 mr-1" />{generating ? 'Generating...' : 'Download Bundle'}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteBatch(batch.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
