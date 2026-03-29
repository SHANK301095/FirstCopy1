import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountUpNumberProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  enableScrollTrigger?: boolean;
}

export function CountUpNumber({
  end,
  start = 0,
  duration = 2000,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  enableScrollTrigger = true,
}: CountUpNumberProps) {
  const [value, setValue] = useState(start);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!enableScrollTrigger) {
      // Start immediately if scroll trigger disabled
      setTimeout(() => animateValue(), delay);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            setHasTriggered(true);
            setTimeout(() => animateValue(), delay);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enableScrollTrigger, hasTriggered, delay]);

  const animateValue = () => {
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: easeOutExpo for snappy feel
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentValue = start + (end - start) * eased;
      setValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setValue(end);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  };

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}

// Helper component for stat values like "50M+", "99.99%", "< 10ms"
interface AnimatedStatProps {
  value: string;
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedStat({ value, duration = 2000, delay = 0, className }: AnimatedStatProps) {
  // Parse the value
  const parsed = parseValue(value);
  
  return (
    <CountUpNumber
      end={parsed.number}
      decimals={parsed.decimals}
      prefix={parsed.prefix}
      suffix={parsed.suffix}
      duration={duration}
      delay={delay}
      className={className}
    />
  );
}

function parseValue(value: string): { number: number; prefix: string; suffix: string; decimals: number } {
  // Handle "< 10ms" format
  if (value.startsWith('<')) {
    const match = value.match(/<\s*(\d+(?:\.\d+)?)(.*)/);
    if (match) {
      return {
        number: parseFloat(match[1]),
        prefix: '< ',
        suffix: match[2].trim(),
        decimals: match[1].includes('.') ? match[1].split('.')[1].length : 0,
      };
    }
  }

  // Handle "50M+", "99.99%", "10K+" formats
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)/);
  if (match) {
    return {
      number: parseFloat(match[1]),
      prefix: '',
      suffix: match[2].trim(),
      decimals: match[1].includes('.') ? match[1].split('.')[1].length : 0,
    };
  }

  return { number: 0, prefix: '', suffix: value, decimals: 0 };
}
