/**
 * Phase 11: Zerodha Token Expiry Indicator
 * Shows time remaining on Kite access token (expires daily at ~6:30 AM IST)
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ZerodhaTokenExpiryProps {
  tokenCreatedAt?: Date | string;
  onReauth?: () => void;
  className?: string;
}

function getExpiryTime(createdAt: Date): Date {
  // Kite tokens expire next day at 6:30 AM IST (01:00 UTC)
  const expiry = new Date(createdAt);
  expiry.setUTCDate(expiry.getUTCDate() + 1);
  expiry.setUTCHours(1, 0, 0, 0); // 6:30 AM IST ≈ 01:00 UTC
  return expiry;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function ZerodhaTokenExpiry({ tokenCreatedAt, onReauth, className }: ZerodhaTokenExpiryProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!tokenCreatedAt) return;
    const created = typeof tokenCreatedAt === 'string' ? new Date(tokenCreatedAt) : tokenCreatedAt;
    const expiry = getExpiryTime(created);

    const update = () => setTimeLeft(expiry.getTime() - Date.now());
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [tokenCreatedAt]);

  if (!tokenCreatedAt) {
    return (
      <Badge variant="outline" className={cn('text-[10px] gap-1 text-muted-foreground', className)}>
        <Clock className="h-3 w-3" />
        Not Connected
      </Badge>
    );
  }

  const isExpired = timeLeft <= 0;
  const isWarning = timeLeft > 0 && timeLeft < 2 * 60 * 60 * 1000; // < 2h

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5', className)}>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] gap-1',
                isExpired && 'bg-loss/20 text-loss border-loss/30',
                isWarning && !isExpired && 'bg-warning/20 text-warning border-warning/30',
                !isWarning && !isExpired && 'bg-profit/20 text-profit border-profit/30',
              )}
            >
              {isExpired ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
              {isExpired ? 'Token Expired' : formatTimeLeft(timeLeft)}
            </Badge>
            {isExpired && onReauth && (
              <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={onReauth}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isExpired
              ? 'Kite token has expired. Re-authenticate to continue.'
              : `Token expires in ${formatTimeLeft(timeLeft)}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
