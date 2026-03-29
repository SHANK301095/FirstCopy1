/**
 * Grade Badge — colored badge showing AI trade grade (A/B/C/D/F)
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  C: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  D: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  F: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface GradeBadgeProps {
  grade: string;
  details?: Record<string, unknown> | null;
  size?: 'sm' | 'default';
}

export function GradeBadge({ grade, details, size = 'sm' }: GradeBadgeProps) {
  const normalized = grade.toUpperCase().charAt(0);
  const colorClass = GRADE_COLORS[normalized] || GRADE_COLORS['C'];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-bold font-mono",
        colorClass,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
      )}
    >
      {normalized}
    </Badge>
  );

  if (!details) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <div className="space-y-1">
            {Object.entries(details).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-3">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-mono">{String(val)}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
