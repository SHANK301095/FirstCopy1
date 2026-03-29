/**
 * Merge Mode Explanation UI
 * Visual explanation of Append vs Stitch with examples
 */

import { ArrowRight, Layers, Link2, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type MergeMode = 'append' | 'stitch';

interface MergeModeExplanationProps {
  selectedMode: MergeMode;
  onModeChange: (mode: MergeMode) => void;
  className?: string;
}

export function MergeModeExplanation({ selectedMode, onModeChange, className }: MergeModeExplanationProps) {
  return (
    <div className={cn('grid md:grid-cols-2 gap-4', className)}>
      {/* Append Mode */}
      <Card 
        className={cn(
          'cursor-pointer transition-all hover:border-primary/50',
          selectedMode === 'append' && 'border-primary ring-2 ring-primary/20'
        )}
        onClick={() => onModeChange('append')}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-primary" />
            Append Mode
            {selectedMode === 'append' && <Badge>Selected</Badge>}
          </CardTitle>
          <CardDescription>Stack datasets end-to-end</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual example */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-primary/60 rounded text-xs text-center text-primary-foreground">
                Dataset A (Jan-Mar)
              </div>
              <div className="h-4 bg-ai-purple/60 rounded text-xs text-center text-white">
                Dataset B (Apr-Jun)
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="h-8 bg-gradient-to-r from-primary/60 to-ai-purple/60 rounded text-xs flex items-center justify-center text-white">
                Merged (Jan-Jun)
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p>✓ Best for non-overlapping time ranges</p>
            <p>✓ Preserves all data from both datasets</p>
            <p>✓ Fast processing</p>
          </div>
        </CardContent>
      </Card>

      {/* Stitch Mode */}
      <Card 
        className={cn(
          'cursor-pointer transition-all hover:border-primary/50',
          selectedMode === 'stitch' && 'border-primary ring-2 ring-primary/20'
        )}
        onClick={() => onModeChange('stitch')}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5 text-primary" />
            Stitch Mode
            {selectedMode === 'stitch' && <Badge>Selected</Badge>}
          </CardTitle>
          <CardDescription>Merge overlapping datasets intelligently</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual example */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-primary/60 rounded text-xs text-center text-primary-foreground">
                Dataset A (Jan-Apr)
              </div>
              <div className="h-4 bg-ai-purple/60 rounded text-xs text-center text-white ml-8">
                Dataset B (Mar-Jun)
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="h-8 bg-gradient-to-r from-primary/60 via-warning/60 to-ai-purple/60 rounded text-xs flex items-center justify-center text-white">
                Merged (overlap handled)
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p>✓ Handles overlapping time ranges</p>
            <p>✓ Deduplicates based on policy</p>
            <p>✓ Fills gaps where possible</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
