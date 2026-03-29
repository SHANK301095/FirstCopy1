import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Database, 
  Clock, 
  Activity, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  FileText,
  TrendingUp,
  Wifi,
  WifiOff,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secureLogger';

interface CopilotContextPanelProps {
  isOnline: boolean;
  currentRoute: string;
  className?: string;
}

// Get readable page name from route
function getPageInfo(pathname: string): { name: string; section: string } {
  const routeMap: Record<string, { name: string; section: string }> = {
    '/': { name: 'Home', section: 'Core' },
    '/dashboard': { name: 'Dashboard', section: 'Core' },
    '/sentinel': { name: 'Sentinel', section: 'Core' },
    '/workflow': { name: 'Run Backtest', section: 'Backtesting' },
    '/data': { name: 'Data Manager', section: 'Backtesting' },
    '/strategies': { name: 'Strategy Library', section: 'Backtesting' },
    '/saved-results': { name: 'Results', section: 'Backtesting' },
    '/optimizer': { name: 'Optimizer', section: 'Analysis' },
    '/walk-forward': { name: 'Walk-Forward', section: 'Analysis' },
    '/analytics': { name: 'Analytics', section: 'Analysis' },
    '/scanner': { name: 'Scanner', section: 'Analysis' },
    '/tearsheet': { name: 'Tearsheet', section: 'Analysis' },
    '/portfolio': { name: 'Portfolio Builder', section: 'Trading' },
    '/risk-dashboard': { name: 'Risk Dashboard', section: 'Trading' },
    '/position-sizing': { name: 'Position Sizing', section: 'Trading' },
    '/journal': { name: 'Trade Journal', section: 'Trading' },
    '/settings': { name: 'Settings', section: 'System' },
    '/cloud-sync': { name: 'Cloud Sync', section: 'System' },
  };
  
  return routeMap[pathname] || { name: pathname.slice(1) || 'Home', section: 'Other' };
}

export function CopilotContextPanel({ isOnline, currentRoute, className }: CopilotContextPanelProps) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const pageInfo = getPageInfo(currentRoute || location.pathname);
  
  // Build debug bundle (sanitized)
  const buildDebugBundle = () => {
    const bundle = {
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0', // Would come from package.json or env
      route: currentRoute || location.pathname,
      pageName: pageInfo.name,
      section: pageInfo.section,
      isOnline,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      // Add recent logs (sanitized)
      recentLogs: secureLogger.getRecentLogs?.(5) || [],
    };
    
    return JSON.stringify(bundle, null, 2);
  };
  
  const copyDebugBundle = async () => {
    try {
      const bundle = buildDebugBundle();
      await navigator.clipboard.writeText(bundle);
      setCopied(true);
      toast.success('Debug bundle copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn(
        "border-b border-border/30 bg-gradient-to-r from-muted/20 via-transparent to-muted/20",
        className
      )}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Context</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-2.5">
            {/* Current Page */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Page</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {pageInfo.section}
                </Badge>
                <span className="text-xs font-medium">{pageInfo.name}</span>
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-amber-500" />
                )}
                <span className="text-xs text-muted-foreground">Status</span>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  isOnline ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30"
                )}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            
            {/* Placeholder for dataset info - would connect to real store */}
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2">
                <Database className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Dataset</span>
              </div>
              <span className="text-xs text-muted-foreground italic">None selected</span>
            </div>
            
            {/* Copy Debug Bundle */}
            <Button
              variant="outline"
              size="sm"
              onClick={copyDebugBundle}
              className="w-full h-7 text-xs gap-1.5 mt-1"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Debug Bundle
                </>
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
