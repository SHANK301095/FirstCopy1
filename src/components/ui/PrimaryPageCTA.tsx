/**
 * Primary Page CTA component
 * Consistent top-right CTA with mobile sticky bottom
 */

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PrimaryPageCTAProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function PrimaryPageCTA({
  label,
  icon: Icon,
  onClick,
  disabled = false,
  loading = false,
  className,
}: PrimaryPageCTAProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={cn(
        'fixed bottom-20 left-4 right-4 z-40',
        className
      )}>
        <Button 
          onClick={onClick}
          disabled={disabled || loading}
          className="w-full gap-2 h-12 shadow-lg"
          size="lg"
        >
          <Icon className="h-5 w-5" />
          {loading ? 'Loading...' : label}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn('gap-2', className)}
    >
      <Icon className="h-4 w-4" />
      {loading ? 'Loading...' : label}
    </Button>
  );
}
