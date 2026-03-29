/**
 * Goal Progress Rings - P1 Dashboard
 */

import { cn } from '@/lib/utils';

interface GoalRingProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'profit' | 'warning' | 'loss';
  className?: string;
}

const SIZE_CONFIG = {
  sm: { size: 48, stroke: 4, fontSize: 'text-xs' },
  md: { size: 64, stroke: 5, fontSize: 'text-sm' },
  lg: { size: 80, stroke: 6, fontSize: 'text-base' },
};

const COLOR_CONFIG = {
  primary: 'stroke-primary',
  profit: 'stroke-profit',
  warning: 'stroke-warning',
  loss: 'stroke-loss',
};

export function GoalProgressRing({
  label,
  current,
  target,
  unit = '',
  size = 'md',
  color = 'primary',
  className,
}: GoalRingProps) {
  const config = SIZE_CONFIG[size];
  const colorClass = COLOR_CONFIG[color];
  
  const percentage = Math.min((current / target) * 100, 100);
  const radius = (config.size - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: config.size, height: config.size }}>
        {/* Background ring */}
        <svg
          className="absolute transform -rotate-90"
          width={config.size}
          height={config.size}
        >
          <circle
            className="stroke-muted"
            strokeWidth={config.stroke}
            fill="none"
            r={radius}
            cx={config.size / 2}
            cy={config.size / 2}
          />
        </svg>
        
        {/* Progress ring */}
        <svg
          className="absolute transform -rotate-90"
          width={config.size}
          height={config.size}
        >
          <circle
            className={cn("transition-all duration-500 ease-out", colorClass)}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            fill="none"
            r={radius}
            cx={config.size / 2}
            cy={config.size / 2}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", config.fontSize)}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xs font-medium">
          {current.toLocaleString()}{unit} / {target.toLocaleString()}{unit}
        </p>
      </div>
    </div>
  );
}

interface GoalRingsGridProps {
  goals: Array<{
    label: string;
    current: number;
    target: number;
    unit?: string;
    color?: 'primary' | 'profit' | 'warning' | 'loss';
  }>;
  className?: string;
  compact?: boolean;
}

export function GoalRingsGrid({ goals, className, compact = false }: GoalRingsGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      compact ? "grid-cols-4" : "grid-cols-2 md:grid-cols-4",
      className
    )}>
      {goals.map((goal, idx) => (
        <GoalProgressRing
          key={idx}
          {...goal}
          size={compact ? "sm" : "md"}
        />
      ))}
    </div>
  );
}
