import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'cyber' | 'glow' | 'holographic';
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  className,
  size = 'md',
  variant = 'default',
}: StatCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  // Animated background effect for cyber variant
  useEffect(() => {
    if (variant !== 'cyber' && variant !== 'holographic') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create animated gradient lines
      const lineCount = variant === 'holographic' ? 8 : 5;
      for (let i = 0; i < lineCount; i++) {
        const y = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * canvas.height;
        const gradient = ctx.createLinearGradient(0, y, canvas.width, y);
        
        if (variant === 'holographic') {
          gradient.addColorStop(0, 'hsla(280, 100%, 60%, 0)');
          gradient.addColorStop(0.5, `hsla(${180 + i * 30}, 100%, 60%, 0.15)`);
          gradient.addColorStop(1, 'hsla(195, 100%, 60%, 0)');
        } else {
          gradient.addColorStop(0, 'hsla(195, 100%, 50%, 0)');
          gradient.addColorStop(0.5, 'hsla(195, 100%, 50%, 0.1)');
          gradient.addColorStop(1, 'hsla(195, 100%, 50%, 0)');
        }
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(animate);
    };

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [variant]);

  const variantClasses = {
    default: 'trader-stat',
    cyber: 'relative overflow-hidden rounded-lg border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-[0_0_20px_hsl(195_100%_50%/0.1)] hover:shadow-[0_0_30px_hsl(195_100%_50%/0.2)] hover:border-primary/50 transition-all duration-300',
    glow: 'rounded-lg border border-primary/20 bg-card shadow-[0_0_25px_hsl(195_100%_50%/0.12)] hover:shadow-[0_0_40px_hsl(195_100%_50%/0.2)] transition-all duration-300',
    holographic: 'relative overflow-hidden rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-ai-purple/10 shadow-[0_0_30px_hsl(270_100%_60%/0.15),0_0_60px_hsl(195_100%_50%/0.1)] hover:shadow-[0_0_50px_hsl(270_100%_60%/0.25),0_0_80px_hsl(195_100%_50%/0.15)] transition-all duration-300',
  };

  return (
    <div className={cn(variantClasses[variant], 'group', sizeClasses[size], className)}>
      {(variant === 'cyber' || variant === 'holographic') && (
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 pointer-events-none opacity-60"
        />
      )}
      
      {variant === 'holographic' && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-ai-purple/5 pointer-events-none" />
      )}
      
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "metric-label truncate",
            (variant === 'cyber' || variant === 'holographic') && "text-primary/80"
          )}>{title}</p>
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span className={cn(
              "font-mono font-bold tabular-nums tracking-tight",
              valueSizeClasses[size],
              trend === 'up' && "pnl-positive",
              trend === 'down' && "pnl-negative",
              !trend && "text-foreground",
              variant === 'holographic' && !trend && "bg-gradient-to-r from-primary to-ai-purple bg-clip-text text-transparent"
            )}>
              {value}
            </span>
            {trend && trendValue && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums',
                  trend === 'up' && 'bg-[hsl(var(--profit)/0.12)] text-[hsl(var(--profit))]',
                  trend === 'down' && 'bg-[hsl(var(--loss)/0.12)] text-[hsl(var(--loss))]',
                  trend === 'neutral' && 'bg-muted text-muted-foreground'
                )}
              >
                {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {trend === 'neutral' && <Minus className="h-3 w-3" />}
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn(
            "rounded-lg p-2.5 flex-shrink-0 transition-all duration-200 group-hover:scale-105",
            variant === 'cyber' && "bg-primary/20 text-primary shadow-[0_0_15px_hsl(195_100%_50%/0.3)]",
            variant === 'holographic' && "bg-gradient-to-br from-primary/30 to-ai-purple/30 text-primary shadow-[0_0_20px_hsl(270_100%_60%/0.3)]",
            variant === 'glow' && "bg-primary/15 text-primary",
            variant === 'default' && "bg-primary/10 text-primary group-hover:bg-primary/15"
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}