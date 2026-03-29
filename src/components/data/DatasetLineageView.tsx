/**
 * Dataset Lineage Tree View
 * Visual representation of merge history
 */

import { GitBranch, GitMerge, Database, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DatasetLineage } from '@/lib/mergeHistory';

interface DatasetLineageViewProps {
  lineage: DatasetLineage;
  className?: string;
}

function LineageNode({ node, depth = 0 }: { node: DatasetLineage; depth?: number }) {
  const hasParents = node.parents.length > 0;
  
  return (
    <div className="relative">
      {/* Connection line from parent */}
      {depth > 0 && (
        <div className="absolute -left-6 top-0 h-6 w-6 border-l-2 border-b-2 border-primary/30 rounded-bl-lg" />
      )}
      
      {/* Node card */}
      <div className={cn(
        'p-3 rounded-lg border bg-card transition-colors hover:border-primary/50',
        hasParents && 'border-primary/30'
      )}>
        <div className="flex items-center gap-2">
          {hasParents ? (
            <GitMerge className="h-4 w-4 text-primary" />
          ) : (
            <Database className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{node.datasetName}</span>
          {!hasParents && <Badge variant="outline" className="text-xs">Source</Badge>}
        </div>
        
        {node.mergeInfo && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Merged {new Date(node.mergeInfo.mergedAt).toLocaleDateString()}</span>
            <Badge variant="secondary" className="text-xs">{node.mergeInfo.mode}</Badge>
          </div>
        )}
      </div>
      
      {/* Children */}
      {hasParents && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-primary/20 pl-4">
          {node.parents.map((parent, idx) => (
            <LineageNode key={`${parent.datasetId}-${idx}`} node={parent} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DatasetLineageView({ lineage, className }: DatasetLineageViewProps) {
  const totalSources = countSources(lineage);
  
  function countSources(node: DatasetLineage): number {
    if (node.parents.length === 0) return 1;
    return node.parents.reduce((sum, p) => sum + countSources(p), 0);
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-5 w-5 text-primary" />
          Dataset Lineage
          <Badge variant="secondary">{totalSources} source{totalSources !== 1 ? 's' : ''}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LineageNode node={lineage} />
      </CardContent>
    </Card>
  );
}
