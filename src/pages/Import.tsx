import { useState, useCallback } from 'react';
import { Upload, FileUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { processImportedFile } from '@/lib/reportParser';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/ui/PageTitle';

export default function Import() {
  const { batches, eas, currentProjectId, addResults } = useStore();
  const { toast } = useToast();
  
  const projectBatches = batches.filter((b) => b.projectId === currentProjectId);
  const projectEAs = eas.filter((e) => e.projectId === currentProjectId);
  
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedEA, setSelectedEA] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ name: string; success: boolean }[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (!selectedBatch || !selectedEA) {
      toast({ title: 'Error', description: 'Select batch and EA first', variant: 'destructive' });
      return;
    }

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith('.html') || f.name.endsWith('.htm') || f.name.endsWith('.xml') || f.name.endsWith('.csv')
    );

    if (files.length === 0) {
      toast({ title: 'Error', description: 'No valid files. Use HTML, XML, or CSV.', variant: 'destructive' });
      return;
    }

    setImporting(true);
    const results: { name: string; success: boolean }[] = [];
    const parsedResults = [];

    for (const file of files) {
      try {
        const result = await processImportedFile(file, selectedBatch, selectedEA);
        if (result) {
          parsedResults.push(result);
          results.push({ name: file.name, success: true });
        } else {
          results.push({ name: file.name, success: false });
        }
      } catch {
        results.push({ name: file.name, success: false });
      }
    }

    if (parsedResults.length > 0) {
      addResults(parsedResults);
      toast({ title: 'Success', description: `Imported ${parsedResults.length} results` });
    }
    setImportResults(results);
    setImporting(false);
  }, [selectedBatch, selectedEA, addResults, toast]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const dt = new DataTransfer();
    Array.from(e.target.files).forEach((f) => dt.items.add(f));
    const fakeEvent = { preventDefault: () => {}, dataTransfer: dt } as unknown as React.DragEvent;
    await handleDrop(fakeEvent);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle 
        title="Import Results" 
        subtitle="Import MT5 backtest reports (HTML, XML, CSV)"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Select Batch</label>
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger><SelectValue placeholder="Choose batch..." /></SelectTrigger>
            <SelectContent>
              {projectBatches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Select EA</label>
          <Select value={selectedEA} onValueChange={setSelectedEA}>
            <SelectTrigger><SelectValue placeholder="Choose EA..." /></SelectTrigger>
            <SelectContent>
              {projectEAs.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className={cn('border-2 border-dashed transition-colors', dragActive ? 'border-primary bg-primary/5' : 'border-border')}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Upload className={cn('h-12 w-12 mb-4', dragActive ? 'text-primary' : 'text-muted-foreground')} />
          <h3 className="text-lg font-semibold mb-2">Drag & Drop Reports</h3>
          <p className="text-muted-foreground text-center mb-4">Drop MT5 HTML, XML, or CSV report files here</p>
          <label>
            <input type="file" multiple accept=".html,.htm,.xml,.csv" className="hidden" onChange={handleFileInput} />
            <Button variant="outline" asChild><span>Browse Files</span></Button>
          </label>
        </CardContent>
      </Card>

      {importResults.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Import Results</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.success ? <CheckCircle className="h-4 w-4 text-profit" /> : <AlertCircle className="h-4 w-4 text-loss" />}
                  <span className={r.success ? 'text-foreground' : 'text-muted-foreground'}>{r.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
