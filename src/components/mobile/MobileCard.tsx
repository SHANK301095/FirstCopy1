/**
 * Premium Mobile Card Components
 * Apple-style elegance with smooth interactions
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  showArrow?: boolean;
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
}

export function MobileCard({ 
  children, 
  className, 
  onClick,
  showArrow = false,
  variant = 'default'
}: MobileCardProps) {
  const isClickable = !!onClick;
  
  const variantStyles = {
    default: 'bg-card border border-border/40 shadow-sm',
    elevated: 'bg-card shadow-lg shadow-black/5 border border-border/20',
    outlined: 'bg-transparent border border-border/50',
    interactive: 'bg-card border border-border/40 shadow-sm hover:shadow-md hover:border-primary/20',
  };

  const content = (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {showArrow && isClickable && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      )}
    </div>
  );

  if (isClickable) {
    return (
      <motion.div 
        className={cn(
          'rounded-2xl p-4 cursor-pointer touch-manipulation',
          variantStyles[variant],
          className
        )}
        onClick={onClick}
        role="button"
        tabIndex={0}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div 
      className={cn(
        'rounded-2xl p-4',
        variantStyles[variant],
        className
      )}
    >
      {content}
    </div>
  );
}

interface MobileCardGroupProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function MobileCardGroup({ children, title, className }: MobileCardGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-3">
          {title}
        </h3>
      )}
      <div className="rounded-2xl bg-card border border-border/30 overflow-hidden divide-y divide-border/20">
        {children}
      </div>
    </div>
  );
}

interface MobileCardRowProps {
  children: ReactNode;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
  icon?: ReactNode;
}

export function MobileCardRow({ 
  children, 
  onClick, 
  showArrow = true, 
  className,
  icon 
}: MobileCardRowProps) {
  const isClickable = !!onClick;
  
  const content = (
    <div className="flex items-center gap-3.5">
      {icon && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {showArrow && isClickable && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      )}
    </div>
  );

  if (isClickable) {
    return (
      <motion.div 
        className={cn(
          'px-4 py-3.5 cursor-pointer touch-manipulation min-h-[52px] flex items-center',
          'active:bg-accent/50',
          className
        )}
        onClick={onClick}
        role="button"
        tabIndex={0}
        whileTap={{ backgroundColor: 'hsl(var(--accent) / 0.5)' }}
      >
        {content}
      </motion.div>
    );
  }
  
  return (
    <div 
      className={cn('px-4 py-3.5 min-h-[52px] flex items-center', className)}
    >
      {content}
    </div>
  );
}
