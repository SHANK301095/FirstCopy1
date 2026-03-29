/**
 * Code Diff Viewer - P1 Strategy Library
 * Compare strategy versions
 */

import { useMemo } from 'react';
import { GitCompare, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber: number;
  oldLineNumber?: number;
}

interface CodeDiffViewerProps {
  oldCode: string;
  newCode: string;
  oldVersion?: string;
  newVersion?: string;
  className?: string;
}

function computeDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const diff: DiffLine[] = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  let lineNumber = 0;

  // Simple line-by-line diff
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    lineNumber++;
    
    if (oldIndex >= oldLines.length) {
      // Only new lines left
      diff.push({
        type: 'added',
        content: newLines[newIndex],
        lineNumber,
      });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // Only old lines left
      diff.push({
        type: 'removed',
        content: oldLines[oldIndex],
        lineNumber,
        oldLineNumber: oldIndex + 1,
      });
      oldIndex++;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines match
      diff.push({
        type: 'unchanged',
        content: newLines[newIndex],
        lineNumber,
        oldLineNumber: oldIndex + 1,
      });
      oldIndex++;
      newIndex++;
    } else {
      // Lines differ - check if it's a modification or insert/delete
      const oldInNew = newLines.indexOf(oldLines[oldIndex], newIndex);
      const newInOld = oldLines.indexOf(newLines[newIndex], oldIndex);
      
      if (oldInNew === -1 && newInOld === -1) {
        // Both lines changed
        diff.push({
          type: 'removed',
          content: oldLines[oldIndex],
          lineNumber,
          oldLineNumber: oldIndex + 1,
        });
        diff.push({
          type: 'added',
          content: newLines[newIndex],
          lineNumber: lineNumber + 1,
        });
        lineNumber++;
        oldIndex++;
        newIndex++;
      } else if (oldInNew === -1) {
        // Old line was removed
        diff.push({
          type: 'removed',
          content: oldLines[oldIndex],
          lineNumber,
          oldLineNumber: oldIndex + 1,
        });
        oldIndex++;
      } else {
        // New line was added
        diff.push({
          type: 'added',
          content: newLines[newIndex],
          lineNumber,
        });
        newIndex++;
      }
    }
  }

  return diff;
}

export function CodeDiffViewer({
  oldCode,
  newCode,
  oldVersion = 'v1',
  newVersion = 'v2',
  className,
}: CodeDiffViewerProps) {
  const [expanded, setExpanded] = useState(true);
  
  const diff = useMemo(() => computeDiff(oldCode, newCode), [oldCode, newCode]);
  
  const stats = useMemo(() => {
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;
    return { added, removed };
  }, [diff]);

  return (
    <Card className={cn("", className)}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-primary" />
              Code Changes
              <Badge variant="outline" className="text-[10px] ml-2">
                {oldVersion} → {newVersion}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] bg-profit/10 text-profit">
                <Plus className="h-3 w-3 mr-0.5" />
                {stats.added}
              </Badge>
              <Badge className="text-[10px] bg-loss/10 text-loss">
                <Minus className="h-3 w-3 mr-0.5" />
                {stats.removed}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="font-mono text-xs">
                {diff.map((line, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-stretch border-b border-border/20 last:border-0",
                      line.type === 'added' && "bg-profit/10",
                      line.type === 'removed' && "bg-loss/10"
                    )}
                  >
                    {/* Line number */}
                    <div className="w-10 flex-shrink-0 text-right pr-2 py-0.5 text-muted-foreground border-r border-border/30 select-none">
                      {line.lineNumber}
                    </div>
                    
                    {/* Change indicator */}
                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                      {line.type === 'added' && (
                        <Plus className="h-3 w-3 text-profit" />
                      )}
                      {line.type === 'removed' && (
                        <Minus className="h-3 w-3 text-loss" />
                      )}
                    </div>
                    
                    {/* Code content */}
                    <div className="flex-1 py-0.5 px-2 whitespace-pre overflow-x-auto">
                      {line.content || ' '}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
