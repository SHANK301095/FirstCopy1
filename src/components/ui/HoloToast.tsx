/**
 * Futuristic Holographic Toast Notifications
 * Cyberpunk-styled toast with glow effects and sound
 */

import { toast as sonnerToast } from 'sonner';
import { CheckCircle, AlertTriangle, AlertCircle, Info, Zap, Sparkles } from 'lucide-react';

// Sound effect URLs (using Web Audio API for futuristic sounds)
const playNotificationSound = (type: 'success' | 'error' | 'warning' | 'info') => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different notification types
    const frequencies: Record<string, number[]> = {
      success: [523.25, 659.25, 783.99], // C5, E5, G5 - ascending major chord
      error: [392, 349.23, 311.13], // G4, F4, Eb4 - descending
      warning: [440, 440], // A4, A4 - alert
      info: [523.25, 587.33], // C5, D5 - gentle rise
    };
    
    const freqs = frequencies[type] || frequencies.info;
    let time = audioContext.currentTime;
    
    freqs.forEach((freq, i) => {
      oscillator.frequency.setValueAtTime(freq, time + i * 0.1);
    });
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Audio not supported, fail silently
  }
};

// Holographic toast styles
const getToastStyles = (variant: 'success' | 'error' | 'warning' | 'info' | 'default') => {
  const baseStyles = `
    relative overflow-hidden backdrop-blur-md border 
    before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent 
    before:-translate-x-full before:animate-[shimmer_2s_infinite]
    after:absolute after:inset-x-0 after:h-px after:top-0
    after:bg-gradient-to-r after:from-transparent after:via-current after:to-transparent after:opacity-50
  `;
  
  const variants = {
    success: `${baseStyles} bg-profit/10 border-profit/40 text-profit shadow-[0_0_30px_hsl(152_75%_48%/0.3)]`,
    error: `${baseStyles} bg-loss/10 border-loss/40 text-loss shadow-[0_0_30px_hsl(0_80%_58%/0.3)]`,
    warning: `${baseStyles} bg-warning/10 border-warning/40 text-warning shadow-[0_0_30px_hsl(42_95%_52%/0.3)]`,
    info: `${baseStyles} bg-primary/10 border-primary/40 text-primary shadow-[0_0_30px_hsl(var(--primary)/0.3)]`,
    default: `${baseStyles} bg-card/80 border-border/50 text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.15)]`,
  };
  
  return variants[variant];
};

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Zap,
};

interface HoloToastOptions {
  description?: string;
  duration?: number;
  playSound?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const createHoloToast = (
  variant: 'success' | 'error' | 'warning' | 'info' | 'default',
  title: string,
  options: HoloToastOptions = {}
) => {
  const { description, duration = 4000, playSound = true, action } = options;
  const Icon = iconMap[variant];
  
  if (playSound && variant !== 'default') {
    playNotificationSound(variant as 'success' | 'error' | 'warning' | 'info');
  }
  
  return sonnerToast.custom(
    (id) => (
      <div className={`${getToastStyles(variant)} rounded-xl p-4 min-w-[320px] max-w-[420px]`}>
        {/* Cyber grid background */}
        <div className="absolute inset-0 cyber-grid opacity-10 rounded-xl" />
        
        {/* Scan line */}
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30 animate-[scan-line_3s_ease-in-out_infinite]" style={{ top: '50%' }} />
        
        <div className="relative z-10 flex items-start gap-3">
          {/* Icon with glow */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 blur-md opacity-50">
              <Icon className="h-5 w-5" />
            </div>
            <Icon className="relative h-5 w-5 animate-pulse" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{title}</div>
            {description && (
              <div className="text-xs opacity-80 mt-1">{description}</div>
            )}
            {action && (
              <button
                onClick={() => {
                  action.onClick();
                  sonnerToast.dismiss(id);
                }}
                className="mt-2 text-xs font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                {action.label}
              </button>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={() => sonnerToast.dismiss(id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <span className="sr-only">Close</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-current opacity-40 rounded-tl" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-current opacity-40 rounded-br" />
      </div>
    ),
    { duration }
  );
};

// Exported toast functions
export const holoToast = {
  success: (title: string, options?: HoloToastOptions) => 
    createHoloToast('success', title, options),
  
  error: (title: string, options?: HoloToastOptions) => 
    createHoloToast('error', title, options),
  
  warning: (title: string, options?: HoloToastOptions) => 
    createHoloToast('warning', title, options),
  
  info: (title: string, options?: HoloToastOptions) => 
    createHoloToast('info', title, options),
  
  message: (title: string, options?: HoloToastOptions) => 
    createHoloToast('default', title, options),
  
  // AI-themed toast
  ai: (title: string, options?: HoloToastOptions) => {
    if (options?.playSound !== false) {
      playNotificationSound('info');
    }
    
    return sonnerToast.custom(
      (id) => (
        <div className="relative overflow-hidden backdrop-blur-md bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/40 rounded-xl p-4 min-w-[320px] max-w-[420px] shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-20 bg-[length:200%_auto] animate-[gradient-shift_3s_linear_infinite]" />
          </div>
          
          {/* Neural network dots */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-primary animate-pulse"
                style={{
                  left: `${10 + i * 12}%`,
                  top: `${20 + Math.sin(i) * 30}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          
          <div className="relative z-10 flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 blur-lg bg-primary/50" />
              <Sparkles className="relative h-5 w-5 text-primary animate-pulse" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-primary">{title}</div>
              {options?.description && (
                <div className="text-xs text-muted-foreground mt-1">{options.description}</div>
              )}
            </div>
            
            <button
              onClick={() => sonnerToast.dismiss(id)}
              className="flex-shrink-0 text-primary/60 hover:text-primary transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ),
      { duration: options?.duration || 5000 }
    );
  },
  
  // Loading toast with neural animation
  loading: (title: string) => {
    return sonnerToast.custom(
      () => (
        <div className="relative overflow-hidden backdrop-blur-md bg-card/80 border border-primary/30 rounded-xl p-4 min-w-[280px] shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <div className="font-medium text-sm">{title}</div>
          </div>
          
          {/* Scan line */}
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-[scan-line_2s_ease-in-out_infinite]" style={{ top: '50%' }} />
        </div>
      ),
      { duration: Infinity }
    );
  },
  
  dismiss: sonnerToast.dismiss,
};

export default holoToast;
