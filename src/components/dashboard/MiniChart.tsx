/**
 * Mini Chart Widget - P0 Dashboard
 * Lightweight sparkline-style charts for stat cards
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MiniChartProps {
  data: number[];
  color?: 'profit' | 'loss' | 'primary' | 'muted';
  height?: number;
  showFill?: boolean;
  className?: string;
}

export function MiniChart({ 
  data, 
  color = 'primary', 
  height = 32, 
  showFill = true,
  className 
}: MiniChartProps) {
  const { path, fillPath, bounds } = useMemo(() => {
    if (data.length < 2) return { path: '', fillPath: '', bounds: { min: 0, max: 1 } };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const width = 100;
    const stepX = width / (data.length - 1);
    const padding = 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

    return { 
      path: linePath, 
      fillPath: areaPath, 
      bounds: { min, max } 
    };
  }, [data, height]);

  const colorClasses = {
    profit: 'stroke-profit',
    loss: 'stroke-loss',
    primary: 'stroke-primary',
    muted: 'stroke-muted-foreground/50',
  };

  const fillClasses = {
    profit: 'fill-profit/20',
    loss: 'fill-loss/20',
    primary: 'fill-primary/20',
    muted: 'fill-muted-foreground/10',
  };

  if (data.length < 2) return null;

  return (
    <svg 
      className={cn("w-full", className)} 
      height={height} 
      viewBox={`0 0 100 ${height}`} 
      preserveAspectRatio="none"
    >
      {showFill && (
        <path
          d={fillPath}
          className={fillClasses[color]}
        />
      )}
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={colorClasses[color]}
      />
    </svg>
  );
}

/**
 * Quick Action Card - P0 Dashboard
 * Action cards based on recent activity
 */

import { Link } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface QuickActionCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  badge?: string;
}

export function QuickActionCard({ to, icon: Icon, title, description, gradient, badge }: QuickActionCardProps) {
  return (
    <Link to={to}>
      <Card className="p-4 hover:bg-muted/50 transition-all group cursor-pointer border-border/50 hover:border-primary/30">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-gradient-to-br shadow-sm transition-all", gradient)}>
            <Icon className="h-4 w-4 text-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                {title}
              </p>
              {badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}
