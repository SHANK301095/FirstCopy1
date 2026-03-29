/**
 * Shared Data Manager - Admin-only component
 * Upload and manage shared OHLCV datasets
 * Supports chunked upload for large files (50MB+)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Database,
  Trash2,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  HardDrive,
  Calendar,
  Clock,
  Pause,
  Play,
  XCircle,
} from 'lucide-react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SharedDataset } from '@/lib/sharedDataService';
import { 
  uploadLargeFile, 
  getResumableSession, 
  clearResumableSession,
  type UploadProgress 
} from '@/lib/chunkedUpload';

// Column mapping type
type ColumnMapping = 'timestamp' | 'open' | 'high' | 'low' | 'close' | 'volume' | 'none';

interface ColumnConfig {
  name: string;
  mapping: ColumnMapping;
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'];

// Threshold for chunked upload (10MB)
const CHUNKED_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

export function SharedDataManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Datasets state
  const [datasets, setDatasets] = useState<SharedDataset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string | number>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressNum, setUploadProgressNum] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadProgress | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    timeframe: '1m',
    description: '',
    sourceInfo: '',
  });
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Stats from parsing
  const [parseStats, setParseStats] = useState<{
    rowCount: number;
    rangeFrom: number;
    rangeTo: number;
  } | null>(null);

  // Check for resumable upload on mount
  useEffect(() => {
    if (pendingFile) {
      const existingSession = getResumableSession(pendingFile.name);
      if (existingSession) {
        toast({
          title: 'Resumable Upload Found',
          description: 'A previous upload session was found. Click Upload to resume.',
        });
      }
    }
  }, [pendingFile]);

  // Load existing datasets
  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      // Admin sees all datasets including inactive
      const { data, error } = await supabase
        .from('shared_datasets')
        .select('*')
        .order('symbol', { ascending: true });

      if (error) throw error;
      setDatasets((data || []) as SharedDataset[]);
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setParseStats(null);

    // Extract symbol from filename
    const name = file.name.replace(/\.csv$/i, '');
    const symbolMatch = name.match(/([A-Z]{3,}(?:USDT?|BTC|ETH|INR|USD)?)/i);
    
    setFormData(prev => ({
      ...prev,
      name,
      symbol: symbolMatch?.[1]?.toUpperCase() || '',
    }));

    // Parse preview
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 100,
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
          return { name: h, mapping };
        });

        setColumns(cols);
        setPreviewRows(rows.slice(0, 5));

        // Parse full file for stats
        parseFullFile(file, cols);
      },
    });
  }, []);

  const parseFullFile = (file: File, cols: ColumnConfig[]) => {
    const tsCol = cols.find(c => c.mapping === 'timestamp')?.name;
    if (!tsCol) return;

    let rowCount = 0;
    let minTs = Infinity;
    let maxTs = -Infinity;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      step: (row) => {
        rowCount++;
        const data = row.data as Record<string, string>;
        let ts = parseFloat(data[tsCol]);
        if (isNaN(ts)) {
          const parsed = Date.parse(data[tsCol]);
          if (!isNaN(parsed)) ts = parsed;
        }
        if (ts < 1e12) ts *= 1000;
        if (!isNaN(ts)) {
          minTs = Math.min(minTs, ts);
          maxTs = Math.max(maxTs, ts);
        }
      },
      complete: () => {
        setParseStats({
          rowCount,
          rangeFrom: minTs === Infinity ? 0 : minTs,
          rangeTo: maxTs === -Infinity ? 0 : maxTs,
        });
      },
    });
  };

  const handleUpload = async () => {
    if (!pendingFile || !formData.symbol || !parseStats) return;

    setUploading(true);
    setUploadProgressNum(0);

    // Build columns map
    const columnsMap: Record<string, string> = {};
    columns.forEach(c => {
      if (c.mapping !== 'none') {
        columnsMap[c.mapping] = c.name;
      }
    });

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
      // Use chunked upload for large files
      if (pendingFile.size > CHUNKED_UPLOAD_THRESHOLD) {
        const existingSession = getResumableSession(pendingFile.name);
        
        await uploadLargeFile(
          pendingFile,
          metadata,
          (progress) => {
            setUploadStatus(progress);
            setUploadProgressNum(progress.progress);
          },
          existingSession || undefined
        );
      } else {
        // Small file: use direct upload
        setUploadProgressNum(10);
        
        const fileBuffer = await pendingFile.arrayBuffer();
        const compressedStream = new Blob([fileBuffer]).stream().pipeThrough(
          new CompressionStream('gzip')
        );
        const compressedBlob = await new Response(compressedStream).blob();
        
        setUploadProgressNum(30);

        const storagePath = `${formData.symbol.toUpperCase()}/${formData.timeframe}/${Date.now()}.csv.gz`;
        
        const { error: uploadError } = await supabase.storage
          .from('market-data')
          .upload(storagePath, compressedBlob, {
            contentType: 'application/gzip',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        
        setUploadProgressNum(70);

        const { error: insertError } = await supabase
          .from('shared_datasets')
          .insert({
            name: formData.name,
            symbol: formData.symbol.toUpperCase(),
            timeframe: formData.timeframe,
            row_count: parseStats.rowCount,
            file_size_bytes: compressedBlob.size,
            storage_path: storagePath,
            range_from_ts: parseStats.rangeFrom,
            range_to_ts: parseStats.rangeTo,
            columns_map: columnsMap,
            description: formData.description || null,
            source_info: formData.sourceInfo || null,
            uploaded_by: user?.id,
          });

        if (insertError) throw insertError;
      }

      setUploadProgressNum(100);
      toast({ title: 'Upload Complete', description: `${parseStats.rowCount.toLocaleString()} rows uploaded` });
      
      // Reset form
      setPendingFile(null);
      setColumns([]);
      setPreviewRows([]);
      setParseStats(null);
      setFormData({ name: '', symbol: '', timeframe: '1m', description: '', sourceInfo: '' });
      clearResumableSession(pendingFile.name);
      
      // Reload datasets
      loadDatasets();

    } catch (err: any) {
      console.error('[SharedDataManager] Upload error:', err);
      
      // Build actionable error message
      let title = 'Upload Failed';
      let description = 'An unexpected error occurred.';
      
      const code = err?.code || '';
      const msg = err?.message || String(err);
      
      if (code === 'NETWORK_ERROR' || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        title = 'Network Error';
        description = 'Could not reach the server. Please check your internet connection and try again.';
      } else if (code === 'CORS_ERROR') {
        title = 'Connection Blocked';
        description = 'Request blocked by browser security. Please contact support.';
      } else if (code === 'AUTH_MISSING' || code === 'AUTH_INVALID') {
        title = 'Authentication Error';
        description = 'Your session has expired. Please log in again and retry.';
      } else if (code === 'ADMIN_REQUIRED') {
        title = 'Access Denied';
        description = 'Admin privileges are required to upload shared datasets.';
      } else if (code === 'SESSION_EXPIRED' || code === 'SESSION_NOT_FOUND') {
        title = 'Session Expired';
        description = 'The upload session expired. Please restart the upload.';
        clearResumableSession(pendingFile.name);
      } else if (code === 'TIMEOUT') {
        title = 'Upload Timed Out';
        description = 'The upload took too long. Please try again or check your connection speed.';
      } else if (msg.includes('storage') || msg.includes('bucket')) {
        title = 'Storage Error';
        description = 'Failed to store the file. The storage service may be temporarily unavailable.';
      } else {
        description = msg;
      }
      
      toast({ title, description, variant: 'destructive' });
    } finally {
      setUploading(false);
      setUploadProgressNum(0);
      setUploadStatus(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const dataset = datasets.find(d => d.id === id);
      if (!dataset) return;

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('market-data')
        .remove([(dataset as any).storage_path]);

      if (storageError) console.warn('Storage delete warning:', storageError);

      // Delete metadata
      const { error } = await supabase
        .from('shared_datasets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Deleted', description: 'Dataset removed' });
      loadDatasets();
    } catch (err) {
      toast({ title: 'Delete Failed', description: String(err), variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('shared_datasets')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      loadDatasets();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString();
  };

  const requiredMapped = ['timestamp', 'open', 'high', 'low', 'close'].every(
    req => columns.some(c => c.mapping === req)
  );

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Shared Market Data
          </CardTitle>
          <CardDescription>
            Upload OHLCV datasets that will be available to all users for backtesting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pendingFile ? (
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <span className="text-lg font-medium">Select CSV File</span>
              <span className="text-sm text-muted-foreground mt-1">
                Large files supported (50MB+, 1M+ rows)
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{pendingFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(pendingFile.size)}
                      {parseStats && ` • ${parseStats.rowCount.toLocaleString()} rows`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setPendingFile(null);
                  setColumns([]);
                  setPreviewRows([]);
                  setParseStats(null);
                }}>
                  Clear
                </Button>
              </div>

              {/* Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dataset Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. NIFTY 2022-2024"
                  />
                </div>
                <div>
                  <Label>Symbol *</Label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    placeholder="e.g. NIFTY, BANKNIFTY"
                  />
                </div>
                <div>
                  <Label>Timeframe</Label>
                  <Select
                    value={formData.timeframe}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, timeframe: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map(tf => (
                        <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source Info</Label>
                  <Input
                    value={formData.sourceInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, sourceInfo: e.target.value }))}
                    placeholder="e.g. NSE, Yahoo Finance"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional notes about this dataset..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Column Mapping */}
              {columns.length > 0 && (
                <div>
                  <Label className="mb-2 block">Column Mapping</Label>
                  <div className="flex flex-wrap gap-2">
                    {columns.map((col, idx) => (
                      <Badge
                        key={col.name}
                        variant={col.mapping !== 'none' ? 'default' : 'outline'}
                        className={cn(
                          col.mapping === 'timestamp' && 'bg-blue-600',
                          col.mapping === 'open' && 'bg-emerald-600',
                          col.mapping === 'high' && 'bg-emerald-500',
                          col.mapping === 'low' && 'bg-red-500',
                          col.mapping === 'close' && 'bg-emerald-700',
                          col.mapping === 'volume' && 'bg-purple-600',
                        )}
                      >
                        {col.name} → {col.mapping}
                      </Badge>
                    ))}
                  </div>
                  {!requiredMapped && (
                    <p className="text-sm text-destructive mt-2">
                      Missing required columns: timestamp, open, high, low, close
                    </p>
                  )}
                </div>
              )}

              {/* Date Range */}
              {parseStats && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(parseStats.rangeFrom)} → {formatDate(parseStats.rangeTo)}</span>
                  </div>
                  <Badge variant="outline" className="text-profit border-profit">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready to upload
                  </Badge>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgressNum} />
                  <p className="text-sm text-center text-muted-foreground">
                    {uploadStatus?.message || (
                      uploadProgressNum < 30 ? 'Compressing...' : 
                      uploadProgressNum < 70 ? 'Uploading to storage...' : 
                      'Saving metadata...'
                    )}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!formData.symbol || !requiredMapped || !parseStats || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Dataset
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Datasets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Shared Datasets
            </CardTitle>
            <CardDescription>
              {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} available
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadDatasets}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shared datasets uploaded yet
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {datasets.map((ds) => (
                  <div
                    key={ds.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      ds.is_active ? "bg-card" : "bg-muted/30 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ds.symbol}</span>
                          <Badge variant="secondary">{ds.timeframe}</Badge>
                          {!ds.is_active && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{ds.row_count.toLocaleString()} rows</span>
                          <span>{formatBytes(ds.file_size_bytes)}</span>
                          <span>{formatDate(ds.range_from_ts)} → {formatDate(ds.range_to_ts)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(ds.id, ds.is_active)}
                        title={ds.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {ds.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(ds.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shared Dataset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the dataset and its file from storage.
              Users will no longer be able to use this data for backtesting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
