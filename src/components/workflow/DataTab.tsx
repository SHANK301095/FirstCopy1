import { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, ChevronDown, Info, Download, ArrowRight, Cloud, CloudUpload, Loader2, Trash2, RefreshCw, Database, Globe } from 'lucide-react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBacktestStore, CSVColumn } from '@/lib/backtestStore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { parseBrokerData, detectBrokerFormat, type BrokerFormat } from '@/lib/brokerParsers';
import { safeText } from '@/lib/safeText';
import { useCloudDataUpload } from '@/hooks/useCloudDataUpload';
import { useAuth } from '@/contexts/AuthContext';
import { SharedDatasetSelector, type DateRangeFilter, type DatasetSettings } from '@/components/backtest/SharedDatasetSelector';
import type { SharedDataset } from '@/lib/sharedDataService';
import { QuickStartDemoButton } from './QuickStartDemoButton';

// Sample OHLCV CSV content for download
const SAMPLE_OHLCV_CSV = `time,open,high,low,close,volume
1704067200,42000.50,42150.00,41950.25,42100.75,1250.5
1704067500,42100.75,42200.00,42050.00,42175.50,980.3
1704067800,42175.50,42250.25,42100.00,42125.00,1100.8
1704068100,42125.00,42180.00,42000.00,42050.25,1450.2
1704068400,42050.25,42100.00,41900.50,41950.75,1320.6
1704068700,41950.75,42050.00,41850.00,42000.00,890.4
1704069000,42000.00,42150.50,41980.25,42100.25,1050.9
1704069300,42100.25,42200.75,42050.00,42175.00,1180.3
1704069600,42175.00,42300.00,42100.50,42250.50,1400.7
1704069900,42250.50,42350.25,42200.00,42300.00,1600.5`;

const downloadSampleCSV = () => {
  const blob = new Blob([SAMPLE_OHLCV_CSV], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'sample_ohlcv.csv';
  link.click();
  URL.revokeObjectURL(link.href);
};

// Extract symbol from filename like BINANCE_BTCUSDT_5.csv → BTCUSDT
const extractSymbolFromFilename = (filename: string): string | null => {
  const name = filename.replace(/\.csv$/i, '');
  // Common patterns: EXCHANGE_SYMBOL_TIMEFRAME or SYMBOL_TIMEFRAME or just SYMBOL
  const patterns = [
    /^[A-Z]+_([A-Z0-9]+)_\d+$/i,  // BINANCE_BTCUSDT_5
    /^([A-Z0-9]+)_\d+[mhd]?$/i,   // BTCUSDT_5m
    /^([A-Z]{3,}[A-Z]{3,})$/i,    // BTCUSDT (pair without separator)
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  
  // Fallback: try to find currency pair patterns in filename
  const pairMatch = name.match(/([A-Z]{3,6}(?:USDT?|BTC|ETH|INR|USD))/i);
  if (pairMatch) {
    return pairMatch[1].toUpperCase();
  }
  
  return null;
};

// File size limits - optimized for 300MB files × 30 = ~9GB total
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB per file for cloud
const LOCAL_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB for local processing
const WARN_FILE_SIZE = 100 * 1024 * 1024; // 100MB warning threshold
const TOTAL_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB total

const COLUMN_MAPPINGS: { value: CSVColumn['mapping']; label: string; required: boolean }[] = [
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
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
  'Asia/Singapore',
];

const FORMAT_LABELS: Record<BrokerFormat, string> = {
  mt4_csv: 'MetaTrader 4',
  mt5_csv: 'MetaTrader 5',
  mt5_hst: 'MT5 History',
  ctrader_csv: 'cTrader',
  tradingview_csv: 'TradingView',
  ninjatrader_csv: 'NinjaTrader',
  amibroker_csv: 'AmiBroker',
  zerodha_csv: 'Zerodha',
  ibkr_csv: 'Interactive Brokers',
  alpaca_csv: 'Alpaca',
  deriv_csv: 'Deriv',
  generic_csv: 'Generic CSV',
  unknown: 'Unknown'
};

interface DataTabProps {
  onProceedToStrategy?: () => void;
}

// Plan storage limits (in bytes)
const PLAN_LIMITS = {
  free: 1 * 1024 * 1024 * 1024, // 1GB
  pro: 8 * 1024 * 1024 * 1024, // 8GB
  teams: 100 * 1024 * 1024 * 1024, // 100GB
};

export function DataTab({ onProceedToStrategy }: DataTabProps) {
  const { uploadedData, setUploadedData, updateColumnMapping, setActiveSymbol, setTimezone, isDataValid } = useBacktestStore();
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploading, progress, uploadFile, listDatasets, downloadFile, deleteFile, getTotalStorageUsed } = useCloudDataUpload();
  
  const [dragActive, setDragActive] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [detectedFormat, setDetectedFormat] = useState<BrokerFormat | null>(null);
  const [cloudDatasets, setCloudDatasets] = useState<Awaited<ReturnType<typeof listDatasets>>>([]);
  const [loadingCloudData, setLoadingCloudData] = useState(false);
  const [showCloudPanel, setShowCloudPanel] = useState(false);
  const [pendingCloudUpload, setPendingCloudUpload] = useState<File | null>(null);
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);
  const [dataSourceTab, setDataSourceTab] = useState<'upload' | 'library'>('upload');
  
  // Public Library state
  const [selectedSharedDataset, setSelectedSharedDataset] = useState<SharedDataset | null>(null);
  const [sharedDatasetSettings, setSharedDatasetSettings] = useState<DatasetSettings | undefined>(undefined);

  // Load cloud datasets on mount
  useEffect(() => {
    if (user) {
      loadCloudDatasets();
    }
  }, [user]);

  const loadCloudDatasets = async () => {
    setLoadingCloudData(true);
    const datasets = await listDatasets();
    setCloudDatasets(datasets);
    // Calculate total storage
    const totalUsed = datasets.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    setTotalStorageUsed(totalUsed);
    setLoadingCloudData(false);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const validateFileSize = (file: File, forCloud: boolean = false): boolean => {
    const maxSize = forCloud ? MAX_FILE_SIZE : LOCAL_MAX_FILE_SIZE;
    const maxLabel = forCloud ? '3GB' : '25MB';
    
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: `Maximum file size is ${maxLabel}. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.${!forCloud ? ' Try uploading to cloud storage for larger files.' : ''}`,
        variant: 'destructive'
      });
      return false;
    }
    
    if (file.size > WARN_FILE_SIZE) {
      toast({
        title: 'Large File',
        description: `Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB. ${forCloud ? 'Uploading to cloud...' : 'Consider using cloud storage for better performance.'}`,
      });
    }
    
    return true;
  };

  // Upload file to cloud storage
  const handleCloudUpload = async (file: File) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to upload to cloud storage.',
        variant: 'destructive'
      });
      return;
    }

    if (!validateFileSize(file, true)) return;

    // First process locally to get metadata
    const content = await file.text();
    const { format } = detectBrokerFormat(content);
    
    // Parse first 1000 rows to get metadata
    let rowCount = 0;
    let symbol = extractSymbolFromFilename(file.name) || undefined;
    let firstTs: number | undefined;
    let lastTs: number | undefined;

    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      preview: 1000,
      complete: async (results) => {
        rowCount = results.data.length;
        
        // Try to detect timestamp range
        const headers = results.meta.fields || [];
        const timeCol = headers.find(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('date'));
        if (timeCol && results.data.length > 0) {
          const firstRow = results.data[0] as Record<string, unknown>;
          const lastRow = results.data[results.data.length - 1] as Record<string, unknown>;
          const firstTime = firstRow[timeCol];
          const lastTime = lastRow[timeCol];
          
          if (firstTime) firstTs = new Date(String(firstTime)).getTime() || Number(firstTime) * 1000;
          if (lastTime) lastTs = new Date(String(lastTime)).getTime() || Number(lastTime) * 1000;
        }

        // Upload to cloud
        const datasetId = await uploadFile(file, {
          name: file.name.replace(/\.csv$/i, ''),
          symbol,
          timeframe: format !== 'unknown' ? format : undefined,
          rowCount,
          rangeFromTs: firstTs,
          rangeToTs: lastTs,
        });

        if (datasetId) {
          await loadCloudDatasets();
          setPendingCloudUpload(null);
        }
      }
    });
  };

  // Load dataset from cloud
  const handleLoadFromCloud = async (filePath: string) => {
    setLoadingCloudData(true);
    const file = await downloadFile(filePath);
    if (file) {
      await processCSV(file);
    }
    setLoadingCloudData(false);
  };

  // Delete dataset from cloud
  const handleDeleteFromCloud = async (filePath: string, datasetId: string) => {
    const success = await deleteFile(filePath, datasetId);
    if (success) {
      await loadCloudDatasets();
    }
  };

  const processCSV = async (file: File) => {
    // Check file size FIRST
    if (!validateFileSize(file)) {
      return;
    }

    const content = await file.text();
    
    // Try auto-detection with broker parsers first
    const { format, confidence } = detectBrokerFormat(content);
    setDetectedFormat(format);
    
    if (format !== 'unknown' && confidence > 0.7) {
      // Use advanced broker parser
      const result = parseBrokerData(content, { symbol: file.name.split('.')[0] });
      
      if (result.success && result.bars.length > 0) {
        const columns: CSVColumn[] = [
          { name: 'timestamp', mapping: 'timestamp' },
          { name: 'open', mapping: 'open' },
          { name: 'high', mapping: 'high' },
          { name: 'low', mapping: 'low' },
          { name: 'close', mapping: 'close' },
          { name: 'volume', mapping: 'volume' },
        ];
        
        if (result.bars[0].spread !== undefined) {
          columns.push({ name: 'spread', mapping: 'spread' });
        }
        
        const rows = result.bars.map(bar => ({
          timestamp: new Date(bar.timestamp).toISOString(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
          spread: bar.spread,
          symbol: bar.symbol || result.symbol || 'DEFAULT'
        }));
        
        const symbols = [...new Set(rows.map(r => String(r.symbol)))];
        
        setUploadedData({
          fileName: file.name,
          columns,
          rows,
          symbols: symbols.length > 0 ? symbols : ['DEFAULT'],
          activeSymbol: symbols[0] || 'DEFAULT',
          timezone: 'Asia/Kolkata',
          validationErrors: result.errors,
          gapCount: result.metadata.gapCount,
          nanCount: 0,
        });
        
        toast({ 
          title: `${FORMAT_LABELS[format]} Detected`, 
          description: `${rows.length} bars loaded (${result.metadata.firstDate.toLocaleDateString()} - ${result.metadata.lastDate.toLocaleDateString()})` 
        });
        return;
      }
    }
    
    // Fallback to PapaParse for generic CSVs - use worker mode for large files
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true, // Use web worker to prevent UI freezing
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string | number>[];
        
        // Auto-detect column mappings
        const columns: CSVColumn[] = headers.map((h) => {
          const lower = h.toLowerCase();
          let mapping: CSVColumn['mapping'] = 'none';
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

        // Check for required columns
        const required = COLUMN_MAPPINGS.filter((m) => m.required).map((m) => m.value);
        const present = new Set(columns.map((c) => c.mapping));
        const missing = required.filter((m) => !present.has(m));
        const hasRequiredColumns = missing.length === 0;

        if (!hasRequiredColumns) {
          const lowerHeaders = headers.map((h) => h.toLowerCase());
          const looksLikeEquityCurve =
            headers.length <= 3 &&
            lowerHeaders.some((h) => h.includes('amount') || h.includes('equity') || h.includes('balance'));

          toast({
            title: looksLikeEquityCurve ? 'Wrong CSV Type for Backtest' : 'Missing Required Columns',
            description: looksLikeEquityCurve
              ? 'This file looks like an equity/balance CSV (e.g. Date + Amount). For backtesting, upload OHLCV candles: time, open, high, low, close (volume optional).'
              : `Missing: ${missing.join(', ')}. Please map the required fields in Schema Mapper (timestamp, open, high, low, close).`,
            variant: 'destructive',
          });
        }

        // Detect symbols from data or filename
        const symbolCol = columns.find((c) => c.mapping === 'symbol');
        let symbols: string[] = [];
        if (symbolCol) {
          symbols = [...new Set(rows.map((r) => String(r[symbolCol.name])).filter(Boolean))];
        }
        
        // If no symbol column, try to extract from filename
        if (symbols.length === 0) {
          const extractedSymbol = extractSymbolFromFilename(file.name);
          if (extractedSymbol) {
            symbols = [extractedSymbol];
          }
        }

        // Validation
        let nanCount = 0;
        rows.forEach((row) => {
          Object.values(row).forEach((v) => {
            if (v === '' || v === null || v === undefined) nanCount++;
            if (v === 'NaN' || (typeof v === 'number' && isNaN(v))) nanCount++;
          });
        });

        const activeSymbol = symbols[0] || 'DEFAULT';
        
        setUploadedData({
          fileName: file.name,
          columns,
          rows,
          symbols: symbols.length > 0 ? symbols : ['DEFAULT'],
          activeSymbol,
          timezone: 'Asia/Kolkata',
          validationErrors: [],
          gapCount: 0,
          nanCount,
        });

        toast({ title: 'CSV Loaded', description: `${rows.length} rows, ${headers.length} columns` });
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

  const clearData = () => {
    setUploadedData(null);
    setSelectedSharedDataset(null);
    setSharedDatasetSettings(undefined);
  };

  // Handle shared dataset selection from Public Library
  const handleSharedDatasetSelect = (dataset: SharedDataset | null, settings?: DatasetSettings) => {
    setSelectedSharedDataset(dataset);
    setSharedDatasetSettings(settings);
    
    if (dataset) {
      // Create uploadedData from shared dataset metadata for UI consistency
      const rangeFrom = dataset.range_from_ts ? new Date(dataset.range_from_ts).toISOString() : '';
      const rangeTo = dataset.range_to_ts ? new Date(dataset.range_to_ts).toISOString() : '';
      
      setUploadedData({
        fileName: `📚 ${dataset.name} (Public Library)`,
        columns: [
          { name: 'timestamp', mapping: 'timestamp' },
          { name: 'open', mapping: 'open' },
          { name: 'high', mapping: 'high' },
          { name: 'low', mapping: 'low' },
          { name: 'close', mapping: 'close' },
          { name: 'volume', mapping: 'volume' },
        ],
        rows: [], // Rows will be loaded during backtest execution
        symbols: [dataset.symbol],
        activeSymbol: dataset.symbol,
        timezone: 'UTC',
        validationErrors: [],
        gapCount: 0,
        nanCount: 0,
        // Store shared dataset info for backtest
        sharedDatasetId: dataset.id,
        sharedDatasetSettings: settings,
      });

      toast({
        title: 'Public Dataset Selected',
        description: `${dataset.symbol} • ${dataset.row_count?.toLocaleString() || 'N/A'} rows • ${dataset.timeframe}`,
      });
    }
  };
  const requiredMapped = COLUMN_MAPPINGS.filter((m) => m.required).every((m) =>
    uploadedData?.columns.some((c) => c.mapping === m.value)
  );

  // Check if using shared dataset
  const isUsingSharedDataset = !!selectedSharedDataset || !!uploadedData?.sharedDatasetId;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Ready for Backtest Banner */}
      {uploadedData && (requiredMapped || isUsingSharedDataset) && (
        <div className="bg-profit/10 border border-profit/30 rounded-lg p-4 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-profit flex-shrink-0" />
            <div>
              <p className="font-semibold text-profit">Ready for Backtest</p>
              <p className="text-sm text-muted-foreground">
                {isUsingSharedDataset ? (
                  <>📚 Public Dataset • Symbol: {uploadedData.activeSymbol}</>
                ) : (
                  <>All required columns mapped. {uploadedData.rows.length.toLocaleString()} rows • Symbol: {uploadedData.activeSymbol}</>
                )}
              </p>
            </div>
          </div>
          {onProceedToStrategy && (
            <Button onClick={onProceedToStrategy} variant="default" size="sm" className="flex-shrink-0">
              Proceed to Strategy
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}
      
      {/* Data Source Card */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Select Data Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs: Upload CSV vs Public Library */}
          <Tabs value={dataSourceTab} onValueChange={(v) => setDataSourceTab(v as 'upload' | 'library')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV
              </TabsTrigger>
              <TabsTrigger value="library" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public Library
              </TabsTrigger>
            </TabsList>

            {/* Upload CSV Tab */}
            <TabsContent value="upload">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg transition-all p-6',
                  dragActive ? 'border-primary bg-primary/5' : 'border-border'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!uploadedData ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Upload className={cn('h-12 w-12 mb-4', dragActive ? 'text-primary' : 'text-muted-foreground')} />
                    <h3 className="text-lg font-semibold mb-2">Drag & Drop CSV File</h3>
                    <p className="text-muted-foreground text-center mb-4 max-w-md">
                      Upload your historical OHLCV data. Supports timestamp, open, high, low, close, volume columns.
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Local: up to 25MB • Cloud: up to 3GB
                    </p>
                    
                    {/* Quick Start Demo - Most prominent */}
                    <div className="mb-6">
                      <QuickStartDemoButton variant="default" size="lg" />
                    </div>
                    
                    <div className="flex flex-wrap gap-3 items-center justify-center">
                      <label>
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
                        <Button variant="outline" asChild>
                          <span>Browse Files (Local)</span>
                        </Button>
                      </label>
                      {user && (
                        <label>
                          <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleCloudUpload(e.target.files[0]);
                              }
                            }} 
                          />
                          <Button variant="outline" asChild disabled={uploading}>
                            <span>
                              <CloudUpload className="h-4 w-4 mr-2" />
                              Upload to Cloud
                            </span>
                          </Button>
                        </label>
                      )}
                      <Button variant="ghost" size="sm" onClick={downloadSampleCSV} className="text-xs text-muted-foreground">
                        <Download className="h-3 w-3 mr-1" />
                        Sample CSV
                      </Button>
                    </div>

                    {/* Upload Progress */}
                    {uploading && progress && (
                      <div className="w-full max-w-md mt-6 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            {progress.stage === 'compressing' && (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Compressing (gzip)...
                              </>
                            )}
                            {progress.stage === 'uploading' && (
                              <>
                                <CloudUpload className="h-3 w-3" />
                                Uploading to cloud...
                              </>
                            )}
                            {progress.stage === 'done' && (
                              <>
                                <CheckCircle className="h-3 w-3 text-profit" />
                                Complete!
                              </>
                            )}
                          </span>
                          <span className="font-mono">{progress.percent}%</span>
                        </div>
                        <Progress value={progress.percent} className="h-2" />
                      </div>
                    )}

                    {/* Cloud Datasets Panel */}
                    {user && cloudDatasets.length > 0 && (
                      <div className="w-full mt-8 border-t pt-6">
                        <div className="mb-4 p-3 rounded-lg bg-muted/30 border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                              <Cloud className="h-4 w-4 text-primary" />
                              Your Cloud Storage
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(totalStorageUsed / 1024 / 1024).toFixed(1)} MB used
                            </span>
                          </div>
                          <Progress value={(totalStorageUsed / PLAN_LIMITS.pro) * 100} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">Your Cloud Datasets ({cloudDatasets.length})</h4>
                          <Button variant="ghost" size="sm" onClick={loadCloudDatasets} disabled={loadingCloudData}>
                            <RefreshCw className={cn("h-3 w-3", loadingCloudData && "animate-spin")} />
                          </Button>
                        </div>
                        <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                          {cloudDatasets.map((dataset) => (
                            <div key={dataset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{safeText(dataset.name)}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {dataset.symbol && <Badge variant="outline" className="text-[10px]">{dataset.symbol}</Badge>}
                                  {dataset.rowCount && <span>{dataset.rowCount.toLocaleString()} rows</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleLoadFromCloud(dataset.filePath)} disabled={loadingCloudData}>
                                  {loadingCloudData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteFromCloud(dataset.filePath, dataset.id)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!user && (
                      <p className="text-xs text-muted-foreground mt-4">
                        <a href="/login" className="text-primary hover:underline">Login</a> to upload large files to cloud
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-semibold">{safeText(uploadedData.fileName)}</p>
                          <p className="text-sm text-muted-foreground">
                            {uploadedData.rows.length.toLocaleString()} rows • {uploadedData.columns.length} columns
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={clearData}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      {detectedFormat && detectedFormat !== 'unknown' && (
                        <Badge variant="outline" className="text-primary border-primary">
                          <Info className="h-3 w-3 mr-1" />
                          {FORMAT_LABELS[detectedFormat]}
                        </Badge>
                      )}
                      {uploadedData.nanCount > 0 && (
                        <Badge variant="outline" className="text-warning border-warning">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {uploadedData.nanCount} NaN/Empty values
                        </Badge>
                      )}
                      {requiredMapped ? (
                        <Badge variant="outline" className="text-profit border-profit">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          All required columns mapped
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-loss border-loss">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Missing required mappings
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Public Library Tab */}
            <TabsContent value="library">
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Database className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Public Market Data</p>
                    <p className="text-xs text-muted-foreground">High-quality OHLCV data curated for backtesting</p>
                  </div>
                </div>

                <SharedDatasetSelector
                  selectedDataset={selectedSharedDataset}
                  settings={sharedDatasetSettings}
                  onSelect={handleSharedDatasetSelect}
                />

                {selectedSharedDataset && (
                  <div className="p-4 rounded-lg bg-profit/5 border border-profit/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-profit" />
                      <span className="font-semibold text-profit">Dataset Selected</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Symbol:</strong> {selectedSharedDataset.symbol}</p>
                      <p><strong>Timeframe:</strong> {selectedSharedDataset.timeframe}</p>
                      <p><strong>Rows:</strong> {selectedSharedDataset.row_count?.toLocaleString() || 'N/A'}</p>
                      {sharedDatasetSettings?.dateRange && (
                        <p><strong>Date Range:</strong> {sharedDatasetSettings.dateRange.startDate} → {sharedDatasetSettings.dateRange.endDate}</p>
                      )}
                      {sharedDatasetSettings?.aggregateTo && (
                        <p><strong>Aggregated to:</strong> {sharedDatasetSettings.aggregateTo}</p>
                      )}
                    </div>
                  </div>
                )}

                {!user && (
                  <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
                    <p className="text-sm text-warning">
                      <a href="/login" className="underline font-medium">Login</a> to access public market datasets
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Schema Mapper */}
      {uploadedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schema Mapper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {uploadedData.columns.map((col) => (
                <div key={col.name} className="flex items-center gap-2">
                  <span className="font-mono text-sm truncate flex-1" title={safeText(col.name)}>
                    {safeText(col.name)}
                  </span>
                  <Select
                    value={col.mapping}
                    onValueChange={(v) => updateColumnMapping(col.name, v as CSVColumn['mapping'])}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_MAPPINGS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label} {m.required && '*'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">* Required columns</p>
          </CardContent>
        </Card>
      )}

      {/* Symbol & Timezone */}
      {uploadedData && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Symbol List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uploadedData.symbols.map((sym) => {
                  const count = uploadedData.rows.filter((r) => {
                    const symCol = uploadedData.columns.find((c) => c.mapping === 'symbol');
                    return symCol ? r[symCol.name] === sym : true;
                  }).length;
                  const isActive = sym === uploadedData.activeSymbol;
                  return (
                    <button
                      key={sym}
                      onClick={() => setActiveSymbol(sym)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-mono transition-colors',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      {safeText(sym)}
                      <span className="ml-2 opacity-70">({count.toLocaleString()})</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timezone</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={uploadedData.timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">Default: Asia/Kolkata (IST) • Currency: INR</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Preview */}
      {uploadedData && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setPreviewExpanded(!previewExpanded)}>
            <CardTitle className="text-base flex items-center justify-between">
              Data Preview (First 100 Rows)
              <ChevronDown className={cn('h-4 w-4 transition-transform', previewExpanded && 'rotate-180')} />
            </CardTitle>
          </CardHeader>
          {previewExpanded && (
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="data-table text-xs">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr>
                      {uploadedData.columns.map((col) => (
                        <th key={col.name} className="whitespace-nowrap">
                          {safeText(col.name)}
                          {col.mapping !== 'none' && (
                            <Badge variant="outline" className="ml-1 text-[10px] py-0">
                              {col.mapping}
                            </Badge>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedData.rows.slice(0, 100).map((row, i) => (
                      <tr key={i}>
                        {uploadedData.columns.map((col) => (
                          <td key={col.name} className="font-mono whitespace-nowrap">
                            {safeText(row[col.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
