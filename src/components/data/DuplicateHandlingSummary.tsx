/**
 * Duplicate Handling Summary UI
 * Clear report panel for keep-first/last/drop policies
 */

import { useState, useMemo } from 'react';
import { 
  Copy, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type DuplicatePolicy = 'keep-first' | 'keep-last' | 'drop-duplicates';

interface DuplicateGroup {
  timestamp: number;
  rows: Array<{
    index: number;
    values: number[];
    source?: string;
  }>;
}

interface DuplicateHandlingSummaryProps {
  duplicates: DuplicateGroup[];
  totalRows: number;
  policy: DuplicatePolicy;
  onPolicyChange: (policy: DuplicatePolicy) => void;
  onApply?: () => void;
  className?: string;
}

const POLICY_INFO: Record<DuplicatePolicy, { label: string; description: string; icon: React.ReactNode }> = {
  'keep-first': {
    label: 'Keep First',
    description: 'Keep the first occurrence, discard later duplicates',
    icon: <ArrowUp className="h-4 w-4" />,
  },
  'keep-last': {
    label: 'Keep Last',
    description: 'Keep the last occurrence, replace earlier duplicates',
    icon: <ArrowDown className="h-4 w-4" />,
  },
  'drop-duplicates': {
    label: 'Drop All',
    description: 'Remove all rows with duplicate timestamps',
    icon: <Trash2 className="h-4 w-4" />,
  },
};

export function DuplicateHandlingSummary({
  duplicates,
  totalRows,
  policy,
  onPolicyChange,
  onApply,
  className,
}: DuplicateHandlingSummaryProps) {
  const [showExamples, setShowExamples] = useState(false);
  
  const stats = useMemo(() => {
    const totalDuplicateRows = duplicates.reduce((sum, g) => sum + g.rows.length, 0);
    const uniqueTimestamps = duplicates.length;
    
    // Calculate what will be kept/removed per policy
    let keptRows = 0;
    let removedRows = 0;
    
    switch (policy) {
      case 'keep-first':
      case 'keep-last':
        keptRows = uniqueTimestamps;
        removedRows = totalDuplicateRows - uniqueTimestamps;
        break;
      case 'drop-duplicates':
        keptRows = 0;
        removedRows = totalDuplicateRows;
        break;
    }
    
    return {
      totalDuplicateRows,
      uniqueTimestamps,
      keptRows,
      removedRows,
      percentageDuplicates: ((totalDuplicateRows / totalRows) * 100).toFixed(2),
    };
  }, [duplicates, policy, totalRows]);

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toISOString().replace('T', ' ').slice(0, 19);
  };

  if (duplicates.length === 0) {
    return (
      <Card className={cn('border-profit/30 bg-profit/5', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-profit" />
            No Duplicates Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All {totalRows.toLocaleString()} rows have unique timestamps. No deduplication needed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-warning/30', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-warning" />
              Duplicate Timestamps Detected
            </CardTitle>
            <CardDescription>
              {stats.uniqueTimestamps} unique timestamps have multiple rows ({stats.percentageDuplicates}% of data)
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {stats.totalDuplicateRows} duplicates
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Policy selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Handling Policy:</Label>
          <RadioGroup value={policy} onValueChange={(v) => onPolicyChange(v as DuplicatePolicy)}>
            <div className="grid gap-3">
              {(Object.entries(POLICY_INFO) as [DuplicatePolicy, typeof POLICY_INFO['keep-first']][]).map(([key, info]) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer',
                    policy === key ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  )}
                  onClick={() => onPolicyChange(key)}
                >
                  <RadioGroupItem value={key} id={key} />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {info.icon}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={key} className="font-medium cursor-pointer">
                      {info.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Impact preview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-profit/10 border border-profit/30">
            <div className="text-2xl font-bold text-profit">{stats.keptRows.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Rows to keep</div>
          </div>
          <div className="p-4 rounded-lg bg-loss/10 border border-loss/30">
            <div className="text-2xl font-bold text-loss">{stats.removedRows.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Rows to remove</div>
          </div>
        </div>

        {/* Examples toggle */}
        <Collapsible open={showExamples} onOpenChange={setShowExamples}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Eye className="h-4 w-4" />
              {showExamples ? 'Hide Examples' : 'Show Examples'}
              <Badge variant="secondary">{Math.min(5, duplicates.length)}</Badge>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <ScrollArea className="h-[200px] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[80px]">Count</TableHead>
                    <TableHead>Rows (Index)</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicates.slice(0, 5).map((group, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">
                        {formatTimestamp(group.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{group.rows.length}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {group.rows.map(r => `#${r.index}`).join(', ')}
                      </TableCell>
                      <TableCell>
                        {policy === 'keep-first' && (
                          <span className="text-xs">Keep #${group.rows[0].index}</span>
                        )}
                        {policy === 'keep-last' && (
                          <span className="text-xs">Keep #${group.rows[group.rows.length - 1].index}</span>
                        )}
                        {policy === 'drop-duplicates' && (
                          <span className="text-xs text-loss">Drop all</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>

        {/* Apply button */}
        {onApply && (
          <Button onClick={onApply} className="w-full gap-2">
            <Filter className="h-4 w-4" />
            Apply {POLICY_INFO[policy].label} Policy
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
