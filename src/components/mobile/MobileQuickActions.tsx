import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { triggerHaptic } from '@/hooks/useTouchGestures';

interface QuickAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  badge?: string | number;
}

interface MobileQuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function MobileQuickActions({ actions, className }: MobileQuickActionsProps) {
  const handleClick = (action: QuickAction) => {
    triggerHaptic('medium');
    action.onClick();
  };

  const colorStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className={cn('grid grid-cols-4 gap-3', className)}>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => handleClick(action)}
          className={cn(
            'relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200',
            'active:scale-95 touch-manipulation',
            'bg-card/60 border border-border/40',
            'hover:bg-accent/50 active:bg-accent'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl transition-colors',
            colorStyles[action.color || 'primary']
          )}>
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-foreground/80 text-center leading-tight">
            {action.label}
          </span>
          
          {/* Badge */}
          {action.badge !== undefined && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {action.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface MobileFloatingActionProps {
  icon: LucideIcon;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function MobileFloatingAction({ icon: Icon, onClick, label, className }: MobileFloatingActionProps) {
  const handleClick = () => {
    triggerHaptic('medium');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'fixed bottom-24 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full',
        'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
        'active:scale-95 transition-all duration-200 touch-manipulation',
        'hover:shadow-xl hover:shadow-primary/30',
        className
      )}
    >
      <Icon className="h-5 w-5" />
      {label && <span className="font-medium text-sm">{label}</span>}
    </button>
  );
}
