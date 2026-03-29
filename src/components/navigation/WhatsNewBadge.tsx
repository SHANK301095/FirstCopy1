/**
 * What's New Changelog Badge - P1 Navigation
 */

import { useState } from 'react';
import { Sparkles, X, Gift, Zap, Bug, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix';
  title: string;
  description: string;
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.5.0',
    date: '2024-12-28',
    type: 'feature',
    title: 'P1 UX Upgrades',
    description: 'Keyboard navigation, favorite pages, notification center, and more.',
  },
  {
    version: '2.4.0',
    date: '2024-12-27',
    type: 'feature',
    title: 'P0 UX Improvements',
    description: 'Breadcrumbs, quick jump menu, activity timeline, drawdown analysis.',
  },
  {
    version: '2.3.0',
    date: '2024-12-26',
    type: 'improvement',
    title: 'MMC Sentinel AI',
    description: 'Added AI-powered trading assistant in core features.',
  },
  {
    version: '2.2.0',
    date: '2024-12-25',
    type: 'fix',
    title: 'Performance Optimizations',
    description: 'Improved chart rendering and data loading speeds.',
  },
];

const TYPE_CONFIG = {
  feature: { icon: Gift, color: 'text-profit bg-profit/10', label: 'New' },
  improvement: { icon: Zap, color: 'text-primary bg-primary/10', label: 'Improved' },
  fix: { icon: Bug, color: 'text-warning bg-warning/10', label: 'Fixed' },
};

interface WhatsNewBadgeProps {
  lastSeenVersion?: string;
  className?: string;
}

export function WhatsNewBadge({ lastSeenVersion, className }: WhatsNewBadgeProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  const latestVersion = CHANGELOG[0]?.version;
  const hasNew = !dismissed && (!lastSeenVersion || lastSeenVersion !== latestVersion);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn("relative gap-1.5", className)}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">What's New</span>
        {hasNew && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What's New
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {CHANGELOG.map((entry, idx) => {
                const config = TYPE_CONFIG[entry.type];
                const Icon = config.icon;
                
                return (
                  <div 
                    key={idx}
                    className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5">
                          v{entry.version}
                        </Badge>
                        <Badge className={cn("text-[10px] h-5", config.color)}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {entry.date}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm">{entry.title}</h4>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setDismissed(true);
                setOpen(false);
              }}
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
