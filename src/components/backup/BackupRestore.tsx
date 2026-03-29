/**
 * Backup/Restore Component
 * Spec: Export/Import - db.exportAll() + db.importAll() with compression
 */

import { useState, forwardRef } from 'react';
import { Download, Upload, Archive, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/db';
import { secureLogger } from '@/lib/secureLogger';

interface ImportPreview {
  counts: Record<string, number>;
  schemaVersion: number;
  exportedAt: number;
}

export const BackupRestore = forwardRef<HTMLDivElement, object>((_, ref) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [compress, setCompress] = useState(true);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    
    try {
      setProgress(20);
      const data = await db.exportAll({ compress });
      setProgress(80);
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mmc-backup-${new Date().toISOString().slice(0, 10)}${compress ? '.lz' : ''}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setProgress(100);
      toast({ title: 'Backup Created', description: 'Your data has been exported successfully.' });
      
      await db.log('info', 'Backup exported', { compressed: compress });
    } catch (error) {
      secureLogger.error('ui', 'Export failed', { error });
      toast({ 
        title: 'Export Failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const isCompressed = file.name.includes('.lz');
      const preview = await db.previewImport(text, isCompressed);
      
      // Parse wrapper for metadata
      let jsonStr = text;
      if (isCompressed) {
        const LZString = (await import('lz-string')).default;
        jsonStr = LZString.decompressFromUTF16(text) || text;
      }
      const wrapper = JSON.parse(jsonStr);
      
      setImportPreview({
        counts: preview,
        schemaVersion: wrapper.schemaVersion || 1,
        exportedAt: wrapper.exportedAt || Date.now()
      });
      setPendingFile(file);
    } catch (error) {
      secureLogger.error('ui', 'Preview failed', { error });
      toast({
        title: 'Invalid Backup File',
        description: 'Could not read backup file. It may be corrupted.',
        variant: 'destructive'
      });
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!pendingFile) return;
    
    setIsImporting(true);
    setProgress(0);
    
    try {
      setProgress(20);
      const text = await pendingFile.text();
      const isCompressed = pendingFile.name.includes('.lz');
      
      setProgress(50);
      const result = await db.importAll(text, { mode: importMode, compressed: isCompressed });
      setProgress(100);
      
      if (result.success) {
        const totalRecords = Object.values(result.counts).reduce((a, b) => a + b, 0);
        toast({ 
          title: 'Import Successful', 
          description: `Imported ${totalRecords} records. ${result.skipped > 0 ? `${result.skipped} skipped.` : ''}`
        });
        
        if (result.conflicts.length > 0) {
          secureLogger.info('db', 'Import conflicts', { count: result.conflicts.length });
        }
      }
      
      setImportPreview(null);
      setPendingFile(null);
    } catch (error) {
      secureLogger.error('db', 'Import failed', { error });
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const cancelImport = () => {
    setImportPreview(null);
    setPendingFile(null);
  };

  return (
    <div ref={ref} className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Backup
          </CardTitle>
          <CardDescription>
            Create a complete backup of all your data including datasets, strategies, and results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="compress">Enable Compression</Label>
              <p className="text-xs text-muted-foreground">
                Uses LZ-String compression to reduce file size (~60-80% smaller)
              </p>
            </div>
            <Switch
              id="compress"
              checked={compress}
              onCheckedChange={setCompress}
            />
          </div>
          
          {isExporting && (
            <Progress value={progress} className="h-2" />
          )}
          
          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Create Backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Restore Backup
          </CardTitle>
          <CardDescription>
            Restore data from a previously created backup file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!importPreview ? (
            <>
              <div className="space-y-2">
                <Label>Import Mode</Label>
                <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as 'replace' | 'merge')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="font-normal">
                      Replace — Clear existing data and import fresh
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="font-normal">
                      Merge — Keep existing data, skip conflicts
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="backup-file"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select backup file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .json or .lz.json files
                    </p>
                  </div>
                  <input
                    id="backup-file"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Backup file validated. Schema version: {importPreview.schemaVersion}
                </AlertDescription>
              </Alert>
              
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium">Records to Import:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(importPreview.counts).map(([table, count]) => (
                    <div key={table} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{table}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Exported: {new Date(importPreview.exportedAt).toLocaleString()}
                </p>
              </div>
              
              {importMode === 'replace' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Replace mode will delete ALL existing data before importing!
                  </AlertDescription>
                </Alert>
              )}
              
              {isImporting && (
                <Progress value={progress} className="h-2" />
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={cancelImport} disabled={isImporting}>
                  Cancel
                </Button>
                
                {importMode === 'replace' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="flex-1" disabled={isImporting}>
                        {isImporting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          'Restore Backup'
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all existing data and replace it with the backup.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleImport}>
                          Yes, Replace All Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button className="flex-1" onClick={handleImport} disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      'Merge Backup'
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

BackupRestore.displayName = 'BackupRestore';
