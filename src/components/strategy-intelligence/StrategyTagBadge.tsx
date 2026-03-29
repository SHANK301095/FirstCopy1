/**
 * StrategyTagBadge — Visual tag badge for strategy tags
 */
import { TAG_CONFIG, type StrategyTag } from '@/types/strategyIntelligence';
import { cn } from '@/lib/utils';

interface StrategyTagBadgeProps {
  tag: StrategyTag;
  size?: 'sm' | 'md';
  className?: string;
}

export function StrategyTagBadge({ tag, size = 'sm', className }: StrategyTagBadgeProps) {
  const config = TAG_CONFIG[tag];
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        config.colorClass,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        className
      )}
    >
      {config.label}
    </span>
  );
}
