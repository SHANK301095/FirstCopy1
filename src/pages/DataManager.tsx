/**
 * Data Manager Page
 * CSV import, column mapping, dataset management with Symbol Folders
 * Cloud-first with Supabase sync
 * Spec: Screen A - Data
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Trash2,
  Search,
  Clock,
  Database,
  FolderOpen,
  Folder,
  Edit2,
  GitMerge,
  Download,
  Eye,
  ChevronRight,
  Loader2,
  BarChart3,
  Calendar,
  Cloud,
  CloudOff,
  RefreshCw,
  HelpCircle,
  Info,
  Zap,
  Play,
} from 'lucide-react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { db, Dataset, DatasetChunk } from '@/db/index';
import { DatasetPreviewPanel } from '@/components/data/DatasetPreviewPanel';
import { DatasetQualityPanel } from '@/components/data/DatasetQualityPanel';
import { CoverageHeatmap } from '@/components/data/CoverageHeatmap';
import { DataQualityScanner } from '@/components/data/DataQualityScanner';
import { useDataSync } from '@/hooks/useDataSync';
import { useAuth } from '@/contexts/AuthContext';
import { getStoredScan, storeQualityScan, getQualityBadge, type StoredQualityScan } from '@/lib/qualityScanStore';
import { scanDatasetQuality } from '@/lib/datasetQuality';
// NeuralLoading, ScanLineLoading, HolographicStatCard removed for finance-grade UI
import { secureLogger } from '@/lib/secureLogger';
import { PageTitle } from '@/components/ui/PageTitle';
import { FlowStepper } from '@/components/workflow/FlowStepper';
import { InlineHelp, FeatureHelpPanel } from '@/components/help';
import { BulkActionsToolbar } from '@/components/data/BulkActionsToolbar';
import { FilterBottomSheet } from '@/components/mobile/FilterBottomSheet';
import { DataImportWizard } from '@/components/data/DataImportWizard';
import { SharedDatasetsBrowser } from '@/components/data/SharedDatasetsBrowser';
import type { SharedDataset } from '@/lib/sharedDataService';

// TradingView Help Panel Component
function TradingViewHelpPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          TradingView Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            TradingView Data Import
          </DialogTitle>
          <DialogDescription>
            Important limitations for TradingView data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Automated Export</AlertTitle>
            <AlertDescription>
              TradingView does not provide reliable automated bulk data export. 
              This is a platform limitation, not an MMC issue.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Available Options:</h4>
            
            <div className="space-y-2">
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 font-medium">
                  <Badge variant="secondary">1</Badge>
                  Manual CSV Export (TradingView Pro+)
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Export data manually from TradingView charts. Requires paid TradingView subscription.
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 font-medium">
                  <Badge variant="secondary">2</Badge>
                  Broker/Exchange CSV Import
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Download historical data from your broker (Zerodha, Upstox) or NSE/BSE directly.
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 font-medium">
                  <Badge variant="outline">3</Badge>
                  MT5 Desktop Module
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the MMC Desktop module to import data directly from MetaTrader 5.
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Spec: Column mapping (ts,o,h,l,c,v[,symbol,spread])
type ColumnMapping = 'timestamp' | 'open' | 'high' | 'low' | 'close' | 'volume' | 'symbol' | 'spread' | 'none';

interface ColumnConfig {
  name: string;
  mapping: ColumnMapping;
}

const COLUMN_MAPPINGS: { value: ColumnMapping; label: string; required: boolean }[] = [
  { value: 'timestamp', label: 'Timestamp', required: true },
  { value: 'open', label: 'Open', required: true },
  { value: 'high', label: 'High', required: true },
  { value: 'low', label: 'Low', required: true },
  { value: 'close', label: 'Close', required: true },
  { value: 'volume', label: 'Volume', required: false },
  { value: 'symbol', label: 'Symbol', required: false },
  { value: 'spread', label: 'Spread', required: false },
  { value: 'none', label: 'Ignore', required: false },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
];

const DUPLICATE_POLICIES = [
  { value: 'keep-first', label: 'Keep First' },
  { value: 'keep-last', label: 'Keep Last' },
];

const MISSING_POLICIES = [
  { value: 'allow', label: 'Allow Gaps' },
  { value: 'fill', label: 'Forward Fill' },
  { value: 'drop', label: 'Drop Rows' },
];

const CHUNK_SIZE = 100000; // Spec: Default chunk size 100k rows

export default function DataManager() {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  
  // Symbol folder state
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<string>>(new Set());
  
  // Rename folder dialog
  const [renamingSymbol, setRenamingSymbol] = useState<string | null>(null);
  const [newSymbolName, setNewSymbolName] = useState('');
  
  // Delete folder dialog
  const [deletingSymbol, setDeletingSymbol] = useState<string | null>(null);
  
  // Merge dialog
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeMode, setMergeMode] = useState<'append' | 'stitch'>('stitch');
  const [overlapPolicy, setOverlapPolicy] = useState<'keep-last' | 'keep-first' | 'drop-duplicates'>('keep-last');
  const [gapPolicy, setGapPolicy] = useState<'allow' | 'warn' | 'block'>('allow');
  const [mergeOutputName, setMergeOutputName] = useState('');
  const [deleteSources, setDeleteSources] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeMessage, setMergeMessage] = useState('');
  
  // Preview state
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [viewTab, setViewTab] = useState<'datasets' | 'coverage' | 'quality' | 'scanner'>('datasets');
  
  // Quality scan state
  const [qualityScans, setQualityScans] = useState<Record<string, StoredQualityScan>>({});
  const [bulkScanning, setBulkScanning] = useState(false);
  const [bulkScanProgress, setBulkScanProgress] = useState({ current: 0, total: 0, currentDataset: '' });
  
  // Import state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string | number>[]>([]);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [duplicatePolicy, setDuplicatePolicy] = useState<'keep-first' | 'keep-last'>('keep-first');
  const [missingPolicy, setMissingPolicy] = useState<'allow' | 'fill' | 'drop'>('allow');
  const [manualSymbol, setManualSymbol] = useState('');
  const [validationStats, setValidationStats] = useState<{
    gaps: number;
    duplicates: number;
    nans: number;
    inferredTF: string;
    detectedSymbol: string | null;
  } | null>(null);
  
  // Import Wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);
  
  // Load stored quality scans
  useEffect(() => {
    const loadQualityScans = () => {
      const stored: Record<string, StoredQualityScan> = {};
      datasets.forEach(d => {
        const scan = getStoredScan(d.id);
        if (scan) stored[d.id] = scan;
      });
      setQualityScans(stored);
    };
    if (datasets.length > 0) loadQualityScans();
  }, [datasets]);
  
  // Bulk scan all datasets in folder
  const runBulkScan = async () => {
    if (selectedFolderDatasets.length === 0) return;
    
    setBulkScanning(true);
    setBulkScanProgress({ current: 0, total: selectedFolderDatasets.length, currentDataset: '' });
    
    const newScans: Record<string, StoredQualityScan> = { ...qualityScans };
    
    for (let i = 0; i < selectedFolderDatasets.length; i++) {
      const dataset = selectedFolderDatasets[i];
      setBulkScanProgress({ current: i + 1, total: selectedFolderDatasets.length, currentDataset: dataset.name });
      
      try {
        const result = await scanDatasetQuality(dataset.id);
        await storeQualityScan(result);
        newScans[dataset.id] = {
          id: result.datasetId,
          datasetId: result.datasetId,
          scannedAt: result.scannedAt,
          totalBars: result.totalBars,
          qualityScore: result.summary.qualityScore,
          summary: {
            gaps: result.summary.gaps,
            duplicates: result.summary.duplicates,
            timezoneDriftDetected: result.summary.timezoneDriftDetected,
            outliers: result.summary.outliers,
            missingOHLCV: result.summary.missingOHLCV,
            badCandles: result.summary.badCandles,
          },
          expectedTimeframe: result.expectedTimeframe,
          detectedTimeframe: result.detectedTimeframe,
          recommendations: result.recommendations,
          issuesCount: result.issues.length,
        };
      } catch (err) {
        secureLogger.warn('data', `Failed to scan dataset: ${dataset.name}`, { datasetId: dataset.id, error: String(err) });
      }
    }
    
    setQualityScans(newScans);
    setBulkScanning(false);
    toast({ title: 'Bulk Scan Complete', description: `Scanned ${selectedFolderDatasets.length} datasets` });
  };

  // Computed: unique symbols (folders) with counts
  const symbolFolders = useMemo(() => {
    const folderMap = new Map<string, { count: number; totalRows: number }>();
    datasets.forEach(d => {
      const existing = folderMap.get(d.symbol) || { count: 0, totalRows: 0 };
      folderMap.set(d.symbol, { 
        count: existing.count + 1, 
        totalRows: existing.totalRows + d.rowCount 
      });
    });
    return Array.from(folderMap.entries())
      .map(([symbol, stats]) => ({ symbol, ...stats }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [datasets]);

  // Computed: datasets for selected symbol
  const selectedFolderDatasets = useMemo(() => {
    if (!selectedSymbol) return [];
    return datasets
      .filter(d => d.symbol === selectedSymbol)
      .sort((a, b) => b.rangeFromTs - a.rangeFromTs);
  }, [datasets, selectedSymbol]);

  // Load datasets from Dexie
  useEffect(() => {
    const loadDatasets = async () => {
      const data = await db.datasets.orderBy('createdAt').reverse().toArray();
      setDatasets(data);
      // Auto-select first symbol if none selected
      if (data.length > 0 && !selectedSymbol) {
        const symbols = [...new Set(data.map(d => d.symbol))];
        if (symbols.length > 0) setSelectedSymbol(symbols[0]);
      }
    };
    loadDatasets();
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const processCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 1000,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string | number>[];
        
        // Auto-detect column mappings
        const cols: ColumnConfig[] = headers.map((h) => {
          const lower = h.toLowerCase();
          let mapping: ColumnMapping = 'none';
          if (lower.includes('time') || lower.includes('date')) mapping = 'timestamp';
          else if (lower === 'open' || lower === 'o') mapping = 'open';
          else if (lower === 'high' || lower === 'h') mapping = 'high';
          else if (lower === 'low' || lower === 'l') mapping = 'low';
          else if (lower === 'close' || lower === 'c') mapping = 'close';
          else if (lower.includes('vol')) mapping = 'volume';
          else if (lower.includes('symbol') || lower.includes('ticker')) mapping = 'symbol';
          else if (lower.includes('spread')) mapping = 'spread';
          return { name: h, mapping };
        });

        // Detect symbol from data
        let detectedSymbol: string | null = null;
        const symbolCol = cols.find(c => c.mapping === 'symbol');
        if (symbolCol && rows.length > 0) {
          const symbols = [...new Set(rows.map(r => String(r[symbolCol.name])))];
          if (symbols.length === 1) {
            detectedSymbol = symbols[0];
          }
        }
        
        // Try to extract from filename if not detected
        if (!detectedSymbol) {
          const match = file.name.match(/^([A-Z]{3,})/i);
          if (match) detectedSymbol = match[1].toUpperCase();
        }

        // Validation stats
        let gaps = 0;
        let duplicates = 0;
        let nans = 0;
        const timestamps: number[] = [];
        
        rows.forEach((row) => {
          const tsCol = cols.find(c => c.mapping === 'timestamp');
          if (tsCol) {
            const ts = new Date(String(row[tsCol.name])).getTime();
            if (timestamps.includes(ts)) duplicates++;
            timestamps.push(ts);
          }
          Object.values(row).forEach((v) => {
            if (v === '' || v === null || v === undefined || v === 'NaN' || (typeof v === 'number' && isNaN(v))) {
              nans++;
            }
          });
        });

        // Infer timeframe
        let inferredTF = 'Unknown';
        if (timestamps.length > 1) {
          const diffs = timestamps.slice(1).map((t, i) => t - timestamps[i]);
          const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
          if (avgDiff <= 60000) inferredTF = 'M1';
          else if (avgDiff <= 300000) inferredTF = 'M5';
          else if (avgDiff <= 900000) inferredTF = 'M15';
          else if (avgDiff <= 1800000) inferredTF = 'M30';
          else if (avgDiff <= 3600000) inferredTF = 'H1';
          else if (avgDiff <= 14400000) inferredTF = 'H4';
          else if (avgDiff <= 86400000) inferredTF = 'D1';
          else inferredTF = 'W1';
        }

        setPendingFile(file);
        setColumns(cols);
        setPreviewRows(rows.slice(0, 100));
        setManualSymbol(detectedSymbol || '');
        setValidationStats({ gaps, duplicates, nans, inferredTF, detectedSymbol });
        
        toast({ title: 'CSV Parsed', description: `${rows.length} preview rows, ${headers.length} columns` });
      },
      error: (err) => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      },
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.csv'));
    if (files.length > 0) processCSV(files[0]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCSV(e.target.files[0]);
    }
  };

  const updateColumnMapping = (name: string, mapping: ColumnMapping) => {
    setColumns(cols => cols.map(c => c.name === name ? { ...c, mapping } : c));
  };

  const clearPending = () => {
    setPendingFile(null);
    setColumns([]);
    setPreviewRows([]);
    setValidationStats(null);
    setManualSymbol('');
  };

  const importDataset = async () => {
    if (!pendingFile) return;
    
    const requiredMapped = COLUMN_MAPPINGS.filter(m => m.required)
      .every(m => columns.some(c => c.mapping === m.value));
    
    if (!requiredMapped) {
      toast({ title: 'Missing Mappings', description: 'Map all required columns', variant: 'destructive' });
      return;
    }

    const symbol = manualSymbol.trim().toUpperCase() || 'UNKNOWN';
    if (!symbol || symbol === 'UNKNOWN') {
      toast({ title: 'Symbol Required', description: 'Please enter a symbol/folder name', variant: 'destructive' });
      return;
    }

    setImporting(true);

    try {
      const datasetId = uuidv4();
      const allRows: number[][] = [];
      
      await new Promise<void>((resolve, reject) => {
        Papa.parse(pendingFile, {
          header: true,
          skipEmptyLines: true,
          step: (row) => {
            const data = row.data as Record<string, string>;
            const tsCol = columns.find(c => c.mapping === 'timestamp');
            const oCol = columns.find(c => c.mapping === 'open');
            const hCol = columns.find(c => c.mapping === 'high');
            const lCol = columns.find(c => c.mapping === 'low');
            const cCol = columns.find(c => c.mapping === 'close');
            const vCol = columns.find(c => c.mapping === 'volume');
            
            if (tsCol && oCol && hCol && lCol && cCol) {
              const ts = new Date(data[tsCol.name]).getTime();
              const o = parseFloat(data[oCol.name]) || 0;
              const h = parseFloat(data[hCol.name]) || 0;
              const l = parseFloat(data[lCol.name]) || 0;
              const c = parseFloat(data[cCol.name]) || 0;
              const v = vCol ? parseFloat(data[vCol.name]) || 0 : 0;
              allRows.push([ts, o, h, l, c, v]);
            }
          },
          complete: () => resolve(),
          error: (err) => reject(err),
        });
      });

      // Store chunks
      const numChunks = Math.ceil(allRows.length / CHUNK_SIZE);
      for (let i = 0; i < numChunks; i++) {
        const chunk: DatasetChunk = {
          id: uuidv4(),
          datasetId,
          index: i,
          rows: allRows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        };
        await db.datasetChunks.put(chunk);
      }

      const firstTs = allRows[0]?.[0] || 0;
      const lastTs = allRows[allRows.length - 1]?.[0] || 0;
      
      const dataset: Dataset = {
        id: datasetId,
        name: pendingFile.name.replace('.csv', ''),
        symbol,
        timeframe: validationStats?.inferredTF || 'Unknown',
        tz: timezone,
        rowCount: allRows.length,
        columnsMap: Object.fromEntries(columns.filter(c => c.mapping !== 'none').map(c => [c.name, c.mapping])),
        importMeta: {
          source: 'file',
          importedAt: Date.now(),
          fileSize: pendingFile.size,
        },
        duplicatePolicy,
        missingPolicy,
        stats: {
          firstTs,
          lastTs,
          gaps: validationStats?.gaps || 0,
          duplicates: validationStats?.duplicates || 0,
        },
        chunks: numChunks,
        createdAt: Date.now(),
        rangeFromTs: firstTs,
        rangeToTs: lastTs,
        sourceName: pendingFile.name.replace('.csv', ''),
      };

      await db.datasets.put(dataset);
      await db.log('info', 'Dataset imported', { datasetId, rowCount: allRows.length });

      setDatasets(prev => [dataset, ...prev]);
      setSelectedSymbol(symbol);
      clearPending();
      toast({ title: 'Dataset Imported', description: `${allRows.length.toLocaleString()} rows saved to ${symbol}` });
    } catch (err) {
      toast({ title: 'Import Failed', description: String(err), variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const deleteDataset = async (id: string) => {
    await db.datasetChunks.where('datasetId').equals(id).delete();
    await db.datasets.delete(id);
    setDatasets(prev => prev.filter(d => d.id !== id));
    setSelectedDatasetIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    toast({ title: 'Deleted', description: 'Dataset removed' });
  };

  const renameFolder = async () => {
    if (!renamingSymbol || !newSymbolName.trim()) return;
    const newName = newSymbolName.trim().toUpperCase();
    
    await db.transaction('rw', db.datasets, async () => {
      const toUpdate = await db.datasets.where('symbol').equals(renamingSymbol).toArray();
      for (const ds of toUpdate) {
        await db.datasets.update(ds.id, { symbol: newName });
      }
    });
    
    setDatasets(prev => prev.map(d => 
      d.symbol === renamingSymbol ? { ...d, symbol: newName } : d
    ));
    
    if (selectedSymbol === renamingSymbol) {
      setSelectedSymbol(newName);
    }
    
    setRenamingSymbol(null);
    setNewSymbolName('');
    toast({ title: 'Folder Renamed', description: `${renamingSymbol} → ${newName}` });
  };

  const deleteFolder = async () => {
    if (!deletingSymbol) return;
    
    const toDelete = datasets.filter(d => d.symbol === deletingSymbol);
    
    await db.transaction('rw', [db.datasets, db.datasetChunks], async () => {
      for (const ds of toDelete) {
        await db.datasetChunks.where('datasetId').equals(ds.id).delete();
        await db.datasets.delete(ds.id);
      }
    });
    
    setDatasets(prev => prev.filter(d => d.symbol !== deletingSymbol));
    
    if (selectedSymbol === deletingSymbol) {
      const remaining = symbolFolders.filter(f => f.symbol !== deletingSymbol);
      setSelectedSymbol(remaining.length > 0 ? remaining[0].symbol : null);
    }
    
    setDeletingSymbol(null);
    toast({ title: 'Folder Deleted', description: `${toDelete.length} datasets removed` });
  };

  const toggleDatasetSelection = (id: string) => {
    setSelectedDatasetIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const openMergeDialog = () => {
    if (selectedDatasetIds.size < 2) return;
    
    const selected = selectedFolderDatasets.filter(d => selectedDatasetIds.has(d.id));
    const defaultName = `${selectedSymbol}_merged_${new Date().toISOString().split('T')[0]}`;
    setMergeOutputName(defaultName);
    setShowMergeDialog(true);
  };

  const performMerge = async () => {
    if (selectedDatasetIds.size < 2) return;
    
    const selected = selectedFolderDatasets.filter(d => selectedDatasetIds.has(d.id));
    
    // Validate same timeframe
    const timeframes = new Set(selected.map(d => d.timeframe));
    if (timeframes.size > 1) {
      toast({ title: 'Merge Error', description: 'All datasets must have the same timeframe', variant: 'destructive' });
      return;
    }
    
    // Estimate total rows
    const totalRows = selected.reduce((sum, d) => sum + d.rowCount, 0);
    if (totalRows > 10000000 && gapPolicy !== 'allow') {
      toast({ title: 'Large Dataset Warning', description: `Merging ${totalRows.toLocaleString()} rows may take a while` });
    }
    
    setMerging(true);
    setMergeProgress(0);
    setMergeMessage('Starting merge...');
    
    try {
      const worker = new Worker(new URL('../workers/merge.worker.ts', import.meta.url), { type: 'module' });
      
      await new Promise<void>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.type === 'progress') {
            setMergeProgress(e.data.pct);
            setMergeMessage(e.data.message);
          } else if (e.data.type === 'result') {
            if (e.data.success) {
              // Reload datasets
              db.datasets.orderBy('createdAt').reverse().toArray().then(data => {
                setDatasets(data);
                setSelectedDatasetIds(new Set());
                setShowMergeDialog(false);
                toast({ 
                  title: 'Merge Complete', 
                  description: `Created ${mergeOutputName} with ${e.data.stats.totalRows.toLocaleString()} rows` 
                });
                resolve();
              });
            } else {
              reject(new Error(e.data.error));
            }
            worker.terminate();
          }
        };
        
        worker.onerror = (err) => {
          reject(err);
          worker.terminate();
        };
        
        worker.postMessage({
          type: 'merge',
          datasetIds: Array.from(selectedDatasetIds),
          outputName: mergeOutputName,
          mergeMode,
          overlapPolicy,
          gapPolicy,
          deleteSources,
          chunkSize: CHUNK_SIZE,
        });
      });
    } catch (err) {
      toast({ title: 'Merge Failed', description: String(err), variant: 'destructive' });
    } finally {
      setMerging(false);
      setMergeProgress(0);
      setMergeMessage('');
    }
  };

  const formatDateRange = (fromTs: number, toTs: number) => {
    if (!fromTs || !toTs) return 'Unknown';
    const from = new Date(fromTs).toLocaleDateString();
    const to = new Date(toTs).toLocaleDateString();
    return `${from} → ${to}`;
  };

  const requiredMapped = COLUMN_MAPPINGS.filter(m => m.required)
    .every(m => columns.some(c => c.mapping === m.value));

  const filteredFolders = symbolFolders.filter(f => 
    f.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle wizard import completion
  const handleWizardComplete = async (data: {
    rows: number[][];
    metadata: {
      name: string;
      symbol: string;
      timeframe: string;
      timezone: string;
      rowCount: number;
      rangeFrom: number;
      rangeTo: number;
    };
  }) => {
    try {
      const datasetId = uuidv4();
      const numChunks = Math.ceil(data.rows.length / CHUNK_SIZE);
      
      // Store chunks
      for (let i = 0; i < numChunks; i++) {
        const chunkRows = data.rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await db.datasetChunks.put({
          id: `${datasetId}_chunk_${i}`,
          datasetId,
          index: i,
          rows: chunkRows,
        });
      }
      
      const dataset: Dataset = {
        id: datasetId,
        name: data.metadata.name,
        symbol: data.metadata.symbol.toUpperCase() || 'UNKNOWN',
        timeframe: data.metadata.timeframe,
        tz: data.metadata.timezone,
        rowCount: data.rows.length,
        columnsMap: {
          timestamp: 'timestamp',
          open: 'open',
          high: 'high',
          low: 'low',
          close: 'close',
          volume: 'volume',
        },
        importMeta: {
          source: 'wizard',
          importedAt: Date.now(),
        },
        duplicatePolicy: 'keep-first',
        missingPolicy: 'allow',
        stats: {
          firstTs: data.metadata.rangeFrom,
          lastTs: data.metadata.rangeTo,
          gaps: 0,
          duplicates: 0,
        },
        chunks: numChunks,
        createdAt: Date.now(),
        rangeFromTs: data.metadata.rangeFrom,
        rangeToTs: data.metadata.rangeTo,
        sourceName: data.metadata.name,
      };
      
      await db.datasets.put(dataset);
      setDatasets(prev => [dataset, ...prev]);
      setSelectedSymbol(dataset.symbol);
      setShowImportWizard(false);
      toast({ title: 'Import Complete', description: `${data.rows.length.toLocaleString()} rows imported to ${dataset.symbol}` });
    } catch (err) {
      toast({ title: 'Import Failed', description: String(err), variant: 'destructive' });
    }
  };

  return (
    <PageErrorBoundary pageName="Data Manager">
    <div className="space-y-6 animate-fade-in">
      {/* Import Wizard Modal */}
      <DataImportWizard 
        open={showImportWizard} 
        onClose={() => setShowImportWizard(false)}
        onComplete={handleWizardComplete}
      />
      
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <PageTitle 
            title="Data Manager" 
            subtitle="Import and manage historical CSV datasets by symbol" 
          />
          <InlineHelp topicId="csv-import" />
        </div>
        <div className="flex items-center gap-3">
          <FeatureHelpPanel compact />
          <Button 
            onClick={() => setShowImportWizard(true)}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Quick Import
          </Button>
          <FlowStepper 
            status={{ hasData: datasets.length > 0 }} 
            className="hidden md:flex"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Panel */}
        <Card
          className={cn(
            'border-2 border-dashed transition-all lg:col-span-2',
            dragActive ? 'border-primary bg-primary/5' : 'border-border'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import CSV Dataset
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!pendingFile ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Upload className={cn('h-16 w-16 mb-4', dragActive ? 'text-primary' : 'text-muted-foreground')} />
                <h3 className="text-lg font-semibold mb-2">Drag & Drop CSV File</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Upload OHLCV data with columns: timestamp, open, high, low, close, volume
                </p>
                <label>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
                  <Button asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold">{pendingFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearPending}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Symbol Input */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="symbol-input" className="text-sm font-medium">
                    Folder (Symbol) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="symbol-input"
                    value={manualSymbol}
                    onChange={(e) => setManualSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. NIFTY, BANKNIFTY"
                    className="mt-1"
                  />
                  {validationStats?.detectedSymbol && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-detected: {validationStats.detectedSymbol}
                    </p>
                  )}
                </div>

                {/* Validation Summary */}
                {validationStats && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">TF: {validationStats.inferredTF}</Badge>
                    {validationStats.duplicates > 0 && (
                      <Badge variant="outline" className="text-warning border-warning">
                        {validationStats.duplicates} duplicates
                      </Badge>
                    )}
                    {validationStats.nans > 0 && (
                      <Badge variant="outline" className="text-warning border-warning">
                        {validationStats.nans} NaN/empty
                      </Badge>
                    )}
                    {requiredMapped && manualSymbol.trim() ? (
                      <Badge variant="outline" className="text-profit border-profit">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-loss border-loss">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {!manualSymbol.trim() ? 'Enter symbol' : 'Map required'}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Column Mapping */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Column Mapping</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {columns.map((col) => (
                      <div key={col.name} className="flex items-center gap-2">
                        <span className="font-mono text-xs truncate flex-1">{col.name}</span>
                        <Select
                          value={col.mapping}
                          onValueChange={(v) => updateColumnMapping(col.name, v as ColumnMapping)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMN_MAPPINGS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}{m.required && '*'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Import Settings */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Timezone</label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Duplicates</label>
                    <Select value={duplicatePolicy} onValueChange={(v) => setDuplicatePolicy(v as 'keep-first' | 'keep-last')}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DUPLICATE_POLICIES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Missing Data</label>
                    <Select value={missingPolicy} onValueChange={(v) => setMissingPolicy(v as 'allow' | 'fill' | 'drop')}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MISSING_POLICIES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={importDataset} 
                  disabled={!requiredMapped || importing || !manualSymbol.trim()}
                >
                  {importing ? 'Importing...' : 'Import Dataset'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Market Data Browser */}
        <SharedDatasetsBrowser 
          compact
          onSelectDataset={(dataset: SharedDataset) => {
            toast({
              title: `Selected: ${dataset.symbol}`,
              description: `${dataset.row_count.toLocaleString()} rows, ${dataset.timeframe} timeframe`,
            });
          }}
        />

        {/* Symbol Folders Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-5 w-5 text-primary" />
              Symbol Folders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search symbols..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8"
                />
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              {filteredFolders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No folders yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.symbol}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group',
                        selectedSymbol === folder.symbol 
                          ? 'bg-primary/10 text-primary' 
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => {
                        setSelectedSymbol(folder.symbol);
                        setSelectedDatasetIds(new Set());
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Folder className="h-4 w-4 shrink-0" />
                        <span className="font-medium truncate">{folder.symbol}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {folder.count}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingSymbol(folder.symbol);
                            setNewSymbolName(folder.symbol);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSymbol(folder.symbol);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Selected Folder Datasets + Coverage + Preview */}
      {selectedSymbol && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Datasets List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    {selectedSymbol} Datasets
                  </CardTitle>
                  <CardDescription>
                    {selectedFolderDatasets.length} dataset{selectedFolderDatasets.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                {selectedDatasetIds.size >= 2 && (
                  <Button onClick={openMergeDialog} size="sm" className="gap-2">
                    <GitMerge className="h-4 w-4" />
                    Merge ({selectedDatasetIds.size})
                  </Button>
                )}
              </div>
              
              {/* View Tabs */}
              <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'datasets' | 'coverage' | 'quality' | 'scanner')} className="mt-2">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="datasets" className="gap-1.5">
                    <Database className="h-3.5 w-3.5" />
                    Datasets
                  </TabsTrigger>
                  <TabsTrigger value="coverage" className="gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Coverage
                  </TabsTrigger>
                  <TabsTrigger value="quality" className="gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Quality
                  </TabsTrigger>
                  <TabsTrigger value="scanner" className="gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Scanner
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {viewTab === 'datasets' && (
                <ScrollArea className="h-[350px]">
                  {selectedFolderDatasets.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No datasets in this folder</p>
                      <p className="text-sm">Import a CSV to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFolderDatasets.map((dataset) => (
                        <div
                          key={dataset.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer',
                            selectedDatasetIds.has(dataset.id) 
                              ? 'bg-primary/10 ring-1 ring-primary' 
                              : previewDataset?.id === dataset.id
                                ? 'bg-accent'
                                : 'bg-muted/50 hover:bg-muted'
                          )}
                          onClick={() => setPreviewDataset(dataset)}
                        >
                          <Checkbox
                            checked={selectedDatasetIds.has(dataset.id)}
                            onCheckedChange={() => toggleDatasetSelection(dataset.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{dataset.name}</p>
                              {qualityScans[dataset.id] && (
                                <Badge 
                                  variant={getQualityBadge(qualityScans[dataset.id].qualityScore).variant}
                                  className="text-[10px] shrink-0"
                                >
                                  {qualityScans[dataset.id].qualityScore}%
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{dataset.timeframe}</Badge>
                              <span>{dataset.rowCount.toLocaleString()} rows</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateRange(dataset.rangeFromTs, dataset.rangeToTs)}
                              </span>
                              {dataset.sourceName?.startsWith('Merged:') && (
                                <Badge variant="secondary" className="text-[10px]">
                                  <GitMerge className="h-2 w-2 mr-1" />
                                  Merged
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDataset(dataset);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDataset(dataset.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                      </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
              {viewTab === 'coverage' && (
                <CoverageHeatmap datasets={selectedFolderDatasets} symbol={selectedSymbol} />
              )}
              {viewTab === 'quality' && (
                <div className="space-y-4">
                  {selectedFolderDatasets.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No datasets to analyze</p>
                      <p className="text-sm">Import a CSV to run quality checks</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Bulk Scan Section */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div>
                          <p className="font-medium text-sm">Bulk Quality Scan</p>
                          <p className="text-xs text-muted-foreground">
                            Analyze all {selectedFolderDatasets.length} datasets in this folder
                          </p>
                        </div>
                        <Button 
                          onClick={runBulkScan} 
                          disabled={bulkScanning}
                          size="sm"
                          className="gap-2"
                        >
                          {bulkScanning ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {bulkScanProgress.current}/{bulkScanProgress.total}
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Scan All
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Progress Bar */}
                      {bulkScanning && (
                        <div className="space-y-2">
                          <Progress value={(bulkScanProgress.current / bulkScanProgress.total) * 100} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center">
                            Scanning: {bulkScanProgress.currentDataset}
                          </p>
                        </div>
                      )}
                      
                      {/* Summary Stats */}
                      {Object.keys(qualityScans).length > 0 && !bulkScanning && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 rounded-lg border text-center bg-green-500/10">
                            <div className="text-xl font-bold text-green-500">
                              {selectedFolderDatasets.filter(d => qualityScans[d.id]?.qualityScore >= 90).length}
                            </div>
                            <div className="text-xs text-muted-foreground">Excellent</div>
                          </div>
                          <div className="p-3 rounded-lg border text-center bg-yellow-500/10">
                            <div className="text-xl font-bold text-yellow-500">
                              {selectedFolderDatasets.filter(d => {
                                const score = qualityScans[d.id]?.qualityScore;
                                return score !== undefined && score >= 50 && score < 90;
                              }).length}
                            </div>
                            <div className="text-xs text-muted-foreground">Fair</div>
                          </div>
                          <div className="p-3 rounded-lg border text-center bg-destructive/10">
                            <div className="text-xl font-bold text-destructive">
                              {selectedFolderDatasets.filter(d => {
                                const score = qualityScans[d.id]?.qualityScore;
                                return score !== undefined && score < 50;
                              }).length}
                            </div>
                            <div className="text-xs text-muted-foreground">Poor</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Dataset List with Quality Scores */}
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-2">
                          {selectedFolderDatasets.map((dataset) => {
                            const scan = qualityScans[dataset.id];
                            const badge = scan ? getQualityBadge(scan.qualityScore) : null;
                            
                            return (
                              <div
                                key={dataset.id}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                                  previewDataset?.id === dataset.id ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted/50 hover:bg-muted'
                                )}
                                onClick={() => setPreviewDataset(dataset)}
                              >
                                <Database className="h-4 w-4 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{dataset.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {dataset.rowCount.toLocaleString()} rows • {dataset.timeframe}
                                  </div>
                                </div>
                                {scan ? (
                                  <div className="text-right shrink-0">
                                    <Badge variant={badge?.variant} className="mb-1">
                                      {scan.qualityScore}% {badge?.label}
                                    </Badge>
                                    <div className="text-[10px] text-muted-foreground">
                                      {scan.issuesCount} issues
                                    </div>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">
                                    Not scanned
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                      
                      {previewDataset && (
                        <DatasetQualityPanel 
                          datasetId={previewDataset.id} 
                          datasetName={previewDataset.name} 
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
              {viewTab === 'scanner' && (
                <DataQualityScanner />
              )}
            </CardContent>
          </Card>

          {/* Preview / Quality Panel */}
          <div className="lg:col-span-1 space-y-4">
            {previewDataset ? (
              <>
                <DatasetPreviewPanel 
                  dataset={previewDataset} 
                  onClose={() => setPreviewDataset(null)} 
                />
                <DatasetQualityPanel 
                  datasetId={previewDataset.id} 
                  datasetName={previewDataset.name} 
                />
              </>
            ) : (
              <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">Select a dataset to preview</p>
                  <p className="text-sm">Click on any dataset to see its chart and quality stats</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Rename Folder Dialog */}
      <Dialog open={!!renamingSymbol} onOpenChange={() => setRenamingSymbol(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              This will update the symbol for all datasets in this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-symbol">New Symbol Name</Label>
            <Input
              id="new-symbol"
              value={newSymbolName}
              onChange={(e) => setNewSymbolName(e.target.value.toUpperCase())}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingSymbol(null)}>Cancel</Button>
            <Button onClick={renameFolder} disabled={!newSymbolName.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <AlertDialog open={!!deletingSymbol} onOpenChange={() => setDeletingSymbol(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {datasets.filter(d => d.symbol === deletingSymbol).length} datasets 
              in the "{deletingSymbol}" folder. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-primary" />
              Merge Datasets
            </DialogTitle>
            <DialogDescription>
              Combine {selectedDatasetIds.size} datasets into a single merged dataset.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Selected datasets summary */}
            <div className="space-y-2">
              <Label>Selected Datasets</Label>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-muted/50 rounded-lg">
                {selectedFolderDatasets
                  .filter(d => selectedDatasetIds.has(d.id))
                  .map(d => (
                    <div key={d.id} className="text-sm flex justify-between">
                      <span className="truncate">{d.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {d.rowCount.toLocaleString()} rows
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Output name */}
            <div>
              <Label htmlFor="merge-name">Output Dataset Name</Label>
              <Input
                id="merge-name"
                value={mergeOutputName}
                onChange={(e) => setMergeOutputName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Merge mode */}
            <div>
              <Label>Merge Mode</Label>
              <Select value={mergeMode} onValueChange={(v) => setMergeMode(v as 'append' | 'stitch')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Append (simple concatenation)</SelectItem>
                  <SelectItem value="stitch">Stitch (resolve overlaps)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Overlap resolution */}
            <div>
              <Label>Overlap Resolution</Label>
              <Select value={overlapPolicy} onValueChange={(v) => setOverlapPolicy(v as 'keep-last' | 'keep-first' | 'drop-duplicates')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep-last">Keep Last (later dataset wins)</SelectItem>
                  <SelectItem value="keep-first">Keep First (earlier dataset wins)</SelectItem>
                  <SelectItem value="drop-duplicates">Drop Duplicates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gap policy */}
            <div>
              <Label>Gap Policy</Label>
              <Select value={gapPolicy} onValueChange={(v) => setGapPolicy(v as 'allow' | 'warn' | 'block')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow Gaps</SelectItem>
                  <SelectItem value="warn">Warn on Gaps</SelectItem>
                  <SelectItem value="block">Block if Gaps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delete sources option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="delete-sources"
                checked={deleteSources}
                onCheckedChange={(checked) => setDeleteSources(checked === true)}
              />
              <Label htmlFor="delete-sources" className="text-sm cursor-pointer">
                Delete source datasets after merge
              </Label>
            </div>

            {/* Progress */}
            {merging && (
              <div className="space-y-2">
                <Progress value={mergeProgress} />
                <p className="text-sm text-muted-foreground text-center">{mergeMessage}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)} disabled={merging}>
              Cancel
            </Button>
            <Button onClick={performMerge} disabled={merging || !mergeOutputName.trim()}>
              {merging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Merging...
                </>
              ) : (
                'Merge Datasets'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageErrorBoundary>
  );
}
