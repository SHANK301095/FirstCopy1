/**
 * Strategy Card Preview - P1 Strategy Library
 */

import { useState } from 'react';
import { 
  Eye, 
  Code, 
  TrendingUp, 
  TrendingDown, 
  Copy, 
  Star,
  Shield,
  Zap,
  Clock,
  BarChart2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

interface StrategyMeta {
  id: string;
  name: string;
  version?: string;
  description?: string;
  winRate?: number;
  profitFactor?: number;
  totalTrades?: number;
  complexity?: 'simple' | 'moderate' | 'complex';
  tags?: string[];
  lastUpdated?: string;
}

interface StrategyCardPreviewProps {
  strategy: StrategyMeta;
  onDuplicate?: (id: string) => void;
  onView?: (id: string) => void;
  className?: string;
  children: React.ReactNode;
}

const COMPLEXITY_CONFIG = {
  simple: { color: 'text-profit bg-profit/10', label: 'Simple', icon: Zap },
  moderate: { color: 'text-warning bg-warning/10', label: 'Moderate', icon: Shield },
  complex: { color: 'text-loss bg-loss/10', label: 'Complex', icon: BarChart2 },
};

export function StrategyCardPreview({
  strategy,
  onDuplicate,
  onView,
  className,
  children,
}: StrategyCardPreviewProps) {
  const complexityConfig = strategy.complexity 
    ? COMPLEXITY_CONFIG[strategy.complexity] 
    : null;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className={cn("w-80 p-0", className)}
        side="right"
        align="start"
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm">{strategy.name}</h4>
              {strategy.version && (
                <Badge variant="outline" className="text-[10px] mt-1">
                  v{strategy.version}
                </Badge>
              )}
            </div>
            {complexityConfig && (
              <Badge className={cn("text-[10px]", complexityConfig.color)}>
                <complexityConfig.icon className="h-3 w-3 mr-1" />
                {complexityConfig.label}
              </Badge>
            )}
          </div>

          {/* Description */}
          {strategy.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {strategy.description}
            </p>
          )}

          {/* Performance badges */}
          <div className="grid grid-cols-3 gap-2">
            {strategy.winRate !== undefined && (
              <div className="p-2 rounded-md bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Win Rate</p>
                <p className={cn(
                  "text-sm font-bold",
                  strategy.winRate >= 50 ? "text-profit" : "text-loss"
                )}>
                  {strategy.winRate.toFixed(1)}%
                </p>
              </div>
            )}
            {strategy.profitFactor !== undefined && (
              <div className="p-2 rounded-md bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">PF</p>
                <p className={cn(
                  "text-sm font-bold",
                  strategy.profitFactor >= 1 ? "text-profit" : "text-loss"
                )}>
                  {strategy.profitFactor.toFixed(2)}
                </p>
              </div>
            )}
            {strategy.totalTrades !== undefined && (
              <div className="p-2 rounded-md bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Trades</p>
                <p className="text-sm font-bold">{strategy.totalTrades}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {strategy.tags && strategy.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {strategy.tags.slice(0, 4).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
              {strategy.tags.length > 4 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{strategy.tags.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            {onView && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-7 text-xs"
                onClick={() => onView(strategy.id)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
            {onDuplicate && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-7 text-xs"
                onClick={() => onDuplicate(strategy.id)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Duplicate
              </Button>
            )}
          </div>

          {/* Last updated */}
          {strategy.lastUpdated && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {strategy.lastUpdated}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Performance Badges for Strategy Cards
 */
interface PerformanceBadgesProps {
  winRate?: number;
  profitFactor?: number;
  sharpeRatio?: number;
  className?: string;
}

export function PerformanceBadges({ 
  winRate, 
  profitFactor, 
  sharpeRatio,
  className 
}: PerformanceBadgesProps) {
  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {winRate !== undefined && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px]",
            winRate >= 60 ? "border-profit/50 text-profit" : 
            winRate >= 50 ? "border-warning/50 text-warning" : 
            "border-loss/50 text-loss"
          )}
        >
          {winRate >= 60 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : 
           winRate < 50 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : null}
          {winRate.toFixed(0)}% WR
        </Badge>
      )}
      {profitFactor !== undefined && (
        <Badge 
          variant="outline"
          className={cn(
            "text-[10px]",
            profitFactor >= 1.5 ? "border-profit/50 text-profit" : 
            profitFactor >= 1 ? "border-warning/50 text-warning" : 
            "border-loss/50 text-loss"
          )}
        >
          PF {profitFactor.toFixed(2)}
        </Badge>
      )}
      {sharpeRatio !== undefined && sharpeRatio > 0 && (
        <Badge 
          variant="outline"
          className={cn(
            "text-[10px]",
            sharpeRatio >= 1.5 ? "border-profit/50 text-profit" : 
            sharpeRatio >= 1 ? "border-warning/50 text-warning" : 
            "border-muted-foreground/50"
          )}
        >
          SR {sharpeRatio.toFixed(2)}
        </Badge>
      )}
    </div>
  );
}
