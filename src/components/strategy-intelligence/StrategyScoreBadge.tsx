/**
 * StrategyScoreBadge — MMC Composite Score visual indicator
 */
import { cn } from '@/lib/utils';

interface StrategyScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

function getScoreGrade(score: number) {
  if (score >= 80) return { label: 'Elite', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', ring: 'ring-emerald-500/20' };
  if (score >= 65) return { label: 'Strong', color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/30', ring: 'ring-sky-500/20' };
  if (score >= 50) return { label: 'Average', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', ring: 'ring-amber-500/20' };
  return { label: 'Weak', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', ring: 'ring-red-500/20' };
}

export function StrategyScoreBadge({ score, size = 'md', showLabel = true, className }: StrategyScoreBadgeProps) {
  const grade = getScoreGrade(score);
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full border font-bold font-mono',
          grade.bg,
          grade.color,
          sizeClasses[size]
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', grade.color)}>{grade.label}</span>
      )}
    </div>
  );
}

export { getScoreGrade };
