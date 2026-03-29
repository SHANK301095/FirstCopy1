/**
 * Matrix-style Loading Screen
 * Falling characters animation for page transitions
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MatrixLoaderProps {
  show: boolean;
  onComplete?: () => void;
  duration?: number;
  className?: string;
}

const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  opacity: number;
}

export function MatrixLoader({ show, onComplete, duration = 800, className }: MatrixLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(show);
  const [isExiting, setIsExiting] = useState(false);
  const animationRef = useRef<number>();
  const columnsRef = useRef<Column[]>([]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsExiting(false);
      
      // Auto-complete after duration
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 300);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initColumns();
    };

    const initColumns = () => {
      const columns: Column[] = [];
      const columnWidth = 20;
      const numColumns = Math.ceil(canvas.width / columnWidth);
      
      for (let i = 0; i < numColumns; i++) {
        columns.push({
          x: i * columnWidth,
          y: Math.random() * -canvas.height,
          speed: 8 + Math.random() * 15,
          chars: Array.from({ length: 20 }, () => 
            MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
          ),
          opacity: 0.3 + Math.random() * 0.7,
        });
      }
      columnsRef.current = columns;
    };

    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 5, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      columnsRef.current.forEach((column) => {
        column.y += column.speed;
        
        // Reset column when it goes off screen
        if (column.y > canvas.height + 400) {
          column.y = Math.random() * -200;
          column.speed = 8 + Math.random() * 15;
          column.chars = column.chars.map(() => 
            MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
          );
        }

        // Draw characters
        column.chars.forEach((char, i) => {
          const y = column.y + i * 20;
          if (y < 0 || y > canvas.height) return;

          // First character is brighter (leading edge)
          if (i === 0) {
            ctx.fillStyle = `hsla(185, 100%, 70%, ${column.opacity})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'hsl(185, 100%, 50%)';
          } else {
            const fadeOpacity = column.opacity * (1 - i / column.chars.length);
            ctx.fillStyle = `hsla(185, 100%, 50%, ${fadeOpacity})`;
            ctx.shadowBlur = 0;
          }

          ctx.font = '16px "JetBrains Mono", monospace';
          ctx.fillText(char, column.x, y);

          // Randomly change characters
          if (Math.random() < 0.02) {
            column.chars[i] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center',
        'transition-opacity duration-300',
        isExiting ? 'opacity-0' : 'opacity-100',
        className
      )}
    >
      {/* Matrix rain canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, hsl(220 30% 3%) 0%, hsl(220 30% 5%) 100%)' }}
      />
      
      {/* Center loading indicator */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Cyber spinner */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-primary/20 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-4 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_20px_hsl(185_100%_50%)]" />
          </div>
        </div>
        
        {/* Loading text */}
        <div className="text-primary font-mono text-sm tracking-widest animate-pulse">
          LOADING<span className="animate-[blink_1s_infinite]">_</span>
        </div>
      </div>
      
      {/* Scan lines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }} />
      </div>
      
      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,5,10,0.8) 100%)',
        }}
      />
    </div>
  );
}

// Hook for using matrix loader
export function useMatrixLoader() {
  const [isLoading, setIsLoading] = useState(false);

  const showLoader = (duration?: number) => {
    setIsLoading(true);
    if (duration) {
      setTimeout(() => setIsLoading(false), duration);
    }
  };

  const hideLoader = () => setIsLoading(false);

  return { isLoading, showLoader, hideLoader };
}
