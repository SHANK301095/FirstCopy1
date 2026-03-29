import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  enableScrollTrigger?: boolean;
  onComplete?: () => void;
}

interface UseCountUpReturn {
  value: number;
  formattedValue: string;
  isAnimating: boolean;
  ref: React.RefObject<HTMLElement>;
  reset: () => void;
  start: () => void;
}

export function useCountUp({
  start = 0,
  end,
  duration = 2000,
  delay = 0,
  decimals = 0,
  enableScrollTrigger = true,
  onComplete,
}: UseCountUpOptions): UseCountUpReturn {
  const [value, setValue] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const animationRef = useRef<number>();

  const animate = useCallback(() => {
    const startTime = performance.now();
    const startValue = start;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentValue = startValue + (end - startValue) * eased;
      setValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setValue(end);
        setIsAnimating(false);
        onComplete?.();
      }
    };

    setIsAnimating(true);
    animationRef.current = requestAnimationFrame(step);
  }, [start, end, duration, onComplete]);

  const startAnimation = useCallback(() => {
    if (hasTriggered) return;
    
    setHasTriggered(true);
    
    if (delay > 0) {
      setTimeout(animate, delay);
    } else {
      animate();
    }
  }, [animate, delay, hasTriggered]);

  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setValue(start);
    setIsAnimating(false);
    setHasTriggered(false);
  }, [start]);

  // Intersection Observer for scroll trigger
  useEffect(() => {
    if (!enableScrollTrigger || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            startAnimation();
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [enableScrollTrigger, hasTriggered, startAnimation]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const formattedValue = value.toFixed(decimals);

  return {
    value,
    formattedValue,
    isAnimating,
    ref: ref as React.RefObject<HTMLElement>,
    reset,
    start: startAnimation,
  };
}

// Utility to parse values like "50M+", "99.99%", "< 10ms", "10K+"
export function parseStatValue(value: string): { number: number; prefix: string; suffix: string; decimals: number } {
  // Handle special cases
  if (value.includes('<')) {
    const match = value.match(/<\s*(\d+(?:\.\d+)?)/);
    return {
      number: match ? parseFloat(match[1]) : 0,
      prefix: '< ',
      suffix: value.replace(/<\s*\d+(?:\.\d+)?/, '').trim(),
      decimals: 0,
    };
  }

  // Extract number and suffix
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)/);
  if (!match) return { number: 0, prefix: '', suffix: value, decimals: 0 };

  const num = parseFloat(match[1]);
  const suffix = match[2].trim();
  const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;

  return { number: num, prefix: '', suffix, decimals };
}
