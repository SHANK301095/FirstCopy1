/**
 * Multi-Asset/Multi-Currency Backtesting Info Card
 * Displays feature limitation notice for single strategy multi-asset runs
 */

import { useState, useEffect } from 'react';
import { Info, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MultiAssetInfoCardProps {
  className?: string;
  variant?: 'card' | 'inline';
  storageKey?: string;
}

const STORAGE_KEY = 'mmc_multi_asset_info_dismissed';

export function MultiAssetInfoCard({ 
  className, 
  variant = 'card',
  storageKey = STORAGE_KEY 
}: MultiAssetInfoCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(storageKey, 'true');
  };

  const handleLearnMore = () => {
    // Navigate to Portfolio Builder page
    window.location.href = '/portfolio';
  };

  if (isDismissed) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <div className={cn(
        "rounded-lg bg-muted/50 border border-border overflow-hidden transition-all duration-200",
        className
      )}>
        {/* Header - Always visible */}
        <div className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-muted/70 transition-colors"
             onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-foreground">
              Multi-Asset/Multi-Currency Backtesting
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Content - Collapsible */}
        <div className={cn(
          "overflow-hidden transition-all duration-200",
          isCollapsed ? "max-h-0" : "max-h-40"
        )}>
          <div className="px-3 pb-3 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
              While you can manage multiple symbols, running a single strategy simultaneously across many 
              uncorrelated assets in one backtest run is not fully optimized for complex inter-asset 
              dependencies yet. Portfolio Builder allows combining different strategies.
            </p>
            <div className="mt-2 pl-6">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary hover:text-primary/80 gap-1"
                onClick={handleLearnMore}
              >
                <span>Learn more about Portfolio Builder</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div className={cn(
      "p-5 rounded-xl bg-card border border-border shadow-sm relative",
      className
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Info className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-2 flex-1">
          <h4 className="text-sm font-semibold text-foreground">
            Multi-Asset/Multi-Currency Backtesting (Single Strategy)
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            While you can manage multiple symbols, running a single strategy simultaneously across many 
            uncorrelated assets in one backtest run is not fully optimized for complex inter-asset 
            dependencies yet. Portfolio Builder allows combining different strategies.
          </p>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-primary hover:text-primary/80 gap-1"
            onClick={handleLearnMore}
          >
            <span>Learn more about Portfolio Builder</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
