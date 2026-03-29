/**
 * Data Upload Wizard
 * Premium multi-step wizard for uploading shared market data
 * Step 1: Drop file → Step 2: Map columns → Step 3: Review & Upload
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2,
  ChevronRight, ChevronLeft, X, ArrowRight, Sparkles, Table2,
  Calendar, BarChart3, Columns3
} from 'lucide-react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  uploadLargeFile,
  getResumableSession,
  clearResumableSession,
  type UploadProgress,
} from '@/lib/chunkedUpload';
import { motion, AnimatePresence } from 'framer-motion';

type ColumnMapping = 'timestamp' | 'open' | 'high' | 'low' | 'close' | 'volume' | 'none';

interface ColumnConfig {
  name: string;
  mapping: ColumnMapping;
  sample: string;
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'];
const CHUNKED_THRESHOLD = 10 * 1024 * 1024;
const REQUIRED_MAPPINGS: ColumnMapping[] = ['timestamp', 'open', 'high', 'low', 'close'];

const MAPPING_LABELS: Record<ColumnMapping, { label: string; color: string }> = {
  timestamp: { label: 'Timestamp', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  open: { label: 'Open', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  high: { label: 'High', color: 'bg-green-500/10 text-green-500 border-green-500/30' },
  low: { label: 'Low', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  close: { label: 'Close', color: 'bg-primary/10 text-primary border-primary/30' },
  volume: { label: 'Volume', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  none: { label: 'Skip', color: 'bg-muted text-muted-foreground border-border' },
};

interface WizardProps {
  onComplete: () => void;
}

export function DataUploadWizard({ onComplete }: WizardProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0); // 0=file, 1=mapping, 2=review+upload
  const [isDragging, setIsDragging] = useState(false);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [parseStats, setParseStats] = useState<{ rowCount: number; rangeFrom: number; rangeTo: number } | null>(null);
  const [parsing, setParsing] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '', symbol: '', timeframe: '1m', description: '', sourceInfo: '',
  });

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const processFile = useCallback((f: File) => {
    setFile(f);
    setParsing(true);

    const name = f.name.replace(/\.csv$/i, '');
    const symbolMatch = name.match(/([A-Z]{3,}(?:USDT?|BTC|ETH|INR|USD)?)/i);
    setFormData(prev => ({ ...prev, name, symbol: symbolMatch?.[1]?.toUpperCase() || '' }));

    // Parse preview
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      preview: 100,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        const cols: ColumnConfig[] = headers.map((h) => {
          const lower = h.toLowerCase();
          let mapping: ColumnMapping = 'none';
          if (lower.includes('time') || lower.includes('date')) mapping = 'timestamp';
          else if (lower === 'open' || lower === 'o') mapping = 'open';
          else if (lower === 'high' || lower === 'h') mapping = 'high';
          else if (lower === 'low' || lower === 'l') mapping = 'low';
          else if (lower === 'close' || lower === 'c') mapping = 'close';
          else if (lower.includes('vol')) mapping = 'volume';
          return { name: h, mapping, sample: String(rows[0]?.[h] ?? '') };
        });

        setColumns(cols);
        setPreviewRows(rows.slice(0, 5));

        // Parse full for stats
        let rowCount = 0, minTs = Infinity, maxTs = -Infinity;
        const tsCol = cols.find(c => c.mapping === 'timestamp')?.name;

        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          step: (row) => {
            rowCount++;
            if (tsCol) {
              const data = row.data as Record<string, string>;
              let ts = parseFloat(data[tsCol]);
              if (isNaN(ts)) { const p = Date.parse(data[tsCol]); if (!isNaN(p)) ts = p; }
              if (ts < 1e12) ts *= 1000;
              if (!isNaN(ts)) { minTs = Math.min(minTs, ts); maxTs = Math.max(maxTs, ts); }
            }
          },
          complete: () => {
            setParseStats({
              rowCount,
              rangeFrom: minTs === Infinity ? 0 : minTs,
              rangeTo: maxTs === -Infinity ? 0 : maxTs,
            });
            setParsing(false);
            setStep(1);
          },
        });
      },
    });
  }, []);

  // Drag & drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) processFile(f);
    else toast.error('Only CSV files are supported');
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const updateColumnMapping = (idx: number, mapping: ColumnMapping) => {
    setColumns(prev => prev.map((c, i) => i === idx ? { ...c, mapping } : c));
  };

  const requiredMapped = REQUIRED_MAPPINGS.every(req => columns.some(c => c.mapping === req));

  const handleUpload = async () => {
    if (!file || !formData.symbol || !parseStats) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadMessage('Preparing...');

    const columnsMap: Record<string, string> = {};
    columns.forEach(c => { if (c.mapping !== 'none') columnsMap[c.mapping] = c.name; });

    const metadata = {
      name: formData.name,
      symbol: formData.symbol.toUpperCase(),
      timeframe: formData.timeframe,
      rowCount: parseStats.rowCount,
      rangeFromTs: parseStats.rangeFrom,
      rangeToTs: parseStats.rangeTo,
      columnsMap,
      description: formData.description || undefined,
      sourceInfo: formData.sourceInfo || undefined,
    };

    try {
      if (file.size > CHUNKED_THRESHOLD) {
        const session = getResumableSession(file.name);
        await uploadLargeFile(file, metadata, (p) => {
          setUploadProgress(p.progress);
          setUploadMessage(p.message || 'Uploading...');
        }, session || undefined);
      } else {
        setUploadMessage('Compressing...');
        setUploadProgress(15);
        const buf = await file.arrayBuffer();
        const compressed = new Blob([buf]).stream().pipeThrough(new CompressionStream('gzip'));
        const blob = await new Response(compressed).blob();
        
        setUploadMessage('Uploading to storage...');
        setUploadProgress(40);
        const storagePath = `${formData.symbol.toUpperCase()}/${formData.timeframe}/${Date.now()}.csv.gz`;
        const { error: uploadErr } = await supabase.storage.from('market-data').upload(storagePath, blob, { contentType: 'application/gzip', upsert: false });
        if (uploadErr) throw uploadErr;

        setUploadMessage('Saving metadata...');
        setUploadProgress(80);
        const { error: insertErr } = await supabase.from('shared_datasets').insert({
          name: formData.name, symbol: formData.symbol.toUpperCase(), timeframe: formData.timeframe,
          row_count: parseStats.rowCount, file_size_bytes: blob.size, storage_path: storagePath,
          range_from_ts: parseStats.rangeFrom, range_to_ts: parseStats.rangeTo,
          columns_map: columnsMap, description: formData.description || null,
          source_info: formData.sourceInfo || null, uploaded_by: user?.id,
        });
        if (insertErr) throw insertErr;
      }

      setUploadProgress(100);
      setUploadMessage('Complete!');
      toast.success(`${parseStats.rowCount.toLocaleString()} rows uploaded successfully`);
      clearResumableSession(file.name);
      
      setTimeout(() => {
        resetWizard();
        onComplete();
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed: ' + String(err));
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetWizard = () => {
    setFile(null);
    setColumns([]);
    setPreviewRows([]);
    setParseStats(null);
    setFormData({ name: '', symbol: '', timeframe: '1m', description: '', sourceInfo: '' });
    setStep(0);
    setUploading(false);
    setUploadProgress(0);
    setUploadMessage('');
  };

  const stepVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      {/* Step Indicator */}
      <div className="border-b bg-muted/20 px-6 py-4">
        <div className="flex items-center gap-3">
          {['Select File', 'Map Columns', 'Review & Upload'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground'
              )}>
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-sm font-medium hidden sm:inline', i === step ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
            </div>
          ))}
        </div>
      </div>

      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {/* Step 0: File Selection */}
          {step === 0 && (
            <motion.div key="step0" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all',
                  isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/50 hover:border-primary/40 hover:bg-muted/20'
                )}
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className={cn('h-8 w-8 text-primary transition-transform', isDragging && 'scale-110')} />
                </div>
                <span className="text-lg font-semibold">
                  {isDragging ? 'Drop CSV here' : 'Drop CSV or click to browse'}
                </span>
                <span className="text-sm text-muted-foreground mt-1">
                  Supports large files (50MB+, 1M+ rows) • Auto-compressed upload
                </span>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
              </div>

              {parsing && (
                <div className="flex items-center justify-center gap-3 mt-6 p-4 rounded-xl bg-muted/30">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">Analyzing file...</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 1: Column Mapping */}
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="space-y-6">
              {/* File Summary */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(file?.size || 0)} • {parseStats?.rowCount.toLocaleString()} rows • {columns.length} columns
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={resetWizard}><X className="h-4 w-4" /></Button>
              </div>

              {/* Metadata Form */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Dataset Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. NIFTY 2022-24" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Symbol *</Label>
                  <Input value={formData.symbol} onChange={(e) => setFormData(p => ({ ...p, symbol: e.target.value.toUpperCase() }))} placeholder="NIFTY" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Timeframe</Label>
                  <Select value={formData.timeframe} onValueChange={(v) => setFormData(p => ({ ...p, timeframe: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEFRAMES.map(tf => <SelectItem key={tf} value={tf}>{tf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source</Label>
                  <Input value={formData.sourceInfo} onChange={(e) => setFormData(p => ({ ...p, sourceInfo: e.target.value }))} placeholder="NSE, Yahoo" />
                </div>
              </div>

              {/* Column Mapping Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Columns3 className="h-4 w-4" /> Column Mapping
                  </Label>
                  {!requiredMapped && (
                    <Badge variant="destructive" className="text-xs">Missing required columns</Badge>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {columns.map((col, idx) => (
                    <div key={col.name} className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all',
                      col.mapping !== 'none' ? 'border-primary/20 bg-primary/[0.02]' : 'border-border/50'
                    )}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-medium truncate">{col.name}</p>
                        <p className="text-xs text-muted-foreground truncate">e.g. {col.sample || '—'}</p>
                      </div>
                      <Select value={col.mapping} onValueChange={(v) => updateColumnMapping(idx, v as ColumnMapping)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MAPPING_LABELS).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview */}
              {previewRows.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Table2 className="h-4 w-4" /> Data Preview (first 5 rows)
                  </Label>
                  <div className="border rounded-xl overflow-hidden">
                    <ScrollArea className="max-h-[200px]">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            {columns.filter(c => c.mapping !== 'none').map(c => (
                              <th key={c.name} className="px-3 py-2 text-left font-medium">
                                <Badge variant="outline" className={cn('text-[10px]', MAPPING_LABELS[c.mapping].color)}>
                                  {MAPPING_LABELS[c.mapping].label}
                                </Badge>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr key={i} className="border-t border-border/30">
                              {columns.filter(c => c.mapping !== 'none').map(c => (
                                <td key={c.name} className="px-3 py-1.5 font-mono">{String(row[c.name] ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={resetWizard} className="rounded-xl">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!requiredMapped || !formData.symbol}
                  className="rounded-xl"
                >
                  Review <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Review & Upload */}
          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="space-y-6">
              {!uploading ? (
                <>
                  {/* Review Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'File', value: file?.name || '', icon: FileSpreadsheet },
                      { label: 'Size', value: formatBytes(file?.size || 0), icon: BarChart3 },
                      { label: 'Rows', value: parseStats?.rowCount.toLocaleString() || '0', icon: Table2 },
                      { label: 'Symbol', value: formData.symbol, icon: Sparkles },
                      { label: 'Timeframe', value: formData.timeframe, icon: Calendar },
                      { label: 'Date Range', value: parseStats ? `${new Date(parseStats.rangeFrom).toLocaleDateString()} → ${new Date(parseStats.rangeTo).toLocaleDateString()}` : '—', icon: Calendar },
                    ].map((item) => (
                      <div key={item.label} className="p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div className="flex items-center gap-2 mb-1">
                          <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</span>
                        </div>
                        <p className="text-sm font-semibold truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mapped Columns Summary */}
                  <div className="flex flex-wrap gap-2">
                    {columns.filter(c => c.mapping !== 'none').map(c => (
                      <Badge key={c.name} variant="outline" className={cn('gap-1', MAPPING_LABELS[c.mapping].color)}>
                        {c.name} → {MAPPING_LABELS[c.mapping].label}
                      </Badge>
                    ))}
                  </div>

                  {formData.description && (
                    <div className="p-3 rounded-xl bg-muted/20 text-sm text-muted-foreground">
                      {formData.description}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                      <ChevronLeft className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button onClick={handleUpload} className="rounded-xl gap-2">
                      <Upload className="h-4 w-4" />
                      Upload {parseStats?.rowCount.toLocaleString()} Rows
                    </Button>
                  </div>
                </>
              ) : (
                /* Upload Progress */
                <div className="flex flex-col items-center py-8 space-y-6">
                  {uploadProgress < 100 ? (
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center"
                    >
                      <CheckCircle className="h-10 w-10 text-emerald-500" />
                    </motion.div>
                  )}
                  <div className="text-center space-y-2 w-full max-w-sm">
                    <p className="text-lg font-semibold">
                      {uploadProgress < 100 ? 'Uploading...' : 'Upload Complete!'}
                    </p>
                    <p className="text-sm text-muted-foreground">{uploadMessage}</p>
                    <Progress value={uploadProgress} className="h-2 rounded-full" />
                    <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
