import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/lib/secureLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  stage?: 'compressing' | 'uploading' | 'done';
}

interface CloudDataset {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  originalSize: number;
  compressedSize: number;
  symbol: string | null;
  timeframe: string | null;
  rowCount: number | null;
  rangeFrom: Date | null;
  rangeTo: Date | null;
  createdAt: string;
}

// 10GB total limit, 500MB per file max (before compression)
const MAX_TOTAL_STORAGE = 10 * 1024 * 1024 * 1024; // 10GB
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB per file

interface UseCloudDataUploadReturn {
  uploading: boolean;
  progress: UploadProgress | null;
  uploadFile: (file: File, metadata: {
    name: string;
    symbol?: string;
    timeframe?: string;
    rowCount?: number;
    rangeFromTs?: number;
    rangeToTs?: number;
    columns?: Record<string, string>[];
  }) => Promise<string | null>;
  downloadFile: (filePath: string) => Promise<File | null>;
  deleteFile: (filePath: string, datasetId: string) => Promise<boolean>;
  listDatasets: () => Promise<CloudDataset[]>;
  getDatasetUrl: (filePath: string) => Promise<string | null>;
  getTotalStorageUsed: () => Promise<number>;
}

const BUCKET_NAME = 'historical-data';

// Compress data using native CompressionStream API (gzip)
async function compressData(data: Blob, onProgress?: (percent: number) => void): Promise<Blob> {
  // Check if CompressionStream is available (modern browsers)
  if (typeof CompressionStream === 'undefined') {
    console.warn('CompressionStream not available, uploading uncompressed');
    return data;
  }

  const stream = data.stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  
  const reader = compressedStream.getReader();
  const chunks: BlobPart[] = [];
  let totalSize = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as BlobPart);
    totalSize += value.length;
    
    // Estimate progress (compression ratio ~70-80% for CSV)
    const estimatedProgress = Math.min(95, (totalSize / (data.size * 0.25)) * 100);
    onProgress?.(estimatedProgress);
  }
  
  onProgress?.(100);
  return new Blob(chunks, { type: 'application/gzip' });
}

// Decompress gzip data using native DecompressionStream API
async function decompressData(data: Blob): Promise<Blob> {
  // Check if file is gzip compressed (magic bytes: 1f 8b)
  const header = await data.slice(0, 2).arrayBuffer();
  const bytes = new Uint8Array(header);
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  
  if (!isGzip) {
    // Not compressed, return as-is
    return data;
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream not available in this browser');
  }

  const stream = data.stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  
  const reader = decompressedStream.getReader();
  const chunks: BlobPart[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as BlobPart);
  }
  
  return new Blob(chunks, { type: 'text/csv' });
}

export function useCloudDataUpload(): UseCloudDataUploadReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadFile = useCallback(async (
    file: File,
    metadata: {
      name: string;
      symbol?: string;
      timeframe?: string;
      rowCount?: number;
      rangeFromTs?: number;
      rangeToTs?: number;
      columns?: Record<string, string>[];
    }
  ): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to upload data to cloud storage.',
        variant: 'destructive'
      });
      return null;
    }

    setUploading(true);
    const originalSize = file.size;
    
    try {
      // Stage 1: Compress the file
      setProgress({ loaded: 0, total: 100, percent: 0, stage: 'compressing' });
      
      const compressedBlob = await compressData(file, (percent) => {
        setProgress({ 
          loaded: percent, 
          total: 100, 
          percent: Math.round(percent * 0.4), // Compression is 40% of total progress
          stage: 'compressing' 
        });
      });
      
      const compressedSize = compressedBlob.size;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      
      secureLogger.info('upload', `Compression: ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedSize / 1024 / 1024).toFixed(1)}MB (${compressionRatio}% saved)`);

      // Stage 2: Upload compressed file
      setProgress({ loaded: 40, total: 100, percent: 40, stage: 'uploading' });
      
      // Generate unique file path with .gz extension
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${timestamp}_${sanitizedName}.gz`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, compressedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/gzip'
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress({ loaded: 90, total: 100, percent: 90, stage: 'uploading' });

      // Generate fingerprint from original file content
      const sampleContent = await file.slice(0, 1000).text();
      const fingerprint = btoa(sampleContent.slice(0, 100) + file.size.toString()).slice(0, 32);

      // Save metadata to datasets table with both original and compressed sizes
      const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          user_id: user.id,
          name: metadata.name,
          file_name: file.name,
          symbol: metadata.symbol || null,
          timeframe: metadata.timeframe || null,
          row_count: metadata.rowCount || null,
          range_from_ts: metadata.rangeFromTs || null,
          range_to_ts: metadata.rangeToTs || null,
          columns: metadata.columns || null,
          fingerprint,
          source_name: filePath,
          file_size: compressedSize // Store compressed size (actual storage used)
        })
        .select('id')
        .single();

      if (datasetError) {
        // Rollback: delete the uploaded file
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        throw datasetError;
      }

      setProgress({ loaded: 100, total: 100, percent: 100, stage: 'done' });

      toast({
        title: 'Upload Complete',
        description: `${file.name} compressed ${compressionRatio}% (${(compressedSize / 1024 / 1024).toFixed(1)}MB stored)`
      });

      return datasetData.id;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, [user, toast]);

  const downloadFile = useCallback(async (filePath: string): Promise<File | null> => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to download data.',
        variant: 'destructive'
      });
      return null;
    }

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (error) throw error;

      // Decompress if gzip
      const decompressedBlob = await decompressData(data);
      
      // Extract original filename (remove .gz extension and timestamp prefix)
      let fileName = filePath.split('/').pop() || 'data.csv';
      if (fileName.endsWith('.gz')) {
        fileName = fileName.slice(0, -3);
      }
      // Remove timestamp prefix (e.g., 1234567890_filename.csv → filename.csv)
      const underscoreIndex = fileName.indexOf('_');
      if (underscoreIndex > 0 && !isNaN(Number(fileName.slice(0, underscoreIndex)))) {
        fileName = fileName.slice(underscoreIndex + 1);
      }
      
      return new File([decompressedBlob], fileName, { type: 'text/csv' });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download file',
        variant: 'destructive'
      });
      return null;
    }
  }, [user, toast]);

  const deleteFile = useCallback(async (filePath: string, datasetId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to delete data.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from datasets table
      const { error: dbError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      toast({
        title: 'Deleted',
        description: 'Dataset removed from cloud storage.'
      });

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete file',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, toast]);

  const listDatasets = useCallback(async (): Promise<CloudDataset[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        name: d.name,
        fileName: d.file_name || '',
        filePath: d.source_name || '',
        fileSize: (d as { file_size?: number }).file_size || 0,
        originalSize: 0, // Not tracked separately yet
        compressedSize: (d as { file_size?: number }).file_size || 0,
        symbol: d.symbol,
        timeframe: d.timeframe,
        rowCount: d.row_count,
        rangeFrom: d.range_from_ts ? new Date(d.range_from_ts) : null,
        rangeTo: d.range_to_ts ? new Date(d.range_to_ts) : null,
        createdAt: d.created_at || ''
      }));
    } catch (error) {
      console.error('List datasets error:', error);
      return [];
    }
  }, [user]);

  const getDatasetUrl = useCallback(async (filePath: string): Promise<string | null> => {
    if (!user || !filePath) return null;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Get URL error:', error);
      return null;
    }
  }, [user]);

  const getTotalStorageUsed = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('file_size')
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).reduce((total, d) => {
        const size = (d as { file_size?: number }).file_size || 0;
        return total + size;
      }, 0);
    } catch (error) {
      console.error('Get storage error:', error);
      return 0;
    }
  }, [user]);

  return {
    uploading,
    progress,
    uploadFile,
    downloadFile,
    deleteFile,
    listDatasets,
    getDatasetUrl,
    getTotalStorageUsed
  };
}
