/**
 * Strategy Comparison View
 * Side-by-side comparison of multiple marketplace strategies
 */

import { X, TrendingUp, Star, Download, Award, BarChart3, Target, Percent } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ComparisonStrategy {
  id: string;
  title: string;
  description: string | null;
  category: string;
  rating_avg: number;
  rating_count: number;
  download_count: number;
  is_verified: boolean;
  is_featured: boolean;
  is_free: boolean;
  price: number;
  tags: string[];
}

interface StrategyComparisonViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategies: ComparisonStrategy[];
  onRemove: (id: string) => void;
  onDownload: (strategy: ComparisonStrategy) => void;
  onPreview: (strategy: ComparisonStrategy) => void;
}

const metrics: Array<{ 
  key: string; 
  label: string; 
  icon: typeof Star; 
  higherBetter: boolean | null;
}> = [
  { key: 'rating', label: 'Rating', icon: Star, higherBetter: true },
  { key: 'downloads', label: 'Downloads', icon: Download, higherBetter: true },
  { key: 'reviews', label: 'Reviews', icon: BarChart3, higherBetter: true },
  { key: 'category', label: 'Category', icon: Target, higherBetter: null },
  { key: 'price', label: 'Price', icon: Percent, higherBetter: false },
];

export function StrategyComparisonView({
  open,
  onOpenChange,
  strategies,
  onRemove,
  onDownload,
  onPreview,
}: StrategyComparisonViewProps) {
  if (strategies.length === 0) return null;

  // Find best values for highlighting
  const bestValues = {
    rating: Math.max(...strategies.map(s => s.rating_avg)),
    downloads: Math.max(...strategies.map(s => s.download_count)),
    reviews: Math.max(...strategies.map(s => s.rating_count)),
  };

  const getValue = (strategy: ComparisonStrategy, key: string) => {
    switch (key) {
      case 'rating': return strategy.rating_avg;
      case 'downloads': return strategy.download_count;
      case 'reviews': return strategy.rating_count;
      case 'category': return strategy.category;
      case 'price': return strategy.price;
      default: return 0;
    }
  };

  const isBest = (strategy: ComparisonStrategy, key: string) => {
    const metric = metrics.find(m => m.key === key);
    if (!metric || metric.higherBetter === null) return false;
    
    const value = getValue(strategy, key) as number;
    const best = bestValues[key as keyof typeof bestValues];
    
    if (metric.higherBetter) {
      return value === best && best > 0;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Compare Strategies ({strategies.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {strategies.map((strategy) => (
              <Card
                key={strategy.id}
                variant="glass"
                className="w-[280px] flex-shrink-0 relative"
              >
                {/* Remove Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 z-10"
                  onClick={() => onRemove(strategy.id)}
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Header */}
                <div className="p-4 border-b">
                  <div className="flex items-start gap-2 pr-6">
                    {strategy.is_verified && (
                      <Badge className="bg-primary text-primary-foreground border-0 shrink-0">
                        <Award className="h-3 w-3" />
                      </Badge>
                    )}
                    <div>
                      <h3 className="font-semibold line-clamp-2">{strategy.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {strategy.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="p-4 space-y-3">
                  {metrics.map((metric) => {
                    const value = getValue(strategy, metric.key);
                    const best = isBest(strategy, metric.key);
                    const Icon = metric.icon;
                    
                    return (
                      <div 
                        key={metric.key}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg",
                          best && "bg-success/10 border border-success/30"
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Icon className="h-4 w-4" />
                          {metric.label}
                        </div>
                        <span className={cn(
                          "font-medium",
                          best && "text-success"
                        )}>
                          {metric.key === 'price' 
                            ? (strategy.is_free ? 'Free' : `$${strategy.price}`)
                            : metric.key === 'category'
                              ? strategy.category
                              : metric.key === 'rating'
                                ? (value as number).toFixed(1)
                                : (value as number).toLocaleString()}
                          {best && ' ✓'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Tags */}
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-1">
                    {strategy.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 pt-0 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onPreview(strategy)}
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onDownload(strategy)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Get
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Summary */}
        {strategies.length >= 2 && (
          <Card variant="glass" className="p-4 mt-4">
            <h4 className="font-medium mb-2">Quick Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Highest Rated</p>
                <p className="font-medium">
                  {strategies.reduce((a, b) => a.rating_avg > b.rating_avg ? a : b).title}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Most Downloaded</p>
                <p className="font-medium">
                  {strategies.reduce((a, b) => a.download_count > b.download_count ? a : b).title}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Most Reviews</p>
                <p className="font-medium">
                  {strategies.reduce((a, b) => a.rating_count > b.rating_count ? a : b).title}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg. Rating</p>
                <p className="font-medium">
                  {(strategies.reduce((sum, s) => sum + s.rating_avg, 0) / strategies.length).toFixed(1)} ★
                </p>
              </div>
            </div>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
