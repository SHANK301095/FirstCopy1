/**
 * Bulk Tester Page
 * Comprehensive bulk EA/Strategy testing with queue management,
 * multi-worker progress, priority lanes, and batch operations
 * Connected to real backtest engine with result storage
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Plus, 
  Upload, 
  Settings2, 
  Layers, 
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  TrendingUp,
  Zap,
  LayoutGrid,
  ListOrdered,
  Filter,
  Download,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Folder,
  Bot,
  Timer,
  BarChart3,
  ArrowUpDown,
  History,
  Check,
  X,
  FileCode,
  Package,
  Activity,
  Scale,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { InlineHelp, FeatureHelpPanel } from '@/components/help';

import { BulkRunnerGrid } from '@/desktop/components/BulkRunnerGrid';
import { MultiWorkerProgress } from '@/desktop/components/MultiWorkerProgress';
import { PriorityQueue, type QueuedItem, type Priority } from '@/desktop/components/PriorityQueue';
import { useBulkTesterStore, getQueueStats, formatDuration, type BulkTestItem } from '@/lib/bulkTesterStore';
import { BulkTesterLiveCharts } from '@/components/bulkTester/BulkTesterLiveCharts';
import { BulkTestComparison } from '@/components/bulkTester/BulkTestComparison';
import { useToast } from '@/hooks/use-toast';

// EA Selector Dialog Component
function EASelector({ 
  open, 
  onClose, 
  onSelect 
}: { 
  open: boolean; 
  onClose: () => void; 
  onSelect: (items: Omit<BulkTestItem, 'id' | 'status' | 'progress' | 'retryCount'>[]) => void;
}) {
  const { availableEAs, loadEAs } = useBulkTesterStore();
  const [selectedEAs, setSelectedEAs] = useState<Set<string>>(new Set());
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [dateFrom, setDateFrom] = useState('2023-01-01');
  const [dateTo, setDateTo] = useState('2024-01-01');
  const [priority, setPriority] = useState<Priority>('normal');

  useEffect(() => {
    if (open) {
      loadEAs();
    }
  }, [open, loadEAs]);

  const handleToggleEA = (eaId: string) => {
    setSelectedEAs(prev => {
      const next = new Set(prev);
      if (next.has(eaId)) {
        next.delete(eaId);
      } else {
        next.add(eaId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedEAs.size === availableEAs.length) {
      setSelectedEAs(new Set());
    } else {
      setSelectedEAs(new Set(availableEAs.map(ea => ea.id)));
    }
  };

  const handleConfirm = () => {
    const items = availableEAs
      .filter(ea => selectedEAs.has(ea.id))
      .map(ea => ({
        eaId: ea.id,
        eaName: ea.name,
        symbol,
        timeframe,
        dateRange: { from: dateFrom, to: dateTo },
        priority,
      }));
    
    onSelect(items);
    onClose();
    setSelectedEAs(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Select EAs from Library
          </DialogTitle>
          <DialogDescription>
            Choose EAs to add to the bulk testing queue
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Test Configuration */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="space-y-1.5">
              <Label className="text-xs">Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EURUSD">EURUSD</SelectItem>
                  <SelectItem value="GBPUSD">GBPUSD</SelectItem>
                  <SelectItem value="USDJPY">USDJPY</SelectItem>
                  <SelectItem value="XAUUSD">XAUUSD</SelectItem>
                  <SelectItem value="BTCUSD">BTCUSD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M1">M1</SelectItem>
                  <SelectItem value="M5">M5</SelectItem>
                  <SelectItem value="M15">M15</SelectItem>
                  <SelectItem value="H1">H1</SelectItem>
                  <SelectItem value="H4">H4</SelectItem>
                  <SelectItem value="D1">D1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          {/* Priority Selection */}
          <div className="flex items-center gap-4">
            <Label className="text-xs">Priority:</Label>
            <div className="flex gap-2">
              {(['high', 'normal', 'low'] as Priority[]).map((p) => (
                <Button
                  key={p}
                  variant={priority === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'text-xs',
                    priority === p && p === 'high' && 'bg-red-500 hover:bg-red-600',
                    priority === p && p === 'low' && 'bg-gray-500 hover:bg-gray-600'
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* EA List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Available EAs ({availableEAs.length})</Label>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedEAs.size === availableEAs.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <ScrollArea className="h-[250px] border rounded-lg p-2">
              {availableEAs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Package className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No EAs in library</p>
                  <p className="text-xs">Import EAs from EA Manager first</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableEAs.map((ea) => (
                    <div
                      key={ea.id}
                      onClick={() => handleToggleEA(ea.id)}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        selectedEAs.has(ea.id) 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox checked={selectedEAs.has(ea.id)} />
                      <FileCode className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ea.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          v{ea.version} • {ea.compiled ? 'Compiled' : 'Not compiled'}
                        </p>
                      </div>
                      {ea.compiled && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedEAs.size === 0}
            className="bg-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {selectedEAs.size} EA{selectedEAs.size !== 1 ? 's' : ''} to Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// File Upload Dialog Component
function FileUploadDialog({
  open,
  onClose,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (items: Omit<BulkTestItem, 'id' | 'status' | 'progress' | 'retryCount'>[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [dateFrom, setDateFrom] = useState('2023-01-01');
  const [dateTo, setDateTo] = useState('2024-01-01');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files).filter(f => 
        f.name.endsWith('.ex5') || f.name.endsWith('.mq5')
      ));
    }
  };

  const handleConfirm = () => {
    const items = files.map(file => ({
      eaId: `uploaded-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      eaName: file.name.replace(/\.(ex5|mq5)$/, ''),
      symbol,
      timeframe,
      dateRange: { from: dateFrom, to: dateTo },
      priority: 'normal' as Priority,
    }));
    
    onUpload(items);
    onClose();
    setFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload EA Files
          </DialogTitle>
          <DialogDescription>
            Upload .ex5 or .mq5 files to test
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              multiple
              accept=".ex5,.mq5"
              onChange={handleFileChange}
              className="hidden"
              id="ea-file-input"
            />
            <label htmlFor="ea-file-input" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select or drag & drop EA files
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Supports .ex5 and .mq5 files
              </p>
            </label>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <ScrollArea className="h-[120px] border rounded-lg p-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 text-sm">
                    <FileCode className="h-4 w-4 text-primary" />
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Test Config */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EURUSD">EURUSD</SelectItem>
                  <SelectItem value="GBPUSD">GBPUSD</SelectItem>
                  <SelectItem value="USDJPY">USDJPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M15">M15</SelectItem>
                  <SelectItem value="H1">H1</SelectItem>
                  <SelectItem value="H4">H4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={files.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Add {files.length} File{files.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BulkTester() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('queue');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [eaSelectorOpen, setEaSelectorOpen] = useState(false);
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const {
    items,
    status,
    config,
    currentSession,
    batchStartedAt,
    updateConfig,
    addItems,
    removeItem,
    clearQueue,
    clearCompleted,
    updateItemPriority,
    reorderItems,
    retryItem,
    startBatch,
    pauseBatch,
    resumeBatch,
    stopBatch,
    exportResults,
  } = useBulkTesterStore();

  // Auto-switch to live tab when batch starts
  useEffect(() => {
    if (status === 'running' && activeTab !== 'live') {
      setActiveTab('live');
    }
  }, [status]);

  // Calculate stats
  const stats = useMemo(() => getQueueStats(items), [items]);

  // Convert to QueuedItem format for PriorityQueue component
  const queueItems: QueuedItem[] = useMemo(() => 
    items.map(item => ({
      id: item.id,
      name: item.eaName,
      priority: item.priority,
      status: item.status === 'completed' ? 'done' : 
              item.status === 'failed' ? 'error' : 
              item.status === 'cached' ? 'done' :
              item.status as 'queued' | 'running' | 'paused',
      progress: item.progress,
      error: item.error,
    })),
    [items]
  );

  // Handle queue operations
  const handleReorder = useCallback((reordered: QueuedItem[]) => {
    const reorderedItems = reordered.map(q => 
      items.find(i => i.id === q.id)!
    ).filter(Boolean);
    reorderItems(reorderedItems);
  }, [items, reorderItems]);

  const handlePriorityChange = useCallback((id: string, priority: Priority) => {
    updateItemPriority(id, priority);
  }, [updateItemPriority]);

  const handleRemove = useCallback((id: string) => {
    removeItem(id);
  }, [removeItem]);

  const handleRetry = useCallback((id: string) => {
    retryItem(id);
  }, [retryItem]);

  const handleStart = useCallback(async () => {
    await startBatch();
    toast({
      title: 'Batch Started',
      description: `Processing ${items.length} items`,
    });
  }, [startBatch, items.length, toast]);

  const handleExport = useCallback(async () => {
    try {
      const buffer = await exportResults();
      
      // Download file - create new Uint8Array to ensure ArrayBuffer type
      const blob = new Blob([new Uint8Array(buffer)], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-test-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: 'Excel report downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [exportResults, toast]);

  // Calculate overall progress
  const overallProgress = items.length > 0
    ? ((stats.completed + stats.cached + stats.failed) / items.length) * 100
    : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PageTitle 
            title="Bulk Tester" 
            subtitle="Mass EA & Strategy Testing with Queue Management"
          />
          <InlineHelp topicId="bulk-queue" />
          <Badge variant="secondary" className="bg-primary/10 text-primary h-fit">
            <Cpu className="h-3 w-3 mr-1" />
            {config.concurrency} Workers
            <InlineHelp topicId="concurrency" className="ml-1" />
          </Badge>
          {currentSession && (
            <Badge variant="outline" className="h-fit">
              Session: {currentSession.name}
            </Badge>
          )}
        </div>
        <FeatureHelpPanel compact />
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Queued</p>
              <p className="text-lg font-bold">{stats.queued}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Running</p>
              <p className="text-lg font-bold">{stats.running}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
              <p className="text-lg font-bold">{stats.completed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Failed</p>
              <p className="text-lg font-bold">{stats.failed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Cached</p>
              <p className="text-lg font-bold">{stats.cached}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Success</p>
              <p className="text-lg font-bold">
                {items.length > 0 ? ((stats.completed / items.length) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Est. Time</p>
              <p className="text-lg font-bold">{formatDuration(stats.queued * 120)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-pink-500/10 to-transparent border-pink-500/20">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-pink-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Control Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {status === 'idle' || status === 'completed' ? (
              <Button 
                onClick={handleStart} 
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={items.length === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Batch
              </Button>
            ) : status === 'paused' ? (
              <Button onClick={resumeBatch} variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : (
              <Button onClick={pauseBatch} variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            
            {(status === 'running' || status === 'paused') && (
              <Button onClick={stopBatch} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}

            <Separator orientation="vertical" className="h-8" />

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tests
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Tests to Queue</DialogTitle>
                  <DialogDescription>
                    Select EAs, Strategies, or import from file
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col gap-2"
                    onClick={() => { setAddDialogOpen(false); setEaSelectorOpen(true); }}
                  >
                    <Bot className="h-8 w-8 text-primary" />
                    <span>From EA Library</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex-col gap-2"
                    onClick={() => { setAddDialogOpen(false); setFileUploadOpen(true); }}
                  >
                    <Upload className="h-8 w-8 text-primary" />
                    <span>Upload .ex5 Files</span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={clearCompleted}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Completed
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={viewMode === 'grid' ? 'bg-muted' : ''}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={viewMode === 'list' ? 'bg-muted' : ''}
              onClick={() => setViewMode('list')}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-8" />

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={stats.completed === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        {/* Progress when running */}
        {(status === 'running' || status === 'paused') && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {status === 'paused' ? 'Paused' : 'Processing'}
              </span>
              <span className="font-mono font-medium">
                {stats.completed + stats.failed} / {items.length} ({overallProgress.toFixed(0)}%)
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="queue" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            <span className="hidden sm:inline">Queue</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {items.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Live</span>
            {status === 'running' && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-[10px] bg-primary animate-pulse">
                LIVE
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="workers" className="gap-2">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">Workers</span>
          </TabsTrigger>
          <TabsTrigger value="grid" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid View</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
            {stats.completed > 1 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {stats.completed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Priority Queue */}
            <div className="lg:col-span-2">
              <PriorityQueue
                items={queueItems}
                onReorder={handleReorder}
                onPriorityChange={handlePriorityChange}
                onRemove={handleRemove}
                onRetry={handleRetry}
              />
            </div>

            {/* Queue Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Queue Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-red-500" />
                        High Priority
                      </span>
                      <span className="font-mono">
                        {items.filter(i => i.priority === 'high').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-blue-500" />
                        Normal
                      </span>
                      <span className="font-mono">
                        {items.filter(i => i.priority === 'normal').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <ArrowUpDown className="h-3 w-3 text-gray-500" />
                        Low
                      </span>
                      <span className="font-mono">
                        {items.filter(i => i.priority === 'low').length}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Workers Active</span>
                      <span className="font-mono">{config.concurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cache Enabled</span>
                      <span className="font-mono">
                        {config.cachePreviousResults ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    size="sm"
                    onClick={() => setEaSelectorOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add from EA Library
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    size="sm"
                    onClick={() => setFileUploadOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload EA Files
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-500 hover:text-red-500" 
                    size="sm" 
                    onClick={clearQueue}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Queue
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Live Progress Tab */}
        <TabsContent value="live" className="space-y-4">
          <BulkTesterLiveCharts
            items={items}
            status={status}
            startedAt={batchStartedAt ?? undefined}
            onPause={pauseBatch}
            onResume={resumeBatch}
          />
          
          {items.length === 0 && (
            <Card className="p-12 text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No Tests Running</h3>
              <p className="text-muted-foreground mb-4">
                Add tests to the queue and start a batch to see live progress
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tests
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers">
          <MultiWorkerProgress
            workerCount={config.concurrency}
            onPauseAll={pauseBatch}
            onResumeAll={resumeBatch}
          />
        </TabsContent>

        {/* Grid View Tab */}
        <TabsContent value="grid">
          <BulkRunnerGrid
            state={{
              mode: 'bulk',
              status: status,
              items: items.map((item) => ({
                id: item.id,
                eaId: item.eaId,
                eaName: item.eaName,
                status: item.status === 'completed' ? 'done' : 
                        item.status === 'failed' ? 'error' : 
                        item.status as any,
                progress: item.progress,
              })),
              totalItems: items.length,
              completedItems: stats.completed,
              failedItems: stats.failed,
              reusedItems: stats.cached,
              currentPage: 1,
            }}
            pageSize={config.batchSize}
            onStart={handleStart}
            onPause={pauseBatch}
            onResume={resumeBatch}
            onCancel={stopBatch}
            onReset={clearQueue}
            onPageChange={() => {}}
          />
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="compare" className="space-y-4">
          <BulkTestComparison items={items} />
        </TabsContent>

        {/* Results/History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Test Results
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  disabled={stats.completed === 0}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {items.filter(i => i.status === 'completed' || i.status === 'failed' || i.status === 'cached').length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <History className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No results yet</p>
                      <p className="text-xs">Run tests to see results here</p>
                    </div>
                  ) : (
                    items
                      .filter(i => i.status === 'completed' || i.status === 'failed' || i.status === 'cached')
                      .map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-muted/50',
                            item.status === 'failed' && 'border-red-500/30 bg-red-500/5',
                            item.status === 'cached' && 'border-purple-500/30 bg-purple-500/5'
                          )}
                        >
                          {/* Status Icon */}
                          <div className={cn(
                            'p-2 rounded-lg',
                            item.status === 'completed' && 'bg-emerald-500/10 text-emerald-500',
                            item.status === 'failed' && 'bg-red-500/10 text-red-500',
                            item.status === 'cached' && 'bg-purple-500/10 text-purple-500'
                          )}>
                            {item.status === 'completed' && <CheckCircle2 className="h-5 w-5" />}
                            {item.status === 'failed' && <XCircle className="h-5 w-5" />}
                            {item.status === 'cached' && <Zap className="h-5 w-5" />}
                          </div>

                          {/* Test Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{item.eaName}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {item.symbol} • {item.timeframe}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.dateRange.from} → {item.dateRange.to}
                            </p>
                            {item.error && (
                              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {item.error}
                              </p>
                            )}
                          </div>

                          {/* Results */}
                          {item.result && (
                            <div className="hidden md:grid grid-cols-4 gap-4 text-center">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Profit</p>
                                <p className={cn(
                                  'font-mono text-sm font-medium',
                                  item.result.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'
                                )}>
                                  ${item.result.netProfit.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">PF</p>
                                <p className="font-mono text-sm font-medium">
                                  {item.result.profitFactor.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Win Rate</p>
                                <p className="font-mono text-sm font-medium">
                                  {item.result.winRate.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">DD</p>
                                <p className="font-mono text-sm font-medium text-orange-500">
                                  {item.result.maxDrawdownPct.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Duration */}
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="font-mono text-sm">
                              {item.duration ? formatDuration(item.duration / 1000) : '-'}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => retryItem(item.id)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Re-run Test</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Performance Settings
                </CardTitle>
                <CardDescription>
                  Configure worker count and batch processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Worker Count (Concurrency)</Label>
                    <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {config.concurrency}
                    </span>
                  </div>
                  <Slider
                    value={[config.concurrency]}
                    onValueChange={([val]) => updateConfig({ concurrency: val })}
                    min={1}
                    max={4}
                    step={1}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    More workers = faster processing, higher CPU usage
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Batch Size (Grid Slots)</Label>
                    <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {config.batchSize}
                    </span>
                  </div>
                  <Select
                    value={config.batchSize.toString()}
                    onValueChange={(val) => updateConfig({ batchSize: parseInt(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 slots per page</SelectItem>
                      <SelectItem value="20">20 slots per page</SelectItem>
                      <SelectItem value="50">50 slots per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Test Timeout</Label>
                    <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {formatDuration(config.timeout)}
                    </span>
                  </div>
                  <Slider
                    value={[config.timeout]}
                    onValueChange={([val]) => updateConfig({ timeout: val })}
                    min={60}
                    max={600}
                    step={30}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Behavior Settings
                </CardTitle>
                <CardDescription>
                  Configure failure handling and caching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>On Failure Policy</Label>
                  <Select
                    value={config.failPolicy}
                    onValueChange={(val: 'continue' | 'stop' | 'retry') => updateConfig({ failPolicy: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continue">Continue with next</SelectItem>
                      <SelectItem value="stop">Stop batch</SelectItem>
                      <SelectItem value="retry">Retry failed (up to max)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.failPolicy === 'retry' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Max Retries</Label>
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {config.maxRetries}
                      </span>
                    </div>
                    <Slider
                      value={[config.maxRetries]}
                      onValueChange={([val]) => updateConfig({ maxRetries: val })}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cache Previous Results</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Skip re-running identical tests
                    </p>
                  </div>
                  <Switch
                    checked={config.cachePreviousResults}
                    onCheckedChange={(checked) => updateConfig({ cachePreviousResults: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Priority Mode</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Enable priority lanes for queue
                    </p>
                  </div>
                  <Switch
                    checked={config.priorityMode}
                    onCheckedChange={(checked) => updateConfig({ priorityMode: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Settings
                </CardTitle>
                <CardDescription>
                  Configure automatic result exports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Export on Completion</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Automatically export when batch completes
                      </p>
                    </div>
                    <Switch
                      checked={config.autoExport}
                      onCheckedChange={(checked) => updateConfig({ autoExport: checked })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Export Format</Label>
                    <Select
                      value={config.exportFormat}
                      onValueChange={(val: 'excel' | 'csv' | 'json') => updateConfig({ exportFormat: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx) - Multi-sheet</SelectItem>
                        <SelectItem value="csv">CSV - Single file</SelectItem>
                        <SelectItem value="json">JSON - Full data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium mb-1">Excel Export Includes:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Overview_Compare sheet with PASS/FAIL status</li>
                    <li>Rankings sheet (Top 10 by Return/DD/Sharpe)</li>
                    <li>Per-EA sheets with inputs, KPIs, equity curves</li>
                    <li>Data_Quality and Settings_Snapshot sheets</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EASelector
        open={eaSelectorOpen}
        onClose={() => setEaSelectorOpen(false)}
        onSelect={addItems}
      />
      <FileUploadDialog
        open={fileUploadOpen}
        onClose={() => setFileUploadOpen(false)}
        onUpload={addItems}
      />
    </div>
  );
}
