/**
 * Export Center - Central hub for all exports
 * CSV/JSON/PDF download options for all data types
 */

import React, { useState } from 'react';
import { 
  Download, FileText, FileJson, FileSpreadsheet, 
  Clock, Trash2, FolderDown, Database, LineChart,
  TrendingUp, Briefcase, FileBarChart, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { toast } from 'sonner';
import { 
  ExportFormat, 
  ExportDataType, 
  getExportHistory, 
  clearExportHistory,
  exportToCSV,
  exportToJSON,
  ExportHistoryItem
} from '@/lib/exportService';
import { generateProfessionalTearsheet } from '@/lib/professionalPdfExport';

const DATA_TYPES: { id: ExportDataType; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'dataset', label: 'Datasets', icon: <Database className="h-5 w-5" />, description: 'OHLCV price data' },
  { id: 'backtest', label: 'Backtest Results', icon: <LineChart className="h-5 w-5" />, description: 'Performance metrics & equity' },
  { id: 'trades', label: 'Trade History', icon: <TrendingUp className="h-5 w-5" />, description: 'Individual trade records' },
  { id: 'strategy', label: 'Strategies', icon: <FileBarChart className="h-5 w-5" />, description: 'Strategy code & parameters' },
  { id: 'portfolio', label: 'Portfolio', icon: <Briefcase className="h-5 w-5" />, description: 'Portfolio composition' },
  { id: 'tearsheet', label: 'Tearsheet', icon: <FileText className="h-5 w-5" />, description: 'PDF performance report' },
];

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  csv: <FileSpreadsheet className="h-4 w-4" />,
  json: <FileJson className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
  html: <FileText className="h-4 w-4" />,
};

export default function ExportCenter() {
  const [selectedType, setSelectedType] = useState<ExportDataType>('dataset');
  const [isExporting, setIsExporting] = useState(false);
  const [history, setHistory] = useState<ExportHistoryItem[]>(getExportHistory());

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    
    try {
      // Demo export with sample data
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `mmc-${selectedType}-${timestamp}`;

      if (format === 'csv') {
        // Sample CSV export
        const sampleData = [
          { date: '2024-01-01', open: 100, high: 105, low: 99, close: 103, volume: 1000 },
          { date: '2024-01-02', open: 103, high: 108, low: 102, close: 107, volume: 1200 },
        ];
        exportToCSV(sampleData, filename);
        toast.success(`${selectedType} exported as CSV`);
      } else if (format === 'json') {
        const sampleData = { type: selectedType, exportedAt: new Date().toISOString(), data: [] };
        exportToJSON(sampleData, filename);
        toast.success(`${selectedType} exported as JSON`);
      } else if (format === 'pdf') {
        toast.loading('Generating professional PDF...');
        await generateProfessionalTearsheet({
          netProfit: 45000,
          grossProfit: 78000,
          grossLoss: -33000,
          totalTrades: 142,
          winningTrades: 92,
          losingTrades: 50,
          winRate: 64.8,
          profitFactor: 2.36,
          maxDrawdownPercent: 12.3,
          maxDrawdownAmount: 8500,
          sharpeRatio: 1.65,
          cagr: 24.5,
          expectancyR: 0.42,
          avgWin: 848,
          avgLoss: 660,
          largestWin: 5200,
          largestLoss: -3100,
          avgHoldTime: 0,
          equityCurve: Array.from({ length: 100 }, (_, i) => 100000 + i * 450 + ((i * 31 + 7) % 50) * 40),
          drawdownCurve: Array.from({ length: 100 }, (_, i) => -((i * 17 + 3) % 8)),
          trades: [],
          symbol: selectedType,
          dateRange: 'Sample Export',
          traderName: 'Trader',
          strategyName: `${selectedType} Report`,
        });
        toast.dismiss();
        toast.success('Professional PDF downloaded!');
      }

      // Refresh history
      setHistory(getExportHistory());
    } catch (error) {
      toast.error('Export failed. Please try again.');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearHistory = () => {
    clearExportHistory();
    setHistory([]);
    toast.success('Export history cleared');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderDown className="h-6 w-6 text-primary" />
            Export Center
          </h1>
          <p className="text-muted-foreground">
            Download your data in CSV, JSON, or PDF format
          </p>
        </div>
        <Button variant="outline" onClick={() => setHistory(getExportHistory())}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Type Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Data Type</CardTitle>
              <CardDescription>Choose what you want to export</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DATA_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                      selectedType === type.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedType === type.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {type.icon}
                    </div>
                    <span className="font-medium text-sm">{type.label}</span>
                    <span className="text-xs text-muted-foreground text-center">{type.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
              <CardDescription>Choose your preferred format for {DATA_TYPES.find(t => t.id === selectedType)?.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting || selectedType === 'tearsheet'}
                >
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <span>CSV</span>
                  <span className="text-xs text-muted-foreground">Spreadsheet</span>
                </Button>
                
                <Button
                  size="lg"
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleExport('json')}
                  disabled={isExporting || selectedType === 'tearsheet'}
                >
                  <FileJson className="h-8 w-8 text-yellow-600" />
                  <span>JSON</span>
                  <span className="text-xs text-muted-foreground">Structured</span>
                </Button>
                
                <Button
                  size="lg"
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                >
                  <FileText className="h-8 w-8 text-red-600" />
                  <span>PDF</span>
                  <span className="text-xs text-muted-foreground">Report</span>
                </Button>
              </div>

              {selectedType === 'tearsheet' && (
                <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                  💡 Tearsheets are only available in PDF format as they include charts and formatted reports.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export History */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Export History</CardTitle>
              <CardDescription>Recent downloads</CardDescription>
            </div>
            {history.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear export history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all records of past exports. The files themselves are not affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearHistory}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No exports yet</p>
                <p className="text-xs">Your export history will appear here</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-2 rounded bg-muted">
                        {FORMAT_ICONS[item.format]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.filename}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {item.format.toUpperCase()}
                          </Badge>
                          <span>{formatFileSize(item.size)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="text-lg">💡</span>
            <div>
              <strong>Quick Tips:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Use CSV for importing into Excel or Google Sheets</li>
                <li>Use JSON for programmatic access or backups</li>
                <li>Use PDF for sharing professional reports</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
