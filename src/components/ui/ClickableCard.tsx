/**
 * Clickable Card Component
 * Reusable selection card with haptic feedback and animations
 */

import { cn } from '@/lib/utils';
import { hapticFeedback } from '@/lib/haptics';
import { ReactNode } from 'react';

interface ClickableCardProps {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  showCheckbox?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function ClickableCard({
  children,
  selected = false,
  disabled = false,
  onClick,
  className,
  showCheckbox = true,
  variant = 'default',
}: ClickableCardProps) {
  const handleClick = () => {
    if (disabled) return;
    hapticFeedback('selection');
    onClick?.();
  };

  const baseStyles = cn(
    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ease-out text-left",
    "hover:bg-muted/50 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "animate-fade-in"
  );

  const variantStyles = {
    default: cn(
      selected 
        ? "bg-primary/5 border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.1)]" 
        : "bg-muted/30 border-transparent hover:border-border",
      disabled && "opacity-50 pointer-events-none"
    ),
    elevated: cn(
      selected 
        ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10" 
        : "bg-card border-border/50 shadow-sm hover:shadow-md hover:border-primary/20",
      disabled && "opacity-50 pointer-events-none"
    ),
    outlined: cn(
      selected 
        ? "bg-primary/5 border-primary" 
        : "bg-transparent border-border hover:border-primary/40",
      disabled && "opacity-50 pointer-events-none"
    ),
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(baseStyles, variantStyles[variant], className)}
    >
      {children}
      
      {showCheckbox && (
        <div className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
          selected 
            ? "bg-primary border-primary text-primary-foreground scale-110" 
            : "border-muted-foreground/40 hover:border-muted-foreground/60"
        )}>
          {selected && (
            <svg 
              className="w-3 h-3 animate-scale-in" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}
    </button>
  );
}

/**
 * Clickable Card Content wrapper for icon + text
 */
interface CardContentProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  badge?: ReactNode;
  selected?: boolean;
}

export function ClickableCardContent({
  icon,
  title,
  description,
  badge,
  selected = false,
}: CardContentProps) {
  return (
    <>
      {icon && (
        <div className={cn(
          "p-2 rounded-lg shrink-0 transition-colors duration-200",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{title}</span>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
        )}
      </div>
    </>
  );
}
