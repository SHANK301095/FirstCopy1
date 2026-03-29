/**
 * MiniStat — Reusable metric display card for analytics sections
 */
import { cn } from '@/lib/utils';

interface MiniStatProps {
  label: string;
  value: string;
  sub?: string;
  variant?: 'success' | 'danger' | 'warning' | 'default';
}

const variantColors: Record<string, string> = {
  success: 'text-emerald-400',
  danger: 'text-red-400',
  warning: 'text-amber-400',
  default: 'text-foreground',
};

export function MiniStat({ label, value, sub, variant = 'default' }: MiniStatProps) {
  return (
    <div className="text-center">
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      <div className={cn('text-lg font-bold font-mono', variantColors[variant])}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
