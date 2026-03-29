/**
 * Data Import Wizard Component
 * Step-by-step flow for CSV/JSON cleaning & validation
 */

import { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, Wand2, Settings2, Eye, Download, Loader2, X } from 'lucide-react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getAllPresets, detectPreset, type ImportPreset } from '@/lib/importPresets';

// Wizard steps
type WizardStep = 'upload' | 'preview' | 'cleaning' | 'validation' | 'mapping' | 'confirm';

interface ColumnInfo {
  name: string;
  sampleValues: string[];
  inferredType: 'number' | 'date' | 'string' | 'unknown';
  nullCount: number;
  uniqueCount: number;
}

interface CleaningSuggestion {
  id: string;
  column: string;
  issue: string;
  suggestion: string;
  action: 'trim' | 'parseNumber' | 'parseDate' | 'fillNull' | 'drop';
  autoApply: boolean;
}

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  check: (data: Record<string, string>[]) => { passed: boolean; message: string };
  required: boolean;
}

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: {
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
  }) => void;
}

const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];
const REQUIRED_MAPPINGS = ['timestamp', 'open', 'high', 'low', 'close'];

const STEP_LABELS: Record<WizardStep, string> = {
  upload: 'Upload File',
  preview: 'Preview Data',
  cleaning: 'Clean Data',
  validation: 'Validate',
  mapping: 'Map Columns',
  confirm: 'Confirm Import',
};

export function DataImportWizard({ open, onClose, onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [cleaningSuggestions, setCleaningSuggestions] = useState<CleaningSuggestion[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<ImportPreset | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState({
    name: '',
    symbol: '',
    timeframe: 'M5',
    timezone: 'Asia/Kolkata',
  });
  const [validationResults, setValidationResults] = useState<Array<{ rule: string; passed: boolean; message: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = useMemo(() => getAllPresets(), []);
  const stepIndex = Object.keys(STEP_LABELS).indexOf(step);

  // Handle file upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setIsProcessing(true);

    try {
      // Parse CSV
      const text = await selectedFile.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        preview: 1000, // Preview first 1000 rows
      });

      if (result.errors.length > 0) {
        setError(`Parse error: ${result.errors[0].message}`);
        setIsProcessing(false);
        return;
      }

      setRawData(result.data);

      // Analyze columns
      const columnNames = result.meta.fields || [];
      const columnInfos: ColumnInfo[] = columnNames.map(name => {
        const values = result.data.map(row => row[name]).filter(v => v !== undefined && v !== '');
        const uniqueValues = new Set(values);
        
        // Infer type
        let inferredType: ColumnInfo['inferredType'] = 'unknown';
        const numericCount = values.filter(v => !isNaN(Number(v))).length;
        const dateCount = values.filter(v => !isNaN(Date.parse(v))).length;
        
        if (numericCount > values.length * 0.8) inferredType = 'number';
        else if (dateCount > values.length * 0.8) inferredType = 'date';
        else if (values.length > 0) inferredType = 'string';

        return {
          name,
          sampleValues: values.slice(0, 5),
          inferredType,
          nullCount: result.data.length - values.length,
          uniqueCount: uniqueValues.size,
        };
      });

      setColumns(columnInfos);

      // Auto-detect preset
      const detectedPreset = detectPreset(columnNames);
      if (detectedPreset) {
        setSelectedPreset(detectedPreset);
        // Auto-map columns based on preset
        const mappings: Record<string, string> = {};
        for (const mapping of detectedPreset.mappings) {
          const matchingCol = columnNames.find(
            c => c.toLowerCase() === mapping.sourceColumn.toLowerCase()
          );
          if (matchingCol) {
            mappings[matchingCol] = mapping.targetField;
          }
        }
        setColumnMappings(mappings);
      }

      // Generate cleaning suggestions
      const suggestions: CleaningSuggestion[] = [];
      for (const col of columnInfos) {
        // Check for whitespace
        const hasWhitespace = col.sampleValues.some(v => v !== v.trim());
        if (hasWhitespace) {
          suggestions.push({
            id: `trim-${col.name}`,
            column: col.name,
            issue: 'Values have leading/trailing whitespace',
            suggestion: 'Trim whitespace from all values',
            action: 'trim',
            autoApply: true,
          });
        }

        // Check for null values
        if (col.nullCount > 0 && col.nullCount < result.data.length * 0.1) {
          suggestions.push({
            id: `null-${col.name}`,
            column: col.name,
            issue: `${col.nullCount} missing values (${((col.nullCount / result.data.length) * 100).toFixed(1)}%)`,
            suggestion: 'Drop rows with missing values',
            action: 'drop',
            autoApply: false,
          });
        }
      }
      setCleaningSuggestions(suggestions);

      // Set default name from filename
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setMetadata(prev => ({ ...prev, name: baseName }));

      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Run validation checks
  const runValidation = useCallback(() => {
    const rules: ValidationRule[] = [
      {
        id: 'required-columns',
        name: 'Required Columns',
        description: 'All OHLC columns must be mapped',
        check: () => {
          const mapped = Object.values(columnMappings);
          const missing = REQUIRED_MAPPINGS.filter(r => !mapped.includes(r));
          return {
            passed: missing.length === 0,
            message: missing.length === 0 ? 'All required columns mapped' : `Missing: ${missing.join(', ')}`,
          };
        },
        required: true,
      },
      {
        id: 'monotonic-timestamp',
        name: 'Monotonic Timestamps',
        description: 'Timestamps should be in ascending order',
        check: () => {
          const tsCol = Object.entries(columnMappings).find(([, v]) => v === 'timestamp')?.[0];
          if (!tsCol) return { passed: false, message: 'No timestamp column mapped' };
          
          let lastTs = -Infinity;
          let outOfOrder = 0;
          for (const row of rawData.slice(0, 100)) {
            const ts = Number(row[tsCol]) || Date.parse(row[tsCol]);
            if (ts < lastTs) outOfOrder++;
            lastTs = ts;
          }
          return {
            passed: outOfOrder === 0,
            message: outOfOrder === 0 ? 'Timestamps are in order' : `${outOfOrder} out-of-order timestamps found`,
          };
        },
        required: false,
      },
      {
        id: 'numeric-ohlc',
        name: 'Numeric OHLC Values',
        description: 'OHLC values should be valid numbers',
        check: () => {
          const ohlcCols = Object.entries(columnMappings)
            .filter(([, v]) => ['open', 'high', 'low', 'close'].includes(v))
            .map(([k]) => k);
          
          let invalidCount = 0;
          for (const row of rawData.slice(0, 100)) {
            for (const col of ohlcCols) {
              if (isNaN(Number(row[col]))) invalidCount++;
            }
          }
          return {
            passed: invalidCount === 0,
            message: invalidCount === 0 ? 'All OHLC values are numeric' : `${invalidCount} non-numeric values found`,
          };
        },
        required: true,
      },
    ];

    const results = rules.map(rule => ({
      rule: rule.name,
      ...rule.check(rawData),
    }));

    setValidationResults(results);
    return results.every(r => r.passed);
  }, [columnMappings, rawData]);

  // Handle final import
  const handleImport = useCallback(() => {
    setIsProcessing(true);

    try {
      // Find column mappings
      const tsCol = Object.entries(columnMappings).find(([, v]) => v === 'timestamp')?.[0];
      const openCol = Object.entries(columnMappings).find(([, v]) => v === 'open')?.[0];
      const highCol = Object.entries(columnMappings).find(([, v]) => v === 'high')?.[0];
      const lowCol = Object.entries(columnMappings).find(([, v]) => v === 'low')?.[0];
      const closeCol = Object.entries(columnMappings).find(([, v]) => v === 'close')?.[0];
      const volCol = Object.entries(columnMappings).find(([, v]) => v === 'volume')?.[0];

      if (!tsCol || !openCol || !highCol || !lowCol || !closeCol) {
        throw new Error('Missing required column mappings');
      }

      // Convert to numeric rows
      const rows: number[][] = [];
      for (const row of rawData) {
        const ts = Number(row[tsCol]) || Date.parse(row[tsCol]);
        const o = Number(row[openCol]);
        const h = Number(row[highCol]);
        const l = Number(row[lowCol]);
        const c = Number(row[closeCol]);
        const v = volCol ? Number(row[volCol]) || 0 : 0;

        if (!isNaN(ts) && !isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c)) {
          rows.push([ts, o, h, l, c, v]);
        }
      }

      // Sort by timestamp
      rows.sort((a, b) => a[0] - b[0]);

      onComplete({
        rows,
        metadata: {
          name: metadata.name,
          symbol: metadata.symbol,
          timeframe: metadata.timeframe,
          timezone: metadata.timezone,
          rowCount: rows.length,
          rangeFrom: rows[0]?.[0] || 0,
          rangeTo: rows[rows.length - 1]?.[0] || 0,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  }, [columnMappings, rawData, metadata, onComplete]);

  // Navigation
  const nextStep = useCallback(() => {
    const steps: WizardStep[] = ['upload', 'preview', 'cleaning', 'validation', 'mapping', 'confirm'];
    const currentIdx = steps.indexOf(step);
    if (currentIdx < steps.length - 1) {
      if (step === 'mapping') {
        runValidation();
      }
      setStep(steps[currentIdx + 1]);
    }
  }, [step, runValidation]);

  const prevStep = useCallback(() => {
    const steps: WizardStep[] = ['upload', 'preview', 'cleaning', 'validation', 'mapping', 'confirm'];
    const currentIdx = steps.indexOf(step);
    if (currentIdx > 0) {
      setStep(steps[currentIdx - 1]);
    }
  }, [step]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Import Wizard - {STEP_LABELS[step]}
          </DialogTitle>
          <DialogDescription>
            Step {stepIndex + 1} of {Object.keys(STEP_LABELS).length}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="px-1">
          <Progress value={((stepIndex + 1) / Object.keys(STEP_LABELS).length) * 100} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {Object.values(STEP_LABELS).map((label, idx) => (
              <span key={label} className={cn(idx <= stepIndex && 'text-primary font-medium')}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="flex-1 pr-4">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Drop CSV/JSON file here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Supports CSV, JSON, and TXT files up to 500MB
                  </p>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Or select a preset format:</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {presets.slice(0, 6).map(preset => (
                    <Button
                      key={preset.id}
                      variant={selectedPreset?.id === preset.id ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start"
                      onClick={() => setSelectedPreset(preset)}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Processing file...</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{file?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {rawData.length.toLocaleString()} rows, {columns.length} columns
                  </p>
                </div>
                {selectedPreset && (
                  <Badge variant="secondary">
                    Detected: {selectedPreset.name}
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.slice(0, 6).map(col => (
                        <TableHead key={col.name} className="whitespace-nowrap">
                          {col.name}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {col.inferredType}
                          </Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.slice(0, 6).map(col => (
                          <TableCell key={col.name} className="font-mono text-sm">
                            {row[col.name]?.slice(0, 20) || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>

              <Alert>
                <Eye className="h-4 w-4" />
                <AlertTitle>Preview Mode</AlertTitle>
                <AlertDescription>
                  Showing first 5 rows. Full data will be processed on import.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step: Cleaning */}
          {step === 'cleaning' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Cleaning Suggestions</p>
                <Badge variant="secondary">{cleaningSuggestions.length} issues found</Badge>
              </div>

              {cleaningSuggestions.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-profit" />
                  <AlertTitle>Data looks clean!</AlertTitle>
                  <AlertDescription>No cleaning actions needed. Proceed to validation.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {cleaningSuggestions.map(suggestion => (
                    <div key={suggestion.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Checkbox
                        id={suggestion.id}
                        defaultChecked={suggestion.autoApply}
                      />
                      <div className="flex-1">
                        <Label htmlFor={suggestion.id} className="font-medium cursor-pointer">
                          {suggestion.column}: {suggestion.issue}
                        </Label>
                        <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                      </div>
                      <Badge variant="outline">{suggestion.action}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Validation */}
          {step === 'validation' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Validation Results</p>
                <Button size="sm" variant="outline" onClick={runValidation}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Re-run
                </Button>
              </div>

              <div className="space-y-2">
                {validationResults.map(result => (
                  <div key={result.rule} className={cn(
                    'flex items-center gap-3 p-3 border rounded-lg',
                    result.passed ? 'border-profit/30 bg-profit/5' : 'border-loss/30 bg-loss/5'
                  )}>
                    {result.passed ? (
                      <CheckCircle className="h-5 w-5 text-profit" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-loss" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{result.rule}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4">
                {columns.map(col => (
                  <div key={col.name} className="flex items-center gap-4">
                    <div className="w-40">
                      <Label className="font-mono">{col.name}</Label>
                      <p className="text-xs text-muted-foreground">{col.sampleValues[0]?.slice(0, 15)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={columnMappings[col.name] || 'none'}
                      onValueChange={(v) => setColumnMappings(prev => ({ ...prev, [col.name]: v }))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ignore</SelectItem>
                        <SelectItem value="timestamp">Timestamp</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="close">Close</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="symbol">Symbol</SelectItem>
                      </SelectContent>
                    </Select>
                    {REQUIRED_MAPPINGS.includes(columnMappings[col.name]) && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Dataset Name</Label>
                  <Input
                    value={metadata.name}
                    onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Dataset"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input
                    value={metadata.symbol}
                    onChange={(e) => setMetadata(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    placeholder="BTCUSDT"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <Select
                    value={metadata.timeframe}
                    onValueChange={(v) => setMetadata(prev => ({ ...prev, timeframe: v }))}
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
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={metadata.timezone}
                    onValueChange={(v) => setMetadata(prev => ({ ...prev, timezone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Import Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File:</span>
                    <span>{file?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rows:</span>
                    <span>{rawData.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mapped columns:</span>
                    <span>{Object.values(columnMappings).filter(v => v !== 'none').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Validation:</span>
                    <span className={validationResults.every(r => r.passed) ? 'text-profit' : 'text-loss'}>
                      {validationResults.every(r => r.passed) ? 'All passed' : 'Has issues'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 'upload' ? onClose : prevStep}>
            {step === 'upload' ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </>
            )}
          </Button>

          {step === 'confirm' ? (
            <Button onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import Dataset
                </>
              )}
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={step === 'upload' && !file}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
