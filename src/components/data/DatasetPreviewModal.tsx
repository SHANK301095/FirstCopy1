/**
 * Dataset Preview Modal - P0 Data Manager
 * Preview CSV before import with auto-detection
 */

import { useState } from 'react';
import { 
  Eye, 
  FileSpreadsheet, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Columns,
  BarChart,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PreviewData {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columns: string[];
  previewRows: Record<string, string | number>[];
  detectedSymbol: string | null;
  inferredTimeframe: string;
  dateRange: { from: string; to: string } | null;
  validationWarnings: string[];
}

interface DatasetPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PreviewData | null;
  onConfirmImport: () => void;
  onCancel: () => void;
}

export function DatasetPreviewModal({
  open,
  onOpenChange,
  data,
  onConfirmImport,
  onCancel,
}: DatasetPreviewModalProps) {
  if (!data) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Dataset Preview
          </DialogTitle>
          <DialogDescription>
            Review your data before importing
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* File Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">File</p>
              <p className="text-sm font-medium truncate">{data.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(data.fileSize)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rows</p>
              <p className="text-sm font-medium">{data.rowCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{data.columns.length} columns</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Symbol</p>
              <p className="text-sm font-medium">{data.detectedSymbol || 'Auto-detect'}</p>
              <p className="text-xs text-muted-foreground">{data.inferredTimeframe} timeframe</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date Range</p>
              {data.dateRange ? (
                <>
                  <p className="text-xs font-medium">{data.dateRange.from}</p>
                  <p className="text-xs text-muted-foreground">to {data.dateRange.to}</p>
                </>
              ) : (
                <p className="text-sm font-medium">-</p>
              )}
            </div>
          </div>

          {/* Validation Warnings */}
          {data.validationWarnings.length > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-sm font-medium text-warning">Validation Warnings</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {data.validationWarnings.map((warning, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-warning">•</span> {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Column Preview */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Columns className="h-3 w-3" />
              Detected Columns
            </p>
            <div className="flex flex-wrap gap-1">
              {data.columns.map(col => (
                <Badge key={col} variant="outline" className="text-xs">
                  {col}
                </Badge>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Data Preview (first 10 rows)
            </p>
            <ScrollArea className="h-48 rounded-lg border border-border/50">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {data.columns.slice(0, 8).map(col => (
                        <th key={col} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                          {col}
                        </th>
                      ))}
                      {data.columns.length > 8 && (
                        <th className="px-2 py-1.5 text-muted-foreground">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.previewRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-border/30 hover:bg-muted/30">
                        {data.columns.slice(0, 8).map(col => (
                          <td key={col} className="px-2 py-1.5 whitespace-nowrap">
                            {String(row[col] ?? '-')}
                          </td>
                        ))}
                        {data.columns.length > 8 && (
                          <td className="px-2 py-1.5 text-muted-foreground">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirmImport} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Proceed to Column Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
