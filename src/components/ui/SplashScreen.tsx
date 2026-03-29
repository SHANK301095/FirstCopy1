import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import mmcLogo from '@/assets/mmc-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 1200 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'loading' | 'fadeOut'>('loading');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('fadeOut');
      setTimeout(onComplete, 300);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-300",
        phase === 'fadeOut' && "opacity-0 pointer-events-none"
      )}
    >
      {/* Simple Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />

      {/* Logo Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="relative">
          <img 
            src={mmcLogo} 
            alt="MMC Logo" 
            className="h-24 md:h-32 w-auto object-contain drop-shadow-2xl"
          />
        </div>

        {/* Loading Bar */}
        <div className="mt-8 w-40 h-1 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-cyan-500 rounded-full"
            style={{
              animation: 'loading-bar 1s ease-in-out infinite',
            }}
          />
        </div>

        {/* Tagline */}
        <p className="mt-4 text-sm text-muted-foreground font-display tracking-wider">
          AI-Engineered Trading Intelligence
        </p>
      </div>

      {/* Version Badge */}
      <div className="absolute bottom-8 text-xs text-muted-foreground/50">
        v3.0
      </div>
    </div>
  );
}