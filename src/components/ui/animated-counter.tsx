/**
 * Animated Counter Component
 * Smoothly animates number changes
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  colorize?: boolean; // Green for positive, red for negative
}

export function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  colorize = false,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-expo)
      const eased = 1 - Math.pow(2, -10 * progress);
      
      const current = startValue + (endValue - startValue) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    previousValue.current = value;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = displayValue.toFixed(decimals);
  const isPositive = value >= 0;

  // Format sign properly - show +/- before the number, not after prefix
  const showSign = colorize && value !== 0;
  const sign = isPositive ? '+' : '';
  
  return (
    <span
      className={cn(
        'tabular-nums transition-colors duration-200',
        colorize && (isPositive ? 'text-profit' : 'text-loss'),
        className
      )}
    >
      {prefix}{showSign ? sign : ''}{formattedValue}{suffix}
    </span>
  );
}
