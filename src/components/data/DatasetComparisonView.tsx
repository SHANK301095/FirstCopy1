/**
 * Dataset Comparison View - P1 Data Manager
 * Supports both local datasets and Public Library datasets
 */

import { useState } from 'react';
import { GitCompare, Check, X, Calendar, Database, BarChart2, Library } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { UniversalAssetSelector, AssetOption } from '@/components/selectors/UniversalAssetSelector';

interface DatasetMeta {
  id: string;
  name: string;
  symbol?: string;
  timeframe?: string;
  rowCount?: number;
  dateRange?: string;
  columns?: string[];
}

interface DatasetComparisonViewProps {
  datasets: DatasetMeta[];
  className?: string;
  showLibrary?: boolean;
}

export function DatasetComparisonView({ datasets, className }: DatasetComparisonViewProps) {
  const [dataset1Id, setDataset1Id] = useState<string>('');
  const [dataset2Id, setDataset2Id] = useState<string>('');

  const dataset1 = datasets.find(d => d.id === dataset1Id);
  const dataset2 = datasets.find(d => d.id === dataset2Id);

  const compareField = (val1: unknown, val2: unknown) => {
    if (val1 === val2) return 'equal';
    if (!val1 || !val2) return 'missing';
    return 'different';
  };

  const renderCompareCell = (val1: unknown, val2: unknown) => {
    const status = compareField(val1, val2);
    return (
      <div className="flex items-center gap-1">
        {status === 'equal' && <Check className="h-3 w-3 text-profit" />}
        {status === 'different' && <X className="h-3 w-3 text-warning" />}
        {status === 'missing' && <span className="text-muted-foreground">—</span>}
      </div>
    );
  };

  const fields = [
    { key: 'symbol', label: 'Symbol', icon: Database },
    { key: 'timeframe', label: 'Timeframe', icon: BarChart2 },
    { key: 'rowCount', label: 'Rows', icon: BarChart2 },
    { key: 'dateRange', label: 'Date Range', icon: Calendar },
  ];

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          Compare Datasets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dataset Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dataset A</label>
            <Select value={dataset1Id} onValueChange={setDataset1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select dataset..." />
              </SelectTrigger>
              <SelectContent>
                {datasets.map(d => (
                  <SelectItem key={d.id} value={d.id} disabled={d.id === dataset2Id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dataset B</label>
            <Select value={dataset2Id} onValueChange={setDataset2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select dataset..." />
              </SelectTrigger>
              <SelectContent>
                {datasets.map(d => (
                  <SelectItem key={d.id} value={d.id} disabled={d.id === dataset1Id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Table */}
        {dataset1 && dataset2 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 text-xs font-medium">Field</th>
                  <th className="text-left p-2 text-xs font-medium">{dataset1.name}</th>
                  <th className="text-left p-2 text-xs font-medium">{dataset2.name}</th>
                  <th className="text-center p-2 text-xs font-medium w-12">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {fields.map(field => {
                  const val1 = dataset1[field.key as keyof DatasetMeta];
                  const val2 = dataset2[field.key as keyof DatasetMeta];
                  return (
                    <tr key={field.key} className="hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground flex items-center gap-1.5">
                        <field.icon className="h-3 w-3" />
                        {field.label}
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {String(val1 ?? '—')}
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {String(val2 ?? '—')}
                      </td>
                      <td className="p-2 text-center">
                        {renderCompareCell(val1, val2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <GitCompare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select two datasets to compare</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
